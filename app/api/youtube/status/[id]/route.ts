import { NextResponse } from 'next/server';
import { getDownloadStatus } from '@/lib/queue-manager';
import { DownloadType, DownloadStatus } from '@/lib/downloader';
import { ensureServerInitialized } from '@/lib/server-init';
import { prisma } from '@/lib/prisma';

// 서버 초기화 확인
ensureServerInitialized();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: '작업 ID가 제공되지 않았습니다.'
      }, { status: 400 });
    }

    // 다운로드 상태 조회
    const queueItem = await getDownloadStatus(id);

    if (!queueItem) {
      return NextResponse.json({
        success: false,
        message: '해당 ID의 다운로드 작업을 찾을 수 없습니다.'
      }, { status: 404 });
    }

    // 플레이리스트 다운로드인지 확인
    const isPlaylist = queueItem.type === DownloadType.PLAYLIST_MP3 || 
                       queueItem.type === DownloadType.PLAYLIST_VIDEO;

    const responseData: Record<string, unknown> = {
      id: queueItem.id,
      status: queueItem.status,
      progress: queueItem.progress,
      error: queueItem.error,
      url: queueItem.url,
      type: queueItem.type,
      createdAt: queueItem.createdAt,
      updatedAt: queueItem.updatedAt,
      isPlaylist
    };

    // 플레이리스트인 경우 다운로드된 파일 정보 추가
    if (isPlaylist && (queueItem.status === DownloadStatus.COMPLETED || queueItem.status === DownloadStatus.PROCESSING)) {
      // 타임스탬프로 파일 이름 패턴 찾기
      const timestampMatch = queueItem.updatedAt.getTime().toString();
      
      // 해당 다운로드와 관련된 파일 찾기
      const files = await prisma.file.findMany({
        where: {
          path: {
            contains: timestampMatch
          }
        },
        orderBy: {
          createdAt: 'asc'
        },
        select: {
          id: true,
          title: true,
          artist: true,
          fileType: true,
          fileSize: true,
          duration: true,
          thumbnailPath: true,
          createdAt: true
        }
      });

      responseData.files = files;
      responseData.completedItems = files.length;
    }

    return NextResponse.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('다운로드 상태 조회 오류:', error);
    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    }, { status: 500 });
  }
} 