# 배포 가이드 (2024)

## 1. 환경 준비
- Ubuntu 22.04+ 또는 Windows 10/11
- Node.js 18+, pnpm
- (권장) Docker, Docker Compose
- (선택) PM2, Nginx

## 2. 환경 변수 설정
- `.env.example` 참고, 실제 값으로 `.env` 생성
- DB, 포트, 외부 API 등 환경별 분리

## 3. Docker 배포
```bash
docker build -t personal-audio .
docker run --env-file .env -p 3000:3000 personal-audio
```
- docker-compose.yml 사용 시 여러 서비스 연동 가능

## 4. PM2/Nginx 운영
- PM2로 무중단 Node.js 운영
- Nginx로 reverse proxy, SSL 적용
- 예시 설정은 Docs/Process.MD 참고

## 5. 바이너리 자동 설치
- yt-dlp, ffmpeg 등은 최초 실행 시 자동 설치됨
- storage/, prisma/ 폴더 및 .env로 데이터/설정 관리

## 6. 운영/장애 경험
- 윈도우 파일 잠금, 캐시 꼬임 등 실전 이슈 반영
- 운영 중 장애 발생 시 로그/캐시/프로세스 점검

---
상세/실전 경험은 Process.MD, PRD_completed.md 참고. 