import { NextRequest, NextResponse } from 'next/server';
import { pauseDownload } from '@/lib/queue-manager';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Download ID is required' }, { status: 400 });
    }

    const queueItem = await prisma.downloadQueue.findUnique({ where: { id } });
    if (!queueItem) {
      return NextResponse.json({
        success: true,
        message: '이미 삭제됨(존재하지 않음)'
      });
    }
    const result = await pauseDownload(id);
    return NextResponse.json({
      success: true,
      message: '다운로드가 중지되었습니다.',
      data: result
    });
  } catch (error) {
    console.error('다운로드 중지 오류:', error);
    return NextResponse.json({
      success: false,
      message: '다운로드 중지 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}