# 개발/운영 프로세스 (2024)

## 1. 기술 스택
- Next.js 13+ (app 라우터)
- TypeScript, Tailwind CSS
- Prisma/SQLite
- socket.io (실시간)
- Docker, PM2, Nginx
- yt-dlp, ffmpeg 자동 설치

## 2. 개발 프로세스
- pnpm 기반 개발/빌드/운영
- 환경변수 .env, .env.example 관리
- 공용 타입/유틸 분리, 코드 스플리팅
- 윈도우/우분투 동시 지원

## 3. 데이터베이스/스토리지
- Prisma/SQLite, storage/ 폴더
- 파일/플레이리스트/공유/캐시/통계 테이블

## 4. UI/UX
- 반응형, Skeleton UI, 코드 스플리팅
- 실시간 상태, 공유/다운로드 UX

## 5. 배포/운영
- Dockerfile, docker-compose, PM2, Nginx
- Ubuntu/Windows 운영, 자동 바이너리 설치
- .env, storage/, prisma/로 데이터 관리

## 6. 미구현/계획
- 외부 인증, S3 연동, 관리자 대시보드, i18n 등

---
상세 내용은 PRD.md, PRD_completed.md, HowToDeploy.md 참고. 