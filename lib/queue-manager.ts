import { prisma } from './prisma';
import { downloadYoutubeMp3, downloadYoutubeVideo, downloadPlaylistMp3, downloadPlaylistVideo, DownloadStatus, DownloadType } from './downloader';

/**
 * 다운로드 큐 최대 동시 작업 수
 */
const MAX_CONCURRENT_DOWNLOADS = 1;

/**
 * 현재 처리 중인 다운로드 작업 수
 */
let currentlyProcessing = 0;

/**
 * 다운로드 큐에 작업 추가
 */
export async function addToQueue(url: string, type: DownloadType, options?: any) {
  try {
    // 새 작업 생성
    const queueItem = await prisma.downloadQueue.create({
      data: {
        url,
        type,
        status: DownloadStatus.PENDING,
        progress: 0,
        // 옵션을 JSON으로 저장 (필요시)
        error: options ? JSON.stringify(options) : null,
      }
    });

    // 큐 처리 시작
    processQueue();

    return queueItem;
  } catch (error) {
    console.error('다운로드 큐 추가 오류:', error);
    throw error;
  }
}

/**
 * 다운로드 큐 처리 함수
 */
export async function processQueue() {
  try {
    // 동시 다운로드 제한 확인
    if (currentlyProcessing >= MAX_CONCURRENT_DOWNLOADS) {
      return;
    }

    // 대기 중인 다운로드 작업 가져오기
    const pendingItems = await prisma.downloadQueue.findMany({
      where: {
        status: DownloadStatus.PENDING,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: MAX_CONCURRENT_DOWNLOADS - currentlyProcessing,
    });

    if (pendingItems.length === 0) {
      return;
    }

    // 각 작업 처리
    for (const item of pendingItems) {
      currentlyProcessing++;

      // 비동기로 다운로드 처리
      let options = {};
      try {
        options = item.error ? JSON.parse(item.error) : {};
      } catch (e) {
        // JSON 파싱 실패 시 빈 객체 사용
      }
      
      processDownload(item.id, item.url, item.type as DownloadType, options)
        .finally(() => {
          currentlyProcessing--;
          // 다음 작업 처리
          processQueue();
        });
    }
  } catch (error) {
    console.error('다운로드 큐 처리 오류:', error);
    currentlyProcessing = Math.max(0, currentlyProcessing - 1);
  }
}

/**
 * 개별 다운로드 작업 처리
 */
async function processDownload(id: string, url: string, type: DownloadType, options: any = {}) {
  try {
    if (type === DownloadType.MP3) {
      await downloadYoutubeMp3(id, url, options);
    } else if (type === DownloadType.VIDEO) {
      await downloadYoutubeVideo(id, url, options);
    } else if (type === DownloadType.PLAYLIST_MP3) {
      await downloadPlaylistMp3(id, url);
    } else if (type === DownloadType.PLAYLIST_VIDEO) {
      await downloadPlaylistVideo(id, url);
    } else {
      throw new Error(`지원하지 않는 다운로드 타입: ${type}`);
    }
  } catch (error) {
    console.error(`다운로드 작업 실패 (ID: ${id}):`, error);
    
    // 이미 downloader 내부에서 상태 업데이트하므로 여기서는 추가 작업 불필요
  }
}

/**
 * 다운로드 작업 상태 조회
 */
export async function getDownloadStatus(id: string) {
  return prisma.downloadQueue.findUnique({
    where: { id },
  });
}

/**
 * 다운로드 작업 취소
 */
export async function cancelDownload(id: string) {
  // 참고: 실제 구현에서는 실행 중인 프로세스 종료 로직 추가 필요
  return prisma.downloadQueue.update({
    where: { id },
    data: {
      status: DownloadStatus.FAILED,
      error: '사용자에 의해 취소됨',
    },
  });
}

/**
 * 다운로드 작업 중지
 */
export async function pauseDownload(id: string) {
  return prisma.downloadQueue.update({
    where: { id },
    data: {
      status: DownloadStatus.PAUSED,
    },
  });
}

/**
 * 다운로드 작업 재개
 */
export async function resumeDownload(id: string) {
  const updated = await prisma.downloadQueue.update({
    where: { id },
    data: {
      status: DownloadStatus.PENDING,
    },
  });
  
  // 큐 처리 재시작
  processQueue();
  
  return updated;
}

/**
 * 전체 큐 중지
 */
export async function pauseAllDownloads() {
  return prisma.downloadQueue.updateMany({
    where: {
      status: {
        in: [DownloadStatus.PENDING, DownloadStatus.PROCESSING]
      }
    },
    data: {
      status: DownloadStatus.PAUSED,
    },
  });
}

/**
 * 전체 큐 재개
 */
export async function resumeAllDownloads() {
  const updated = await prisma.downloadQueue.updateMany({
    where: {
      status: DownloadStatus.PAUSED
    },
    data: {
      status: DownloadStatus.PENDING,
    },
  });
  
  // 큐 처리 재시작
  processQueue();
  
  return updated;
}

/**
 * 완료된 오래된 다운로드 작업 정리
 */
export async function cleanupOldDownloads(daysToKeep = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  return prisma.downloadQueue.deleteMany({
    where: {
      updatedAt: {
        lt: cutoffDate,
      },
      status: {
        in: [DownloadStatus.COMPLETED, DownloadStatus.FAILED],
      },
    },
  });
}

/**
 * 모든 대기 중인 다운로드 작업 조회
 */
export async function getAllPendingDownloads() {
  return prisma.downloadQueue.findMany({
    where: {
      status: DownloadStatus.PENDING,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

/**
 * 모든 진행 중인 다운로드 작업 조회
 */
export async function getAllProcessingDownloads() {
  return prisma.downloadQueue.findMany({
    where: {
      status: DownloadStatus.PROCESSING,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

/**
 * 최근 완료된 다운로드 작업 조회
 */
export async function getRecentCompletedDownloads(limit = 10) {
  return prisma.downloadQueue.findMany({
    where: {
      status: DownloadStatus.COMPLETED,
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: limit,
  });
}

// queueManager 객체 export
export const queueManager = {
  add: addToQueue,
  getStatus: getDownloadStatus,
  cancel: cancelDownload,
  cleanup: cleanupOldDownloads,
  getAllPending: getAllPendingDownloads,
  getAllProcessing: getAllProcessingDownloads,
  getRecentCompleted: getRecentCompletedDownloads
}; 