import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { addToQueue } from '@/lib/queue-manager'
import { DownloadType } from '@/lib/downloader'

interface ChartSong {
  rank: number
  title: string
  artist: string
  album?: string
  coverUrl?: string
  duration?: string
}

// 실제 멜론차트 스크래핑 함수 (현재는 더미데이터 사용)
async function fetchMelonChart(): Promise<ChartSong[]> {
  // TODO: 실제 멜론차트 웹 스크래핑 구현
  // 현재는 더미 데이터 반환
  return mockChartData;
}

// 멜론 차트 더미 데이터 (실제로는 웹 스크래핑 또는 API 연동)
const mockChartData: ChartSong[] = [
  { rank: 1, title: "Ditto", artist: "NewJeans", album: "NewJeans 'OMG'", duration: "3:05", coverUrl: "https://picsum.photos/200/200?random=1" },
  { rank: 2, title: "Hype Boy", artist: "NewJeans", album: "NewJeans 1st EP 'New Jeans'", duration: "2:58", coverUrl: "https://picsum.photos/200/200?random=2" },
  { rank: 3, title: "사건의 지평선", artist: "윤하 (YOUNHA)", album: "YOUNHA 6th Album 'END THEORY'", duration: "4:12" },
  { rank: 4, title: "ANTIFRAGILE", artist: "LE SSERAFIM (르세라핌)", album: "ANTIFRAGILE", duration: "3:26" },
  { rank: 5, title: "Attention", artist: "NewJeans", album: "NewJeans 1st EP 'New Jeans'", duration: "3:01" },
  { rank: 6, title: "Nxde", artist: "(여자)아이들", album: "I love", duration: "2:55" },
  { rank: 7, title: "After LIKE", artist: "IVE (아이브)", album: "After LIKE", duration: "2:55" },
  { rank: 8, title: "Shut Down", artist: "BLACKPINK", album: "BORN PINK", duration: "2:54" },
  { rank: 9, title: "Pink Venom", artist: "BLACKPINK", album: "BORN PINK", duration: "3:06" },
  { rank: 10, title: "Monologue", artist: "테이 (Tei)", album: "Monologue", duration: "4:33" },
  { rank: 11, title: "OMG", artist: "NewJeans", album: "NewJeans 'OMG'", duration: "3:35" },
  { rank: 12, title: "Cookie", artist: "NewJeans", album: "NewJeans 1st EP 'New Jeans'", duration: "3:55" },
  { rank: 13, title: "LOVE DIVE", artist: "IVE (아이브)", album: "LOVE DIVE", duration: "2:57" },
  { rank: 14, title: "FEARLESS", artist: "LE SSERAFIM (르세라핌)", album: "FEARLESS", duration: "2:48" },
  { rank: 15, title: "그라데이션", artist: "10CM", album: "그라데이션", duration: "3:42" },
  { rank: 16, title: "사랑은 늘 도망가", artist: "임영웅", album: "IM HERO", duration: "3:31" },
  { rank: 17, title: "Rush Hour (Feat. j-hope of BTS)", artist: "Crush", album: "Rush Hour", duration: "3:17" },
  { rank: 18, title: "ELEVEN", artist: "IVE (아이브)", album: "ELEVEN", duration: "2:58" },
  { rank: 19, title: "Yet To Come (The Most Beautiful Moment)", artist: "BTS", album: "Proof", duration: "3:35" },
  { rank: 20, title: "Dynamite", artist: "BTS", album: "Dynamite", duration: "3:19" },
  { rank: 21, title: "TOMBOY", artist: "(여자)아이들", album: "I NEVER DIE", duration: "2:55" },
  { rank: 22, title: "STAY", artist: "The Kid LAROI, Justin Bieber", album: "F*CK LOVE 3: OVER YOU", duration: "2:21" },
  { rank: 23, title: "건물 사이에 피어난 장미", artist: "이무진", album: "건물 사이에 피어난 장미", duration: "3:12" },
  { rank: 24, title: "strawberry moon", artist: "아이유 (IU)", album: "strawberry moon", duration: "3:04" },
  { rank: 25, title: "INVU", artist: "태연 (TAEYEON)", album: "INVU - The 3rd Album", duration: "3:20" },
  { rank: 26, title: "취중진담", artist: "김동률", album: "취중진담", duration: "4:17" },
  { rank: 27, title: "봄날", artist: "BTS", album: "You Never Walk Alone", duration: "4:33" },
  { rank: 28, title: "내 손을 잡아", artist: "아이유 (IU)", album: "The Winning", duration: "3:05" },
  { rank: 29, title: "Weekend", artist: "태연 (TAEYEON)", album: "Weekend", duration: "3:34" },
  { rank: 30, title: "WHEN I MOVE", artist: "KARA", album: "MOVE AGAIN", duration: "3:18" },
  { rank: 31, title: "그대가 곁에 있어도 나는 외로웠다", artist: "김광석", album: "김광석 4집", duration: "4:45" },
  { rank: 32, title: "LOVE me", artist: "(여자)아이들", album: "I love", duration: "3:01" },
  { rank: 33, title: "Step Back", artist: "GOT the beat", album: "Step Back", duration: "3:01" },
  { rank: 34, title: "봄여름가을겨울 (Still Life)", artist: "BIGBANG", album: "봄여름가을겨울 (Still Life)", duration: "3:45" },
  { rank: 35, title: "ZOOM", artist: "로켓펀치 (Rocket Punch)", album: "YELLOW PUNCH", duration: "3:05" },
  { rank: 36, title: "바다를 건너", artist: "이문세", album: "바다를 건너", duration: "4:21" },
  { rank: 37, title: "고백", artist: "멜로망스 (MeloMance)", album: "기억의 밤", duration: "3:42" },
  { rank: 38, title: "LOCO", artist: "ITZY (있지)", album: "CRAZY IN LOVE", duration: "3:10" },
  { rank: 39, title: "SNEAKERS", artist: "ITZY (있지)", album: "CHECKMATE", duration: "2:52" },
  { rank: 40, title: "MY BAG", artist: "(여자)아이들", album: "I love", duration: "2:27" },
  { rank: 41, title: "Permission to Dance", artist: "BTS", album: "Butter", duration: "3:07" },
  { rank: 42, title: "Bad Habits", artist: "Ed Sheeran", album: "Bad Habits", duration: "3:51" },
  { rank: 43, title: "Butter", artist: "BTS", album: "Butter", duration: "2:44" },
  { rank: 44, title: "Unholy (feat. Kim Petras)", artist: "Sam Smith", album: "Unholy", duration: "2:36" },
  { rank: 45, title: "있잖아", artist: "혁오 (hyukoh)", album: "있잖아", duration: "3:34" },
  { rank: 46, title: "Next Level", artist: "aespa", album: "Next Level", duration: "3:30" },
  { rank: 47, title: "밤이 되니까", artist: "거미", album: "밤이 되니까", duration: "3:17" },
  { rank: 48, title: "MEGAVERSE", artist: "Stray Kids", album: "★★★★★ (5-STAR)", duration: "2:58" },
  { rank: 49, title: "낙하 (with 아이유)", artist: "AKMU (악뮤)", album: "NEXT EPISODE", duration: "3:40" },
  { rank: 50, title: "That That (prod. & feat. SUGA of BTS)", artist: "PSY", album: "PSY 9th", duration: "2:54" },
  { rank: 51, title: "WADADA", artist: "Kep1er", album: "FIRST IMPACT", duration: "3:03" },
  { rank: 52, title: "사랑해 진짜", artist: "한요한", album: "사랑해 진짜", duration: "3:28" },
  { rank: 53, title: "STUPID", artist: "(여자)아이들", album: "I love", duration: "2:37" },
  { rank: 54, title: "2002", artist: "Anne-Marie", album: "Speak Your Mind", duration: "3:17" },
  { rank: 55, title: "우리들의 블루스", artist: "임영웅", album: "IM HERO", duration: "4:02" },
  { rank: 56, title: "나의 바람 (My Wind)", artist: "이무진", album: "나의 바람 (My Wind)", duration: "3:54" },
  { rank: 57, title: "잊을만하면", artist: "크러쉬 (Crush)", album: "잊을만하면", duration: "3:43" },
  { rank: 58, title: "신호등", artist: "이무진", album: "신호등", duration: "3:06" },
  { rank: 59, title: "여행", artist: "볼빨간사춘기", album: "Red Diary Page.2", duration: "3:50" },
  { rank: 60, title: "WORKMAN", artist: "(여자)아이들", album: "I love", duration: "2:48" },
  { rank: 61, title: "Love scenario", artist: "iKON", album: "Return", duration: "3:36" },
  { rank: 62, title: "사이렌 Remix (Feat. UNEDUCATED KID, Paul Blanco)", artist: "호미들", album: "사이렌 Remix", duration: "3:21" },
  { rank: 63, title: "LILAC", artist: "아이유 (IU)", album: "IU 5th Album 'LILAC'", duration: "3:46" },
  { rank: 64, title: "Blueming", artist: "아이유 (IU)", album: "Love poem", duration: "3:37" },
  { rank: 65, title: "Celebrity", artist: "아이유 (IU)", album: "Celebrity", duration: "3:15" },
  { rank: 66, title: "그댄 행복에 살텐데 (2022)", artist: "김호중", album: "그댄 행복에 살텐데 (2022)", duration: "4:01" },
  { rank: 67, title: "어떻게 이별까지 사랑하겠어, 널 사랑하는 거지", artist: "AKMU (악뮤)", album: "NEXT EPISODE", duration: "3:47" },
  { rank: 68, title: "아버지", artist: "임영웅", album: "IM HERO", duration: "3:36" },
  { rank: 69, title: "Polaroid Love", artist: "ENHYPEN", album: "DIMENSION : ANSWER", duration: "3:04" },
  { rank: 70, title: "Paris In The Rain", artist: "Lauv", album: "I met you when I was 18. (the playlist)", duration: "3:18" },
  { rank: 71, title: "그런 밤 (Some Nights)", artist: "태연 (TAEYEON)", album: "INVU - The 3rd Album", duration: "3:44" },
  { rank: 72, title: "모든 날, 모든 순간 (Every day, Every Moment)", artist: "폴킴 (Paul Kim)", album: "호텔 델루나 OST Part.1", duration: "4:09" },
  { rank: 73, title: "MY WORLD", artist: "aespa", album: "MY WORLD - The 3rd Mini Album", duration: "3:20" },
  { rank: 74, title: "밤하늘의 별을(2020)", artist: "경서", album: "밤하늘의 별을(2020)", duration: "3:30" },
  { rank: 75, title: "Drama", artist: "aespa", album: "MY WORLD - The 3rd Mini Album", duration: "3:26" },
  { rank: 76, title: "만남은 쉽고 이별은 어려워 (Feat. Leellamarz) (Prod. TOIL)", artist: "베이식 (Basick)", album: "쇼미더머니 10 Episode 3", duration: "3:44" },
  { rank: 77, title: "RUN2U", artist: "STAYC(스테이씨)", album: "YOUNG-LUV.COM", duration: "3:01" },
  { rank: 78, title: "STEP", artist: "Kep1er", album: "DOUBLAST", duration: "3:06" },
  { rank: 79, title: "Maniac", artist: "Stray Kids", album: "CIRCUS", duration: "3:01" },
  { rank: 80, title: "밤양갱", artist: "비비 (BIBI)", album: "밤양갱", duration: "2:29" },
  { rank: 81, title: "어제처럼", artist: "폴킴 (Paul Kim)", album: "어제처럼", duration: "3:44" },
  { rank: 82, title: "Spicy", artist: "aespa", album: "MY WORLD - The 3rd Mini Album", duration: "3:00" },
  { rank: 83, title: "밤이 무서워요", artist: "잠비나이", album: "온다", duration: "4:12" },
  { rank: 84, title: "Can't Control Myself", artist: "태연 (TAEYEON)", album: "INVU - The 3rd Album", duration: "3:09" },
  { rank: 85, title: "DICE", artist: "NMIXX", album: "ENTWURF", duration: "2:54" },
  { rank: 86, title: "리무진 (feat. MINO) (Prod. GRAY)", artist: "BE'O (비오)", album: "쇼미더머니 10 Final", duration: "3:32" },
  { rank: 87, title: "Free Somebody", artist: "루나 (LUNA)", album: "Free Somebody", duration: "3:16" },
  { rank: 88, title: "Counting Stars (Feat. Beenzino)", artist: "BE'O (비오)", album: "HELLO", duration: "3:21" },
  { rank: 89, title: "손이 참 곱던 그대", artist: "임영웅", album: "IM HERO", duration: "3:18" },
  { rank: 90, title: "Traffic light", artist: "이무진", album: "Traffic light", duration: "3:41" },
  { rank: 91, title: "어쩌다 어른", artist: "김동률", album: "KIM DONG RYUL ANTHOLOGY", duration: "4:24" },
  { rank: 92, title: "CIRCUS", artist: "Stray Kids", album: "CIRCUS", duration: "3:17" },
  { rank: 93, title: "SHAKE IT", artist: "STAYC(스테이씨)", album: "STEREOTYPE", duration: "3:18" },
  { rank: 94, title: "사실 나는 (Feat.전건우)", artist: "경서", album: "사실 나는", duration: "3:56" },
  { rank: 95, title: "신동엽 라디오", artist: "NCT DREAM", album: "맛 (Hot Sauce) - The 1st Album Repackage", duration: "3:05" },
  { rank: 96, title: "잠이 오질 않네요", artist: "장범준", album: "장범준 3집", duration: "3:40" },
  { rank: 97, title: "TALK THAT TALK", artist: "TWICE", album: "IM NAYEON", duration: "3:14" },
  { rank: 98, title: "회전목마 (Feat. Zion.T, 원슈타인) (Prod. Slom)", artist: "sokodomo", album: "쇼미더머니 10 Episode 1", duration: "3:26" },
  { rank: 99, title: "VIVIZ", artist: "VIVIZ (비비지)", album: "Beam Of Prism", duration: "3:11" },
  { rank: 100, title: "듣고 싶을까", artist: "MSG워너비 (M.O.M)", album: "듣고 싶을까", duration: "3:33" }
]

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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const size = parseInt(searchParams.get('size') || '30')
    const excludeKeywords = searchParams.get('exclude')?.split(',').filter(Boolean) || []
    
    // 실제 차트 데이터 가져오기 (현재는 더미 데이터)
    const chartData = await fetchMelonChart()
    const filteredChart = filterChart(chartData, excludeKeywords, size)
    
    return NextResponse.json({
      chart: filteredChart,
      total: filteredChart.length,
      excludeKeywords
    })
  } catch (error) {
    console.error('Chart fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
          coverUrl: song.coverUrl
        })
        
        results.push({
          rank: song.rank,
          title: song.title,
          artist: song.artist,
          jobId: queueItem.id,
          status: 'queued'
        })
      } catch (error) {
        console.error(`Failed to queue download for ${song.title}:`, error)
        results.push({
          rank: song.rank,
          title: song.title,
          artist: song.artist,
          status: 'failed',
          error: 'Failed to queue download'
        })
      }
    }
    
    return NextResponse.json({
      message: `${results.length} songs queued for download`,
      results
    })
  } catch (error) {
    console.error('Chart download error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}