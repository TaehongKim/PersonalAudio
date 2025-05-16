# YC_mp3_Web

## 프로젝트 소개
YC_mp3_Web은 유튜브 및 멜론 차트의 음악을 모바일 기기에서도 쉽게 다운로드하고 관리할 수 있는 웹 기반 MP3 다운로더 서비스입니다. 단일 비밀번호 인증, 모바일 최적화 UI, 클라우드 파일 관리, 공유 기능 등 다양한 편의 기능을 제공합니다.

- **주요 기능**
  - 유튜브/멜론 차트 MP3 다운로드
  - 저장된 파일 목록 및 다운로드/삭제/공유
  - 공유 URL 생성 및 만료 관리
  - 모바일 반응형 UI 및 PWA 지원

- **기술 스택**
  - Next.js 14 (App Router)
  - TailwindCSS
  - Prisma ORM & MySQL
  - yt-dlp, ffmpeg (서버 사이드 다운로드)
  - pnpm (패키지 관리)
  - **shadcn/ui (UI 컴포넌트 라이브러리)**

---

## Next.js, shadcn/ui, TailwindCSS, Prisma, MySQL 프로젝트 초기화 절차

### 1. pnpm 설치 (최초 1회)
```bash
npm install -g pnpm
```

### 2. Next.js 프로젝트 생성(프로젝트 폴더 상위에서 시작작)
```bash
# 주의: 프로젝트 이름에 대문자가 포함되면 안 됩니다! (예: personal-audio)
pnpm create next-app@latest personal-audio
```

설치 중 옵션 선택:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: No (선택사항) 
- App Router: Yes
- import alias: Yes (기본값: `@/*`)

### 3. 프로젝트 디렉토리로 이동
```bash
cd personal-audio
```

### 4. TailwindCSS 설정 확인
Next.js 설치 과정에서 이미 TailwindCSS가 설정되었지만, 필요한 경우 추가 설정:

```bash
# globals.css에 필요한 Tailwind 지시문이 있는지 확인
# @tailwind base; @tailwind components; @tailwind utilities;
```

### 5. shadcn/ui 설치 및 설정
```bash
# shadcn CLI 설치 및 초기화
pnpm dlx shadcn-ui@latest init
```

초기화 옵션:
- 스타일: `default`
- 색상 테마: `slate`
- 글로벌 CSS 파일 경로: `app/globals.css`
- CSS 변수 사용: Yes
- React Server Components: Yes
- 컴포넌트 경로: `@/components`
- 유틸리티 경로: `@/lib/utils`

필요한 패키지들이 자동으로 설치됩니다:
- `clsx`
- `tailwind-merge`
- `class-variance-authority`

```bash
pnpm dlx shadcn-ui add button
pnpm dlx shadcn-ui add card
```


### 6. Prisma 설치 및 초기화
```bash
# Prisma 설치
pnpm add -D prisma
pnpm add @prisma/client

# Prisma 초기화 (MySQL 데이터베이스 사용)
pnpm prisma init --datasource-provider mysql
```

### 7. MySQL 데이터베이스 설정
`.env` 파일에서 데이터베이스 연결 정보 설정:
```
DATABASE_URL="mysql://USERNAME:PASSWORD@localhost:3306/DATABASE_NAME"
```

### 8. Prisma 스키마 작성
`prisma/schema.prisma` 파일에 데이터 모델 정의:

```prisma
// 예시 스키마
model File {
  id            String    @id @default(cuid())
  title         String
  artist        String?
  fileType      String
  fileSize      Int
  duration      Int?
  path          String
  thumbnailPath String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  downloads     Int       @default(0)
  shares        Share[]
}

model Share {
  id           String    @id @default(cuid())
  shortCode    String    @unique
  expiresAt    DateTime?
  maxDownloads Int?
  downloads    Int       @default(0)
  createdAt    DateTime  @default(now())
  files        File[]
}
```

### 9. Prisma 클라이언트 생성 및 마이그레이션
```bash
# Prisma 클라이언트 생성
pnpm prisma generate

# 데이터베이스 마이그레이션 (초기 스키마 생성)
pnpm prisma migrate dev --name init
```

### 10. shadcn/ui 컴포넌트 추가 (필요에 따라)
```bash
# 예: 버튼, 카드, 폼 컴포넌트 추가
pnpm dlx shadcn-ui@latest add button
pnpm dlx shadcn-ui@latest add card
pnpm dlx shadcn-ui@latest add form
```

### 11. 개발 서버 실행
```bash
pnpm dev
```

## shadcn/ui 설정 문제 해결 방법

### 1. 수동 설정 필요 시
shadcn/ui CLI가 "We could not detect a supported framework" 오류를 표시하는 경우:

1. `components.json` 파일을 생성하여 수동 설정:
   ```json
   {
     "style": "default",
     "rsc": true,
     "tsx": true,
     "tailwind": {
       "config": "tailwind.config.js",
       "css": "app/globals.css",
       "baseColor": "slate",
       "cssVariables": true
     },
     "aliases": {
       "components": "@/components",
       "utils": "@/lib/utils"
     }
   }
   ```

2. `lib/utils.ts` 파일에 필요한 유틸리티 함수 추가:
   ```typescript
   import { type ClassValue, clsx } from "clsx"
   import { twMerge } from "tailwind-merge"
   
   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs))
   }
   ```

3. 필요한 패키지 설치:
   ```bash
   pnpm add clsx tailwind-merge
   ```

### 2. 재설정 필요 시
기존 설정을 삭제하고 처음부터 다시 설정하려면:
```bash
rm components.json
pnpm dlx shadcn-ui@latest init --manual
```

## 폴더 구조 (요약)
```
/
├── app/           # Next.js App Router
├── components/    # UI 및 기능 컴포넌트
├── lib/           # 유틸리티 및 비즈니스 로직
├── public/        # 정적 파일
├── prisma/        # Prisma 스키마
├── middleware.js  # 인증 미들웨어
├── next.config.js # Next.js 설정
└── tailwind.config.js # TailwindCSS 설정
```

---

## 문의 및 기여
- 이 프로젝트는 개인/학습용으로 제작되었습니다.
- 이슈 및 PR은 언제든 환영합니다. 