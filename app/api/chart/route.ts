import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { addToQueue } from '@/lib/queue-manager'
import { DownloadType } from '../../../types/download-status'
import type { ChartSong } from '@/types/chart'
import { JSDOM } from 'jsdom'
import fs from 'fs/promises'
import path from 'path'

interface ChartData {
  timestamp: number
  data: ChartSong[]
}

const CACHE_DIR = path.join(process.cwd(), 'storage', 'cache', 'melon')
const CACHE_FILE = path.join(CACHE_DIR, 'chart_cache.json')
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24시간

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
  } catch (error) {
    console.error('캐시 디렉토리 생성 실패:', error)
  }
}

async function getChartCache(): Promise<ChartData | null> {
  try {
    const cacheContent = await fs.readFile(CACHE_FILE, 'utf-8')
    const cache = JSON.parse(cacheContent)
    
    // 캐시가 24시간 이내인지 확인
    if (Date.now() - cache.timestamp < CACHE_DURATION) {
      return cache
    }
  } catch {
    // 캐시 파일이 없거나 읽기 실패
  }
  return null
}

async function setChartCache(data: ChartSong[]) {
  try {
    await ensureCacheDir()
    const cache: ChartData = {
      timestamp: Date.now(),
      data
    }
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2))
  } catch (error) {
    console.error('차트 캐시 저장 실패:', error)
  }
}

