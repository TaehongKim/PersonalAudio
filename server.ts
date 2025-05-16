import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initSocketServer } from './lib/socket-server';
import { ensureBinaries } from './lib/utils/binary-installer';
import fs from 'fs/promises';
import path from 'path';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Next.js 앱 초기화
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// 서버 초기화 함수
async function initServer() {
  console.log('서버 초기화 중...');
  
  // 스토리지 디렉토리 확인
  const storagePath = process.env.MEDIA_STORAGE_PATH || path.join(process.cwd(), 'storage');
  await fs.mkdir(storagePath, { recursive: true });
  console.log(`스토리지 디렉터리 확인: ${storagePath}`);
  
  // 필수 바이너리 확인 및 설치
  console.log('필수 바이너리 확인 중...');
  await ensureBinaries();
}

app.prepare().then(async () => {
  // 서버 초기화
  await initServer();

  // HTTP 서버 생성
  const server = createServer(async (req, res) => {
    try {
      // URL 파싱
      const parsedUrl = parse(req.url || '', true);
      
      // Next.js로 요청 처리
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('요청 처리 오류:', err);
      res.statusCode = 500;
      res.end('내부 서버 오류');
    }
  });

  // Socket.io 서버 초기화
  initSocketServer(server);

  // 서버 시작
  server.listen(port, () => {
    console.log(`> 서버 시작 - http://${hostname}:${port}`);
  });
}); 