// Socket.io 모듈을 위한 타입 정의

declare module 'socket.io' {
  import { Server as HttpServer } from 'http';
  
  export class Server {
    constructor(httpServer?: HttpServer, options?: any);
    
    on(event: string, listener: Function): this;
    emit(event: string, ...args: any[]): boolean;
    
    to(room: string): { emit: (event: string, ...args: any[]) => boolean };
    in(room: string): { emit: (event: string, ...args: any[]) => boolean };
    
    use(fn: (socket: Socket, next: (err?: Error) => void) => void): this;
  }
  
  export interface Socket {
    id: string;
    connected: boolean;
    
    join(room: string): void;
    leave(room: string): void;
    
    on(event: string, listener: Function): this;
    emit(event: string, ...args: any[]): boolean;
    off(event: string, listener?: Function): this;
    
    disconnect(close?: boolean): void;
  }
  
  export interface DownloadStatusData {
    id: string;
    status: string;
    progress: number;
    data?: any;
    timestamp: string;
  }
  
  export interface DownloadCompleteData {
    id: string;
    fileId: string;
    fileData: any;
    timestamp: string;
  }
  
  export interface DownloadErrorData {
    id: string;
    error: string;
    timestamp: string;
  }
  
  export interface PlaylistItemProgressData {
    id: string;
    itemIndex: number;
    totalItems: number;
    itemTitle: string;
    itemProgress: number;
    timestamp: string;
  }
  
  export interface PlaylistItemCompleteData {
    id: string;
    itemIndex: number;
    totalItems: number;
    fileId: string;
    fileData: any;
    timestamp: string;
  }
}

declare module 'socket.io-client' {
  export function io(uri: string, opts?: any): Socket;
  
  export interface Socket {
    id: string;
    connected: boolean;
    
    on(event: string, listener: Function): this;
    off(event: string, listener?: Function): this;
    
    emit(event: string, ...args: any[]): this;
    
    disconnect(): void;
  }
  
  // 이벤트 데이터 인터페이스 - 서버와 동일한 구조
  export interface DownloadStatusData {
    id: string;
    status: string;
    progress: number;
    data?: any;
    timestamp: string;
  }
  
  export interface DownloadCompleteData {
    id: string;
    fileId: string;
    fileData: any;
    timestamp: string;
  }
  
  export interface DownloadErrorData {
    id: string;
    error: string;
    timestamp: string;
  }
  
  export interface PlaylistItemProgressData {
    id: string;
    itemIndex: number;
    totalItems: number;
    itemTitle: string;
    itemProgress: number;
    timestamp: string;
  }
  
  export interface PlaylistItemCompleteData {
    id: string;
    itemIndex: number;
    totalItems: number;
    fileId: string;
    fileData: any;
    timestamp: string;
  }
} 