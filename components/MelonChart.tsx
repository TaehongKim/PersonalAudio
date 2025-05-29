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
  coverUrl?: string
  error?: string
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
    setLoading(true)
    setError(null)
    try {
      const size = chartSize === 'custom' ? parseInt(customChartSize) || 30 : parseInt(chartSize)
      const excludeParam = keywords.length > 0 ? `&exclude=${keywords.join(',')}` : ''
      
      const response = await fetch(`/api/chart?size=${size}${excludeParam}`)
      if (response.status === 401) {
        setError('세션이 만료되었습니다. 페이지를 새로고침해주세요.')
        setChartSongs([])
        setLoading(false)
        return
      }
      
      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`)
      }
      
      const data = await response.json()
      const chart = data.chart || [];
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
  }, [chartSize, customChartSize, keywords])
  
  const downloadAllSongs = async () => {
    if (chartSongs.length === 0) return
    
    setDownloading(true)
    setError(null)
    try {
      const response = await fetch('/api/chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const newTasks = data.results.map((result: Record<string, unknown>) => ({
        jobId: result.jobId || `${result.rank}-${Date.now()}`,
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: [song] })
      })
      
      if (response.status === 401) {
        setError('다운로드 기능을 사용하려면 먼저 로그인해주세요.')
        return
      }
      
      if (!response.ok) throw new Error('Failed to start download')
      
      const data = await response.json()
      const newTask = {
        jobId: data.results[0]?.jobId || `${song.rank}-${Date.now()}`,
        title: `${song.artist} - ${song.title}`,
        artist: song.artist,
        progress: 0,
        status: data.results[0]?.status || 'queued' as const,
        error: data.results[0]?.error
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
  
  useEffect(() => {
    if (!socket) return
    
    const handleDownloadProgress = (data: Record<string, unknown>) => {
      setDownloadTasks(prev => prev.map(task => 
        task.jobId === data.id 
          ? { ...task, progress: data.progress as number, status: 'processing' as const }
          : task
      ))
    }
    
    const handleDownloadComplete = (data: Record<string, unknown>) => {
      setDownloadTasks(prev => prev.map(task => 
        task.jobId === data.id 
          ? { ...task, progress: 100, status: 'completed' as const }
          : task
      ))
    }
    
    const handleDownloadError = (data: Record<string, unknown>) => {
      setDownloadTasks(prev => prev.map(task => 
        task.jobId === data.id 
          ? { ...task, status: 'failed' as const, error: data.error as string }
          : task
      ))
    }
    
    const unsubscribeProgress = socket.on('download:status', handleDownloadProgress)
    const unsubscribeComplete = socket.on('download:complete', handleDownloadComplete)
    const unsubscribeError = socket.on('download:error', handleDownloadError)
    
    return () => {
      unsubscribeProgress()
      unsubscribeComplete()
      unsubscribeError()
    }
  }, [socket])

  return (
    <div className="flex-1 bg-gradient-to-b from-green-900 to-black text-white p-4 md:p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">멜론 차트</h1>
        <Card className="bg-white/10 border-none">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium mb-3">차트 크기 선택</p>
                <div className="flex flex-wrap gap-4">
                  <label>
                    <input
                      type="radio"
                      name="chartSize"
                      value="30"
                      checked={chartSize === "30"}
                      onChange={() => handleChartSizeChange("30")}
                    />
                    TOP 30
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="chartSize"
                      value="50"
                      checked={chartSize === "50"}
                      onChange={() => handleChartSizeChange("50")}
                    />
                    TOP 50
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="chartSize"
                      value="100"
                      checked={chartSize === "100"}
                      onChange={() => handleChartSizeChange("100")}
                    />
                    TOP 100
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="chartSize"
                      value="custom"
                      checked={chartSize === "custom"}
                      onChange={() => handleChartSizeChange("custom")}
                    />
                    <Label htmlFor="rcustom">직접 입력</Label>
                  </label>
                </div>

                {showCustomInput && (
                  <div className="w-24">
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="숫자 입력"
                      value={customChartSize}
                      onChange={(e) => setCustomChartSize(e.target.value)}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-3">제외 키워드 설정</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {keywords.map((keyword, index) => (
                    <Badge key={index} className="bg-green-700 hover:bg-green-600 px-3 py-1 flex items-center gap-1">
                      {keyword}
                      <button
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="ml-1 hover:bg-green-800 rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="제외할 키워드 입력 후 Enter"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="bg-white/5 border-white/20 text-white"
                  />
                  <Button
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                    onClick={handleAddKeyword}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    추가
                  </Button>
                </div>
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
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-medium">{task.title}</p>
                          <div className="flex items-center">
                            {task.status === "processing" ? (
                              <Badge className="bg-blue-600">
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                진행중
                              </Badge>
                            ) : task.status === "completed" ? (
                              <Badge className="bg-green-600">완료</Badge>
                            ) : task.status === "failed" ? (
                              <Badge className="bg-red-600">실패</Badge>
                            ) : (
                              <Badge className="bg-yellow-600">대기중</Badge>
                            )}
                          </div>
                        </div>
                        {task.status !== 'failed' && (
                          <div className="flex items-center gap-2">
                            <Progress value={task.progress} className="h-2 flex-1" />
                            <span className="text-xs text-gray-400 min-w-[40px] text-right">{task.progress}%</span>
                          </div>
                        )}
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
