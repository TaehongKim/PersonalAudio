"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Filter, X, Music, Clock, RefreshCw, Download } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useSession } from "@/hooks/useSession"
import { toast } from 'react-toastify'
import type { ChartSong } from '@/types/chart'
import Image from 'next/image'

// 긴 텍스트를 중간에 ... 으로 줄이는 유틸리티 함수
const truncateMiddle = (text: string, maxLength: number = 20): string => {
  if (text.length <= maxLength) return text;
  
  const ellipsis = '...';
  const charsToShow = maxLength - ellipsis.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  
  return text.substring(0, frontChars) + ellipsis + text.substring(text.length - backChars);
};

export function MelonChart() {
  const [chartSize, setChartSize] = useState("30")
  const [customChartSize, setCustomChartSize] = useState("")
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [chartSongs, setChartSongs] = useState<ChartSong[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const lastUpdateRef = useRef<string>("")
  const [filteredSongs, setFilteredSongs] = useState<ChartSong[]>([])
  
  const { isLoggedIn, isLoading: sessionLoading } = useSession()
  
  // 필터링 로직 분리
  const applyFiltering = useCallback((songs: ChartSong[], filterKeywords: string[] = keywords) => {
    let filtered = songs
    if (filterKeywords.length > 0) {
      filtered = songs.filter((song) => {
        const searchText = `${song.title} ${song.artist}`.toLowerCase()
        return !filterKeywords.some(keyword => searchText.includes(keyword.toLowerCase()))
      })
    }
    setFilteredSongs(filtered)
    
    if (filtered.length === 0 && filterKeywords.length > 0) {
      setError('필터링 조건에 맞는 곡이 없습니다. 다른 키워드를 시도해보세요.')
    } else if (filtered.length > 0) {
      setError(null)
    }
  }, [keywords])

  const handleAddKeyword = () => {
    if (keywordInput.trim() !== "" && !keywords.includes(keywordInput.trim())) {
      const newKeywords = [...keywords, keywordInput.trim()]
      setKeywords(newKeywords)
      setKeywordInput("")
      // 키워드 추가 시 즉시 필터링 적용
      applyFiltering(chartSongs, newKeywords)
    }
  }

  const handleRemoveKeyword = (keyword: string) => {
    const newKeywords = keywords.filter((k) => k !== keyword)
    setKeywords(newKeywords)
    // 키워드 제거 시 즉시 필터링 적용
    applyFiltering(chartSongs, newKeywords)
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
    if (value !== "custom") {
      // 상태 업데이트와 동시에 새로운 값으로 차트 가져오기
      fetchChart(true, value, customChartSize)
    }
  }
  
  const handleCustomSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomChartSize(value)
    if (value && parseInt(value) > 0 && parseInt(value) <= 100) {
      // 상태 업데이트와 동시에 새로운 값으로 차트 가져오기
      fetchChart(true, chartSize, value)
    }
  }

  const fetchChart = useCallback(async (force = false, overrideSize?: string, overrideCustomSize?: string) => {
    if (!isLoggedIn) {
      setError('로그인이 필요합니다.')
      return
    }
    
    // 강제 새로고침이 아닌 경우 오늘 날짜 확인
    if (!force) {
      const today = new Date().toISOString().split('T')[0]
      if (lastUpdateRef.current === today) {
        return // 이미 오늘 업데이트했으면 스킵
      }
    }
    
    setLoading(true)
    setError(null)
    try {
      // 오버라이드 값이 있으면 사용, 없으면 현재 상태 사용
      const currentChartSize = overrideSize || chartSize
      const currentCustomSize = overrideCustomSize || customChartSize
      const size = currentChartSize === 'custom' ? parseInt(currentCustomSize) || 30 : parseInt(currentChartSize)
      
      console.log(`차트 사이즈: ${currentChartSize}, 커스텀: ${currentCustomSize}, 최종: ${size}`)
      
      const response = await fetch(`/api/chart?size=${size}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.status === 401) {
        setError('세션이 만료되었습니다. 페이지를 새로고침해주세요.')
        setChartSongs([])
        setFilteredSongs([])
        return
      }
      
      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`)
      }
      
      const data = await response.json()
      const chart = data.chart || []
      
      setChartSongs(chart)
      applyFiltering(chart)
      
      if (!force) {
        const today = new Date().toISOString().split('T')[0]
        lastUpdateRef.current = today // 업데이트 날짜 기록
      }
      
      if (chart.length === 0) {
        setError('차트 데이터를 가져오는 중입니다. 잠시 후 다시 시도해주세요.')
      }
    } catch (error) {
      console.error('Failed to fetch chart:', error)
      setError(error instanceof Error ? error.message : '차트를 불러오는데 실패했습니다.')
      setChartSongs([])
      setFilteredSongs([])
    } finally {
      setLoading(false)
    }
  }, [applyFiltering, isLoggedIn])

  // 다음 자정까지의 시간(밀리초) 계산
  const getTimeUntilMidnight = useCallback(() => {
    const now = new Date()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return tomorrow.getTime() - now.getTime()
  }, [])

  // 자정에 실행될 업데이트 예약
  const scheduleNextUpdate = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
    }
    intervalRef.current = setTimeout(() => {
      fetchChart()
      scheduleNextUpdate() // 다음 자정 업데이트 예약
    }, getTimeUntilMidnight())
  }, [fetchChart, getTimeUntilMidnight])

  useEffect(() => {
    if (!sessionLoading && isLoggedIn) {
      fetchChart() // 초기 로드
      scheduleNextUpdate() // 다음 자정 업데이트 예약
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
      }
    }
  }, [fetchChart, scheduleNextUpdate, sessionLoading, isLoggedIn])

  const downloadSelectedSongs = async () => {
    try {
      setDownloading(true)
      
      const response = await fetch('/api/chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songs: filteredSongs
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '다운로드 요청 실패')
      }

      const result = await response.json()
      toast.success(result.message)
      
    } catch (error) {
      console.error('다운로드 오류:', error)
      toast.error(error instanceof Error ? error.message : '다운로드 중 오류가 발생했습니다.')
    } finally {
      setDownloading(false)
    }
  }

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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">멜론 차트</h1>
          {chartSongs.length > 0 && (
            <p className="text-gray-400 text-sm mt-1">
              {keywords.length > 0 ? (
                <>
                  전체 {chartSongs.length}곡 중 {filteredSongs.length}곡 표시
                  {filteredSongs.length !== chartSongs.length && (
                    <span className="text-yellow-400 ml-2">
                      ({chartSongs.length - filteredSongs.length}곡 필터링됨)
                    </span>
                  )}
                </>
              ) : (
                `총 ${chartSongs.length}곡`
              )}
            </p>
          )}
        </div>
        <Button
          onClick={downloadSelectedSongs}
          disabled={downloading || loading || filteredSongs.length === 0}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          {downloading ? '다운로드 중...' : `전체 다운로드 (${filteredSongs.length}곡)`}
        </Button>
      </div>

      <div className="mb-8">
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
                      onChange={handleCustomSizeChange}
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
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => fetchChart(true, chartSize, customChartSize)}
                  disabled={loading || !isLoggedIn}
                  title={!isLoggedIn ? "로그인 후 이용 가능합니다" : "새로고침"}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  새로고침
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

      <div className="mt-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin" />
              <span className="ml-2">차트 로딩 중...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {filteredSongs.map((song) => (
                <Card key={song.rank} className="bg-white/5 border-white/10 overflow-hidden">
                  <div className="relative">
                    <Image
                      src={song.coverUrl || "/placeholder.svg"}
                      alt={`${song.title} album cover`}
                      width={240}
                      height={240}
                      className="w-full aspect-square object-cover"
                      unoptimized
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.svg";
                      }}
                    />
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-green-600 px-2 py-1">{song.rank}</Badge>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium truncate" title={song.title}>
                      {truncateMiddle(song.title, 18)}
                    </p>
                    <p className="text-sm text-gray-400 truncate" title={song.artist}>
                      {truncateMiddle(song.artist, 16)}
                    </p>
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
      </div>
    </div>
  )
}
