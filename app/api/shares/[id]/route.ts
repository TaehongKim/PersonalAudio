import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const share = await prisma.share.findUnique({
      where: { id },
      include: {
        files: {
          select: {
            id: true,
            title: true,
            artist: true,
            fileType: true,
            fileSize: true,
            duration: true,
          }
        }
      }
    });

    if (!share) {
      return NextResponse.json(
        { error: '공유 링크를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 만료 체크
    const isExpired = share.expiresAt ? new Date() > share.expiresAt : false;
    const isDownloadLimitReached = share.maxDownloads ? share.downloads >= share.maxDownloads : false;

    return NextResponse.json({
      share: {
        ...share,
        isExpired,
        isDownloadLimitReached
      }
    });

  } catch (error) {
    console.error('공유 링크 조회 오류:', error);
    return NextResponse.json(
      { error: '공유 링크 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // 공유 링크 삭제 시도
    try {
      await prisma.share.delete({
        where: { id }
      });

      return NextResponse.json({
        success: true,
        message: '공유 링크가 성공적으로 삭제되었습니다.'
      });
    } catch {
      // 삭제 실패 시 (존재하지 않는 ID 등)
      return NextResponse.json(
        { error: '삭제할 공유 링크를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('공유 링크 삭제 오류:', error);
    return NextResponse.json(
      { error: '공유 링크 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { expiresIn, maxDownloads } = body;

    const share = await prisma.share.findUnique({
      where: { id }
    });

    if (!share) {
      return NextResponse.json(
        { error: '수정할 공유 링크를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 만료 시간 계산
    let expiresAt: Date | null = share.expiresAt;
    if (expiresIn !== undefined) {
      if (expiresIn === null || expiresIn === 0) {
        expiresAt = null; // 무기한
      } else {
        expiresAt = new Date();
        expiresAt.setTime(expiresAt.getTime() + (expiresIn * 60 * 60 * 1000));
      }
    }

    const updatedShare = await prisma.share.update({
      where: { id },
      data: {
        ...(expiresIn !== undefined && { expiresAt }),
        ...(maxDownloads !== undefined && { maxDownloads })
      },
      include: {
        files: {
          select: {
            id: true,
            title: true,
            artist: true,
            fileType: true,
            fileSize: true,
            duration: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      share: updatedShare
    });

  } catch (error) {
    console.error('공유 링크 수정 오류:', error);
    return NextResponse.json(
      { error: '공유 링크 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}