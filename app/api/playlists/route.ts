import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const playlists = await prisma.playlist.findMany({
      include: {
        items: {
          include: {
            file: true
          },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { items: true }
        }
      },
      orderBy: [
        { isSystem: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({ playlists });
  } catch (error) {
    console.error('플레이리스트 조회 오류:', error);
    return NextResponse.json(
      { error: '플레이리스트를 불러오는 중 오류가 발생했습니다.' },
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

    const { name, description, groupType, groupName } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: '플레이리스트 이름이 필요합니다.' },
        { status: 400 }
      );
    }

    // 그룹을 플레이리스트로 만드는 경우
    if (groupType && groupName) {
      const files = await prisma.file.findMany({
        where: {
          groupType,
          groupName
        },
        orderBy: { rank: 'asc' }
      });

      if (files.length === 0) {
        return NextResponse.json(
          { error: '해당 그룹에 파일이 없습니다.' },
          { status: 400 }
        );
      }

      const playlist = await prisma.playlist.create({
        data: {
          name,
          description: description || `${groupName} 그룹에서 생성`,
          items: {
            create: files.map((file: any, index: number) => ({
              fileId: file.id,
              order: index
            }))
          }
        },
        include: {
          items: {
            include: { file: true },
            orderBy: { order: 'asc' }
          },
          _count: { select: { items: true } }
        }
      });

      return NextResponse.json({ playlist });
    }

    // 빈 플레이리스트 생성
    const playlist = await prisma.playlist.create({
      data: {
        name,
        description
      },
      include: {
        items: {
          include: { file: true },
          orderBy: { order: 'asc' }
        },
        _count: { select: { items: true } }
      }
    });

    return NextResponse.json({ playlist });
  } catch (error) {
    console.error('플레이리스트 생성 오류:', error);
    return NextResponse.json(
      { error: '플레이리스트 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}