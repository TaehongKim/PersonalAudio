import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({
        success: false,
        message: '삭제할 작업 ID 목록이 제공되지 않았습니다.'
      }, { status: 400 });
    }

    // 다운로드 큐에서 해당 작업들 조회
    const queueItems = await prisma.downloadQueue.findMany({
      where: { 
        id: { in: ids }
      }
    });

    if (queueItems.length === 0) {
      return NextResponse.json({
        success: false,
        message: '삭제할 작업을 찾을 수 없습니다.'
      }, { status: 404 });
    }

    // 진행 중인 작업 확인
    const activeItems = queueItems.filter((item: any) => 
      !['failed', 'completed'].includes(item.status)
    );

    if (activeItems.length > 0) {
      return NextResponse.json({
        success: false,
        message: `${activeItems.length}개의 진행 중인 작업이 있습니다. 먼저 취소해주세요.`,
        activeIds: activeItems.map((item: any) => item.id)
      }, { status: 400 });
    }

    // 일괄 삭제 실행
    const result = await prisma.downloadQueue.deleteMany({
      where: { 
        id: { in: ids },
        status: { in: ['failed', 'completed'] }
      }
    });

    return NextResponse.json({
      success: true,
      message: `${result.count}개의 다운로드 작업이 삭제되었습니다.`,
      data: {
        deletedCount: result.count,
        requestedIds: ids
      }
    });
  } catch (error) {
    console.error('일괄 삭제 오류:', error);
    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    }, { status: 500 });
  }
} 