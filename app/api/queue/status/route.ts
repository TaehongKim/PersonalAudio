import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getQueueSummary } from '@/lib/queue-recovery';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 큐 상태 요약 조회
    const summary = await getQueueSummary();
    
    return NextResponse.json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    console.error('큐 상태 조회 실패:', error);
    return NextResponse.json(
      { error: '큐 상태 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}