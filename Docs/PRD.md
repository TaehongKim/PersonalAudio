# PRD: 윤채의 MP3 다운로더 웹 버전 (YC_mp3_Web)

## 1. 목적 및 개요
- **목적**: 유튜브 및 멜론 차트의 음악을 모바일 기기에서도 쉽게 다운로드/관리할 수 있는 웹 기반 서비스 제공
- **대상 사용자**: 스마트폰으로 음악을 저장하고 관리하려는 사용자, 멜론 차트/유튜브 플레이리스트를 모바일에서 이용하려는 사용자
- **주요 특징**: 모바일 최적화 UI, 단일 비밀번호 인증, 클라우드 저장, 파일 관리, 콘텐츠 공유 기능
- **기술 스택**: Next.js, TailwindCSS, Prisma, MySQL

## 2. 주요 요구사항

### 2.1. 기능 요구사항
- [F-1] 단일 비밀번호 인증으로 서비스 접근 제어 (아이디 없음)
- [F-2] 유튜브 단일 영상/플레이리스트 MP3 다운로드
- [F-3] 유튜브 단일 영상/플레이리스트 720p 비디오 다운로드
- [F-4] 멜론 TOP 30/50/100 차트 곡 MP3 다운로드
- [F-5] 저장된 파일 목록 조회 기능
- [F-6] 저장된 파일 개별/전체 다운로드 기능
- [F-7] 저장된 파일 개별/전체 삭제 기능
- [F-8] 저장된 파일 목록 공유 URL 생성 기능
- [F-9] 공유 URL을 통한 파일 접근 및 다운로드
- [F-10] 오프라인 재생 기능 (PWA)
- [F-11] 모바일 알림으로 다운로드 완료 안내
- [F-12] 제외 키워드 설정 및 적용

### 2.2. 비기능 요구사항
- [N-1] 모바일 최적화 반응형 UI (iOS/Android 모두 지원)
- [N-2] 모든 작업은 서버 측에서 처리하여 모바일 배터리 효율성 유지
- [N-3] 안전한 인증 및 공유 링크 보호
- [N-4] 다운로드 대기열 관리로 서버 부하 분산
- [N-5] 저장 공간 관리 및 제한 기능
- [N-6] 오프라인 모드 지원 (PWA)

## 3. 사용자 시나리오

### 3.1. 서비스 접속 및 인증
1. 웹 URL 접속
2. 단일 비밀번호 입력 (모든 사용자 공통)
3. 인증 후 메인 페이지 진입
4. 비밀번호 기억하기 옵션으로 재접속 시 자동 로그인 (쿠키/로컬 스토리지 활용)

### 3.2. 유튜브 MP3/비디오 다운로드
1. 하단 내비게이션에서 '유튜브' 탭 선택
2. 유튜브 URL 입력
3. 'MP3' 또는 '720p 비디오' 버튼 터치
4. Next.js API 라우트를 통해 서버에서 처리, 작업 진행상황 실시간 표시
5. 다운로드 완료 시 모바일 알림 발송 (Web Push API)
6. '내 파일' 탭에서 다운로드된 파일 확인 가능

### 3.3. 멜론 차트 다운로드
1. 하단 내비게이션에서 '멜론' 탭 선택
2. 다운로드할 차트 크기(30/50/100) 선택
3. 제외 키워드 설정(선택 사항)
4. '다운로드' 버튼 터치
5. 진행상황 목록 실시간 표시 (Socket.io/WebSocket)
6. 다운로드 완료 시 모바일 알림 발송

### 3.4. 파일 관리 및 다운로드
1. '내 파일' 탭에서 저장된 모든 파일 목록 확인 (Prisma를 통한 데이터 쿼리)
2. 검색/필터링으로 원하는 파일 빠르게 찾기
3. 개별 파일 옆 다운로드 아이콘 터치하여 기기에 저장
4. 다중 선택 모드로 여러 파일 한번에 다운로드
5. '전체 다운로드' 버튼으로 모든 파일 다운로드

### 3.5. 파일 삭제 및 정리
1. '내 파일' 탭에서 삭제할 파일 선택
2. 스와이프하여 빠르게 삭제하거나 다중 선택 후 '삭제' 버튼 (React SWR로 즉시 UI 업데이트)
3. 저장 공간 정보 확인 및 관리
4. '전체 삭제' 옵션으로 모든 파일 초기화

