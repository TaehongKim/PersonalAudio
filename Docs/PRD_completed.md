# PRD (완료/운영 기준, 2024)

## 1. 구현 완료 기능
- 유튜브/멜론 음악 다운로드(yt-dlp/ffmpeg 자동)
- 실시간 다운로드 상태(socket.io)
- 파일/플레이리스트/공유/캐시/통계 관리
- Skeleton UI, 코드 스플리팅, 반응형
- 환경변수/운영/배포 자동화
- Docker, PM2, Nginx, Ubuntu/Windows 지원

## 2. 기술 스택/운영 환경
- Next.js 13+ (app 라우터), TypeScript, Tailwind CSS
- Prisma/SQLite, socket.io
- Docker, PM2, Nginx
- yt-dlp, ffmpeg 자동 설치

## 3. 데이터베이스/스토리지
- Prisma/SQLite, storage/ 폴더
- 파일/플레이리스트/공유/캐시/통계 테이블

## 4. UI/UX
- 반응형, Skeleton UI, 실시간 상태, 공유/다운로드 UX

## 5. 배포/운영 경험
- Dockerfile, docker-compose, PM2, Nginx로 실전 배포
- Ubuntu/Windows 운영, 자동 바이너리 설치
- .env, storage/, prisma/로 데이터 관리
- 운영 중 장애/이슈: 윈도우 파일 잠금, 캐시 꼬임 등 실전 경험 반영

## 6. 미구현/계획
- 외부 인증, S3 연동, 관리자 대시보드, i18n 등

---
상세 내용은 PRD.md, Process.MD, HowToDeploy.md 참고. 