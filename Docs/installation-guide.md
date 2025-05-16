# 설치 및 운영 가이드

## 요구 사항

### 시스템 요구 사항
- **Node.js**: v18 이상
- **메모리**: 최소 2GB 이상 (4GB 권장)
- **디스크 공간**: 최소 10GB 이상 (미디어 저장 공간에 따라 변동)

### 지원 운영체제
- **Windows**: Windows 10/11
- **Linux**: Ubuntu 20.04 LTS 이상

## 설치 방법

### 1. 코드 다운로드
```bash
# Git을 사용하여 저장소 클론
git clone <repository-url> personalaudio
cd personalaudio
```

### 2. 종속성 설치
```bash
# NPM 사용시
npm install

# pnpm 사용시
pnpm install
```

### 3. 환경 설정
`.env` 파일을 프로젝트 루트에 생성하고 다음 내용을 추가하세요:

```
# 서버 포트
PORT=3000

# 미디어 저장 경로 (절대 경로 권장)
MEDIA_STORAGE_PATH=./storage

# NextAuth 비밀키 (임의의 복잡한 문자열로 변경)
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

## 프로젝트 실행

### 개발 모드
```bash
npm run dev
```

### 프로덕션 모드
```bash
# 빌드
npm run build

# 실행
npm start
```

## 외부 의존성 관리

### yt-dlp 및 ffmpeg
이 프로젝트는 YouTube 다운로드를 위해 yt-dlp와 ffmpeg를 사용합니다. 프로젝트는 **자동으로** 다음 작업을 수행합니다:

1. 첫 실행 시 필요한 바이너리 확인
2. OS에 따라 적절한 바이너리 다운로드
3. 적절한 실행 권한 설정

**참고**: 프로젝트가 자동으로 설치하는 것을 원치 않거나 문제가 발생할 경우, 다음과 같이 수동으로 설치할 수 있습니다:

#### Windows 수동 설치
1. [yt-dlp 다운로드](https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe)
2. [ffmpeg 다운로드](https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip)
3. 다운로드한 파일들을 `bin` 폴더에 넣습니다 (폴더가 없으면 생성)

#### Ubuntu/Linux 수동 설치
```bash
# yt-dlp 설치
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# ffmpeg 설치
sudo apt update
sudo apt install -y ffmpeg

# 또는 심볼릭 링크 생성
mkdir -p bin
ln -s /usr/bin/ffmpeg bin/ffmpeg
ln -s /usr/bin/ffprobe bin/ffprobe
```

## 데이터베이스 관리

이 프로젝트는 Prisma를 사용하여 SQLite 데이터베이스를 관리합니다.

### 데이터베이스 초기화
```bash
npx prisma migrate deploy
```

### 관리자 계정 초기화
프로젝트는 첫 실행 시 자동으로 기본 관리자 계정을 생성합니다 (비밀번호: admin1234).
보안을 위해 첫 로그인 후 비밀번호를 변경하세요.

## 보안 고려사항

1. 프로덕션 환경에서는 `.env` 파일의 `NEXTAUTH_SECRET`을 강력한 랜덤 문자열로 변경하세요.
2. 기본 관리자 비밀번호를 변경하세요.
3. 보안을 위해 프록시(Nginx, Apache 등)를 통해 서비스를 제공하는 것을 권장합니다.

## 문제 해결

### 바이너리 설치 실패
자동 설치가 실패할 경우:
1. `logs/error.log` 파일에서 오류 확인
2. 위 수동 설치 방법으로 바이너리 설치
3. 바이너리 경로가 `bin/yt-dlp` (Linux) 또는 `bin/yt-dlp.exe` (Windows)인지 확인

### 권한 문제 (Linux)
```bash
# 저장 디렉토리 권한 설정
sudo chown -R <사용자>:<그룹> storage
sudo chmod 755 storage

# 바이너리 실행 권한 설정
sudo chmod +x bin/yt-dlp
sudo chmod +x bin/ffmpeg
sudo chmod +x bin/ffprobe
```

## Docker 배포 (Ubuntu)

### Dockerfile 생성
```dockerfile
FROM node:18-alpine

WORKDIR /app

# 필수 패키지 설치
RUN apk add --no-cache python3 ffmpeg

# 의존성 설치
COPY package*.json ./
RUN npm install

# 소스 복사
COPY . .

# 빌드
RUN npm run build

# 실행
CMD ["npm", "start"]
```

### Docker 실행
```bash
docker build -t personalaudio .
docker run -p 3000:3000 -v /path/to/storage:/app/storage personalaudio
``` 