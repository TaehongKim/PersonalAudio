'use client'

import { io, Socket } from "socket.io-client";

// 소켓 인스턴스를 전역에서 관리
let socketInstance: Socket | null = null;

/**
 * 소켓 인스턴스를 싱글턴으로 관리하는 함수
 * 중복 연결을 방지하고 재사용 가능한 소켓 인스턴스를 반환
 */
export function getSocket(): Socket {
  if (!socketInstance || !socketInstance.connected) {
    // 기존 소켓이 있으면 정리
    if (socketInstance) {
      socketInstance.disconnect();
    }

    // 새로운 소켓 인스턴스 생성
    socketInstance = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: false, // 기존 연결 재사용
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
      withCredentials: true
    });

    // 연결 상태 로깅
    socketInstance.on('connect', () => {
      console.log('소켓 연결됨:', socketInstance?.id);
    });

    socketInstance.on('disconnect', (reason: string) => {
      console.log('소켓 연결 해제:', reason);
    });

    socketInstance.on('connect_error', (error: Error) => {
      console.error('소켓 연결 오류:', error);
    });
  }

  return socketInstance;
}

/**
 * 소켓 연결을 완전히 종료하는 함수
 * 페이지 언마운트 시에만 사용
 */
export function destroySocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

/**
 * 현재 소켓 연결 상태를 확인하는 함수
 */
export function isSocketConnected(): boolean {
  return socketInstance?.connected || false;
} 