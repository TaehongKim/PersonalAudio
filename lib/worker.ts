import { processQueue, cleanupOldDownloads } from './queue-manager';

/**
 * 백그라운드 작업 주기 (밀리초)
 */
const QUEUE_PROCESS_INTERVAL = 10 * 1000; // 10초
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24시간

/**
 * 인터벌 ID
 */
let queueIntervalId: NodeJS.Timeout | null = null;
let cleanupIntervalId: NodeJS.Timeout | null = null;

/**
 * 백그라운드 작업 시작
 */
export function startBackgroundWorker() {
  if (typeof window !== 'undefined') {
    return; // 클라이언트 측에서는 실행하지 않음
  }

  console.log('백그라운드 작업 처리기 시작...');

  // 큐 처리 작업 시작
  if (!queueIntervalId) {
    // 초기 실행
    processQueue().catch(console.error);

    // 주기적 실행
    queueIntervalId = setInterval(() => {
      processQueue().catch(console.error);
    }, QUEUE_PROCESS_INTERVAL);
  }

  // 정리 작업 시작
  if (!cleanupIntervalId) {
    // 초기 실행 (1시간 후)
    const initialCleanupTimeout = setTimeout(() => {
      cleanupOldDownloads().catch(console.error);
      clearTimeout(initialCleanupTimeout);
    }, 60 * 60 * 1000);

    // 주기적 실행
    cleanupIntervalId = setInterval(() => {
      cleanupOldDownloads().catch(console.error);
    }, CLEANUP_INTERVAL);
  }
}

/**
 * 백그라운드 작업 중지
 */
export function stopBackgroundWorker() {
  console.log('백그라운드 작업 처리기 중지...');

  if (queueIntervalId) {
    clearInterval(queueIntervalId);
    queueIntervalId = null;
  }

  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

/**
 * 큐 처리 즉시 시작
 */
export function triggerQueueProcessing() {
  processQueue().catch(console.error);
} 