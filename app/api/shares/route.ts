import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

export async function GET() {
  try {
    const shares = await prisma.share.findMany({
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 만료된 공유 링크 체크 및 상태 추가
    const sharesWithStatus = shares.map((share: any) => ({
      ...share,
      isExpired: share.expiresAt ? new Date() > share.expiresAt : false,
      isDownloadLimitReached: share.maxDownloads ? share.downloads >= share.maxDownloads : false
    }));

    return NextResponse.json({ shares: sharesWithStatus });

  } catch (error) {
    console.error('공유 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '공유 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileIds, expiresIn, maxDownloads } = body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: '공유할 파일을 선택해주세요.' },
        { status: 400 }
      );
    }

    // 파일 존재 여부 확인
    const files = await prisma.file.findMany({
      where: {
        id: { in: fileIds }
      }
    });

    if (files.length !== fileIds.length) {
      return NextResponse.json(
        { error: '일부 파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 만료 시간 계산
    let expiresAt: Date | null = null;
    if (expiresIn && expiresIn > 0) {
      expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + (expiresIn * 60 * 60 * 1000)); // hours to milliseconds
    }

    // 고유한 짧은 코드 생성
    let shortCode: string;
    let isUnique = false;
    do {
      shortCode = nanoid(8); // 8자리 랜덤 코드
      const existing = await prisma.share.findUnique({
        where: { shortCode }
      });
      isUnique = !existing;
    } while (!isUnique);

    // 공유 링크 생성
    const share = await prisma.share.create({
      data: {
        shortCode,
        expiresAt,
        maxDownloads: maxDownloads || null,
        files: {
          connect: fileIds.map((id: string) => ({ id }))
        }
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
      share: {
        ...share,
        shareUrl: `${request.nextUrl.origin}/share/${shortCode}`
      }
    });

  } catch (error) {
    console.error('공유 링크 생성 오류:', error);
    return NextResponse.json(
      { error: '공유 링크 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}