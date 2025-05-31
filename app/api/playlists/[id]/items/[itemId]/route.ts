import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('인증되지 않은 요청');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, itemId } = await params;
    console.log('플레이리스트 아이템 삭제 요청:', { playlistId: id, itemId });

    // 플레이리스트 존재 확인
    const playlist = await prisma.playlist.findUnique({
      where: { id }
    });

    if (!playlist) {
      console.log('플레이리스트를 찾을 수 없음:', id);
      return NextResponse.json(
        { error: '플레이리스트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (playlist.isSystem) {
      console.log('시스템 플레이리스트 수정 시도:', id);
      return NextResponse.json(
        { error: '시스템 플레이리스트는 수정할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 플레이리스트 아이템 존재 확인
    const playlistItem = await prisma.playlistItem.findUnique({
      where: { id: itemId }
    });

    if (!playlistItem) {
      console.log('플레이리스트 아이템을 찾을 수 없음:', itemId);
      return NextResponse.json(
        { error: '플레이리스트 아이템을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (playlistItem.playlistId !== id) {
      console.log('플레이리스트 ID 불일치:', { 
        expected: id, 
        actual: playlistItem.playlistId 
      });
      return NextResponse.json(
        { error: '잘못된 요청입니다.' },
        { status: 400 }
      );
    }

    // 아이템 삭제
    console.log('플레이리스트 아이템 삭제 시작:', itemId);
    await prisma.playlistItem.delete({
      where: { id: itemId }
    });
    
    console.log('플레이리스트 아이템 삭제 완료:', itemId);
    return NextResponse.json({ 
      message: '플레이리스트에서 곡이 제거되었습니다.',
      deletedItemId: itemId
    });
  } catch (error) {
    console.error('플레이리스트 아이템 삭제 오류:', error);
    return NextResponse.json(
      { error: '곡 제거 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 