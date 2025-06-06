import { NextResponse } from 'next/server';
import { getAllPendingDownloads, getAllProcessingDownloads } from '@/lib/queue-manager';
import { prisma } from '@/lib/prisma';
import { DownloadStatus } from '../../../../types/download-status';

export async function GET() {
  try {
    // 대기 중 및 처리 중인 다운로드 작업 가져오기
    const pendingDownloads = await getAllPendingDownloads();
    const processingDownloads = await getAllProcessingDownloads();
    
    // 최근 실패한 작업들 (최근 1시간 내)
    const recentFailedDownloads = await prisma.downloadQueue.findMany({
      where: {
        status: DownloadStatus.FAILED,
        updatedAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // 1시간 전
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 20 // 최대 20개
    });
    
    // 최근 완료된 작업들 (최근 10분 내)
    const recentCompletedDownloads = await prisma.downloadQueue.findMany({
      where: {
        status: DownloadStatus.COMPLETED,
        updatedAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // 10분 전
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10 // 최대 10개
    });
    
    // 모든 배열 합치기 (처리 중 -> 대기 중 -> 실패 -> 완료 순)
    const downloadQueue = [
      ...processingDownloads, 
      ...pendingDownloads, 
      ...recentFailedDownloads,
      ...recentCompletedDownloads
    ];

    // fileId가 있으면 file 정보 조인
    const fileIds = downloadQueue.map((q: any) => q.fileId).filter(Boolean);
    let fileMap: Record<string, any> = {};
    if (fileIds.length > 0) {
      const files = await prisma.file.findMany({
        where: { id: { in: fileIds } },
        select: {
          id: true,
          title: true,
          artist: true,
          fileType: true,
          fileSize: true,
          duration: true,
          thumbnailPath: true,
          createdAt: true,
        }
      });
      fileMap = Object.fromEntries(files.map(f => [f.id, f]));
    }
    const downloadQueueWithFile = downloadQueue.map((q: any) => ({
      ...q,
      file: q.fileId ? fileMap[q.fileId] || null : null
    }));

    return NextResponse.json({
      success: true,
      data: downloadQueueWithFile
    });
  } catch (error) {
    console.error('다운로드 큐 조회 오류:', error);
    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    }, { status: 500 });
  }
} 