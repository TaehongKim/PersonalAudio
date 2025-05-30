import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '14');
    const limit = parseInt(searchParams.get('limit') || '30');

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // 최근 2주일 가장 많이 들은 노래 30곡
    const topPlayed = await prisma.playHistory.groupBy({
      by: ['fileId'],
      where: {
        playedAt: {
          gte: dateFrom
        }
      },
      _count: {
        fileId: true
      },
      orderBy: {
        _count: {
          fileId: 'desc'
        }
      },
      take: limit
    });

    // 파일 정보와 함께 반환
    const files = await Promise.all(
      topPlayed.map(async (item) => {
        const file = await prisma.file.findUnique({
          where: { id: item.fileId }
        });
        return {
          file,
          playCount: item._count.fileId
        };
      })
    );

    // 최근 재생 기록도 함께 조회
    const recentHistory = await prisma.playHistory.findMany({
      where: {
        playedAt: {
          gte: dateFrom
        }
      },
      include: {
        file: true
      },
      orderBy: {
        playedAt: 'desc'
      },
      take: 50
    });

    return NextResponse.json({
      topPlayed: files.filter(f => f.file), // null 파일 제외
      recentHistory,
      period: { days, from: dateFrom, to: new Date() }
    });
  } catch (error) {
    console.error('재생 기록 조회 오류:', error);
    return NextResponse.json(
      { error: '재생 기록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId, duration, completed } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: '파일 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 파일 존재 확인
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 재생 기록 추가
    const playHistory = await prisma.playHistory.create({
      data: {
        fileId,
        duration: duration || null,
        completed: completed || false
      }
    });

    return NextResponse.json({ playHistory });
  } catch (error) {
    console.error('재생 기록 추가 오류:', error);
    return NextResponse.json(
      { error: '재생 기록을 추가하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}