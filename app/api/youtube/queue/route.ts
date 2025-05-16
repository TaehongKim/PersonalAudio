import { NextResponse } from 'next/server';
import { getAllPendingDownloads, getAllProcessingDownloads } from '@/lib/queue-manager';
import { ensureServerInitialized } from '@/lib/server-init';

// 서버 초기화 확인
ensureServerInitialized();

export async function GET() {
  try {
    // 대기 중 및 처리 중인 다운로드 작업 가져오기
    const pendingDownloads = await getAllPendingDownloads();
    const processingDownloads = await getAllProcessingDownloads();
    
    // 두 배열 합치기 (처리 중이 먼저, 그 다음 대기 중)
    const downloadQueue = [...processingDownloads, ...pendingDownloads];
    
    return NextResponse.json({
      success: true,
      data: downloadQueue
    });
  } catch (error) {
    console.error('다운로드 큐 조회 오류:', error);
    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    }, { status: 500 });
  }
} 