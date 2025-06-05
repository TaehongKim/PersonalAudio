import { NextResponse } from 'next/server';
import { cancelDownload } from '@/lib/queue-manager';
import { ensureServerInitialized } from '@/lib/server-init';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 서버 초기화 확인
ensureServerInitialized();

export async function POST(
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

    // 다운로드 취소
    const queueItem = await prisma.downloadQueue.findUnique({ where: { id } });
    if (!queueItem) {
      return NextResponse.json({
        success: true,
        message: '이미 취소됨(존재하지 않음)'
      });
    }
    const result = await cancelDownload(id);
    return NextResponse.json({
      success: true,
      message: '다운로드가 취소되었습니다.',
      data: {
        id: result.id,
        status: result.status,
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