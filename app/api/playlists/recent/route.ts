import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// 최근 재생목록(유저별, 시스템 플레이리스트)
const RECENT_PLAYLIST_NAME = 'recent_playlist';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  // 최근 재생목록 찾기
  const playlist = await prisma.playlist.findFirst({
    where: { userId, isSystem: true, name: RECENT_PLAYLIST_NAME },
    include: {
      items: {
        include: { file: true },
        orderBy: { order: 'asc' }
      }
    }
  });
  if (!playlist) return NextResponse.json({ files: [] });
  const files = playlist.items.map((item: any) => item.file);
  return NextResponse.json({ files });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    // User 존재 확인 및 없으면 생성
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.create({ data: { id: userId } });
    }
    const { files } = await req.json();
    if (!Array.isArray(files)) {
      return NextResponse.json({ error: 'files 배열이 필요합니다.' }, { status: 400 });
    }
    // fileId 유효성 검사
    const fileIds = files.map((f: any) => f.id).filter((id: any) => typeof id === 'string' && id.length > 0);
    if (fileIds.length !== files.length) {
      return NextResponse.json({ error: '모든 파일에 id가 필요합니다.' }, { status: 400 });
    }
    // 기존 recent_playlist 찾기
    let playlist = await prisma.playlist.findFirst({
      where: { userId, isSystem: true, name: RECENT_PLAYLIST_NAME },
      include: { items: true }
    });
    if (!playlist) {
      // 없으면 새로 생성
      playlist = await prisma.playlist.create({
        data: {
          userId,
          name: RECENT_PLAYLIST_NAME,
          isSystem: true,
          items: {
            create: fileIds.map((fileId, i) => ({ fileId, order: i }))
          }
        },
        include: { items: true }
      });
    } else {
      // 있으면 기존 아이템 삭제 후 새로 추가
      await prisma.playlistItem.deleteMany({ where: { playlistId: playlist.id } });
      await prisma.playlist.update({
        where: { id: playlist.id },
        data: {
          items: {
            create: fileIds.map((fileId, i) => ({ fileId, order: i }))
          }
        }
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('recent_playlist POST 오류:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 