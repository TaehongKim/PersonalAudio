import { useEffect, useState, useCallback } from 'react';
import { io, Socket, DownloadStatusData, DownloadErrorData, PlaylistItemProgressData, PlaylistItemCompleteData } from 'socket.io-client';

/**
 * 소켓.io 연결을 관리하는 커스텀 훅
 */
export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // 소켓 초기화
  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') return;

    // 소켓이 이미 존재하면 재사용
    if (socket) return;

    // 소켓 연결
    const socketIo = io(window.location.origin, {
      path: '/api/socket',
    });

    // 이벤트 리스너 등록
    socketIo.on('connect', () => {
      console.log('Socket connected:', socketIo.id);
      setIsConnected(true);
    });

    socketIo.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketIo.on('connect_error', (err: any) => {
      console.error('Socket connection error:', err);
      setIsConnected(false);
    });

    // 소켓 저장
    setSocket(socketIo);

    // 컴포넌트 언마운트 시 정리
    return () => {
      socketIo.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [socket]);

  // 다운로드 ID 구독 함수
  const subscribeToDownload = useCallback((downloadId: string) => {
    if (!socket || !isConnected) return false;
    socket.emit('subscribe', downloadId);
    return true;
  }, [socket, isConnected]);

  // 구독 해제 함수
  const unsubscribeFromDownload = useCallback((downloadId: string) => {
    if (!socket || !isConnected) return false;
    socket.emit('unsubscribe', downloadId);
    return true;
  }, [socket, isConnected]);

  // 이벤트 리스너 등록 함수
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (!socket) return () => {};
    socket.on(event, callback);
    return () => {
      socket.off(event, callback);
    };
  }, [socket]);

  return {
    socket,
    isConnected,
    subscribeToDownload,
    unsubscribeFromDownload,
    on
  };
}

/**
 * 다운로드 상태를 실시간으로 추적하는 커스텀 훅
 */
export function useDownloadStatus(downloadId: string | null) {
  const { socket, isConnected, subscribeToDownload, unsubscribeFromDownload, on } = useSocket();
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [playlistItems, setPlaylistItems] = useState<any[]>([]);

  // 구독 설정
  useEffect(() => {
    if (!downloadId || !isConnected) return;

    // 다운로드 ID 구독
    subscribeToDownload(downloadId);

    // 상태 업데이트 이벤트 리스너
    const statusCleanup = on('download:status', (data: DownloadStatusData) => {
      if (data.id === downloadId) {
        setStatus(data.status);
        setProgress(data.progress);
        if (data.data) setData(data.data);
      }
    });

    // 오류 이벤트 리스너
    const errorCleanup = on('download:error', (data: DownloadErrorData) => {
      if (data.id === downloadId) {
        setError(data.error);
      }
    });

    // 플레이리스트 항목 진행 이벤트 리스너
    const playlistItemProgressCleanup = on('playlist:item-progress', (data: PlaylistItemProgressData) => {
      if (data.id === downloadId) {
        setPlaylistItems((prev) => {
          // 이미 있는 항목이면 업데이트, 없으면 추가
          const index = prev.findIndex(item => item.index === data.itemIndex);
          if (index >= 0) {
            const newItems = [...prev];
            newItems[index] = {
              ...newItems[index],
              progress: data.itemProgress,
              title: data.itemTitle,
              updatedAt: data.timestamp
            };
            return newItems;
          } else {
            return [...prev, {
              index: data.itemIndex,
              title: data.itemTitle,
              progress: data.itemProgress,
              totalItems: data.totalItems,
              status: 'processing',
              error: null,
              fileId: null,
              updatedAt: data.timestamp
            }];
          }
        });
      }
    });

    // 플레이리스트 항목 완료 이벤트 리스너
    const playlistItemCompleteCleanup = on('playlist:item-complete', (data: PlaylistItemCompleteData) => {
      if (data.id === downloadId) {
        setPlaylistItems((prev) => {
          // 이미 있는 항목이면 업데이트, 없으면 추가
          const index = prev.findIndex(item => item.index === data.itemIndex);
          if (index >= 0) {
            const newItems = [...prev];
            newItems[index] = {
              ...newItems[index],
              progress: 100,
              status: 'completed',
              fileId: data.fileId,
              fileData: data.fileData,
              updatedAt: data.timestamp
            };
            return newItems;
          } else {
            return [...prev, {
              index: data.itemIndex,
              title: data.fileData?.title || `항목 #${data.itemIndex + 1}`,
              progress: 100,
              totalItems: data.totalItems,
              status: 'completed',
              fileId: data.fileId,
              fileData: data.fileData,
              error: null,
              updatedAt: data.timestamp
            }];
          }
        });
      }
    });

    // 컴포넌트 언마운트 시 정리
    return () => {
      unsubscribeFromDownload(downloadId);
      statusCleanup();
      errorCleanup();
      playlistItemProgressCleanup();
      playlistItemCompleteCleanup();
    };
  }, [downloadId, isConnected, subscribeToDownload, unsubscribeFromDownload, on]);

  return {
    status,
    progress,
    error,
    data,
    playlistItems,
    isConnected
  };
} 