### 3.6. 파일 목록 공유
1. '내 파일' 탭에서 공유할 파일들 선택
2. '공유 링크 생성' 버튼 터치
3. 유효 기간 설정 (1일/7일/30일/무기한)
4. 생성된 URL 복사 또는 공유 앱으로 직접 전송 (Web Share API)
5. 수신자는 링크를 통해 비밀번호 없이 파일 접근 및 다운로드 가능

## 4. UI/UX 요구사항
- [UI-1] TailwindCSS를 활용한 모바일 최적화 반응형 디자인
- [UI-2] 하단 내비게이션 바 기반 직관적 모바일 인터페이스
- [UI-3] 다운로드/변환 진행상황을 위한 진행 표시줄 및 카드 UI
- [UI-4] 파일 목록은 스와이프 제스처로 빠른 관리 (터치 최적화)
- [UI-5] 다크/라이트 모드 전환 (TailwindCSS 다크 모드 활용)
- [UI-6] 공유 링크 생성 및 관리 UI
- [UI-7] 터치 영역 최적화 (최소 44x44px)
- [UI-8] 재생 컨트롤은 미니 플레이어 형태로 구현

## 5. 기술 요구사항
- [T-1] **프론트엔드**: 
  - Next.js 14 (App Router) - 서버 컴포넌트와 클라이언트 컴포넌트 적절히 활용
  - TailwindCSS - 모바일 우선 반응형 디자인
  - SWR/React Query - 데이터 패칭 및 캐싱
  - NextAuth.js - 단일 비밀번호 인증 구현
  
- [T-2] **백엔드**: 
  - Next.js API 라우트 - 서버리스 함수로 구현
  - Middleware 활용 - 인증 및 권한 체크
  - Socket.io - 실시간 다운로드 진행상황 업데이트
  
- [T-3] **데이터베이스**:
  - MySQL - 주 데이터베이스
  - Prisma ORM - 타입 안전한 데이터베이스 쿼리
  - 효율적인 인덱싱으로 모바일에서 빠른 쿼리 응답 보장
  
- [T-4] **파일 처리**:
  - yt-dlp, ffmpeg - 다운로드 및 변환 (서버 사이드)
  - 로컬 파일 시스템 - 파일 저장 (서버 스토리지 활용)
  - Stream API - 효율적인 파일 다운로드 제공
  
- [T-5] **PWA 구성**:
  - Next-PWA - 서비스워커 및 오프라인 지원
  - IndexedDB - 오프라인 데이터 캐싱
  
- [T-6] **공유 기능**:
  - 단축 URL 및 만료 시간 기능 (Prisma 모델 활용)
  - QR 코드 생성 라이브러리 (qrcode.react)

## 6. 데이터베이스 모델 설계 (Prisma)

```prisma
// 주요 Prisma 스키마 설계
model File {
  id          String    @id @default(cuid())
  title       String
  artist      String?
  fileType    String    // MP3, MP4 등
  fileSize    Int
  duration    Int?      // 재생 시간 (초)
  path        String    // 서버 파일 시스템 경로
  thumbnailPath String? // 썸네일 경로
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  downloads   Int       @default(0)
  shares      Share[]   // 공유 링크 관계
}

model Share {
  id         String    @id @default(cuid())
  shortCode  String    @unique // 짧은 공유 코드
  expiresAt  DateTime? // null이면 무기한
  maxDownloads Int?     // null이면 무제한
  downloads  Int       @default(0)
  createdAt  DateTime  @default(now())
  files      File[]    // 공유되는 파일들
}

model Settings {
  id        String    @id @default(cuid())
  password  String    // 해시된 비밀번호
  excludeKeywords String?  // 쉼표로 구분된 제외 키워드
  storageLimit Int     // 저장소 제한 (MB)
  darkMode   Boolean  @default(false)
}

model DownloadQueue {
  id        String    @id @default(cuid())
  url       String    // 다운로드할 URL
  type      String    // MP3, 720p 등
  status    String    // pending, processing, completed, failed
  progress  Int       @default(0)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  error     String?   // 오류 메시지
}
```

## 7. 화면 정의

### 7.1. 로그인 화면 (`/`)
- 단일 비밀번호 입력 필드
- 서비스 소개 배너
- '기억하기' 옵션 (자동 로그인)
- TailwindCSS 애니메이션으로 시각적 효과
- 대시보드 및 바로가기

### 7.2.  유튜브 다운로드 탭 (`/youtube`)
- URL 입력 필드 (form validation)
- 'MP3 다운로드'/'720p 다운로드' 버튼
- 최근 다운로드 이력 (최대 5개)
- 진행 중인 작업 상태 표시 (실시간 업데이트)

