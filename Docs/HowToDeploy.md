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

## 8. PersonalAudio 배포 가이드

Ubuntu 서버에서 Nginx와 PM2를 사용하여 PersonalAudio 애플리케이션을 배포하는 상세한 가이드입니다.

## 📋 시스템 요구사항

- **OS**: Ubuntu 20.04 LTS 이상
- **RAM**: 최소 2GB (권장 4GB 이상)
- **Storage**: 최소 20GB (미디어 파일 저장 공간 별도)
- **Network**: 인터넷 연결 및 도메인 (music.lunajj.com)

## 🛠️ 1. 시스템 업데이트 및 기본 패키지 설치

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y curl wget git unzip build-essential

# 방화벽 설정
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

## 🟢 2. Node.js 설치

```bash
# Node.js 20.x LTS 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 버전 확인
node --version  # v20.x.x
npm --version   # 10.x.x
```

## 📦 3. pnpm 설치

```bash
# pnpm 설치
npm install -g pnpm

# 버전 확인
pnpm --version
```

## ⚡ 4. PM2 설치

```bash
# PM2 글로벌 설치
npm install -g pm2

# PM2 시스템 서비스 등록
pm2 startup
# 출력된 명령어를 실행하세요 (예: sudo env PATH=...)

# 버전 확인
pm2 --version
```

## 🔧 5. 바이너리 설치

PersonalAudio는 YouTube 다운로드와 미디어 처리를 위해 외부 바이너리가 필요합니다.

### 5.1 yt-dlp 설치

```bash
# yt-dlp 최신 버전 다운로드 및 설치
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# 설치 확인
yt-dlp --version

# 업데이트 (주기적으로 실행 권장)
sudo yt-dlp -U
```

### 5.2 FFmpeg 설치

```bash
# FFmpeg 설치
sudo apt install -y ffmpeg

# 설치 확인
ffmpeg -version

# 추가 코덱 패키지 설치 (선택사항)
sudo apt install -y libavcodec-extra
```

### 5.3 바이너리 경로 확인

```bash
# 설치된 바이너리 경로 확인
which yt-dlp    # /usr/local/bin/yt-dlp
which ffmpeg    # /usr/bin/ffmpeg

# 실행 권한 확인
ls -la /usr/local/bin/yt-dlp
ls -la /usr/bin/ffmpeg
```

## 🗄️ 6. PostgreSQL 설치 및 설정

```bash
# PostgreSQL 설치
sudo apt install -y postgresql postgresql-contrib

# PostgreSQL 서비스 시작
sudo systemctl start postgresql
sudo systemctl enable postgresql

# PostgreSQL 사용자 및 데이터베이스 생성
sudo -u postgres createuser --interactive
# Enter name of role to add: personalaudio
# Shall the new role be a superuser? (y/n) y

sudo -u postgres createdb personalaudio

# 비밀번호 설정
sudo -u postgres psql
ALTER USER personalaudio PASSWORD 'your_secure_password';
\q
```

## 🌐 7. Nginx 설치

```bash
# Nginx 설치
sudo apt install -y nginx

# Nginx 서비스 시작
sudo systemctl start nginx
sudo systemctl enable nginx

# 기본 설정 백업
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
```

## 📁 8. 애플리케이션 배포

### 8.1 프로젝트 클론

```bash
# 홈 디렉터리로 이동
cd ~

# 프로젝트 클론 (실제 저장소 URL로 변경)
git clone https://github.com/your-username/PersonalAudio.git

# 프로젝트 디렉터리로 이동
cd PersonalAudio
```

### 8.2 의존성 설치

```bash
# Node.js 의존성 설치
pnpm install
```

### 8.3 환경 변수 설정

```bash
# .env.production 파일 생성
cp .env.example .env.production

# 환경 변수 편집
nano .env.production
```

**.env.production 설정 예시:**
```env
# Database
DATABASE_URL="postgresql://personalaudio:your_secure_password@localhost:5432/personalaudio"

# NextAuth
NEXTAUTH_URL="https://music.lunajj.com"
NEXTAUTH_SECRET="your-nextauth-secret-key-minimum-32-characters"

# File Paths
MEDIA_STORAGE_PATH="/home/ubuntu/PersonalAudio/storage"
CACHE_STORAGE_PATH="/home/ubuntu/PersonalAudio/storage/cache"

# External APIs (선택사항)
MELON_API_KEY="your-melon-api-key"

# Server Configuration
PORT=3300
NODE_ENV=production

# Binary Paths
YTDLP_PATH="/usr/local/bin/yt-dlp"
FFMPEG_PATH="/usr/bin/ffmpeg"

# File Upload
MAX_FILE_SIZE=100000000  # 100MB
ALLOWED_FILE_TYPES="mp3,mp4,wav,flac"

# Download Limits
MAX_CONCURRENT_DOWNLOADS=3
DOWNLOAD_TIMEOUT=300000  # 5분
```

