import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { addToQueue } from '@/lib/queue-manager'
import { DownloadType } from '@/lib/downloader'
import * as cheerio from 'cheerio'

interface ChartSong {
  rank: number
  title: string
  artist: string
  album?: string
  coverUrl?: string
  duration?: string
}

// 실제 멜론차트 스크래핑 함수
async function fetchMelonChart(size: number = 100): Promise<ChartSong[]> {
  try {
    console.log('멜론차트 스크래핑 시작...')
    
    // 멜론 차트 페이지의 실제 구조에 맞춰 수정
    const response = await fetch('https://www.melon.com/chart/index.htm', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    const songs: ChartSong[] = []
    
    // 멜론차트의 실제 구조에 맞춰 선택자 수정
    $('tbody tr').each((index, element) => {
      if (index >= size) return false
      
      const $row = $(element)
      
      // 순위 추출 - 다양한 선택자 시도
      let rank = index + 1
      const rankSelectors = ['.rank', '.rank strong', 'td:first-child', '.rank01']
      for (const sel of rankSelectors) {
        const rankText = $row.find(sel).text().trim()
        const parsedRank = parseInt(rankText)
        if (parsedRank && parsedRank > 0) {
          rank = parsedRank
          break
        }
      }
      
      // 제목 추출 - 다양한 선택자 시도  
      let title = ''
      const titleSelectors = [
        '.ellipsis.rank01 a',
        '.wrap_song_info .ellipsis a',
        'a[href*="song/detail"]',
        '.song_name a'
      ]
      for (const sel of titleSelectors) {
        const t = $row.find(sel).text().trim()
        if (t) {
          title = t
          break
        }
      }
      
      // 아티스트 추출
      let artist = ''
      const artistSelectors = [
        '.ellipsis.rank02 a',
        '.artist a',
        'a[href*="artist/detail"]'
      ]
      for (const sel of artistSelectors) {
        const a = $row.find(sel).text().trim() 
        if (a) {
          artist = a
          break
        }
      }
      
      // 앨범 정보 추출
      let album = ''
      const albumSelectors = [
        '.ellipsis.rank03 a',
        '.album a',
        'a[href*="album/detail"]'
      ]
      for (const sel of albumSelectors) {
        const alb = $row.find(sel).text().trim()
        if (alb) {
          album = alb
          break
        }
      }
      
      // 앨범 커버 이미지 URL 추출
      let coverUrl = ''
      const imgElement = $row.find('img').first()
      if (imgElement.length > 0) {
        const src = imgElement.attr('src')
        if (src) {
          if (src.startsWith('//')) {
            coverUrl = 'https:' + src
          } else if (src.startsWith('/')) {
            coverUrl = 'https://www.melon.com' + src
          } else if (src.startsWith('http')) {
            coverUrl = src
          }
          
          // 이미지 크기를 더 크게 조정
          if (coverUrl.includes('cdnimg.melon.co.kr')) {
            coverUrl = coverUrl.replace(/\/melon\/resize\/\d+\/quality\/\d+\/optimize/, '/melon/resize/300/quality/80/optimize')
          }
        }
      }
      
      // 유효한 데이터가 있을 때만 추가
      if (title && artist) {
        songs.push({
          rank,
          title,
          artist,
          album: album || undefined,
          coverUrl: coverUrl || undefined,
          duration: undefined
        })
        
        console.log(`곡 ${rank}: ${title} - ${artist} (커버: ${coverUrl ? '있음' : '없음'})`)
      }
    })
    
    console.log(`멜론차트 스크래핑 완료: ${songs.length}곡`)
    console.log('첫 3곡 샘플:', songs.slice(0, 3))
    
    // 스크래핑 결과가 없으면 백업 데이터 사용
    if (songs.length === 0) {
      console.log('스크래핑 실패, 백업 데이터 사용')
      return getMockChartData(size)
    }
    
    return songs.slice(0, size)
    
  } catch (error) {
    console.error('멜론차트 스크래핑 오류:', error)
    
    // 스크래핑 실패시 백업 데이터 반환
    console.log('스크래핑 실패, 백업 데이터 사용')
    return getMockChartData(size)
  }
}

// 백업용 더미 데이터 (스크래핑 실패시 사용)
function getMockChartData(size: number = 100): ChartSong[] {
  const mockData: ChartSong[] = [
    { rank: 1, title: "Never Ending Story", artist: "아이유", album: "꽃갈피 셋", duration: "3:05", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/101/61/648/10161648_20190219180710_300.jpg" },
    { rank: 2, title: "너에게 닿기를", artist: "10CM", album: "너에게 닿기를", duration: "2:58", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/109/88/992/10988992_20221031160258_300.jpg" },
    { rank: 3, title: "사건의 지평선", artist: "윤하 (YOUNHA)", album: "YOUNHA 6th Album 'END THEORY'", duration: "4:12", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/108/30/804/10830804_20220221104308_300.jpg" },
    { rank: 4, title: "ANTIFRAGILE", artist: "LE SSERAFIM (르세라핌)", album: "ANTIFRAGILE", duration: "3:26", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/111/50/014/11150014_20221017143808_300.jpg" },
    { rank: 5, title: "Attention", artist: "NewJeans", album: "NewJeans 1st EP 'New Jeans'", duration: "3:01", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/110/14/867/11014867_20220801111055_300.jpg" },
    { rank: 6, title: "Nxde", artist: "(여자)아이들", album: "I love", duration: "2:55", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/111/44/553/11144553_20221017100307_300.jpg" },
    { rank: 7, title: "After LIKE", artist: "IVE (아이브)", album: "After LIKE", duration: "2:55", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/110/30/902/11030902_20220822180808_300.jpg" },
    { rank: 8, title: "Shut Down", artist: "BLACKPINK", album: "BORN PINK", duration: "2:54", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/110/93/482/11093482_20220916100308_300.jpg" },
    { rank: 9, title: "Pink Venom", artist: "BLACKPINK", album: "BORN PINK", duration: "3:06", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/110/93/482/11093482_20220916100308_300.jpg" },
    { rank: 10, title: "Monologue", artist: "테이 (Tei)", album: "Monologue", duration: "4:33", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/109/97/855/10997855_20221114100308_300.jpg" },
    { rank: 11, title: "OMG", artist: "NewJeans", album: "NewJeans 'OMG'", duration: "3:35", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/112/15/470/11215470_20230102110408_300.jpg" },
    { rank: 12, title: "Cookie", artist: "NewJeans", album: "NewJeans 1st EP 'New Jeans'", duration: "3:55", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/110/14/867/11014867_20220801111055_300.jpg" },
    { rank: 13, title: "LOVE DIVE", artist: "IVE (아이브)", album: "LOVE DIVE", duration: "2:57", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/108/73/508/10873508_20220405100408_300.jpg" },
    { rank: 14, title: "FEARLESS", artist: "LE SSERAFIM (르세라핌)", album: "FEARLESS", duration: "2:48", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/108/54/262/10854262_20220502100708_300.jpg" },
    { rank: 15, title: "그라데이션", artist: "10CM", album: "그라데이션", duration: "3:42", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/109/76/123/10976123_20221014100308_300.jpg" },
    { rank: 16, title: "사랑은 늘 도망가", artist: "임영웅", album: "IM HERO", duration: "3:31", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/108/14/123/10814123_20220506100408_300.jpg" },
    { rank: 17, title: "Rush Hour (Feat. j-hope of BTS)", artist: "Crush", album: "Rush Hour", duration: "3:17", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/108/91/726/10891726_20220922100308_300.jpg" },
    { rank: 18, title: "ELEVEN", artist: "IVE (아이브)", album: "ELEVEN", duration: "2:58", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/107/72/779/10772779_20211201100408_300.jpg" },
    { rank: 19, title: "Yet To Come (The Most Beautiful Moment)", artist: "BTS", album: "Proof", duration: "3:35", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/109/05/608/10905608_20220610100308_300.jpg" },
    { rank: 20, title: "Dynamite", artist: "BTS", album: "Dynamite", duration: "3:19", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/105/79/423/10579423_20200821100407_300.jpg" },
    { rank: 21, title: "TOMBOY", artist: "(여자)아이들", album: "I NEVER DIE", duration: "2:55", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/108/39/604/10839604_20220314100408_300.jpg" },
    { rank: 22, title: "STAY", artist: "The Kid LAROI, Justin Bieber", album: "F*CK LOVE 3: OVER YOU", duration: "2:21", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/107/43/445/10743445_20210709180408_300.jpg" },
    { rank: 23, title: "건물 사이에 피어난 장미", artist: "이무진", album: "건물 사이에 피어난 장미", duration: "3:12", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/109/08/745/10908745_20220624100308_300.jpg" },
    { rank: 24, title: "strawberry moon", artist: "아이유 (IU)", album: "strawberry moon", duration: "3:04", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/107/11/648/10711648_20211019180308_300.jpg" },
    { rank: 25, title: "INVU", artist: "태연 (TAEYEON)", album: "INVU - The 3rd Album", duration: "3:20", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/108/17/123/10817123_20220214100408_300.jpg" },
    { rank: 26, title: "취중진담", artist: "김동률", album: "취중진담", duration: "4:17", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/109/34/556/10934556_20220729100308_300.jpg" },
    { rank: 27, title: "봄날", artist: "BTS", album: "You Never Walk Alone", duration: "4:33", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/008/54/010/854010_500.jpg" },
    { rank: 28, title: "내 손을 잡아", artist: "아이유 (IU)", album: "The Winning", duration: "3:05", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/112/48/123/11248123_20230213100408_300.jpg" },
    { rank: 29, title: "Weekend", artist: "태연 (TAEYEON)", album: "Weekend", duration: "3:34", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/107/11/456/10711456_20210706100408_300.jpg" },
    { rank: 30, title: "WHEN I MOVE", artist: "KARA", album: "MOVE AGAIN", duration: "3:18", coverUrl: "https://cdnimg.melon.co.kr/cm2/album/images/112/56/789/11256789_20230717100408_300.jpg" }
  ]
  
  // 요청된 크기만큼 복제하여 반환
  const result: ChartSong[] = []
  for (let i = 0; i < size; i++) {
    const baseIndex = i % mockData.length
    const song = { ...mockData[baseIndex] }
    song.rank = i + 1
    result.push(song)
  }
  
  return result
}

function filterChart(songs: ChartSong[], excludeKeywords: string[], limit: number): ChartSong[] {
  let filtered = songs
  
  if (excludeKeywords.length > 0) {
    filtered = songs.filter(song => {
      const searchText = `${song.title} ${song.artist} ${song.album || ''}`.toLowerCase()
      return !excludeKeywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
      )
    })
  }
  
  // 커버 이미지가 없는 항목에 기본 이미지 추가
  const withCover = filtered.map(song => ({
    ...song,
    coverUrl: song.coverUrl || `https://picsum.photos/200/200?random=${song.rank}`
  }))
  
  return withCover.slice(0, limit)
}

export async function GET(request: NextRequest) {
  try {
    // 헤더 정보 로깅
    console.log('=== 멜론차트 API GET 요청 ===')
    console.log('Cookie 헤더:', request.headers.get('cookie'))
    console.log('Authorization 헤더:', request.headers.get('authorization'))
    console.log('User-Agent:', request.headers.get('user-agent'))
    
    const session = await getServerSession(authOptions)
    console.log('멜론차트 GET API 세션:', session)
    console.log('세션 사용자:', session?.user)
    
    if (!session) {
      console.log('GET 세션이 없어 401 반환')
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: '로그인이 필요합니다. 다시 로그인해주세요.'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const size = parseInt(searchParams.get('size') || '30')
    const excludeParam = searchParams.get('exclude')
    const excludeKeywords = excludeParam ? excludeParam.split(',') : []

    let chart = await fetchMelonChart(Math.min(size, 100)) // 최대 100곡까지만

    // 제외 키워드가 있으면 필터링
    if (excludeKeywords.length > 0) {
      chart = chart.filter(song => {
        const searchText = `${song.title} ${song.artist} ${song.album || ''}`.toLowerCase()
        return !excludeKeywords.some(keyword => 
          searchText.includes(keyword.toLowerCase())
        )
      })
    }

    return NextResponse.json({
      chart,
      size: chart.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('멜론차트 GET API 오류:', error)
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: '차트 데이터를 가져오는 중 오류가 발생했습니다.'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 헤더 정보 로깅
    console.log('=== 멜론차트 API POST 요청 ===')
    console.log('Cookie 헤더:', request.headers.get('cookie'))
    
    const session = await getServerSession(authOptions)
    console.log('멜론차트 POST API 세션:', session)
    
    if (!session) {
      console.log('POST 세션이 없어 401 반환')
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
    
    for (const song of songs) {
      try {
        // 다운로드 작업을 큐에 추가 (멜론차트용 특별 처리)
        const searchQuery = `${song.artist} ${song.title}`
        
        const queueItem = await addToQueue(`ytsearch:${searchQuery}`, DownloadType.MP3, {
          isMelonChart: true,
          rank: song.rank,
          chartSize: songs.length,
          coverUrl: song.coverUrl,
          artist: song.artist,
          title: song.title
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