### 7.3. 멜론 차트 탭 (`/melon`)
- 차트 크기 선택 (30/50/100) - Radio buttons, 숫자 직접 입력
- 제외 키워드 설정 - Tags input
- 차트 미리보기 (상위 10개) - Grid layout
- 다운로드 버튼
- 진행 중인 작업 상태 표시 (카드 형태)

### 7.4. 내 파일 탭 (`/files`)
- 저장된 파일 목록 (정렬/필터링 옵션)
- 파일 검색 기능 - 검색어 하이라이트
- 개별/전체 다운로드 옵션
- 개별/전체 삭제 옵션
- 공유 링크 생성 버튼
- 저장 공간 사용량 표시 - 원형 프로그레스 바

### 7.5. 공유 관리 화면 (`/shares`)
- 생성된 공유 링크 목록 - 카드 형태
- 링크별 만료 일자 표시
- 링크 삭제 및 갱신 옵션
- QR 코드 생성 기능 (모달 또는 팝업)

### 7.6. 설정 탭 (`/settings`)
- 다크/라이트 모드 전환 - 토글 스위치
- 알림 설정 - 체크박스 그룹
- 저장 공간 관리 - 슬라이더
- 비밀번호 변경 옵션
- 정보 및 도움말 - 아코디언 패널

### 7.7. 공유 링크 접근 화면 (`/share/[code]`)
- 공유된 파일 목록 표시
- 개별/전체 다운로드 버튼
- 미리듣기 기능
- 만료 정보 표시

## 8. 보안 및 개인정보 보호
- [S-1] 모든 통신은 HTTPS로 암호화
- [S-2] 비밀번호는 bcrypt로 해시하여 저장
- [S-3] Next.js Middleware를 활용한 인증 보호 레이어
- [S-4] 공유 링크는 nanoid로 생성하여 추측 불가능하게 구현
- [S-5] JWT 토큰 만료 시간 적절히 설정
- [S-6] API 요청 제한(rate limiting) 적용
- [S-7] 만료된 공유 링크 자동 비활성화 (cron job)

## 9. 구현 상세

### 9.1. Next.js 프로젝트 구조
```
/
├── app/                    # Next.js App Router
│   ├── api/                # API 라우트
│   │   ├── auth/           # 인증 관련 API
│   │   ├── youtube/        # 유튜브 다운로드 API
│   │   ├── melon/          # 멜론 차트 API
│   │   ├── files/          # 파일 관리 API
│   │   └── shares/         # 공유 링크 API
│   ├── youtube/            # 유튜브 페이지
│   ├── melon/              # 멜론 페이지
│   ├── files/              # 파일 관리 페이지
│   ├── shares/             # 공유 관리 페이지
│   ├── settings/           # 설정 페이지
│   ├── share/[code]/       # 공유 링크 접근 페이지
│   └── layout.js           # 루트 레이아웃 (내비게이션 포함)
├── components/             # 컴포넌트
│   ├── ui/                 # UI 컴포넌트
│   ├── player/             # 플레이어 컴포넌트
│   ├── forms/              # 폼 컴포넌트
│   └── layouts/            # 레이아웃 컴포넌트
├── lib/                    # 유틸리티 함수
│   ├── prisma.js           # Prisma 클라이언트
│   ├── auth.js             # 인증 관련 로직
│   ├── downloader.js       # 다운로드 관련 로직
│   └── utils.js            # 기타 유틸리티
├── public/                 # 정적 파일
│   └── icons/              # PWA 아이콘 등
├── prisma/                 # Prisma 설정
│   └── schema.prisma       # 데이터베이스 스키마
├── middleware.js           # Next.js 미들웨어
├── next.config.js          # Next.js 설정
└── tailwind.config.js      # TailwindCSS 설정
```

### 9.2. 주요 API 엔드포인트
- **POST /api/auth/login** - 비밀번호 검증 및 JWT 토큰 발급
- **GET /api/files** - 저장된 파일 목록 조회
- **DELETE /api/files/[id]** - 파일 삭제
- **POST /api/youtube/download** - 유튜브 URL 다운로드 요청
- **GET /api/youtube/status/[id]** - 다운로드 상태 확인
- **POST /api/melon/download** - 멜론 차트 다운로드 요청
- **POST /api/shares** - 공유 링크 생성
- **GET /api/shares/[code]** - 공유 링크 정보 조회

## 10. 인프라 및 배포