### 8.4 데이터베이스 마이그레이션

```bash
# Prisma 클라이언트 생성
pnpm prisma generate

# 데이터베이스 마이그레이션 실행
pnpm prisma migrate deploy

# 초기 데이터 시드 (선택사항)
pnpm prisma db seed
```

### 8.5 스토리지 디렉터리 생성

```bash
# 스토리지 디렉터리 생성
mkdir -p storage/{cache,zip,melon,youtube,playlists}

# 권한 설정
chmod 755 storage
chmod -R 755 storage/*
```

### 8.6 애플리케이션 빌드

```bash
# Next.js 프로덕션 빌드
pnpm build

# 빌드 확인
ls -la .next/
```

## 🚀 9. PM2로 애플리케이션 실행

### 9.1 PM2 설정 파일 생성

```bash
# ecosystem.config.js 파일 생성
nano ecosystem.config.js
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'personalaudio',
      script: 'npm',
      args: 'start',
      cwd: '/home/ubuntu/PersonalAudio',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3300
      },
      env_file: '.env.production',
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      restart_delay: 1000,
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'storage']
    }
  ]
};
```

### 9.2 로그 디렉터리 생성

```bash
# 로그 디렉터리 생성
mkdir -p logs
touch logs/combined.log logs/out.log logs/error.log
```

### 9.3 PM2로 애플리케이션 시작

```bash
# PM2로 애플리케이션 시작
pm2 start ecosystem.config.js

# PM2 상태 확인
pm2 status

# 로그 확인
pm2 logs personalaudio

# PM2 설정 저장
pm2 save
```

## 🌐 10. Nginx 설정

### 10.1 Nginx 사이트 설정

```bash
# Nginx 설정 파일 생성
sudo nano /etc/nginx/sites-available/personalaudio
```

**/etc/nginx/sites-available/personalaudio:**
```nginx
server {
    listen 80;
    server_name music.lunajj.com;
    
    # HTTP를 HTTPS로 리디렉션
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name music.lunajj.com;
    
    # SSL 설정 (Let's Encrypt 인증서 설치 후 활성화)
    # ssl_certificate /etc/letsencrypt/live/music.lunajj.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/music.lunajj.com/privkey.pem;
    
    # SSL 보안 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # 파일 업로드 크기 제한
    client_max_body_size 100M;
    
    # 타임아웃 설정
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # Gzip 압축
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # 정적 파일 직접 서빙 및 캐싱
    location /_next/static {
        alias /home/ubuntu/PersonalAudio/.next/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Public 폴더 정적 파일
    location /favicon.ico {
        alias /home/ubuntu/PersonalAudio/public/favicon.ico;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # 스토리지 파일 접근 (보안 주의 - 내부 사용만)
    location /storage {
        internal;
        alias /home/ubuntu/PersonalAudio/storage;
    }
    
    # 메인 애플리케이션 프록시
    location / {
        proxy_pass http://localhost:3300;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket 지원
        proxy_set_header Sec-WebSocket-Key $http_sec_websocket_key;
        proxy_set_header Sec-WebSocket-Version $http_sec_websocket_version;
        proxy_set_header Sec-WebSocket-Protocol $http_sec_websocket_protocol;
        proxy_set_header Sec-WebSocket-Extensions $http_sec_websocket_extensions;
    }
    
    # 로그 설정
    access_log /var/log/nginx/personalaudio.access.log;
    error_log /var/log/nginx/personalaudio.error.log;
}
```

### 10.2 Nginx 사이트 활성화

```bash
# 사이트 활성화
sudo ln -s /etc/nginx/sites-available/personalaudio /etc/nginx/sites-enabled/

# 기본 사이트 비활성화 (선택사항)
sudo rm /etc/nginx/sites-enabled/default

# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

## 🔒 11. SSL 인증서 설정

### 11.1 Certbot 설치

```bash
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d music.lunajj.com

# 인증서 발급 후 Nginx 설정에서 SSL 라인 주석 해제
sudo nano /etc/nginx/sites-available/personalaudio
# ssl_certificate와 ssl_certificate_key 라인의 주석(#) 제거

# Nginx 재시작
sudo systemctl restart nginx

# 자동 갱신 설정
sudo crontab -e
# 다음 줄 추가:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 11.2 SSL 설정 확인

```bash
# SSL 인증서 상태 확인
sudo certbot certificates

# SSL 테스트 (선택사항)
curl -I https://music.lunajj.com
```

