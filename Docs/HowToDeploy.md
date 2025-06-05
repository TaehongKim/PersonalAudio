# 배포 가이드 (2024, music.lunajj.com 기준)

## 1. 환경 준비
- Ubuntu 22.04+ 또는 Windows 10/11
- Node.js 18+, pnpm
- (권장) Docker, Docker Compose
- (선택) PM2, Nginx
- 도메인: https://music.lunajj.com

## 1-1. 필수 바이너리(yt-dlp, ffmpeg) 설치
### Ubuntu (권장)
```bash
# yt-dlp 설치
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# ffmpeg 설치
sudo apt update
sudo apt install -y ffmpeg

# 설치 확인
yt-dlp --version
ffmpeg -version
```

### Windows (수동)
- [yt-dlp.exe 다운로드](https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe) → `bin/` 폴더에 저장
- [ffmpeg 다운로드](https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip) → 압축 해제 후 `bin/` 폴더에 `ffmpeg.exe`, `ffprobe.exe` 복사
- 환경변수 PATH에 bin 폴더 추가 권장

### 자동 설치
- 프로젝트 최초 실행 시(서버 코드) yt-dlp, ffmpeg가 없으면 자동 다운로드/설치 시도
- 운영 환경에서는 수동 설치/업데이트 권장

### 업데이트
```bash
# yt-dlp 최신화
sudo yt-dlp -U
# ffmpeg 최신화
sudo apt upgrade -y ffmpeg
```

### bin 폴더 직접 복사/링크 (ENOENT 오류 등 발생 시)
- 서버 코드가 `/프로젝트경로/bin/yt-dlp`, `/bin/ffmpeg`를 참조할 때 해당 파일이 없으면 ENOENT 오류가 발생할 수 있음
- 자동 설치가 실패하거나, 시스템에만 설치된 경우 아래처럼 bin 폴더에 직접 복사 또는 심볼릭 링크를 생성해야 함

#### 복사 예시
```bash
mkdir -p /home/사용자명/PersonalAudio/bin
cp /usr/local/bin/yt-dlp /home/사용자명/PersonalAudio/bin/yt-dlp
cp /usr/bin/ffmpeg /home/사용자명/PersonalAudio/bin/ffmpeg
chmod +x /home/사용자명/PersonalAudio/bin/yt-dlp
chmod +x /home/사용자명/PersonalAudio/bin/ffmpeg
```

