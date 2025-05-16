# 기여 가이드

## 개발 환경 설정

### 필수 사항
* Node.js v18 이상
* npm 또는 pnpm
* Git

### 개발 환경 설정
```bash
# 저장소 복제
git clone <repository-url>
cd personalaudio

# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm run dev
```

## 프로젝트 구조

```
personalaudio/
├── app/                  # Next.js 앱 디렉토리
│   ├── api/              # API 엔드포인트
│   │   ├── auth/         # 인증 관련 API
│   │   └── youtube/      # YouTube 다운로드 API
│   └── download/         # 다운로드 관련 페이지
├── bin/                  # 바이너리 (yt-dlp, ffmpeg)
├── components/           # 재사용 가능한 UI 컴포넌트
│   └── ui/               # 기본 UI 컴포넌트
├── contexts/             # React Context 관련 코드
├── Docs/                 # 문서
├── hooks/                # 커스텀 React Hooks
├── lib/                  # 유틸리티 및 핵심 기능
│   └── utils/            # 유틸리티 함수
├── prisma/               # Prisma 데이터베이스 스키마
├── public/               # 정적 파일
├── storage/              # 다운로드된 미디어 저장 위치
└── types/                # 전역 타입 정의
```

## 코드 스타일

이 프로젝트는 다음 코딩 규칙을 따릅니다:

- **타입스크립트**: 모든 코드는 타입을 명시적으로 선언해야 합니다.
- **코드 포맷팅**: ESLint와 Prettier 설정을 따릅니다.
- **명명 규칙**:
  - 파일 이름: 컴포넌트는 PascalCase, 그 외 유틸리티/훅은 camelCase
  - 변수/함수: camelCase
  - 클래스/인터페이스: PascalCase
  - 상수: UPPER_SNAKE_CASE

### ESLint 및 타입 검사
```bash
# TypeScript 타입 검사
pnpm run typecheck

# ESLint 실행
pnpm run lint
```

## 브랜치 전략

- `main`: 프로덕션 코드 (안정 버전)
- `develop`: 개발 버전, 다음 릴리스 준비
- `feature/*`: 새로운 기능 개발
- `bugfix/*`: 버그 수정
- `hotfix/*`: 프로덕션 긴급 수정

## Pull Request 가이드라인

새로운 기능이나 버그 수정을 제출할 때:

1. 적절한 브랜치를 생성합니다: `feature/feature-name` 또는 `bugfix/issue-number`
2. 코드 변경을 커밋합니다.
3. 테스트를 작성하고 실행합니다.
4. Pull Request를 생성합니다.
5. PR 템플릿을 작성합니다.

## 테스트

### 테스트 실행
```bash
# 모든 테스트 실행
pnpm run test

# 특정 파일 테스트
pnpm run test -- path/to/test/file.test.ts
```

## yt-dlp 및 ffmpeg 관련 개발

### yt-dlp 사용법

yt-dlp 명령을 실행하는 방법:

```typescript
import { spawn } from 'child_process';
import { getBinaryPaths } from './utils/binary-installer';

// 바이너리 경로 가져오기
const { ytdlp, ffmpeg } = getBinaryPaths();

// yt-dlp 실행
const ytdlpProcess = spawn(ytdlp, [
  '-x',
  '--audio-format', 'mp3',
  '--audio-quality', '0',
  '-o', outputPath,
  '--ffmpeg-location', ffmpeg,
  url
]);

// 출력 처리
ytdlpProcess.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ytdlpProcess.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

ytdlpProcess.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
```

### 바이너리 설치 디버깅

바이너리 설치 문제 해결:

```typescript
import { ensureBinaries, checkYtdlpVersion, checkFfmpegVersion } from './utils/binary-installer';

// 바이너리 확인 및 설치
async function checkBinaries() {
  try {
    // 바이너리 자동 설치
    await ensureBinaries();
    
    // 버전 확인
    const ytdlpVersion = await checkYtdlpVersion();
    const ffmpegVersion = await checkFfmpegVersion();
    
    console.log(`yt-dlp 버전: ${ytdlpVersion}`);
    console.log(`ffmpeg 버전: ${ffmpegVersion}`);
  } catch (error) {
    console.error('바이너리 설치 오류:', error);
  }
}
```

## Socket.io 개발

소켓 이벤트 처리 예시:

```typescript
// 서버 측 코드 (lib/socket-server.ts)
io.on('connection', (socket) => {
  socket.on('subscribe', (downloadId) => {
    socket.join(downloadId);
    console.log(`클라이언트 ${socket.id}가 ${downloadId} 구독`);
  });
});

// 클라이언트 측 코드 (hooks/useSocket.ts)
useEffect(() => {
  const socket = io();
  
  socket.on('connect', () => {
    console.log('소켓 연결됨');
    socket.emit('subscribe', downloadId);
  });
  
  return () => {
    socket.disconnect();
  };
}, []);
```

## 문서화

새로운 기능을 추가할 때는 다음 문서를 업데이트해야 합니다:

1. README.md - 주요 변경 사항
2. Docs/API.md - API 엔드포인트 변경
3. JSDoc 주석 - 모든 함수와 컴포넌트에 추가

## 릴리스 프로세스

1. `develop` 브랜치에서 모든 변경 사항 병합 및 테스트
2. 버전 번호 업데이트 (`package.json`)
3. `CHANGELOG.md` 업데이트
4. `main` 브랜치로 병합
5. 릴리스 태그 생성

## 도움말 및 지원

질문이나 문제가 있으시면 Issues에 등록하거나 메인테이너에게 문의하세요.

감사합니다! 