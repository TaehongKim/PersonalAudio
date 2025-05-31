import { startBackgroundWorker } from './worker';
import { initializeAdmin } from './init-admin';
import { ensureBinaries } from './utils/binary-installer';
import { startFileWatcher } from './file-watcher';
import fs from 'fs/promises';
import path from 'path';

// 미디어 파일 저장 경로
const MEDIA_STORAGE_PATH = process.env.MEDIA_STORAGE_PATH || './storage';

/**
 * 서버 초기화 함수
 * 
 * 서버가 시작될 때 필요한 작업들을 초기화합니다.
 */
export async function initializeServer() {
  // 사용 환경 확인
  if (typeof window !== 'undefined') {
    return; // 클라이언트 측에서는 실행하지 않음
  }

  console.log('서버 초기화 중...');

  try {
    // 스토리지 디렉터리 확인 및 생성
    await fs.mkdir(MEDIA_STORAGE_PATH, { recursive: true });
    console.log(`스토리지 디렉터리 확인: ${path.resolve(MEDIA_STORAGE_PATH)}`);

    // 필수 바이너리(yt-dlp, ffmpeg) 설치 확인
    console.log('필수 바이너리 확인 중...');
    await ensureBinaries();

    // 관리자 계정 초기화
    await initializeAdmin();
    
    // 백그라운드 작업 처리기 시작
    startBackgroundWorker();

    // 파일 시스템 감시 시작
    startFileWatcher();

    console.log('서버 초기화 완료');
  } catch (error) {
    console.error('서버 초기화 오류:', error);
  }
}

// API 라우트 핸들러에서 호출될 초기화 함수
// (한 번만 실행되도록 보장)
let initialized = false;

export function ensureServerInitialized() {
  if (!initialized) {
    initializeServer().catch(err => {
      console.error("서버 초기화 중 오류 발생:", err);
    });
    initialized = true;
  }
} 