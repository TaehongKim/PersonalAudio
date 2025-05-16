# YC_mp3_Web 배포 가이드

이 문서는 YC_mp3_Web 애플리케이션을 Ubuntu 서버에 배포하는 방법을 설명합니다.

## 1. 서버 환경 준비

### 1.1. 서버 요구사항
- **운영체제**: Ubuntu 서버 20.04 LTS 이상
- **최소 사양**: 
  - CPU: 2코어 이상
  - RAM: 4GB 이상
  - 디스크: 40GB 이상 (미디어 파일 저장을 위해 더 많은 공간 권장)

### 1.2. 기본 패키지 설치

```bash
# 시스템 업데이트
sudo apt update
sudo apt upgrade -y

# 기본 도구 설치
sudo apt install -y curl git build-essential

# Node.js 설치 (16.x 이상 권장)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# npm 업데이트
sudo npm install -g npm@latest

# pm2 설치
sudo npm install -g pm2

# 웹 서버 설치
sudo apt install -y nginx
```

### 1.3. 미디어 관련 패키지 설치

```bash
# yt-dlp 설치
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# ffmpeg 설치
sudo apt install -y ffmpeg

# yt-dlp 테스트
yt-dlp --version
ffmpeg -version
```

### 1.4. MySQL 설치 및 설정

```bash
# MySQL 설치
sudo apt install -y mysql-server

# MySQL 보안 설정
sudo mysql_secure_installation

# MySQL 서비스 시작 및 자동 시작 설정
sudo systemctl start mysql
sudo systemctl enable mysql
```

MySQL 데이터베이스 및 사용자 생성:

```bash
sudo mysql -u root -p
```

MySQL 프롬프트에서:

```sql
CREATE DATABASE yc_mp3_web;
CREATE USER 'yc_user'@'localhost' IDENTIFIED BY '안전한비밀번호';
GRANT ALL PRIVILEGES ON yc_mp3_web.* TO 'yc_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 2. 애플리케이션 배포

### 2.1. 코드 가져오기

```bash
# 프로젝트 폴더 생성
mkdir -p /var/www
cd /var/www

# 저장소에서 코드 복제
git clone https://github.com/your-username/yc-mp3-web.git
cd yc-mp3-web
```

### 2.2. 환경 설정

`.env` 파일 생성:

```bash
cp .env.example .env
nano .env
```

필요한 환경 변수 설정:

```
# 데이터베이스 설정
DATABASE_URL="mysql://yc_user:안전한비밀번호@localhost:3306/yc_mp3_web"

# 애플리케이션 설정
NODE_ENV=production
OUTPUT_FOLDER=/var/www/yc-mp3-web/public/downloads
AUTH_PASSWORD=안전한관리자비밀번호

# (선택) JWT 보안 설정
JWT_SECRET=랜덤하고안전한문자열
JWT_EXPIRES_IN=7d
```

### 2.3. 다운로드 폴더 생성 및 권한 설정

```bash
# 다운로드 폴더 생성
mkdir -p /var/www/yc-mp3-web/public/downloads

# 권한 설정
sudo chown -R www-data:www-data /var/www/yc-mp3-web/public/downloads
sudo chmod -R 755 /var/www/yc-mp3-web/public/downloads

# 애플리케이션 폴더 권한도 설정
sudo chown -R www-data:www-data /var/www/yc-mp3-web
```

### 2.4. 의존성 설치 및 빌드

```bash
# 패키지 설치
npm install

# Prisma 데이터베이스 마이그레이션
npx prisma migrate deploy

# 애플리케이션 빌드
npm run build
```

### 2.5. PM2로 애플리케이션 실행

```bash
# PM2로 시작
pm2 start npm --name "yc-mp3-web" -- start

# 시스템 재시작 시 자동 실행 설정
pm2 startup
pm2 save
```

PM2 관리 명령어:
```bash
# 애플리케이션 상태 확인
pm2 status

# 로그 확인
pm2 logs yc-mp3-web

# 애플리케이션 재시작
pm2 restart yc-mp3-web

