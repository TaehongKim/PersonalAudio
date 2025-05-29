import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { DownloadStatus } from './downloader';
import type { File } from '@prisma/client';

// 타입 정의
interface DownloadStatusData {
  id: string;
  status: DownloadStatus;
  progress: number;
  data?: Record<string, unknown>;
  timestamp: string;
}

interface DownloadCompleteData {
  id: string;
  fileId: string;
  fileData: File;
  timestamp: string;
}

interface DownloadErrorData {
  id: string;
  error: string;
  timestamp: string;
}

interface PlaylistItemProgressData {
  id: string;
  itemIndex: number;
  totalItems: number;
  itemTitle: string;
  itemProgress: number;
  timestamp: string;
}

interface PlaylistItemCompleteData {
  id: string;
  itemIndex: number;
  totalItems: number;
  fileId: string;
  fileData: File;
  timestamp: string;
}

// 실제 Socket.io 서버 인스턴스
let io: Server | undefined = globalThis.io;

/**
 * Socket.io 서버 초기화
 */
export function initSocketServer(httpServer: HttpServer) {
  if (io) {
    console.log('Socket.io 서버가 이미 초기화되어 있습니다.');
    return io;
  }

  io = new Server(httpServer, {
    path: '/api/socket',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  globalThis.io = io;

  // 연결 이벤트 핸들러
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] 클라이언트 연결됨: ${socket.id}`);

    // 다운로드 ID 구독
    socket.on('subscribe', (downloadId: string) => {
      console.log(`[Socket] 클라이언트 ${socket.id}가 다운로드 ID ${downloadId}를 구독합니다.`);
      socket.join(downloadId);
    });

    // 구독 취소
    socket.on('unsubscribe', (downloadId: string) => {
      console.log(`[Socket] 클라이언트 ${socket.id}가 다운로드 ID ${downloadId} 구독을 취소합니다.`);
      socket.leave(downloadId);
    });

    // 연결 종료
    socket.on('disconnect', (reason: string) => {
      console.log(`[Socket] 클라이언트 연결 종료: ${socket.id}, 이유: ${reason}`);
    });
  });

  console.log('[Socket] Socket.io 서버 초기화 완료');
  return io;
}

/**
 * Socket.io 서버 가져오기
 */
export function getSocketServer() {
  return io;
}

/**
 * 다운로드 상태 업데이트 이벤트 발송
 */
export function emitDownloadStatusUpdate(
  downloadId: string, 
  status: DownloadStatus, 
  progress: number, 
  data?: Record<string, unknown>
) {
  if (!io) {
    console.log('[Socket] Socket.io 서버가 초기화되지 않았습니다.');
    return;
  }

  const eventData: DownloadStatusData = {
    id: downloadId,
    status,
    progress,
    data,
    timestamp: new Date().toISOString()
  };

  io.to(downloadId).emit('download:status', eventData);
  
  console.log(`[Socket] 다운로드 상태 업데이트: ${downloadId}, ${status}, ${progress}%`);
}

/**
 * 다운로드 완료 이벤트 발송
 */
export function emitDownloadComplete(downloadId: string, fileId: string, fileData: File) {
  if (!io) {
    console.log('[Socket] Socket.io 서버가 초기화되지 않았습니다.');
    return;
  }

  const eventData: DownloadCompleteData = {
    id: downloadId,
    fileId,
    fileData,
    timestamp: new Date().toISOString()
  };

  io.to(downloadId).emit('download:complete', eventData);
  
  console.log(`[Socket] 다운로드 완료: ${downloadId}, 파일 ID: ${fileId}`);
}

/**
 * 다운로드 오류 이벤트 발송
 */
export function emitDownloadError(downloadId: string, error: string) {
  if (!io) {
    console.log('[Socket] Socket.io 서버가 초기화되지 않았습니다.');
    return;
  }

  const eventData: DownloadErrorData = {
    id: downloadId,
    error,
    timestamp: new Date().toISOString()
  };

  io.to(downloadId).emit('download:error', eventData);
  
  console.log(`[Socket] 다운로드 오류: ${downloadId}, 오류: ${error}`);
}

/**
 * 플레이리스트 항목 진행 이벤트 발송
 */
export function emitPlaylistItemProgress(
  downloadId: string, 
  itemIndex: number, 
  totalItems: number, 
  itemTitle: string, 
  itemProgress: number
) {
  if (!io) {
    console.log('[Socket] Socket.io 서버가 초기화되지 않았습니다.');
    return;
  }

  const eventData: PlaylistItemProgressData = {
    id: downloadId,
    itemIndex,
    totalItems,
    itemTitle,
    itemProgress,
    timestamp: new Date().toISOString()
  };

  io.to(downloadId).emit('playlist:item-progress', eventData);
  
  console.log(`[Socket] 플레이리스트 항목 진행: ${downloadId}, 항목 ${itemIndex+1}/${totalItems}, ${itemProgress}%`);
}

/**
 * 플레이리스트 항목 완료 이벤트 발송
 */
export function emitPlaylistItemComplete(
  downloadId: string, 
  itemIndex: number, 
  totalItems: number, 
  fileId: string, 
  fileData: File
) {
  if (!io) {
    console.log('[Socket] Socket.io 서버가 초기화되지 않았습니다.');
    return;
  }

  const eventData: PlaylistItemCompleteData = {
    id: downloadId,
    itemIndex,
    totalItems,
    fileId,
    fileData,
    timestamp: new Date().toISOString()
  };

  io.to(downloadId).emit('playlist:item-complete', eventData);
  
  console.log(`[Socket] 플레이리스트 항목 완료: ${downloadId}, 항목 ${itemIndex+1}/${totalItems}`);
}

export default io; 