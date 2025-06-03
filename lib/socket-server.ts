import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { DownloadStatus } from '../types/download-status';

// 타입 정의
interface DownloadStatusData {
  id: string;
  status: DownloadStatus;
  progress: number;
  data?: Record<string, unknown>;
  timestamp: string;
  fileId?: string;
}

// Prisma File 모델 구조 기반 타입 정의
export type FileRecord = {
  id: string;
  title: string;
  artist?: string | null;
  fileType: string;
  fileSize: number;
  duration?: number | null;
  path: string;
  thumbnailPath?: string | null;
  sourceUrl?: string | null;
  groupType?: string | null;
  groupName?: string | null;
  rank?: number | null;
  createdAt: Date;
  updatedAt: Date;
  downloads: number;
};

interface DownloadCompleteData {
  id: string;
  fileId: string;
  fileData: FileRecord;
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
  fileData: FileRecord;
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

  console.log('🚀 Socket.IO 서버 초기화 시작...');

  io = new Server(httpServer, {
    path: '/api/socket',
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? false // 프로덕션에서는 동일 origin만 허용
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    maxHttpBufferSize: 1e6,
    allowUpgrades: true
  });
  globalThis.io = io;

  // 연결 이벤트 핸들러
  io.on('connection', (socket: Socket) => {
    console.log(`✅ [Socket] 클라이언트 연결됨: ${socket.id}`);

    // 다운로드 ID 구독 (기존 subscribe)
    socket.on('subscribe', (downloadId: string) => {
      console.log(`📡 [Socket] 클라이언트 ${socket.id}가 다운로드 ID ${downloadId}를 구독합니다.`);
      socket.join(downloadId);
    });

    // join 이벤트도 처리 (호환성)
    socket.on('join', (room: string) => {
      console.log(`🔗 [Socket] 클라이언트 ${socket.id}가 방 ${room}에 참가합니다.`);
      socket.join(room);
    });

    // leave 이벤트 처리
    socket.on('leave', (room: string) => {
      console.log(`👋 [Socket] 클라이언트 ${socket.id}가 방 ${room}에서 나갑니다.`);
      socket.leave(room);
    });

    // 구독 취소
    socket.on('unsubscribe', (downloadId: string) => {
      console.log(`❌ [Socket] 클라이언트 ${socket.id}가 다운로드 ID ${downloadId} 구독을 취소합니다.`);
      socket.leave(downloadId);
    });

    // 연결 오류 처리
    socket.on('error', (error: Error) => {
      console.error(`🔥 [Socket] 클라이언트 ${socket.id} 오류:`, error.message);
    });

    // 연결 종료
    socket.on('disconnect', (reason: string) => {
      console.log(`💔 [Socket] 클라이언트 연결 종료: ${socket.id}, 이유: ${reason}`);
    });
  });

  // 서버 레벨 오류 처리
  (io as any).engine.on('connection_error', (err: any) => {
    console.error('⚠️ [Socket] 연결 오류:', err.req, err.code, err.message, err.context);
  });

  console.log('✅ [Socket] Socket.io 서버 초기화 완료');
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
export function emitDownloadComplete(downloadId: string, fileId: string, fileData: FileRecord) {
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
  fileData: FileRecord
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