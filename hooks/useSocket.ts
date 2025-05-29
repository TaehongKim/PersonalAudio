'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSocket, isSocketConnected, destroySocket } from '@/lib/socket-client'
import type { Socket } from 'socket.io-client'

// 이벤트 데이터 타입 정의
interface DownloadStatusData {
  id: string
  status: string
  progress: number
  data?: any
  timestamp: string
}

interface DownloadCompleteData {
  id: string
  fileId: string
  fileData: any
  timestamp: string
}

interface DownloadErrorData {
  id: string
  error: string
  timestamp: string
}

interface PlaylistItemProgressData {
  id: string
  itemIndex: number
  totalItems: number
  itemTitle: string
  itemProgress: number
  timestamp: string
}

interface PlaylistItemCompleteData {
  id: string
  itemIndex: number
  totalItems: number
  fileId: string
  fileData: any
  timestamp: string
}

/**
 * Socket.io 클라이언트를 관리하는 커스텀 훅
 * 싱글턴 패턴으로 소켓 인스턴스를 관리하여 중복 연결 방지
 */
export function useSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const subscribedRoomsRef = useRef<Set<string>>(new Set())

  // 소켓 초기화
  useEffect(() => {
    try {
      const socket = getSocket()
      socketRef.current = socket
      
      // 연결 상태 동기화
      setIsConnected(socket.connected)

      // 이벤트 리스너 등록
      const handleConnect = () => {
        setIsConnected(true)
        setError(null)
        console.log('useSocket: 연결됨')
      }

      const handleDisconnect = () => {
        setIsConnected(false)
        console.log('useSocket: 연결 해제됨')
      }

      const handleConnectError = (err: Error) => {
        setError(err.message)
        console.error('useSocket: 연결 오류:', err)
      }

      socket.on('connect', handleConnect)
      socket.on('disconnect', handleDisconnect)
      socket.on('connect_error', handleConnectError)

      // 정리 함수
      return () => {
        socket.off('connect', handleConnect)
        socket.off('disconnect', handleDisconnect)
        socket.off('connect_error', handleConnectError)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '소켓 초기화 실패')
    }
  }, [])

  // 이벤트 리스너 등록
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    const socket = socketRef.current
    if (!socket) return () => {}

    socket.on(event, callback)
    return () => socket.off(event, callback)
  }, [])

  // 이벤트 발송
  const emit = useCallback((event: string, ...args: any[]) => {
    const socket = socketRef.current
    if (!socket) {
      console.warn('소켓이 연결되지 않았습니다.')
      return false
    }
    
    return socket.emit(event, ...args)
  }, [])

  // 다운로드 상태 구독
  const subscribeToDownload = useCallback((downloadId: string) => {
    const socket = socketRef.current
    if (!socket || !downloadId) return

    const room = `download:${downloadId}`
    if (!subscribedRoomsRef.current.has(room)) {
      socket.emit('join', room)
      subscribedRoomsRef.current.add(room)
      console.log('다운로드 구독:', room)
    }
  }, [])

  // 다운로드 상태 구독 해제
  const unsubscribeFromDownload = useCallback((downloadId: string) => {
    const socket = socketRef.current
    if (!socket || !downloadId) return

    const room = `download:${downloadId}`
    if (subscribedRoomsRef.current.has(room)) {
      socket.emit('leave', room)
      subscribedRoomsRef.current.delete(room)
      console.log('다운로드 구독 해제:', room)
    }
  }, [])

  return {
    socket: socketRef.current,
    isConnected,
    error,
    on,
    emit,
    subscribeToDownload,
    unsubscribeFromDownload
  }
}

/**
 * 다운로드 상태를 실시간으로 추적하는 커스텀 훅
 */
export function useDownloadStatus(downloadId: string | null) {
  const { socket, isConnected, subscribeToDownload, unsubscribeFromDownload, on } = useSocket()
  const [status, setStatus] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [playlistItems, setPlaylistItems] = useState<any[]>([])

  // 구독 설정
  useEffect(() => {
    if (!downloadId || !isConnected) return

    // 다운로드 ID 구독
    subscribeToDownload(downloadId)

    // 상태 업데이트 이벤트 리스너
    const statusCleanup = on('download:status', (data: DownloadStatusData) => {
      if (data.id === downloadId) {
        setStatus(data.status)
        setProgress(data.progress)
        if (data.data) setData(data.data)
      }
    })

    // 오류 이벤트 리스너
    const errorCleanup = on('download:error', (data: DownloadErrorData) => {
      if (data.id === downloadId) {
        setError(data.error)
      }
    })

    // 플레이리스트 항목 진행 이벤트 리스너
    const playlistItemProgressCleanup = on('playlist:item-progress', (data: PlaylistItemProgressData) => {
      if (data.id === downloadId) {
        setPlaylistItems((prev) => {
          // 이미 있는 항목이면 업데이트, 없으면 추가
          const index = prev.findIndex(item => item.index === data.itemIndex)
          if (index >= 0) {
            const newItems = [...prev]
            newItems[index] = {
              ...newItems[index],
              progress: data.itemProgress,
              title: data.itemTitle,
              updatedAt: data.timestamp
            }
            return newItems
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
            }]
          }
        })
      }
    })

    // 플레이리스트 항목 완료 이벤트 리스너
    const playlistItemCompleteCleanup = on('playlist:item-complete', (data: PlaylistItemCompleteData) => {
      if (data.id === downloadId) {
        setPlaylistItems((prev) => {
          // 이미 있는 항목이면 업데이트, 없으면 추가
          const index = prev.findIndex(item => item.index === data.itemIndex)
          if (index >= 0) {
            const newItems = [...prev]
            newItems[index] = {
              ...newItems[index],
              progress: 100,
              status: 'completed',
              fileId: data.fileId,
              fileData: data.fileData,
              updatedAt: data.timestamp
            }
            return newItems
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
            }]
          }
        })
      }
    })

    // 컴포넌트 언마운트 시 정리
    return () => {
      unsubscribeFromDownload(downloadId)
      statusCleanup()
      errorCleanup()
      playlistItemProgressCleanup()
      playlistItemCompleteCleanup()
    }
  }, [downloadId, isConnected, subscribeToDownload, unsubscribeFromDownload, on])

  return {
    status,
    progress,
    error,
    data,
    playlistItems,
    isConnected
  }
}

/**
 * 페이지 언마운트 시 소켓 정리를 위한 훅
 */
export function useSocketCleanup() {
  useEffect(() => {
    return () => {
      // 페이지 언마운트 시에만 소켓 완전 종료
      if (typeof window !== 'undefined') {
        destroySocket()
      }
    }
  }, [])
} 