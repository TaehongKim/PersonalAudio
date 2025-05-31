import { NextResponse } from 'next/server';
import { resumeAllDownloads } from '@/lib/queue-manager';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await resumeAllDownloads();
    
    return NextResponse.json({
      success: true,
      message: `${result.count}개의 다운로드가 재개되었습니다.`,
      data: result
    });
  } catch (error) {
    console.error('전체 다운로드 재개 오류:', error);
    return NextResponse.json({
      success: false,
      message: '전체 다운로드 재개 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}