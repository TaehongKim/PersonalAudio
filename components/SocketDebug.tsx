'use client'

import { useSocket } from '@/hooks/useSocket'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SocketDebug() {
  const { socket, isConnected, error } = useSocket()
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    if (!socket) return

    const addLog = (message: string) => {
      setLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`])
    }

    const handleConnect = () => addLog('✅ 연결됨')
    const handleDisconnect = (reason: string) => addLog(`❌ 연결 해제: ${reason}`)
    const handleConnectError = (err: Error) => addLog(`🔥 연결 오류: ${err.message}`)
    const handleReconnect = (attemptNumber: number) => addLog(`🔄 재연결 성공: ${attemptNumber}`)

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.on('reconnect', handleReconnect)

    addLog('🚀 Socket 리스너 등록됨')

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.off('reconnect', handleReconnect)
    }
  }, [socket])

  return (
    <Card className="bg-gray-900 border-gray-700 text-white">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          Socket.IO 디버그
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "연결됨" : "연결 안됨"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-xs">
            <strong>Socket ID:</strong> {socket?.id || 'N/A'}
          </div>
          {error && (
            <div className="text-xs text-red-400">
              <strong>오류:</strong> {error.message}
            </div>
          )}
          <div className="text-xs">
            <strong>로그:</strong>
            <div className="mt-1 max-h-32 overflow-y-auto bg-black/20 p-2 rounded">
              {logs.length === 0 ? (
                <div className="text-gray-500">로그 없음</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-xs">{log}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 