# 실시간 모니터링
pm2 monit
```

## 3. Nginx 웹 서버 설정

### 3.1. Nginx 설정 파일 생성

```bash
sudo nano /etc/nginx/sites-available/yc-mp3-web
```

아래 내용을 붙여넣기:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # HTTP를 HTTPS로 리디렉션
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    # SSL 설정
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # 보안 관련 헤더
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    
    # 파일 업로드 크기 제한
    client_max_body_size 500M;
    
    # 정적 파일 캐싱
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # 캐싱 설정
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
    
    # 저장된 미디어 파일
    location /downloads {
        alias /var/www/yc-mp3-web/public/downloads;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }
    
    # Next.js 앱으로 리버스 프록시
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3.2. Nginx 설정 활성화 및 테스트

```bash
# 사이트 활성화
sudo ln -s /etc/nginx/sites-available/yc-mp3-web /etc/nginx/sites-enabled/

# 설정 테스트
sudo nginx -t

# 설정 적용
sudo systemctl restart nginx
```

### 3.3. SSL 인증서 설정 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# 인증서 발급
sudo certbot --nginx -d your-domain.com

# 인증서 자동 갱신 테스트
sudo certbot renew --dry-run
```

## 4. 방화벽 설정

```bash
# 방화벽 활성화 및 HTTP/HTTPS 포트 오픈
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https

# 방화벽 상태 확인
sudo ufw status
```

## 5. 모니터링 및 유지보수

### 5.1. 로그 관리

```bash
# PM2 로그 확인
pm2 logs yc-mp3-web

# Nginx 액세스 로그
sudo tail -f /var/log/nginx/access.log

# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log
```

### 5.2. 백업 설정

**데이터베이스 백업 스크립트 생성:**

```bash
sudo nano /usr/local/bin/backup-mysql.sh
```

스크립트 내용:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mysqldump -u yc_user -p'안전한비밀번호' yc_mp3_web > $BACKUP_DIR/yc_mp3_web_$DATE.sql
find $BACKUP_DIR -type f -name "*.sql" -mtime +7 -delete
```

스크립트 권한 설정 및 cron 작업 추가:

```bash
sudo chmod +x /usr/local/bin/backup-mysql.sh
sudo crontab -e
```

cron 작업 추가:

```
0 3 * * * /usr/local/bin/backup-mysql.sh > /var/log/mysql-backup.log 2>&1
```

### 5.3. 디스크 공간 모니터링

```bash
# 디스크 사용량 확인
df -h

# 다운로드 폴더 크기 확인
du -sh /var/www/yc-mp3-web/public/downloads
```

### 5.4. 오래된 파일 정리 스크립트

```bash
sudo nano /usr/local/bin/cleanup-downloads.sh
```

스크립트 내용:

```bash
#!/bin/bash
# 30일 이상 된 다운로드 파일 정리
find /var/www/yc-mp3-web/public/downloads -type f -mtime +30 -delete
```

스크립트 권한 설정 및 cron 작업 추가:

```bash
sudo chmod +x /usr/local/bin/cleanup-downloads.sh
sudo crontab -e
```

cron 작업 추가:

```
0 4 * * * /usr/local/bin/cleanup-downloads.sh > /var/log/cleanup-downloads.log 2>&1
```

## 6. 문제 해결

### 6.1. yt-dlp 오류
yt-dlp가 작동하지 않는 경우:
```bash
# yt-dlp 업데이트
sudo yt-dlp -U
```

### 6.2. 파일 권한 문제
다운로드 폴더 접근 권한 문제:
```bash
sudo chown -R www-data:www-data /var/www/yc-mp3-web/public/downloads
sudo chmod -R 755 /var/www/yc-mp3-web/public/downloads
```

### 6.3. 데이터베이스 연결 문제
Prisma 연결 오류 발생 시:
```bash
# .env 파일 확인
nano .env

# 데이터베이스 연결 테스트
npx prisma db push --preview-feature
```

## 7. 업데이트 방법

```bash
# 저장소에서 최신 코드 가져오기
cd /var/www/yc-mp3-web
git pull

# 의존성 업데이트
npm install

# 데이터베이스 스키마 업데이트
npx prisma migrate deploy

# 애플리케이션 다시 빌드
npm run build

# 애플리케이션 재시작
pm2 restart yc-mp3-web
``` 