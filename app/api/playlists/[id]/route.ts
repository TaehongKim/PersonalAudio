import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const playlist = await prisma.playlist.findUnique({
      where: { id },
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
      }
    });

    if (!playlist) {
      return NextResponse.json(
        { error: '플레이리스트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ playlist });
  } catch (error) {
    console.error('플레이리스트 조회 오류:', error);
    return NextResponse.json(
      { error: '플레이리스트를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, description } = await request.json();

    const playlist = await prisma.playlist.update({
      where: { id },
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
    console.error('플레이리스트 수정 오류:', error);
    return NextResponse.json(
      { error: '플레이리스트 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const playlist = await prisma.playlist.findUnique({
      where: { id }
    });

    if (!playlist) {
      return NextResponse.json(
        { error: '플레이리스트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (playlist.isSystem) {
      return NextResponse.json(
        { error: '시스템 플레이리스트는 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    await prisma.playlist.delete({
      where: { id }
    });

    return NextResponse.json({ message: '플레이리스트가 삭제되었습니다.' });
  } catch (error) {
    console.error('플레이리스트 삭제 오류:', error);
    return NextResponse.json(
      { error: '플레이리스트 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}