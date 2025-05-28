import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const file = await prisma.file.findUnique({
      where: { id }
    });

    if (!file) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ file });

  } catch (error) {
    console.error('파일 조회 오류:', error);
    return NextResponse.json(
      { error: '파일 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // 파일 정보 조회
    const file = await prisma.file.findUnique({
      where: { id },
      select: {
        id: true,
        path: true,
        thumbnailPath: true,
        title: true
      }
    });

    if (!file) {
      return NextResponse.json(
        { error: '삭제할 파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 실제 파일 시스템에서 파일 삭제
    const deletionResults: string[] = [];

    try {
      await fs.unlink(file.path);
      deletionResults.push(`파일 삭제 성공: ${file.path}`);
    } catch (error) {
      console.warn(`파일 삭제 실패: ${file.path}`, error);
      deletionResults.push(`파일 삭제 실패: ${file.path}`);
    }

    // 썸네일 파일 삭제 (있는 경우)
    if (file.thumbnailPath) {
      try {
        await fs.unlink(file.thumbnailPath);
        deletionResults.push(`썸네일 삭제 성공: ${file.thumbnailPath}`);
      } catch (error) {
        console.warn(`썸네일 삭제 실패: ${file.thumbnailPath}`, error);
        deletionResults.push(`썸네일 삭제 실패: ${file.thumbnailPath}`);
      }
    }

    // 데이터베이스에서 레코드 삭제
    await prisma.file.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: `파일 "${file.title}"이(가) 성공적으로 삭제되었습니다.`,
      deletionResults
    });

  } catch (error) {
    console.error('파일 삭제 오류:', error);
    return NextResponse.json(
      { error: '파일 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, artist } = body;

    // 파일 존재 여부 확인
    const existingFile = await prisma.file.findUnique({
      where: { id }
    });

    if (!existingFile) {
      return NextResponse.json(
        { error: '수정할 파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 파일 정보 업데이트
    const updatedFile = await prisma.file.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(artist && { artist }),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      file: updatedFile,
      message: '파일 정보가 성공적으로 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('파일 정보 업데이트 오류:', error);
    return NextResponse.json(
      { error: '파일 정보 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}