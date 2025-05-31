import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const results: string[] = [];

    // 파일 삭제 함수
    const deleteFile = async (filePath: string, isThumb = false) => {
      try {
        // 경로 정규화
        const normalizedPath = path.normalize(filePath);
        
        // 파일 존재 여부 확인 (stat 사용)
        try {
          await fs.stat(normalizedPath);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            results.push(`${isThumb ? '썸네일' : '파일'} 없음: ${file.title}`);
            return;
          }
          throw error;
        }

        // 파일 삭제
        await fs.unlink(normalizedPath);
        results.push(`${isThumb ? '썸네일' : '파일'} 삭제 성공: ${file.title}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        console.error(`${isThumb ? '썸네일' : '파일'} 삭제 실패 (${filePath}):`, error);
        results.push(`${isThumb ? '썸네일' : '파일'} 삭제 실패: ${file.title} (${errorMessage})`);
      }
    };

    // 메인 파일 삭제
    await deleteFile(file.path);

    // 썸네일 삭제 (있는 경우)
    if (file.thumbnailPath) {
      await deleteFile(file.thumbnailPath, true);
    }

    // DB에서 파일 정보 삭제
    await prisma.file.delete({
      where: { id }
    });

    // 결과 분석
    const successResults = results.filter(r => r.includes('성공'));
    const failureResults = results.filter(r => r.includes('실패') || r.includes('없음'));

    return NextResponse.json({
      success: true,
      deletionResults: results,
      successCount: successResults.length,
      failureCount: failureResults.length
    });

  } catch (error) {
    console.error('파일 삭제 오류:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : '파일 삭제 중 오류가 발생했습니다.' 
      },
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