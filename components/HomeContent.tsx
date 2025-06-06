"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Music,
  FileMusic,
  Share2,
  Settings,
  Download,
  Clock,
  BarChart2,
  HardDrive,
  Youtube,
  TrendingUp,
  RefreshCw,
  Video,
  ListMusic,
  PlayCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { useTheme } from "@/contexts/ThemeContext"
import { usePlayer } from "@/contexts/PlayerContext"
import { useMediaQuery } from "@/hooks/use-mobile"
import { toast } from "react-hot-toast"

// 긴 텍스트를 중간에 ... 으로 줄이는 유틸리티 함수
const truncateMiddle = (text: string, maxLength: number = 25): string => {
  if (text.length <= maxLength) return text;
  
  const ellipsis = '...';
  const charsToShow = maxLength - ellipsis.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  
  return text.substring(0, frontChars) + ellipsis + text.substring(text.length - backChars);
};

interface QuickAccessItem {
  title: string
  icon: React.ElementType
  color: string
  onClick: () => void
}

interface RecentDownload {
  id: string
  title: string
  artist: string | null
  fileType: string
  thumbnailPath: string | null
  createdAt: string
  downloads: number
}

interface StorageInfo {
  totalFiles: number
  totalStorageUsed: number
  storageLimit: number
  storageUsagePercentage: number
  fileTypeStats: {
    fileType: string
    count: number
    totalSize: number
  }[]
}

// 안전한 썸네일 URL 생성 함수
const getThumbnailUrl = (fileId: string, thumbnailPath: string | null): string | null => {
  if (!thumbnailPath) return null
  try {
    return `/api/files/${fileId}/thumbnail`
  } catch {
    return null
  }
}

