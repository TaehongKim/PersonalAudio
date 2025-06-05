import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: '작업 ID가 제공되지 않았습니다.'
      }, { status: 400 });
    }

    // 다운로드 큐에서 해당 작업 조회
    const queueItem = await prisma.downloadQueue.findUnique({ where: { id } });
    if (!queueItem) {
      return NextResponse.json({
        success: true,
        message: '이미 삭제됨(존재하지 않음)'
      });
    }

    // 실패하거나 완료된 작업만 삭제 허용
    if (!['failed', 'completed'].includes(queueItem.status)) {
      return NextResponse.json({
        success: false,
        message: '진행 중인 작업은 삭제할 수 없습니다. 먼저 취소해주세요.'
      }, { status: 400 });
    }

    // 다운로드 큐에서 삭제
    await prisma.downloadQueue.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: '다운로드 작업이 삭제되었습니다.',
      data: {
        id: queueItem.id,
        status: queueItem.status,
      }
    });
  } catch (error) {
    console.error('다운로드 작업 삭제 오류:', error);
    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    }, { status: 500 });
  }
} 