### 10.1. 서버 환경
- **OS**: Ubuntu 서버 LTS 버전
- **웹 서버**: Nginx (리버스 프록시)
- **프로세스 관리**: PM2 (Node.js 앱 관리)
- **데이터베이스**: MySQL (로컬 또는 원격)
- **SSL**: Let's Encrypt (HTTPS 인증서)

### 10.2. 배포 프로세스
1. **서버 준비**
   - Ubuntu 서버 설정
   - Node.js, npm 설치 (LTS 버전)
   - MySQL 설치 및 초기화
   - Nginx 설치 및 설정
   - PM2 설치 (`npm install -g pm2`)
   - yt-dlp, ffmpeg 설치

2. **애플리케이션 배포**
   - Git 리포지토리에서 코드 클론
   - 환경 변수 설정 (.env 파일)
   - 의존성 설치: `npm install`
   - Prisma DB 마이그레이션: `npx prisma migrate deploy`
   - 빌드: `npm run build`
   - PM2로 시작: `pm2 start npm --name "yc-mp3-web" -- start`

3. **Nginx 설정**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       # HTTPS로 리디렉션
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
       location /media {
           alias /path/to/your/media/files;
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

4. **PM2 설정 및 관리**
   - 자동 시작 설정: `pm2 startup`
   - 설정 저장: `pm2 save`
   - 모니터링: `pm2 monit`
   - 로그 확인: `pm2 logs`
   - 앱 재시작: `pm2 restart yc-mp3-web`

5. **백업 및 유지보수**
   - 데이터베이스 백업 스크립트 설정 (cron job)
   - 파일 저장소 백업 설정
   - PM2 로그 순환 설정

### 10.3. 모니터링 및 로깅
- PM2 모니터링으로 앱 상태 추적
- Nginx 액세스 및 에러 로그
- 애플리케이션 로그 (winston/morgan)
- 디스크 공간 모니터링 (미디어 파일 증가에 대비)

## 11. 제한사항 및 주의점
- 저작권이 있는 콘텐츠는 개인 사용 목적으로만 이용 가능
- 대용량 파일의 경우 모바일 기기 다운로드 시 데이터 사용량 주의
- 서버 디스크 공간 모니터링 필요 (미디어 파일 증가)
- 오래된 파일 자동 정리 기능 고려
- iOS Safari에서 다운로드한 파일은 '파일' 앱에서만 접근 가능
- 공유 링크는 비밀번호 보호가 없으므로 민감한 파일 공유 주의
- 서버 리소스 사용량 관리 (동시 다운로드 제한 고려)

## 12. 구현 우선순위

## 구현 우선순위

1. **기본 프로젝트 셋업**
   - Next.js 14 프로젝트 초기화
   - TailwindCSS 설정
   - Prisma 및 MySQL 연결 구성
   - 기본 디렉토리 구조 생성

2. **인증 시스템**
   - 단일 비밀번호 인증 구현
   - 로그인 화면 디자인
   - JWT 토큰 관리

3. **핵심 다운로드 기능**
   - 유튜브 MP3 다운로드 API 구현
   - 유튜브 단일 파일 다운로드
   - 유튜브 플레이리스트 전체 다운로드
   - 유튜브 영상 다운로드
   - 유튜브 다운로드 UI 개발
   - 다운로드 상태 실시간 표시

4. **파일 관리 시스템**
   - 저장된 플레이리스트 목록 조회 기능
   - 플레이리스트 및 단일 파일 다운로드 기능
   - 파일 상세정보 표시
   
5. **공유 기능**
   - 공유 URL 생성 기능
   - 공유 페이지 개발
   - 공유 링크 관리 기능

6. **멜론 차트 기능**
   - 멜론 차트 크롤링 구현
   - 멜론차트의 곡명, 가수명으로 유튜브에서 영상 다운로드  및 mp3 변환 기능
   - 멜론 차트의 앨범아트 썸네일 다운로드 및 mp3에 포함 기능
   - 실시간 플레이 기능 
   - 제외 키워드 기능

7. **파일 관리 고급 기능**
   - 플레이리스트 및 파일 삭제 기능
   - 다중 선택 및 일괄 처리   
   - 저장 공간 관리

8. **비디오 다운로드**
   - 720p 비디오 다운로드 기능
   - 비디오 미리보기 기능

9. **PWA 및 모바일 지원 기능**
   - PWA 설정
   - 모바일 지원 시스템

10. **배포 및 운영**
    - Nginx 설정
    - PM2 설정
    - SSL 인증서 적용
    - 모니터링 시스템 구축
