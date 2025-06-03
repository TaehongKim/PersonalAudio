import { prisma } from './prisma';
import { DownloadStatus } from '../types/download-status';
import { processQueue } from './queue-manager';

/**
 * 서버 시작 시 중단된 다운로드 큐 복구
 */
export async function recoverDownloadQueue(): Promise<void> {
  try {
    console.log('🔄 다운로드 큐 복구 시작...');

    // 처리 중이던 작업들을 대기 상태로 변경
    const processingItems = await prisma.downloadQueue.findMany({
      where: {
        status: DownloadStatus.PROCESSING
      }
    });

    if (processingItems.length > 0) {
      console.log(`📋 ${processingItems.length}개의 중단된 다운로드를 발견했습니다.`);
      
      // 처리 중이던 작업들을 대기 상태로 변경
      await prisma.downloadQueue.updateMany({
        where: {
          status: DownloadStatus.PROCESSING
        },
        data: {
          status: DownloadStatus.PENDING,
          progress: 0,
          error: null // 이전 오류 메시지 초기화
        }
      });

      console.log(`✅ ${processingItems.length}개의 작업을 대기 상태로 복구했습니다.`);
    }

    // 대기 중인 작업 수 확인
    const pendingCount = await prisma.downloadQueue.count({
      where: {
        status: DownloadStatus.PENDING
      }
    });

    if (pendingCount > 0) {
      console.log(`⏳ ${pendingCount}개의 대기 중인 다운로드가 있습니다.`);
      
      // 큐 처리 재시작
      setTimeout(() => {
        console.log('🚀 다운로드 큐 처리를 재시작합니다...');
        processQueue();
      }, 2000); // 2초 후 처리 시작 (서버 완전 시작 대기)
    } else {
      console.log('📭 복구할 다운로드 큐가 없습니다.');
    }

    // 완료된 작업 통계
    const completedCount = await prisma.downloadQueue.count({
      where: {
        status: DownloadStatus.COMPLETED
      }
    });

    const failedCount = await prisma.downloadQueue.count({
      where: {
        status: DownloadStatus.FAILED
      }
    });

    console.log(`📊 다운로드 큐 현황 - 완료: ${completedCount}개, 실패: ${failedCount}개, 대기: ${pendingCount}개`);

  } catch (error) {
    console.error('❌ 다운로드 큐 복구 중 오류 발생:', error);
  }
}

/**
 * 완료된 다운로드 큐 정리 (폴더별 그룹화)
 */
export async function cleanupCompletedQueue(): Promise<void> {
  try {
    // 7일 이전의 완료된 작업들만 정리 대상으로 설정
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const oldCompletedItems = await prisma.downloadQueue.findMany({
      where: {
        status: DownloadStatus.COMPLETED,
        updatedAt: {
          lt: sevenDaysAgo
        }
      },
      include: {
        file: true
      }
    });

    if (oldCompletedItems.length > 0) {
      console.log(`🧹 7일 이전 완료 작업 ${oldCompletedItems.length}개를 정리합니다.`);
      
      // 7일 이전 완료 작업 삭제
      await prisma.downloadQueue.deleteMany({
        where: {
          status: DownloadStatus.COMPLETED,
          updatedAt: {
            lt: sevenDaysAgo
          }
        }
      });

      console.log(`✅ ${oldCompletedItems.length}개의 오래된 완료 작업을 정리했습니다.`);
    }

    // 30일 이전의 실패한 작업들도 정리
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldFailedItems = await prisma.downloadQueue.findMany({
      where: {
        status: DownloadStatus.FAILED,
        updatedAt: {
          lt: thirtyDaysAgo
        }
      }
    });

    if (oldFailedItems.length > 0) {
      console.log(`🧹 30일 이전 실패 작업 ${oldFailedItems.length}개를 정리합니다.`);
      
      await prisma.downloadQueue.deleteMany({
        where: {
          status: DownloadStatus.FAILED,
          updatedAt: {
            lt: thirtyDaysAgo
          }
        }
      });

      console.log(`✅ ${oldFailedItems.length}개의 오래된 실패 작업을 정리했습니다.`);
    }

  } catch (error) {
    console.error('❌ 완료된 큐 정리 중 오류 발생:', error);
  }
}

/**
 * 큐 상태 요약 조회
 */
export async function getQueueSummary(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
  recentGroups: Array<{
    groupType: string;
    groupName: string;
    completedCount: number;
    totalCount: number;
    lastUpdated: Date;
  }>;
}> {
  try {
    const [pending, processing, completed, failed] = await Promise.all([
      prisma.downloadQueue.count({ where: { status: DownloadStatus.PENDING } }),
      prisma.downloadQueue.count({ where: { status: DownloadStatus.PROCESSING } }),
      prisma.downloadQueue.count({ where: { status: DownloadStatus.COMPLETED } }),
      prisma.downloadQueue.count({ where: { status: DownloadStatus.FAILED } })
    ]);

    // 최근 완료된 그룹들 조회 (지난 7일)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCompletedFiles = await prisma.file.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        },
        groupType: {
          not: null
        },
        groupName: {
          not: null
        }
      },
      select: {
        groupType: true,
        groupName: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 그룹별로 집계
    const groupMap = new Map<string, {
      groupType: string;
      groupName: string;
      count: number;
      lastUpdated: Date;
    }>();

    recentCompletedFiles.forEach((file: { groupType: string | null, groupName: string | null, createdAt: Date }) => {
      if (file.groupType && file.groupName) {
        const key = `${file.groupType}:${file.groupName}`;
        const existing = groupMap.get(key);
        
        if (existing) {
          existing.count++;
          if (file.createdAt > existing.lastUpdated) {
            existing.lastUpdated = file.createdAt;
          }
        } else {
          groupMap.set(key, {
            groupType: file.groupType,
            groupName: file.groupName,
            count: 1,
            lastUpdated: file.createdAt
          });
        }
      }
    });

    const recentGroups = Array.from(groupMap.values())
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
      .slice(0, 10)
      .map(group => ({
        groupType: group.groupType,
        groupName: group.groupName,
        completedCount: group.count,
        totalCount: group.count, // 현재는 완료된 것만 카운트
        lastUpdated: group.lastUpdated
      }));

    return {
      pending,
      processing,
      completed,
      failed,
      total: pending + processing + completed + failed,
      recentGroups
    };

  } catch (error) {
    console.error('큐 요약 조회 오류:', error);
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: 0,
      recentGroups: []
    };
  }
}