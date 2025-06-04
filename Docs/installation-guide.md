# 설치 및 운영 가이드 (최신)

## 1. 요구사항
- Node.js 18.x 이상
- pnpm (최신)
- Git
- (선택) Docker, Docker Compose
- (선택) PM2, Nginx (운영 배포)

## 2. 개발 환경 준비
### 2-1. Node.js & pnpm 설치
- [Node.js 공식 사이트](https://nodejs.org/)에서 LTS 버전 설치
- pnpm 설치: `npm install -g pnpm`

### 2-2. 저장소 클론 및 의존성 설치
```bash
git clone <repo-url>
cd PersonalAudio
pnpm install
```

### 2-3. 환경 변수 설정 (.env)
- `.env.example` 파일을 복사해 `.env` 생성 후, 각 항목을 실제 값으로 채움
- 주요 환경변수:
  - `DATABASE_URL` (SQLite/Prisma)
  - `NEXT_PUBLIC_` 접두사: 클라이언트에서 접근 가능
  - 서버 전용 변수: 서버 코드에서만 사용

### 2-4. 윈도우/우분투 동시 지원
- Windows 10/11, Ubuntu 22.04+ 모두 지원
- 경로/명령어 자동 분기, 바이너리 자동 설치 스크립트 내장
- yt-dlp, ffmpeg 등은 최초 실행 시 자동 다운로드/설치됨

## 3. 개발 서버 실행
```bash
pnpm dev
```
- http://localhost:3000 접속

## 4. 빌드 및 운영
### 4-1. 빌드
```bash
pnpm build
```

### 4-2. 운영 서버 실행
```bash
pnpm start
```

## 5. Docker로 배포
- Dockerfile, docker-compose.yml 제공
- 환경변수는 `.env` 파일로 관리
- 빌드 및 실행:
```bash
docker build -t personal-audio .
docker run --env-file .env -p 3000:3000 personal-audio
```

## 6. 기타 운영
- PM2, Nginx 등으로 무중단 배포 가능
- DB/캐시/썸네일/공유 등 모든 데이터는 `storage/`, `prisma/`, `.env`로 관리

---
최신 상세 내용은 README.md, Docs/HowToDeploy.md 참고. 