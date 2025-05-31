import { getSocketServer } from '@/lib/socket-server'

export async function GET() {
  console.log('🔍 Socket.IO API 경로 접근됨')
  
  // Socket.IO 서버가 초기화되어 있는지 확인
  const io = getSocketServer()
  if (!io) {
    console.error('❌ Socket.IO 서버가 초기화되지 않았습니다.')
    return new Response('Socket.IO server not initialized', { status: 500 })
  }

  console.log('✅ Socket.IO 서버가 활성화되어 있습니다.')
  return new Response('Socket.IO is running', { status: 200 })
}

export async function POST() {
  return GET()
} 