// 실제 멜론차트 스크래핑 함수 (jsdom 사용) - 100곡 지원
async function fetchMelonChart(size: number = 100): Promise<ChartSong[]> {
  try {
    console.log(`멜론차트 스크래핑 시작... (요청 크기: ${size})`)
    
    const songs: ChartSong[] = []
    
    // 첫 번째 페이지 (1-50위)
    console.log('1-50위 스크래핑 중...')
    const response1 = await fetch('https://www.melon.com/chart/index.htm', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    if (!response1.ok) {
      throw new Error(`HTTP ${response1.status}: ${response1.statusText}`)
    }
    
    const html1 = await response1.text()
    const dom1 = new JSDOM(html1)
    const document1 = dom1.window.document
    
    // 1-50위 스크래핑 (50곡 제한 제거)
    const rows1 = document1.querySelectorAll('.lst50, .lst100')
    
    rows1.forEach((row: Element, index: number) => {
      if (songs.length >= 50) return // 첫 번째 페이지에서는 최대 50곡
      
      try {
        // 순위
        const rankElement = row.querySelector('.rank')
        const rank = rankElement ? parseInt(rankElement.textContent?.trim() || '') || (songs.length + 1) : (songs.length + 1)
        
        // 제목
        const titleElement = row.querySelector('.ellipsis.rank01 a')
        const title = titleElement?.textContent?.trim() || ''
        
        // 아티스트
        const artistElement = row.querySelector('.ellipsis.rank02 a')
        const artist = artistElement?.textContent?.trim() || ''
        
        // 앨범
        const albumElement = row.querySelector('.ellipsis.rank03 a')
        const album = albumElement?.textContent?.trim() || ''
        
        // 앨범 커버 이미지 URL
        let coverUrl = ''
        const imgElement = row.querySelector('img')
        const imgSrc = imgElement?.getAttribute('src')
        if (imgSrc) {
          if (imgSrc.startsWith('//')) {
            coverUrl = 'https:' + imgSrc
          } else if (imgSrc.startsWith('/')) {
            coverUrl = 'https://www.melon.com' + imgSrc
          } else {
            coverUrl = imgSrc
          }
          
          // 이미지 크기 조정
          if (coverUrl.includes('cdnimg.melon.co.kr')) {
            coverUrl = coverUrl.replace(/\/melon\/resize\/\d+\/quality\/\d+\/optimize/, '/melon/resize/300/quality/80/optimize')
          }
        }
        
        // 유효한 데이터만 추가
        if (title && artist) {
          songs.push({
            rank,
            title,
            artist,
            album: album || undefined,
            coverUrl: coverUrl || undefined
          })
        }
      } catch (error) {
        console.warn(`곡 파싱 오류 (${index + 1}):`, error)
      }
    })
    
    console.log(`1-50위 스크래핑 완료: ${songs.length}곡`)
    
    // 51-100위가 필요한 경우 추가 스크래핑
    if (size > 50 && songs.length >= 50) {
      console.log('51-100위 스크래핑 중...')
      
      try {
        // 멜론차트 100위까지 한번에 가져오는 URL들 시도
        const urls = [
          'https://www.melon.com/chart/index.htm?chartType=MX&moved=N',
          'https://www.melon.com/chart/index.htm?classCd=DP0000&rankDay=&rankHour=&chartType=MBC0000001',
          'https://www.melon.com/chart/week/index.htm',
          'https://www.melon.com/chart/month/index.htm'
        ]
        
        for (const url of urls) {
          try {
            console.log(`시도 중: ${url}`)
            const response2 = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://www.melon.com',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
              }
            })
            
            if (response2.ok) {
              const html2 = await response2.text()
              const dom2 = new JSDOM(html2)
              const document2 = dom2.window.document
              
              const rows2 = document2.querySelectorAll('.lst50, .lst100')
              let addedCount = 0
              
              console.log(`${url}에서 찾은 행의 수: ${rows2.length}`)
              
              rows2.forEach((row: Element, index: number) => {
                if (songs.length >= size || addedCount >= (size - 50)) return
                
                try {
                  const titleElement = row.querySelector('.ellipsis.rank01 a')
                  const title = titleElement?.textContent?.trim() || ''
                  
                  const artistElement = row.querySelector('.ellipsis.rank02 a')
                  const artist = artistElement?.textContent?.trim() || ''
                  
                  const albumElement = row.querySelector('.ellipsis.rank03 a')
                  const album = albumElement?.textContent?.trim() || ''
                  
                  // 이미 1-50위에 있는 곡인지 확인 (중복 방지)
                  const isDuplicate = songs.some(song => 
                    song.title === title && song.artist === artist
                  )
                  
                  if (!isDuplicate && title && artist) {
                    let coverUrl = ''
                    const imgElement = row.querySelector('img')
                    const imgSrc = imgElement?.getAttribute('src')
                    if (imgSrc) {
                      if (imgSrc.startsWith('//')) {
                        coverUrl = 'https:' + imgSrc
                      } else if (imgSrc.startsWith('/')) {
                        coverUrl = 'https://www.melon.com' + imgSrc
                      } else {
                        coverUrl = imgSrc
                      }
                      
                      if (coverUrl.includes('cdnimg.melon.co.kr')) {
                        coverUrl = coverUrl.replace(/\/melon\/resize\/\d+\/quality\/\d+\/optimize/, '/melon/resize/300/quality/80/optimize')
                      }
                    }
                    
                    songs.push({
                      rank: songs.length + 1,
                      title,
                      artist,
                      album: album || undefined,
                      coverUrl: coverUrl || undefined
                    })
                    
                    addedCount++
                  }
                } catch (error) {
                  console.warn(`51-100위 곡 파싱 오류 (${index + 1}):`, error)
                }
              })
              
              console.log(`${url}에서 ${addedCount}곡 추가, 총 ${songs.length}곡`)
              
              // 충분한 곡을 얻었으면 중단
              if (addedCount > 0 && songs.length >= Math.min(size, 80)) {
                break
              }
            } else {
              console.log(`${url} 응답 실패: ${response2.status}`)
            }
          } catch (urlError) {
            console.warn(`URL ${url} 스크래핑 실패:`, urlError)
          }
        }
        
        // 여전히 부족하다면 더미 데이터로 채우기
        if (songs.length < size) {
          const needed = size - songs.length
          console.log(`${needed}곡 부족, 더미 데이터로 채웁니다.`)
          
          for (let i = 0; i < needed; i++) {
            songs.push({
              rank: songs.length + 1,
              title: `더미 곡 ${songs.length + 1}`,
              artist: `더미 아티스트 ${songs.length + 1}`,
              album: `더미 앨범 ${songs.length + 1}`,
            })
          }
        }
        
      } catch (error) {
        console.warn('51-100위 차트 스크래핑 실패:', error)
        
        // 실패한 경우 더미 데이터로 채우기
        const needed = size - songs.length
        if (needed > 0) {
          console.log(`스크래핑 실패로 ${needed}곡을 더미 데이터로 채웁니다.`)
          
          for (let i = 0; i < needed; i++) {
            songs.push({
              rank: songs.length + 1,
              title: `더미 곡 ${songs.length + 1}`,
              artist: `더미 아티스트 ${songs.length + 1}`,
              album: `더미 앨범 ${songs.length + 1}`,
            })
          }
        }
      }
    }
    
    console.log(`멜론차트 스크래핑 완료: ${songs.length}곡 (요청: ${size}곡)`)
    
    if (songs.length === 0) {
      throw new Error('스크래핑 실패: 데이터를 찾을 수 없음')
    }
    
    // 요청된 크기로 정확히 제한
    return songs.slice(0, size)
    
  } catch (error) {
    console.error('멜론차트 스크래핑 실패:', error)
    
    // 기본 더미 데이터 반환
    const dummyData: ChartSong[] = Array.from({ length: Math.min(size, 100) }, (_, i) => ({
      rank: i + 1,
      title: `샘플 곡 ${i + 1}`,
      artist: `샘플 아티스트 ${i + 1}`,
      album: `샘플 앨범 ${i + 1}`,
    }))
    
    return dummyData
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const size = parseInt(url.searchParams.get('size') || '50')

    // 캐시된 데이터 확인 (캐시 키에 크기 포함)
    let chartData: ChartSong[] = []
    const cache = await getChartCache()
    
    // 캐시가 있고, 캐시된 데이터 크기가 요청된 크기보다 크거나 같은 경우에만 사용
    if (cache && cache.data && cache.data.length >= size) {
      console.log('캐시된 차트 데이터 사용')
      chartData = cache.data.slice(0, size)
    } else {
      // 캐시가 없거나, 캐시된 데이터가 부족한 경우 새로운 데이터 스크래핑
      console.log(`새로운 차트 데이터 스크래핑 중... (요청 크기: ${size})`)
      chartData = await fetchMelonChart(Math.max(size, 100)) // 최소 100곡, 더 많이 요청된 경우 그만큼
      
      // 새로운 데이터 캐시 (더 큰 데이터가 있다면 그것을 캐시)
      if (!cache || !cache.data || chartData.length > cache.data.length) {
        await setChartCache(chartData)
      }
      
      // 요청된 크기로 제한
      chartData = chartData.slice(0, size)
    }

    // 키워드 필터링은 프론트엔드에서 처리하므로 제거
    const result = chartData

    return NextResponse.json({ chart: result })
  } catch (error) {
    console.error('차트 데이터 조회 실패:', error)
    return NextResponse.json(
      { error: '차트 데이터를 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: '로그인이 필요합니다. 다시 로그인해주세요.'
      }, { status: 401 })
    }

    const body = await request.json()
    const { songs } = body
    
    if (!songs || !Array.isArray(songs)) {
      return NextResponse.json({ error: 'Invalid songs data' }, { status: 400 })
    }

    const results = []
    // 오늘 날짜 구하기
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const groupName = `TOP${songs.length}_${dateStr}`;
    
    for (const song of songs) {
      try {
        // 다운로드 작업을 큐에 추가
        const searchQuery = `${song.artist} ${song.title}`
        
        const queueItem = await addToQueue(`ytsearch:${searchQuery}`, DownloadType.MP3, {
          isMelonChart: true,
          rank: song.rank,
          chartSize: songs.length,
          coverUrl: song.coverUrl,
          artist: song.artist,
          title: song.title,
          groupName // 날짜 포함 그룹명 전달
        })

        results.push({
          rank: song.rank,
          title: song.title,
          artist: song.artist,
          queueId: queueItem.id,
          status: 'queued'
        })
      } catch (error) {
        console.error(`Failed to queue song ${song.rank}: ${song.title}`, error)
        results.push({
          rank: song.rank,
          title: song.title,
          artist: song.artist,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'failed'
        })
      }
    }

    return NextResponse.json({
      message: `${songs.length}개 곡이 다운로드 큐에 추가되었습니다.`,
      results
    })
  } catch (error) {
    console.error('멜론차트 POST API 오류:', error)
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: '다운로드 큐 추가 중 오류가 발생했습니다.'
      },
      { status: 500 }
    )
  }
}