## 📊 12. 모니터링 및 로그 관리

### 12.1 PM2 모니터링

```bash
# PM2 모니터링 웹 대시보드
pm2 install pm2-server-monit

# 실시간 모니터링
pm2 monit

# 메모리 사용량 확인
pm2 show personalaudio
```

### 12.2 로그 로테이션

```bash
# PM2 로그 로테이션 설치
pm2 install pm2-logrotate

# 로그 로테이션 설정
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### 12.3 시스템 모니터링

```bash
# htop 설치 (시스템 리소스 모니터링)
sudo apt install -y htop

# 디스크 사용량 모니터링
df -h

# 메모리 사용량 확인
free -h

# Nginx 로그 실시간 모니터링
sudo tail -f /var/log/nginx/personalaudio.access.log
```

## 🔄 13. 배포 자동화 스크립트

### 13.1 업데이트 스크립트 생성

```bash
# deploy.sh 스크립트 생성
nano deploy.sh
```

**deploy.sh:**
```bash
#!/bin/bash

echo "🚀 PersonalAudio 배포 시작..."

# Git 업데이트
echo "📡 Git 업데이트..."
git pull origin main

# 의존성 업데이트
echo "📦 의존성 업데이트..."
pnpm install

# 데이터베이스 마이그레이션
echo "🗄️ 데이터베이스 마이그레이션..."
pnpm prisma migrate deploy
pnpm prisma generate

# 애플리케이션 빌드
echo "🔨 애플리케이션 빌드..."
pnpm build

# PM2 재시작
echo "⚡ PM2 재시작..."
pm2 restart personalaudio

# 상태 확인
echo "✅ 배포 완료! 상태 확인:"
pm2 status
pm2 logs personalaudio --lines 10

echo "🎉 배포가 성공적으로 완료되었습니다!"
echo "🌐 사이트 주소: https://music.lunajj.com"
```

```bash
# 실행 권한 부여
chmod +x deploy.sh

# 스크립트 실행
./deploy.sh
```

### 13.2 바이너리 업데이트 스크립트

```bash
# update-binaries.sh 스크립트 생성
nano update-binaries.sh
```

**update-binaries.sh:**
```bash
#!/bin/bash

echo "🔧 바이너리 업데이트 시작..."

# yt-dlp 업데이트
echo "📥 yt-dlp 업데이트..."
sudo yt-dlp -U

# FFmpeg 업데이트 (패키지 매니저 통해)
echo "🎬 FFmpeg 업데이트..."
sudo apt update
sudo apt upgrade -y ffmpeg

# 버전 확인
echo "✅ 업데이트 완료! 버전 확인:"
echo "yt-dlp: $(yt-dlp --version)"
echo "ffmpeg: $(ffmpeg -version | head -n 1)"

echo "🎉 바이너리 업데이트가 완료되었습니다!"
```

```bash
# 실행 권한 부여
chmod +x update-binaries.sh
```

## 🛠️ 14. 운영 관리 명령어

### 14.1 PM2 관리 명령어

```bash
# 애플리케이션 상태 확인
pm2 status

# 로그 확인
pm2 logs personalaudio
pm2 logs personalaudio --lines 100

# 애플리케이션 재시작
pm2 restart personalaudio

# 애플리케이션 정지
pm2 stop personalaudio

# 애플리케이션 삭제
pm2 delete personalaudio

# PM2 프로세스 리스트 저장
pm2 save

# 메모리 사용량 확인
pm2 show personalaudio

# 포트 사용 확인
sudo netstat -tlnp | grep :3300
```

### 14.2 Nginx 관리 명령어

```bash
# Nginx 상태 확인
sudo systemctl status nginx

# Nginx 재시작
sudo systemctl restart nginx

# Nginx 설정 다시 로드
sudo systemctl reload nginx

# Nginx 설정 테스트
sudo nginx -t

# Nginx 로그 확인
sudo tail -f /var/log/nginx/personalaudio.access.log
sudo tail -f /var/log/nginx/personalaudio.error.log
```

### 14.3 데이터베이스 관리

```bash
# PostgreSQL 접속
sudo -u postgres psql personalaudio

# 데이터베이스 백업
sudo -u postgres pg_dump personalaudio > backup_$(date +%Y%m%d_%H%M%S).sql

# 데이터베이스 복원
sudo -u postgres psql personalaudio < backup_file.sql
```

### 14.4 바이너리 관리

```bash
# 바이너리 상태 확인
which yt-dlp
which ffmpeg
yt-dlp --version
ffmpeg -version

# yt-dlp 수동 업데이트
sudo yt-dlp -U

