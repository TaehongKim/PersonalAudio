import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    if (!code) {
      return NextResponse.json({ error: 'Share code is required' }, { status: 400 })
    }

    const share = await prisma.share.findUnique({
      where: { shortCode: code },
      include: {
        files: {
          select: {
            id: true,
            title: true,
            artist: true,
            fileType: true,
            fileSize: true,
            duration: true,
            thumbnailPath: true,
            groupType: true,
            groupName: true,
            rank: true,
            createdAt: true
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
    if (share.expiresAt && new Date() > share.expiresAt) {
      return NextResponse.json(
        { error: '만료된 공유 링크입니다.' },
        { status: 410 }
      );
    }

    // 다운로드 제한 체크
    if (share.maxDownloads && share.downloads >= share.maxDownloads) {
      return NextResponse.json(
        { error: '다운로드 제한에 도달했습니다.' },
        { status: 429 }
      );
    }

    return NextResponse.json({
      share: {
        id: share.id,
        shortCode: share.shortCode,
        expiresAt: share.expiresAt,
        maxDownloads: share.maxDownloads,
        downloads: share.downloads,
        createdAt: share.createdAt,
        files: share.files
      }
    });

  } catch (error) {
    console.error('공유 링크 접근 오류:', error);
    return NextResponse.json(
      { error: '공유 링크 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    if (!code) {
      return NextResponse.json({ error: 'Share code is required' }, { status: 400 })
    }

    const body = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return NextResponse.json(
        { error: '파일 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const share = await prisma.share.findUnique({
      where: { shortCode: code }
    });

    if (!share) {
      return NextResponse.json(
        { error: '공유 링크를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 만료 체크
    if (share.expiresAt && new Date() > share.expiresAt) {
      return NextResponse.json(
        { error: '만료된 공유 링크입니다.' },
        { status: 410 }
      );
    }

    // 다운로드 제한 체크
    if (share.maxDownloads && share.downloads >= share.maxDownloads) {
      return NextResponse.json(
        { error: '다운로드 제한에 도달했습니다.' },
        { status: 429 }
      );
    }

    // 다운로드 카운트 증가
    await prisma.share.update({
      where: { shortCode: code },
      data: {
        downloads: { increment: 1 }
      }
    });

    return NextResponse.json({
      success: true,
      message: '다운로드가 기록되었습니다.'
    });

  } catch (error) {
    console.error('공유 다운로드 기록 오류:', error);
    return NextResponse.json(
      { error: '다운로드 기록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}