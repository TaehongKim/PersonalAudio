import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: '파일 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 플레이리스트 존재 확인
    const playlist = await prisma.playlist.findUnique({
      where: { id }
    });

    if (!playlist) {
      return NextResponse.json(
        { error: '플레이리스트를 찾을 수 없습니다.' },
        { status: 404 }
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

    // 이미 플레이리스트에 있는지 확인
    const existingItem = await prisma.playlistItem.findUnique({
      where: {
        playlistId_fileId: {
          playlistId: id,
          fileId: fileId
        }
      }
    });

    if (existingItem) {
      return NextResponse.json(
        { error: '이미 플레이리스트에 있는 파일입니다.' },
        { status: 400 }
      );
    }

    // 다음 순서 번호 계산
    const lastItem = await prisma.playlistItem.findFirst({
      where: { playlistId: id },
      orderBy: { order: 'desc' }
    });

    const nextOrder = lastItem ? lastItem.order + 1 : 0;

    // 플레이리스트에 파일 추가
    const playlistItem = await prisma.playlistItem.create({
      data: {
        playlistId: id,
        fileId: fileId,
        order: nextOrder
      },
      include: {
        file: true
      }
    });

    return NextResponse.json({ playlistItem });
  } catch (error) {
    console.error('플레이리스트 항목 추가 오류:', error);
    return NextResponse.json(
      { error: '플레이리스트에 파일을 추가하는 중 오류가 발생했습니다.' },
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
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: '파일 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 플레이리스트 항목 삭제
    await prisma.playlistItem.delete({
      where: {
        playlistId_fileId: {
          playlistId: id,
          fileId: fileId
        }
      }
    });

    return NextResponse.json({ message: '플레이리스트에서 파일이 제거되었습니다.' });
  } catch (error) {
    console.error('플레이리스트 항목 제거 오류:', error);
    return NextResponse.json(
      { error: '플레이리스트에서 파일을 제거하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}