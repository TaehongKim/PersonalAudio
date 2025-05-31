import chokidar from 'chokidar';
import { getSocketServer } from './socket-server';
import path from 'path';
import fs from 'fs';

const MEDIA_STORAGE_PATH = process.env.MEDIA_STORAGE_PATH || './storage';

// MEDIA_STORAGE_PATH가 실제로 존재하는지 확인하고, 없다면 생성합니다.
if (!fs.existsSync(MEDIA_STORAGE_PATH)) {
  fs.mkdirSync(MEDIA_STORAGE_PATH, { recursive: true });
  console.log(`미디어 저장 경로 생성: ${path.resolve(MEDIA_STORAGE_PATH)}`);
} else {
  console.log(`미디어 저장 경로 확인: ${path.resolve(MEDIA_STORAGE_PATH)}`);
}

export function startFileWatcher() {
  const io = getSocketServer();
  if (!io) {
    console.warn('Socket.IO 서버가 초기화되지 않아 파일 감시자를 시작할 수 없습니다.');
    return;
  }

  console.log(`파일 감시 시작: ${path.resolve(MEDIA_STORAGE_PATH)}`);

  const watcher = chokidar.watch(MEDIA_STORAGE_PATH, {
    ignored: /(^|[\/])\../, // 숨김 파일 무시
    persistent: true,
    ignoreInitial: true, // 초기 스캔 시 발생하는 이벤트는 무시
    awaitWriteFinish: { // 파일 쓰기가 완료될 때까지 대기 (특히 큰 파일 복사 시 유용)
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });

  const handleFileChange = (eventPath: string, eventType: string) => {
    console.log(`파일 변경 감지 (${eventType}): ${eventPath}`);
    // 클라이언트에 'file:changed' 이벤트 전송
    io.emit('file:changed', { path: eventPath, type: eventType });
  };

  watcher
    .on('add', path => handleFileChange(path, 'added'))
    .on('change', path => handleFileChange(path, 'changed'))
    .on('unlink', path => handleFileChange(path, 'deleted'));
    // .on('addDir', path => handleFileChange(path, 'directory_added')) // 디렉토리 변경도 감지하려면 주석 해제
    // .on('unlinkDir', path => handleFileChange(path, 'directory_deleted'));

  watcher.on('error', error => console.error(`파일 감시자 오류: ${error}`));
  
  console.log('파일 감시자가 성공적으로 시작되었습니다.');
} 