import { NextResponse } from 'next/server';
import { cancelDownload } from '@/lib/queue-manager';
import { ensureServerInitialized } from '@/lib/server-init';

// 서버 초기화 확인
ensureServerInitialized();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: '작업 ID가 제공되지 않았습니다.'
      }, { status: 400 });
    }

    // 다운로드 취소
    const queueItem = await cancelDownload(id);

    return NextResponse.json({
      success: true,
      message: '다운로드가 취소되었습니다.',
      data: {
        id: queueItem.id,
        status: queueItem.status,
      }
    });
  } catch (error) {
    console.error('다운로드 취소 오류:', error);
    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    }, { status: 500 });
  }
} 