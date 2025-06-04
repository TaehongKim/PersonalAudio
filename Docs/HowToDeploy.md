# 배포 가이드 (2024, music.lunajj.com 기준)

## 1. 환경 준비
- Ubuntu 22.04+ 또는 Windows 10/11
- Node.js 18+, pnpm
- (권장) Docker, Docker Compose
- (선택) PM2, Nginx
- 도메인: https://music.lunajj.com

## 2. 환경 변수 설정
- `.env.example` 참고, 실제 값으로 `.env` 생성
- DB, 포트, 외부 API 등 환경별 분리

## 3. Prisma DB 준비
```bash
pnpm prisma generate
pnpm prisma migrate deploy
# (필요시) pnpm prisma db seed
```
- SQLite/Prisma 기반, DB 파일/마이그레이션은 prisma/ 폴더에 위치

## 4. Git에서 직접 배포 (Docker 없이)
### 4-1. 코드 다운로드 및 설치
```bash
git clone https://github.com/your-username/PersonalAudio.git
cd PersonalAudio
pnpm install
cp .env.example .env
# .env 파일 내용 채우기
```
### 4-2. Prisma DB 준비
```bash
pnpm prisma generate
pnpm prisma migrate deploy
```
### 4-3. 빌드 및 실행
```bash
pnpm build
pnpm start # 또는 PM2로 운영
```
### 4-4. PM2로 운영
- 위 PM2 설정/명령어(5-1, 5-2) 참고

## 5. PM2 운영
### 5-1. ecosystem.config.js 예시
```js
module.exports = {
  apps: [
    {
      name: 'personalaudio',
      script: 'pnpm',
      args: 'start',
      cwd: '/home/ubuntu/PersonalAudio',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_file: '.env',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    }
  ]
}
```
### 5-2. PM2 명령어
```bash
pm2 start ecosystem.config.js
pm2 status
pm2 logs personalaudio
pm2 restart personalaudio
pm2 stop personalaudio
pm2 delete personalaudio
pm2 save
pm2 startup
```
- 시스템 재부팅 시 자동 실행: `pm2 startup` 후 안내 명령 실행, `pm2 save`

## 6. Nginx + SSL 설정 (music.lunajj.com)
### 6-1. Nginx 설정 예시
`/etc/nginx/sites-available/personalaudio`
```nginx
server {
    listen 80;
    server_name music.lunajj.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name music.lunajj.com;

    ssl_certificate /etc/letsencrypt/live/music.lunajj.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/music.lunajj.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    client_max_body_size 100M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 정적 파일
    location /_next/static {
        alias /home/ubuntu/PersonalAudio/.next/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    location /favicon.ico {
        alias /home/ubuntu/PersonalAudio/public/favicon.ico;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    # WebSocket 지원
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    # 메인 프록시
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    access_log /var/log/nginx/personalaudio.access.log;
    error_log /var/log/nginx/personalaudio.error.log;
}
```
```bash
sudo ln -s /etc/nginx/sites-available/personalaudio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6-2. SSL 인증서 발급/자동 갱신 (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d music.lunajj.com
```
- 인증서 발급 후, Nginx 설정에서 ssl_certificate 경로가 올바른지 확인
- 인증서 만료 30일 전부터 자동 갱신됨

#### 자동 갱신 crontab 등록
```bash
sudo crontab -e
# 아래 라인 추가 (매일 새벽 3시 자동 갱신 시도)
0 3 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```
#### 수동 갱신/테스트
```bash
sudo certbot renew --dry-run
sudo certbot certificates
sudo tail -n 50 /var/log/letsencrypt/letsencrypt.log
```
- 인증서 갱신 후 Nginx 자동 reload, 로그로 상태 확인

## 7. Docker로 배포하는 방법
### 7-1. Docker 빌드 및 실행
```bash
docker build -t personal-audio .
docker run --env-file .env -p 3000:3000 personal-audio
```
- 볼륨 마운트 예시(데이터 유지):
```bash
docker run --env-file .env -p 3000:3000 -v $(pwd)/storage:/app/storage -v $(pwd)/prisma:/app/prisma personal-audio
```
### 7-2. docker-compose 예시
`docker-compose.yml`
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./storage:/app/storage
      - ./prisma:/app/prisma
    restart: always
```
```bash
docker-compose up -d --build
```
- Nginx reverse proxy/SSL은 호스트에서 직접 운영 권장
- Docker 컨테이너 내부에서 yt-dlp, ffmpeg 자동 설치됨

## 8. 기타 운영/팁
- yt-dlp, ffmpeg 등은 최초 실행 시 자동 설치됨
- storage/, prisma/ 폴더 및 .env로 데이터/설정 관리
- 운영 중 장애 발생 시 로그/캐시/프로세스 점검
- 윈도우 파일 잠금, 캐시 꼬임 등 실전 이슈 반영

---
상세/실전 경험은 Process.MD, PRD_completed.md 참고. 