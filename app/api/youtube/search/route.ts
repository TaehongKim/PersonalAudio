import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { spawn } from 'child_process'
import path from 'path'

const YTDLP_PATH = path.join(process.cwd(), 'bin', 'yt-dlp')

interface SearchResult {
  id: string
  title: string
  uploader: string
  duration: string
  view_count: number
  url: string
  thumbnail: string
  description: string
}

// yt-dlp로 YouTube 검색
async function searchYoutube(query: string, maxResults = 10): Promise<SearchResult[]> {
  return new Promise((resolve, reject) => {
    const searchQuery = `ytsearch${maxResults}:${query}`
    
    const ytdlpProcess = spawn(YTDLP_PATH, [
      '--dump-json',
      '--no-download',
      '--flat-playlist',
      searchQuery
    ])

    let stdout = ''
    let stderr = ''

    ytdlpProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    ytdlpProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    ytdlpProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('yt-dlp 검색 오류:', stderr)
        reject(new Error(`검색 실패: ${stderr}`))
        return
      }

      try {
        const lines = stdout.trim().split('\n').filter(line => line.trim())
        const results: SearchResult[] = []

        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            
            // 플레이리스트 항목은 제외하고 실제 비디오만
            if (data._type === 'video' || (!data._type && data.id)) {
              results.push({
                id: data.id,
                title: data.title || '제목 없음',
                uploader: data.uploader || data.channel || '알 수 없음',
                duration: formatDuration(data.duration),
                view_count: data.view_count || 0,
                url: `https://www.youtube.com/watch?v=${data.id}`,
                thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || '',
                description: data.description || ''
              })
            }
          } catch {
            console.warn('JSON 파싱 중 오류 발생')
          }
        }

        resolve(results)
      } catch {
        reject(new Error('검색 결과 파싱 실패'))
      }
    })
  })
}

// 초 단위 시간을 "MM:SS" 형식으로 변환
function formatDuration(seconds: number | null): string {
  if (!seconds) return '알 수 없음'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// 조회수를 읽기 쉬운 형태로 변환
function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const maxResults = parseInt(searchParams.get('limit') || '10')

    if (!query) {
      return NextResponse.json({ error: '검색어가 필요합니다.' }, { status: 400 })
    }

    if (maxResults > 20) {
      return NextResponse.json({ error: '최대 20개 결과까지 가능합니다.' }, { status: 400 })
    }

    console.log(`YouTube 검색: "${query}" (최대 ${maxResults}개)`)
    
    const results = await searchYoutube(query, maxResults)
    
    // 조회수 포맷팅 추가
    const formattedResults = results.map(result => ({
      ...result,
      view_count_formatted: formatViewCount(result.view_count)
    }))

    return NextResponse.json({
      success: true,
      data: {
        query,
        results: formattedResults,
        total: formattedResults.length
      }
    })
  } catch (error) {
    console.error('YouTube 검색 오류:', error)
    return NextResponse.json(
      { 
        error: 'YouTube 검색 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    )
  }
} 