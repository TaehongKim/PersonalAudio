import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCacheHitRatio, getCacheStats } from '@/lib/file-cache'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 캐시 Hit Ratio와 기본 캐시 정보 조회
    const [hitRatioStats, cacheInfo] = await Promise.all([
      getCacheHitRatio(),
      getCacheStats()
    ])

    return NextResponse.json({
      hitRatio: hitRatioStats,
      cache: {
        ...cacheInfo,
        totalSizeMB: (cacheInfo.totalSize / 1024 / 1024),
        temporarySizeMB: (cacheInfo.temporarySize / 1024 / 1024)
      }
    })
  } catch (error) {
    console.error('캐시 통계 조회 오류:', error)
    return NextResponse.json(
      { error: '캐시 통계를 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
} 