#### 심볼릭 링크 예시
```bash
ln -s /usr/local/bin/yt-dlp /home/사용자명/PersonalAudio/bin/yt-dlp
ln -s /usr/bin/ffmpeg /home/사용자명/PersonalAudio/bin/ffmpeg
```
- Windows는 bin 폴더에 직접 exe 파일을 복사
- 코드가 bin 폴더만 고정 참조한다면 반드시 bin/yt-dlp, bin/ffmpeg가 실제로 존재해야 함
- 시스템 PATH도 fallback 하도록 코드 개선을 권장

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
      cwd: '/home/thkim/PersonalAudio',
      env: {
        NODE_ENV: 'production',
        PORT: 3300
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

#### [실전 주의] PM2 startup과 ecosystem.config.js의 관계
- `pm2 startup`은 **현재 실행 중인 프로세스 리스트**만 자동 복원하며, `ecosystem.config.js` 파일 자체를 자동으로 다시 읽지 않음
- `ecosystem.config.js`를 수정했다면 반드시 아래 순서로 적용해야 함:
  1. `pm2 start ecosystem.config.js` (변경사항 반영)
  2. `pm2 save` (현재 상태 저장)
  3. `pm2 startup` (최초 1회, 안내 명령도 실행)
- 서버가 재부팅되면 마지막으로 `pm2 save`한 시점의 프로세스 상태가 복원됨
- config 파일만 수정하고 `pm2 start`/`pm2 save`를 하지 않으면, 재부팅 시 변경 내용이 반영되지 않음

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
        alias /home/thkim/PersonalAudio/.next/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    location /favicon.ico {
        alias /home/thkim/PersonalAudio/public/favicon.ico;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    # WebSocket 지원
    location /socket.io/ {
        proxy_pass http://localhost:3300;
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
        proxy_pass http://localhost:3300;
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

## 7. Git pull 시 dev.db 충돌/에러 해결법

### 증상
- git pull 시 아래와 같은 에러가 발생할 수 있음:

```
error: Your local changes to the following files would be overwritten by merge:
        prisma/dev.db
Please commit your changes or stash them before you merge.
Aborting
```

### 원인
- prisma/dev.db 파일(로컬 DB)이 변경된 상태에서 pull을 시도하면, git이 병합을 중단함
- dev.db는 바이너리 파일로, 충돌 시 수동 조치가 필요함

### 해결 방법
1. **로컬 dev.db를 임시로 저장(stash) 후 pull**
   ```bash
   git stash push prisma/dev.db
   git pull
   git stash pop # 필요시
   ```
2. **dev.db를 커밋 후 pull**
   ```bash
   git add prisma/dev.db
   git commit -m "dev.db 임시 커밋"
   git pull
   # 필요시 커밋을 되돌리거나, 최신 dev.db로 덮어쓰기
   ```
3. **dev.db를 삭제 후 pull (로컬 DB 데이터가 필요 없을 때)**
   ```bash
   rm prisma/dev.db
   git pull
   # 필요시 마이그레이션 재적용
   pnpm prisma migrate deploy
   ```
4. **dev.db를 .gitignore에 추가(운영 환경에서 DB 파일 관리 안 할 때)**
   - 팀/운영 정책에 따라 dev.db를 git에서 관리하지 않는 것도 고려

### 실전 배포/운영 시 주의
- 운영 서버에서는 dev.db 충돌 시 반드시 백업 후 조치
- DB 충돌/동기화가 잦으면, DB 파일을 git에서 제외하고 dump/마이그레이션으로만 관리하는 것을 권장
- git pull 전 반드시 dev.db 변경사항을 확인하고, 필요시 위 방법으로 안전하게 병합/동기화

### [실전] DB 파일을 git에서 제외하고 dump/마이그레이션으로만 관리하는 방법

1. **.gitignore에 DB 파일 추가**
   - `prisma/dev.db` 또는 운영 DB 파일명을 `.gitignore`에 추가
   ```bash
   echo 'prisma/dev.db' >> .gitignore
   git rm --cached prisma/dev.db
   git commit -m "dev.db git 추적 제외"
   git push
   ```
2. **DB 동기화는 dump/마이그레이션만 사용**
   - DB 파일을 직접 공유하지 않고, 아래 방법으로 동기화
   - **Prisma 마이그레이션 기반**
     ```bash
     pnpm prisma migrate deploy
     # 필요시 seed
     pnpm prisma db seed
     ```
   - **DB dump/복원 기반(예: SQLite)**
     - dump:
       ```bash
       sqlite3 prisma/dev.db .dump > db.sql
       ```
     - 복원:
       ```bash
       sqlite3 prisma/dev.db < db.sql
       ```
   - MySQL/Postgres 등은 각 DB의 dump/restore 명령 사용
3. **팀원/운영 서버는 항상 마이그레이션으로 DB 생성/동기화**
   - DB 파일을 git에서 제외하면, 새 서버/팀원은 아래처럼 동기화
   ```bash
   git pull
   pnpm install
   pnpm prisma migrate deploy
   # 필요시 seed
   pnpm prisma db seed
   ```
4. **운영/협업 시 주의**
   - DB 파일을 git에서 제외하면, 실시간 데이터 동기화는 dump/restore 또는 마이그레이션으로만 가능
   - 중요한 데이터는 주기적으로 dump(백업)하고, 운영/개발 DB는 분리 관리 권장

---
상세/실전 경험은 Process.MD, PRD_completed.md 참고. 