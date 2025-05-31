import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const file = await prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 관련된 모든 정보를 반환합니다.
    return NextResponse.json(file);

  } catch (error) {
    console.error('파일 정보 조회 오류 (debug):', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류 발생';
    return NextResponse.json(
      { error: '파일 정보 조회 중 오류가 발생했습니다.', details: errorMessage },
      { status: 500 }
    );
  }
} 