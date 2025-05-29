"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Download, Filter, X, Music, Clock, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSocket } from "@/hooks/useSocket"
import { useSession } from "@/hooks/useSession"

interface ChartSong {
  rank: number
  title: string
  artist: string
  album?: string
  duration?: string
  coverUrl?: string
}

interface DownloadTask {
  jobId: string
  title: string
  artist: string
  progress: number
  status: 'queued' | 'processing' | 'completed' | 'failed'
  error?: string
  coverUrl?: string
}

export function MelonChart() {
  const [chartSize, setChartSize] = useState("30")
  const [customChartSize, setCustomChartSize] = useState("")
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [chartSongs, setChartSongs] = useState<ChartSong[]>([])
  const [downloadTasks, setDownloadTasks] = useState<DownloadTask[]>([])
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const socket = useSocket()
  const { isLoggedIn, isLoading: sessionLoading } = useSession()

  const handleAddKeyword = () => {
    if (keywordInput.trim() !== "" && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()])
      setKeywordInput("")
    }
  }

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddKeyword()
    }
  }

  const handleChartSizeChange = (value: string) => {
    setChartSize(value)
    setShowCustomInput(value === "custom")
  }
  
  const fetchChart = useCallback(async () => {
    if (!isLoggedIn) {
      setError('로그인이 필요합니다.')
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      const size = chartSize === 'custom' ? parseInt(customChartSize) || 30 : parseInt(chartSize)
      const excludeParam = keywords.length > 0 ? `&exclude=${keywords.join(',')}` : ''
      
      const response = await fetch(`/api/chart?size=${size}${excludeParam}`, {
        credentials: 'include', // 쿠키 포함
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.status === 401) {
        setError('세션이 만료되었습니다. 페이지를 새로고침해주세요.')
        setChartSongs([])
        return
      }
      
      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`)
      }
      
      const data = await response.json()
      const chart = data.chart || []
      setChartSongs(chart)
      
      if (chart.length === 0) {
        setError('조건에 맞는 차트 데이터가 없습니다.')
      }
    } catch (error) {
      console.error('Failed to fetch chart:', error)
      setError(error instanceof Error ? error.message : '차트를 불러오는데 실패했습니다.')
      setChartSongs([])
    } finally {
      setLoading(false)
    }
  }, [chartSize, customChartSize, keywords, isLoggedIn])
  
  const downloadAllSongs = async () => {
    if (chartSongs.length === 0) return
    
    setDownloading(true)
    setError(null)
    try {
      const response = await fetch('/api/chart', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          songs: chartSongs,
          excludeKeywords: keywords,
          size: chartSize === 'custom' ? parseInt(customChartSize) || 30 : parseInt(chartSize)
        })
      })
      
      if (response.status === 401) {
        throw new Error('다운로드 기능을 사용하려면 먼저 로그인해주세요.')
      }
      
      if (!response.ok) {
        throw new Error(`다운로드 시작 실패: ${response.status}`)
      }
      
      const data = await response.json()
      const newTasks = data.results.map((result: any) => ({
        jobId: result.queueId || `${result.rank}-${Date.now()}`,
        title: `${result.artist} - ${result.title}`,
        artist: result.artist as string,
        progress: 0,
        status: result.status as DownloadTask['status'],
        error: result.error as string | undefined,
        coverUrl: chartSongs.find(s => s.rank === result.rank)?.coverUrl
      }))
      
      setDownloadTasks(prev => [...prev, ...newTasks])
      
      if (data.results.some((r: any) => r.status === 'failed')) {
        setError('일부 다운로드 시작에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to start downloads:', error)
      setError(error instanceof Error ? error.message : '다운로드를 시작할 수 없습니다.')
    } finally {
      setDownloading(false)
    }
  }
  
  const downloadSingleSong = async (song: ChartSong) => {
    try {
      const response = await fetch('/api/chart', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ songs: [song] })
      })
      
      if (response.status === 401) {
        setError('다운로드 기능을 사용하려면 먼저 로그인해주세요.')
        return
      }
      
      if (!response.ok) throw new Error('Failed to start download')
      
      const data = await response.json()
      const newTask = {
        jobId: data.results[0]?.queueId || `${song.rank}-${Date.now()}`,
        title: `${song.artist} - ${song.title}`,
        artist: song.artist,
        progress: 0,
        status: data.results[0]?.status || 'queued' as const,
        error: data.results[0]?.error,
        coverUrl: song.coverUrl
      }
      
      setDownloadTasks(prev => [...prev, newTask])
    } catch (error) {
      console.error('Failed to start download:', error)
    }
  }
  
  useEffect(() => {
    if (!sessionLoading && isLoggedIn) {
      fetchChart()
    }
  }, [fetchChart, sessionLoading, isLoggedIn])

  // Socket.IO 이벤트 리스너
  useEffect(() => {
    if (!socket.isConnected) return

    const handleDownloadStatus = (data: any) => {
      setDownloadTasks(prev => 
        prev.map(task => 
          task.jobId === data.id 
            ? { ...task, progress: data.progress, status: data.status }
            : task
        )
      )
    }

    const cleanup = socket.on('download:status', handleDownloadStatus)
    return cleanup
  }, [socket])

  if (sessionLoading) {
    return (
      <div className="flex-1 bg-gradient-to-b from-green-900 to-black text-white p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="flex-1 bg-gradient-to-b from-green-900 to-black text-white p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-300 mb-4">멜론 차트를 이용하려면 먼저 로그인해주세요.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-green-900 to-black text-white p-4 md:p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">멜론 차트</h1>
        <Card className="bg-white/10 border-none">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium mb-3">차트 크기 선택</p>
                <RadioGroup value={chartSize} onValueChange={handleChartSizeChange} className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="30" id="r30" />
                    <Label htmlFor="r30">TOP 30</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="50" id="r50" />
                    <Label htmlFor="r50">TOP 50</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="100" id="r100" />
                    <Label htmlFor="r100">TOP 100</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="rcustom" />
                    <Label htmlFor="rcustom">직접 입력</Label>
                  </div>
                </RadioGroup>
                
                {showCustomInput && (
                  <div className="mt-3">
                    <Input
                      type="number"
                      placeholder="숫자 입력 (1-100)"
                      value={customChartSize}
                      onChange={(e) => setCustomChartSize(e.target.value)}
                      className="w-32 bg-white/10 border-white/20 text-white placeholder-gray-400"
                      min="1"
                      max="100"
                    />
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-3">제외할 키워드</p>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="키워드 입력"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                  <Button onClick={handleAddKeyword} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
                
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <Badge
                        key={keyword}
                        variant="secondary"
                        className="bg-red-900/50 text-red-200 border-red-700/50 cursor-pointer hover:bg-red-900/70"
                        onClick={() => handleRemoveKeyword(keyword)}
                      >
                        {keyword}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={downloadAllSongs}
                  disabled={downloading || chartSongs.length === 0 || !isLoggedIn}
                  title={!isLoggedIn ? "로그인 후 이용 가능합니다" : ""}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {!isLoggedIn ? '로그인 필요' : downloading ? '다운로드 중...' : '차트 전체 다운로드'}
                </Button>
                <Button 
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={fetchChart}
                  disabled={loading || !isLoggedIn}
                  title={!isLoggedIn ? "로그인 후 이용 가능합니다" : "새로고침"}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      <Tabs defaultValue="preview">
        <TabsList className="bg-white/10 border-white/20">
          <TabsTrigger value="preview">차트 미리보기</TabsTrigger>
          <TabsTrigger value="downloads">
            다운로드 진행중 ({downloadTasks.filter((t) => t.status === "processing" || t.status === "queued").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin" />
              <span className="ml-2">차트 로딩 중...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {chartSongs.map((song) => (
                <Card key={song.rank} className="bg-white/5 border-white/10 overflow-hidden">
                  <div className="relative">
                    <img
                      src={song.coverUrl || "/placeholder.svg"}
                      alt={`${song.title} album cover`}
                      className="w-full aspect-square object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.svg";
                      }}
                    />
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-green-600 px-2 py-1">{song.rank}</Badge>
                    </div>
                    <Button
                      size="icon"
                      className="absolute bottom-2 right-2 bg-green-600 hover:bg-green-500 rounded-full h-10 w-10"
                      onClick={() => downloadSingleSong(song)}
                      disabled={!isLoggedIn}
                      title={!isLoggedIn ? "로그인 후 이용 가능합니다" : "다운로드"}
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium truncate">{song.title}</p>
                    <p className="text-sm text-gray-400 truncate">{song.artist}</p>
                    {song.duration && (
                      <p className="text-xs text-gray-500 flex items-center mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {song.duration}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="downloads" className="mt-4">
          <div className="space-y-4">
            {downloadTasks.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>다운로드 중인 항목이 없습니다</p>
              </div>
            ) : (
              downloadTasks.map((task, index) => (
                <Card key={index} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={task.coverUrl || "/placeholder.svg"}
                        width={60}
                        height={60}
                        alt={`${task.title} cover`}
                        className="rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder.svg";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        <p className="text-sm text-gray-400 truncate">{task.artist}</p>
                        
                        <div className="mt-2">
                          <Progress value={task.progress} className="h-2" />
                        </div>
                        
                        <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                          <div className="flex items-center">
                            <Music className="w-3 h-3 mr-1" />
                            <span>MP3</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>
                              {task.status === "completed"
                                ? "완료됨"
                                : task.status === "failed"
                                  ? task.error || "다운로드 실패"
                                  : task.status === "queued"
                                    ? "대기중"
                                    : task.progress < 50
                                      ? "약 2분 남음"
                                      : "약 1분 남음"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
