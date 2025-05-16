FROM node:18-alpine

WORKDIR /app

# 필수 패키지 설치
RUN apk add --no-cache python3 ffmpeg curl bash

# 의존성 설치
COPY package*.json ./
RUN npm install

# 소스 복사
COPY . .

# yt-dlp 수동 설치 (Alpine Linux용)
RUN mkdir -p bin && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp && \
    chmod +x bin/yt-dlp && \
    ln -s /usr/bin/ffmpeg bin/ffmpeg && \
    ln -s /usr/bin/ffprobe bin/ffprobe

# 권한 설정
RUN mkdir -p storage && \
    chmod -R 755 storage bin

# 빌드
RUN npm run build

# Prisma 마이그레이션
RUN npx prisma migrate deploy

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=3000
ENV MEDIA_STORAGE_PATH=./storage

# 포트 노출
EXPOSE 3000

# 실행
CMD ["npm", "start"] 