export function HomeContent({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { theme } = useTheme()
  const { loadFile } = usePlayer()
  const isDark = theme === "dark"
  const isMobile = useMediaQuery("(max-width: 768px)")
  
  // 상태 관리
  const [recentDownloads, setRecentDownloads] = useState<RecentDownload[]>([])
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [topChart, setTopChart] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [downloadLoading, setDownloadLoading] = useState(false)

  // 데이터 로딩 함수들
  const loadRecentFiles = async () => {
    try {
      const response = await fetch('/api/files?limit=4&sortBy=createdAt&sortOrder=desc')
      if (response.ok) {
        const data = await response.json()
        setRecentDownloads(data.files || [])
      }
    } catch (error) {
      console.error('최근 파일 로딩 실패:', error)
      toast.error('최근 파일을 불러오는데 실패했습니다.')
    }
  }

  const loadStorageStats = async () => {
    try {
      const response = await fetch('/api/files/stats')
      if (response.ok) {
        const data = await response.json()
        setStorageInfo(data)
      }
    } catch (error) {
      console.error('저장 공간 정보 로딩 실패:', error)
      toast.error('저장 공간 정보를 불러오는데 실패했습니다.')
    }
  }

  const loadTopChart = async () => {
    try {
      // 인기 파일들 가져오기 (다운로드 횟수 기준)
      const response = await fetch('/api/files?limit=5&sortBy=downloads&sortOrder=desc')
      if (response.ok) {
        const data = await response.json()
        setTopChart(data.files || [])
      }
    } catch (error) {
      console.error('인기 파일 로딩 실패:', error)
      toast.error('인기 파일을 불러오는데 실패했습니다.')
    }
  }

  const loadAllData = async () => {
    setLoading(true)
    await Promise.all([
      loadRecentFiles(),
      loadStorageStats(),
      loadTopChart()
    ])
    setLoading(false)
  }

  // 파일 재생 함수
  const playFile = async (file: RecentDownload) => {
    try {
      // RecentDownload를 FileData 형태로 변환
      const fileData = {
        id: file.id,
        title: file.title,
        artist: file.artist,
        fileType: file.fileType,
        fileSize: 0, // 홈에서는 파일 크기 정보가 없으므로 0으로 설정
        duration: null, // duration 정보도 없음
        thumbnailPath: file.thumbnailPath,
        createdAt: file.createdAt,
        downloads: file.downloads
      }
      
      loadFile(fileData)
      toast.success(`재생 중: ${file.title}`)
    } catch (error) {
      console.error('파일 재생 오류:', error)
      toast.error('파일을 재생할 수 없습니다.')
    }
  }

  // 빠른 유튜브 다운로드 기능
  const handleQuickYoutubeDownload = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('유튜브 URL을 입력해주세요.')
      return
    }

    // YouTube URL 유효성 검사
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/
    if (!youtubeRegex.test(youtubeUrl)) {
      toast.error('올바른 유튜브 URL을 입력해주세요.')
      return
    }

    try {
      setDownloadLoading(true)
      
      // 유튜브 다운로드 API 호출
      const response = await fetch('/api/youtube/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: youtubeUrl,
          format: 'mp3', // 기본값을 mp3로 설정
          quality: 'highest'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '다운로드 요청에 실패했습니다.')
      }

      const result = await response.json()
      
      if (result.success) {
        toast.success('다운로드가 시작되었습니다!')
        setYoutubeUrl('') // URL 입력 필드 초기화
        
        // 다운로드 후 데이터 새로고침
        setTimeout(() => {
          loadAllData()
        }, 2000)
      } else {
        throw new Error(result.error || '다운로드에 실패했습니다.')
      }

    } catch (error) {
      console.error('유튜브 다운로드 오류:', error)
      toast.error(error instanceof Error ? error.message : '다운로드 중 오류가 발생했습니다.')
    } finally {
      setDownloadLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
    
    // 30초마다 자동 새로고침
    const interval = setInterval(() => {
      loadAllData()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // 유틸리티 함수들
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '오늘'
    if (diffDays === 2) return '어제'
    if (diffDays <= 7) return `${diffDays - 1}일 전`
    return date.toLocaleDateString('ko-KR')
  }

  // 빠른 접근 아이템
  const quickAccessItems: QuickAccessItem[] = [
    {
      title: "음악 플레이어",
      icon: PlayCircle,
      color: "bg-pink-600",
      onClick: () => setActiveTab("player"),
    },
    {
      title: "유튜브 다운로드",
      icon: Youtube,
      color: "bg-red-600",
      onClick: () => setActiveTab("youtube"),
    },
    {
      title: "멜론 차트",
      icon: BarChart2,
      color: "bg-green-600",
      onClick: () => setActiveTab("melon"),
    },
    {
      title: "내 파일",
      icon: FileMusic,
      color: "bg-purple-600",
      onClick: () => setActiveTab("files"),
    },
    {
      title: "플레이리스트",
      icon: ListMusic,
      color: "bg-indigo-600",
      onClick: () => setActiveTab("playlist"),
    },
    {
      title: "최근 재생",
      icon: Clock,
      color: "bg-orange-600",
      onClick: () => setActiveTab("recent"),
    },
    {
      title: "공유 관리",
      icon: Share2,
      color: "bg-blue-600",
      onClick: () => setActiveTab("shares"),
    },
    {
      title: "설정",
      icon: Settings,
      color: "bg-gray-600",
      onClick: () => setActiveTab("settings"),
    },
  ]

  if (loading) {
    return (
      <div className={`flex-1 ${isDark ? "bg-gradient-to-b from-blue-900 to-black" : "bg-gradient-to-b from-blue-100 to-white"} text-${isDark ? "white" : "black"} p-4 md:p-8 overflow-y-auto flex items-center justify-center`}>
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex-1 ${isDark ? "bg-gradient-to-b from-blue-900 to-black" : "bg-gradient-to-b from-blue-100 to-white"} text-${isDark ? "white" : "black"} p-4 md:p-8 overflow-y-auto`}
    >
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>안녕하세요!</h1>
          <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
            사랑하는 윤채의 음악방에 오신 것을 환영합니다. 무엇을 도와드릴까요?
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={isDark ? "secondary" : "default"} className="text-xs">
            실시간 업데이트
          </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAllData}
            disabled={loading}
          className={`${isDark ? "border-white/20 text-white hover:bg-white/10" : "border-gray-300 text-gray-800 hover:bg-gray-100"}`}
        >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
        </div>
      </div>

      {/* 빠른 접근 섹션 */}
      <div className="mb-8">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-800"}`}>빠른 접근</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {quickAccessItems.map((item, index) => (
            <Card
              key={index}
              className={`cursor-pointer hover:scale-105 transition-transform ${isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"}`}
              onClick={item.onClick}
            >
              <CardContent className="p-6 md:p-4 flex flex-col items-center justify-center text-center min-h-[120px] md:min-h-[100px]">
                <div className={`${item.color} w-14 h-14 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-3`}>
                  <item.icon className="h-7 w-7 md:h-6 md:w-6 text-white" />
                </div>
                <p className="text-sm font-medium">{item.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 최근 활동 및 통계 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 최근 다운로드 */}
        <Card
          className={`${isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"}`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              최근 다운로드
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-4">
              {recentDownloads.length === 0 ? (
                <div className="text-center py-4">
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    아직 다운로드한 파일이 없습니다
                  </p>
                </div>
              ) : (
                recentDownloads.map((download) => (
                  <div key={download.id} className="flex items-center group">
                    <div className="relative">
                      {getThumbnailUrl(download.id, download.thumbnailPath) ? (
                        <Image
                          src={getThumbnailUrl(download.id, download.thumbnailPath)!}
                          width={40}
                          height={40}
                          alt={`${download.title} 썸네일`}
                          className="rounded object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center ${getThumbnailUrl(download.id, download.thumbnailPath) ? 'hidden' : ''}`}>
                        {download.fileType.toLowerCase().includes('mp3') ? (
                          <Music className="w-5 h-5 text-green-600" />
                        ) : (
                          <Video className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      {download.fileType.toLowerCase().includes('mp3') ? (
                        <Music className="absolute bottom-0 right-0 w-3 h-3 bg-green-600 rounded-full p-0.5" />
                      ) : (
                        <Youtube className="absolute bottom-0 right-0 w-3 h-3 bg-red-600 rounded-full p-0.5" />
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <p 
                        className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"} truncate`}
                        title={download.title}
                      >
                        {truncateMiddle(download.title, isMobile ? 20 : 30)}
                      </p>
                      <p 
                        className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"} truncate`}
                        title={download.artist || '알 수 없는 아티스트'}
                      >
                        {truncateMiddle(download.artist || '알 수 없는 아티스트', isMobile ? 18 : 25)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          playFile(download)
                        }}
                      >
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                    <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"} flex flex-col items-end`}>
                      <span>{formatDate(download.createdAt)}</span>
                      <span className="text-xs opacity-75">{download.downloads}회 다운로드</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className={`w-full ${isDark ? "border-white/20 text-white hover:bg-white/10" : "border-gray-300 text-gray-800 hover:bg-gray-100"}`}
              onClick={() => setActiveTab("files")}
            >
              <FileMusic className="h-4 w-4 mr-2" />
              모든 파일 보기
            </Button>
          </CardFooter>
        </Card>

        {/* 저장 공간 */}
        <Card
          className={`${isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"}`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <HardDrive className="h-5 w-5 mr-2" />
              저장 공간
            </CardTitle>
            <CardDescription className={isDark ? "text-gray-400" : "text-gray-500"}>
              {storageInfo ? `${formatFileSize(storageInfo.totalStorageUsed)} / ${formatFileSize(storageInfo.storageLimit)} 사용 중` : '로딩 중...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-4">
              {storageInfo ? (
                <>
                  <Progress value={storageInfo.storageUsagePercentage} className="h-2" />
                  <div className="space-y-2">
                    {storageInfo.fileTypeStats.map((stat, index) => {
                      const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500']
                      const color = colors[index % colors.length]
                      return (
                        <div key={stat.fileType} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${color} mr-2`}></div>
                            <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                              {stat.fileType.toUpperCase()} ({stat.count}개)
                            </span>
                          </div>
                          <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            {formatFileSize(stat.totalSize)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>저장 공간 정보 로딩 중...</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className={`w-full ${isDark ? "border-white/20 text-white hover:bg-white/10" : "border-gray-300 text-gray-800 hover:bg-gray-100"}`}
              onClick={() => setActiveTab("settings")}
            >
              <Settings className="h-4 w-4 mr-2" />
              저장 공간 관리
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* 추천 및 인기 콘텐츠 */}
      <div className="mb-8">
        <h2 className={`text-xl font-semibold mb-4 flex items-center ${isDark ? "text-white" : "text-gray-800"}`}>
          <TrendingUp className="h-5 w-5 mr-2" />
          인기 파일
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {topChart.length === 0 ? (
            [1, 2, 3, 4, 5].map((item) => (
              <Card
                key={item}
                className={`${isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"} animate-pulse`}
              >
                <div className="relative">
                  <div className="w-full aspect-square bg-gray-300 dark:bg-gray-600"></div>
                  <div className="absolute top-2 left-2">
                    <div className="bg-gray-400 dark:bg-gray-500 text-xs font-bold px-2 py-1 rounded-full w-6 h-5"></div>
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))
          ) : (
            topChart.map((file, index) => (
              <Card
                key={file.id}
                className={`${isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"} cursor-pointer hover:scale-105 transition-transform group`}
                onClick={() => playFile(file)}
              >
                <div className="relative">
                  <div className="w-full aspect-square bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    {getThumbnailUrl(file.id, file.thumbnailPath) ? (
                      <Image
                        src={getThumbnailUrl(file.id, file.thumbnailPath)!}
                        width={150}
                        height={150}
                        alt={`${file.title} 썸네일`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement
                          if (fallback) fallback.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div className={`fallback-icon absolute inset-0 flex items-center justify-center ${getThumbnailUrl(file.id, file.thumbnailPath) ? 'hidden' : ''}`}>
                      {file.fileType.toLowerCase().includes('mp3') ? (
                        <Music className="w-12 h-12 text-green-400" />
                      ) : (
                        <Video className="w-12 h-12 text-red-400" />
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <PlayCircle className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <div className="absolute top-2 left-2">
                    <div className="bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-full">
                      #{index + 1}
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2">
                    <div className={`${file.fileType.toLowerCase().includes('mp3') ? 'bg-green-600' : 'bg-blue-600'} text-white text-xs px-2 py-1 rounded`}>
                      {file.fileType.toUpperCase()}
                    </div>
                  </div>
                </div>
                <CardContent className="p-4 md:p-3">
                  <h3 
                    className="font-medium text-sm md:text-xs truncate mb-1"
                    title={file.title}
                  >
                    {truncateMiddle(file.title, isMobile ? 15 : 20)}
                  </h3>
                  <p 
                    className="text-sm md:text-xs text-gray-500 dark:text-gray-400 truncate"
                    title={file.artist || '알 수 없는 아티스트'}
                  >
                    {truncateMiddle(file.artist || '알 수 없는 아티스트', isMobile ? 12 : 18)}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {file.downloads}회 다운로드
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        <div className="mt-4 text-center">
          <Button
            className={isDark ? "bg-purple-600 hover:bg-purple-700" : "bg-purple-500 hover:bg-purple-600"}
            onClick={() => setActiveTab("files")}
          >
            <FileMusic className="h-4 w-4 mr-2" />
            내 파일 전체보기
          </Button>
        </div>
      </div>

      {/* 빠른 유튜브 다운로드 */}
      <Card
        className={`mb-8 ${isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"}`}
      >
        <CardHeader>
          <CardTitle className="flex items-center">
            <Youtube className="h-5 w-5 mr-2 text-red-500" />
            빠른 유튜브 다운로드
          </CardTitle>
          <CardDescription className={isDark ? "text-gray-400" : "text-gray-500"}>
            유튜브 URL을 입력하여 빠르게 다운로드하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleQuickYoutubeDownload()
                }
              }}
              className={`flex-1 ${
                isDark
                  ? "bg-white/5 border-white/20 text-white focus:border-blue-500"
                  : "bg-gray-100 border-gray-300 text-gray-800 focus:border-blue-500"
              }`}
              disabled={downloadLoading}
            />
            <Button 
              className={isDark ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600"}
              onClick={handleQuickYoutubeDownload}
              disabled={downloadLoading || !youtubeUrl.trim()}
            >
              {downloadLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
              <Download className="h-4 w-4 mr-2" />
              )}
              {downloadLoading ? '다운로드 중...' : '다운로드'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default HomeContent;