# FFmpeg 수동 업데이트
sudo apt update && sudo apt upgrade ffmpeg
```

## 🚨 15. 트러블슈팅

### 15.1 일반적인 문제들

**문제 1: 애플리케이션이 시작되지 않음**
```bash
# 로그 확인
pm2 logs personalaudio

# 환경 변수 확인
pm2 show personalaudio

# 포트 충돌 확인
sudo netstat -tlnp | grep :3300

# 수동 실행 테스트
cd /home/ubuntu/PersonalAudio
PORT=3300 pnpm start
```

**문제 2: 데이터베이스 연결 실패**
```bash
# PostgreSQL 상태 확인
sudo systemctl status postgresql

# 데이터베이스 연결 테스트
sudo -u postgres psql personalaudio

# 환경 변수 확인
cat .env.production | grep DATABASE_URL
```

**문제 3: 바이너리 실행 오류**
```bash
# 바이너리 경로 및 권한 확인
ls -la /usr/local/bin/yt-dlp
ls -la /usr/bin/ffmpeg

# 실행 테스트
yt-dlp --version
ffmpeg -version

# 환경 변수에서 경로 확인
cat .env.production | grep PATH
```

**문제 4: Nginx 프록시 오류**
```bash
# Nginx 설정 확인
sudo nginx -t

# 프록시 대상 서버 확인
curl -I http://localhost:3300

# Nginx 에러 로그 확인
sudo tail -f /var/log/nginx/personalaudio.error.log
```

**문제 5: SSL 인증서 문제**
```bash
# 인증서 상태 확인
sudo certbot certificates

# 인증서 갱신
sudo certbot renew

# Nginx SSL 설정 확인
sudo nginx -t
```

### 15.2 성능 최적화

```bash
# PM2 클러스터 모드 확인
pm2 show personalaudio

# 메모리 사용량 모니터링
pm2 monit

# 시스템 리소스 확인
htop

# 디스크 I/O 확인
iostat -x 1

# 네트워크 연결 확인
ss -tuln
```

## 📝 16. 보안 고려사항

### 16.1 방화벽 설정

```bash
# UFW 상태 확인
sudo ufw status

# 필요한 포트만 열기
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS

# 불필요한 포트 차단
sudo ufw deny 3300   # Node.js 직접 접근 차단

# 방화벽 규칙 확인
sudo ufw status numbered
```

### 16.2 파일 권한 설정

```bash
# 애플리케이션 파일 권한 설정
find /home/ubuntu/PersonalAudio -type f -exec chmod 644 {} \;
find /home/ubuntu/PersonalAudio -type d -exec chmod 755 {} \;

# 실행 파일 권한 설정
chmod +x /home/ubuntu/PersonalAudio/deploy.sh
chmod +x /home/ubuntu/PersonalAudio/update-binaries.sh

# 환경 변수 파일 보안
chmod 600 /home/ubuntu/PersonalAudio/.env.production

# 로그 디렉터리 권한
chmod 755 /home/ubuntu/PersonalAudio/logs
```

### 16.3 정기적인 업데이트

```bash
# 시스템 패키지 업데이트 자동화
sudo crontab -e
# 다음 줄들 추가:
# 0 2 * * 0 apt update && apt upgrade -y  # 주간 시스템 업데이트
# 0 3 * * 0 /home/ubuntu/PersonalAudio/update-binaries.sh  # 주간 바이너리 업데이트

# Node.js 보안 업데이트 확인
npm audit

# 의존성 업데이트
pnpm update
```

---

## 🎉 배포 완료!

축하합니다! PersonalAudio 애플리케이션이 성공적으로 배포되었습니다.

### 🌐 접속 정보
- **메인 사이트**: https://music.lunajj.com
- **애플리케이션 포트**: 3300 (내부용, 직접 접근 차단됨)
- **SSL**: Let's Encrypt 자동 인증서

### 📊 모니터링
- **PM2 모니터링**: `pm2 monit`
- **애플리케이션 로그**: `pm2 logs personalaudio`
- **Nginx 로그**: `sudo tail -f /var/log/nginx/personalaudio.access.log`

### 🔧 관리 명령어
- **배포 업데이트**: `./deploy.sh`
- **바이너리 업데이트**: `./update-binaries.sh`
- **PM2 상태 확인**: `pm2 status`
- **시스템 모니터링**: `htop`

### 🔒 보안 체크리스트
- ✅ 방화벽 설정 완료 (포트 22, 80, 443만 오픈)
- ✅ SSL 인증서 설정 완료
- ✅ 환경 변수 파일 보안 설정
- ✅ Nginx 보안 헤더 설정
- ✅ 애플리케이션 직접 접근 차단 (포트 3300)

정기적인 백업과 모니터링을 통해 안정적인 서비스를 운영하세요! 🚀 