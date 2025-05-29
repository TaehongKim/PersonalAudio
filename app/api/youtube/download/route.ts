import { NextResponse } from 'next/server';
import { addToQueue } from '@/lib/queue-manager';
import { DownloadType, isPlaylistUrl } from '@/lib/downloader';
import { ensureServerInitialized } from '@/lib/server-init';

// 서버 초기화 확인
ensureServerInitialized();

export async function POST(request: Request) {
  try {
    const { url, type } = await request.json();

    // 필수 필드 확인
    if (!url) {
      return NextResponse.json({
        success: false,
        message: 'URL이 제공되지 않았습니다.'
      }, { status: 400 });
    }

    // 유튜브 URL 형식 확인
    const isYoutubeUrl = url.includes('youtube.com') || url.includes('youtu.be');
    if (!isYoutubeUrl) {
      return NextResponse.json({
        success: false,
        message: '유효한 유튜브 URL이 아닙니다.'
      }, { status: 400 });
    }

    // URL이 플레이리스트인지 확인
    const isPlaylist = isPlaylistUrl(url);

    // 다운로드 타입 확인 및 설정
    let downloadType: DownloadType;
    
    // 클라이언트에서 _playlist가 포함된 타입이나 직접 플레이리스트 체크
    if (type.includes('playlist') || isPlaylist) {
      // 플레이리스트인 경우
      if (type.includes('video')) {
        downloadType = DownloadType.PLAYLIST_VIDEO;
      } else {
        downloadType = DownloadType.PLAYLIST_MP3; // 기본값
      }
    } else {
      // 단일 영상인 경우
      if (type.includes('video') || type === 'video720p') {
        downloadType = DownloadType.VIDEO;
      } else {
        downloadType = DownloadType.MP3; // 기본값
      }
    }

    console.log(`다운로드 요청: URL=${url}, type=${type}, downloadType=${downloadType}, isPlaylist=${isPlaylist}`);

    // 다운로드 큐에 추가
    const queueItem = await addToQueue(url, downloadType);

    return NextResponse.json({
      success: true,
      message: isPlaylist 
        ? '플레이리스트 다운로드가 대기열에 추가되었습니다.' 
        : '다운로드가 대기열에 추가되었습니다.',
      data: {
        id: queueItem.id,
        status: queueItem.status,
        type: queueItem.type,
        isPlaylist: isPlaylist
      }
    });
  } catch (error) {
    console.error('다운로드 요청 처리 오류:', error);
    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    }, { status: 500 });
  }
} 