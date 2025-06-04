# PRD (Product Requirements Document) 최신

## 1. 핵심 기능
- [x] 유튜브/멜론 음악 다운로드
- [x] 실시간 다운로드 상태
- [x] 파일/플레이리스트/공유/캐시/통계 관리
- [x] Skeleton UI, 코드 스플리팅, 반응형
- [x] 환경변수/운영/배포 자동화

## 2. 기술 스택
- Next.js 13+ (app 라우터)
- TypeScript, Tailwind CSS
- Prisma/SQLite
- socket.io
- Docker, PM2, Nginx
- yt-dlp, ffmpeg 자동 설치

## 3. 데이터베이스 구조
- 파일, 플레이리스트, 공유, 캐시, 통계 테이블

## 4. UI/UX
- 반응형, Skeleton UI, 실시간 상태, 공유/다운로드 UX

## 5. 배포/운영
- Docker, PM2, Nginx, Ubuntu/Windows 지원
- .env, storage/, prisma/로 데이터 관리

## 6. 미구현/계획
- 외부 인증, S3 연동, 관리자 대시보드, i18n 등

---
상세 내용은 PRD_completed.md, Process.MD, HowToDeploy.md 참고.
