"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { X, CheckCircle, AlertCircle, Clock, Loader2, Music, Pause, Play, Square, Trash2, Search, Archive, RotateCcw } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSocket } from "@/hooks/useSocket"
import { useSession } from "@/hooks/useSession"
import { useDownload } from '@/contexts/DownloadContext'
import Image from 'next/image'

interface DownloadTask {
  jobId: string
  title: string
  artist: string
  progress: number
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused'
  error?: string
  coverUrl?: string
  createdAt?: string
  type?: 'youtube' | 'melon' | 'playlist'
  data?: {
    fileSize?: number
    duration?: number
    quality?: string
    [key: string]: any
  }
}

interface QueueItem {
  id: string
  url: string
  title?: string
  status: string
  progress: number
  createdAt: string
  data?: any
}

interface QueueSummary {
  pending: number
  processing: number
  completed: number
  failed: number
  total: number
  recentGroups: Array<{
    groupType: string
    groupName: string
    completedCount: number
    totalCount: number
    lastUpdated: string
  }>
}

// 긴 텍스트를 중간에 ... 으로 줄이는 유틸리티 함수
const truncateMiddle = (text: string, maxLength: number = 30): string => {
  if (text.length <= maxLength) return text;
  
  const ellipsis = '...';
  const charsToShow = maxLength - ellipsis.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  
  return text.substring(0, frontChars) + ellipsis + text.substring(text.length - backChars);
};

export function DownloadManager() {
  const [downloadTasks, setDownloadTasks] = useState<DownloadTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [queueSummary, setQueueSummary] = useState<QueueSummary | null>(null)
  const socket = useSocket()
  const { isLoggedIn } = useSession()
  const { setDownloadCount } = useDownload()

  // 큐 상태 요약 로드
  const loadQueueSummary = useCallback(async () => {
    if (!isLoggedIn) return

    try {
      const response = await fetch('/api/queue/status', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setQueueSummary(data.data)
      }
    } catch (error) {
      console.error('큐 상태 요약 로드 오류:', error)
    }
  }, [isLoggedIn])

  // 큐 상태 로드
  const loadQueue = useCallback(async () => {
    if (!isLoggedIn) {
      setError('로그인이 필요합니다.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/youtube/queue', {
        credentials: 'include'
      })
      
      if (response.status === 401) {
        setError('세션이 만료되었습니다. 페이지를 새로고침해주세요.')
        return
      }
      
      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`)
      }
      
      const data = await response.json()
      const queueData = data.success ? data.data : []
      
      // 큐 데이터를 DownloadTask 형태로 변환
      const tasks: DownloadTask[] = (queueData || []).map((item: QueueItem) => ({
        jobId: item.id,
        title: item.title || item.url,
        artist: item.data?.artist || '알 수 없음',
        progress: item.progress,
        status: item.status as any,
        coverUrl: item.data?.coverUrl,
        createdAt: item.createdAt,
        type: item.url.includes('melon') ? 'melon' : 'youtube',
        data: item.data
      }))
      
      setDownloadTasks(tasks)
      setDownloadCount(tasks.length) // 다운로드 개수 업데이트
    } catch (err) {
      console.error('Failed to load queue:', err)
      setError(err instanceof Error ? err.message : '큐를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn, setDownloadCount])

  // Socket 이벤트 리스너
  useEffect(() => {
    if (!socket) return

    const handleDownloadStatus = (data: { jobId: string; status: string; progress: number }) => {
      setDownloadTasks(prev => prev.map(task => 
        task.jobId === data.jobId 
          ? { ...task, status: data.status as any, progress: data.progress }
          : task
      ))
    }

    const handleDownloadComplete = (data: { jobId: string; fileId: string; file?: any }) => {
      setDownloadTasks(prev => prev.map(task => 
        task.jobId === data.jobId 
          ? { ...task, status: 'completed', progress: 100 }
          : task
      ))
      // 완료된 작업은 3초 후 목록에서 제거
      setTimeout(() => {
        setDownloadTasks(prev => prev.filter(task => task.jobId !== data.jobId))
      }, 3000)
    }

    const handleDownloadError = (data: { jobId: string; error: string }) => {
      setDownloadTasks(prev => prev.map(task => 
        task.jobId === data.jobId 
          ? { ...task, status: 'failed', error: data.error }
          : task
      ))
    }

    const handlePlaylistItemProgress = (data: { jobId: string; itemTitle: string; progress: number }) => {
      setDownloadTasks(prev => prev.map(task => 
        task.jobId === data.jobId 
          ? { ...task, title: `${task.title} - ${data.itemTitle}`, progress: data.progress }
          : task
      ))
    }

    const statusCleanup = socket.on('download:status', handleDownloadStatus)
    const completeCleanup = socket.on('download:complete', handleDownloadComplete)
    const errorCleanup = socket.on('download:error', handleDownloadError)
    const playlistCleanup = socket.on('playlist:item-progress', handlePlaylistItemProgress)

    return () => {
      statusCleanup()
      completeCleanup()
      errorCleanup()
      playlistCleanup()
    }
  }, [socket])

  // 초기 로드 및 주기적 업데이트
  useEffect(() => {
    loadQueue()
    loadQueueSummary()
    // 5초마다 큐 상태 업데이트
    const interval = setInterval(() => {
      loadQueue()
      loadQueueSummary()
    }, 5000)
    return () => clearInterval(interval)
  }, [loadQueue, loadQueueSummary])

  // 다운로드 취소
  const cancelDownload = async (jobId: string) => {
    try {
      const response = await fetch(`/api/youtube/cancel/${jobId}`, {
        method: 'POST',
        credentials: 'include'
      })
      
      if (response.ok) {
        setDownloadTasks(prev => prev.filter(task => task.jobId !== jobId))
      }
    } catch (err) {
      console.error('Failed to cancel download:', err)
    }
  }

  // 다운로드 중지
  const pauseDownload = async (jobId: string) => {
    try {
      const response = await fetch(`/api/youtube/pause/${jobId}`, {
        method: 'POST',
        credentials: 'include'
      })
      
      if (response.ok) {
        setDownloadTasks(prev => prev.map(task => 
          task.jobId === jobId 
            ? { ...task, status: 'paused' }
            : task
        ))
      }
    } catch (err) {
      console.error('Failed to pause download:', err)
    }
  }

  // 다운로드 재개
  const resumeDownload = async (jobId: string) => {
    try {
      const response = await fetch(`/api/youtube/resume/${jobId}`, {
        method: 'POST',
        credentials: 'include'
      })
      
      if (response.ok) {
        setDownloadTasks(prev => prev.map(task => 
          task.jobId === jobId 
            ? { ...task, status: 'queued' }
            : task
        ))
      }
    } catch (err) {
      console.error('Failed to resume download:', err)
    }
  }


  // 완료된 작업 제거
  const removeCompletedTask = (jobId: string) => {
    setDownloadTasks(prev => prev.filter(task => task.jobId !== jobId))
  }

  // 상태별 아이콘
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      case 'paused':
        return <Pause className="w-5 h-5 text-orange-500" />
      case 'queued':
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />
    }
  }

  // 상태별 라벨
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '완료'
      case 'failed':
        return '실패'
      case 'processing':
        return '처리 중'
      case 'paused':
        return '중지됨'
      case 'queued':
      default:
        return '대기 중'
    }
  }

  // 전체 선택 토글
  const toggleSelectAll = () => {
    if (selectedTasks.length === downloadTasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(downloadTasks.map(task => task.jobId))
    }
  }

  // 개별 선택 토글
  const toggleSelectTask = (jobId: string) => {
    setSelectedTasks(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    )
  }

  // 선택된 작업 삭제
  const deleteSelectedTasks = async () => {
    for (const jobId of selectedTasks) {
      const task = downloadTasks.find(t => t.jobId === jobId)
      if (task && ['processing', 'queued'].includes(task.status)) {
        await pauseDownload(jobId)
      }
      await cancelDownload(jobId)
    }
    setSelectedTasks([])
  }

  // 선택된 작업 중지
  const pauseSelectedTasks = async () => {
    for (const jobId of selectedTasks) {
      await pauseDownload(jobId)
    }
  }

  // 선택된 작업 재개
  const resumeSelectedTasks = async () => {
    for (const jobId of selectedTasks) {
      await resumeDownload(jobId)
    }
  }

  // 필터링된 작업 목록
  const filteredTasks = downloadTasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus
    const matchesSearch = searchQuery === '' || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.artist.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // 상태별 통계
  const statusStats = {
    all: downloadTasks.length,
    queued: downloadTasks.filter(t => t.status === 'queued').length,
    processing: downloadTasks.filter(t => t.status === 'processing').length,
    paused: downloadTasks.filter(t => t.status === 'paused').length,
    completed: downloadTasks.filter(t => t.status === 'completed').length,
    failed: downloadTasks.filter(t => t.status === 'failed').length,
  }

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Music className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">로그인이 필요합니다.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-500" />
          <p className="text-gray-600">다운로드 상태를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadQueue} variant="outline">
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 섹션 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">다운로드 관리</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {downloadTasks.length}개의 작업 {selectedTasks.length > 0 && `(${selectedTasks.length}개 선택)`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadQueue} variant="outline" size="sm">
              <RotateCcw className="w-4 h-4 mr-1" />
              새로고침
            </Button>
          </div>
        </div>

        {/* 큐 상태 요약 */}
        {queueSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400">대기 중</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{queueSummary.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">처리 중</p>
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{queueSummary.processing}</p>
                </div>
                <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400">완료</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{queueSummary.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400">실패</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{queueSummary.failed}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
          </div>
        )}

        {/* 최근 완료된 그룹 */}
        {queueSummary && queueSummary.recentGroups.length > 0 && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Archive className="w-5 h-5 mr-2" />
              최근 완료된 다운로드 그룹
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {queueSummary.recentGroups.slice(0, 6).map((group, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" title={group.groupName}>
                        {truncateMiddle(group.groupName, 25)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {group.groupType === 'melon_chart' ? '🍈 멜론차트' : 
                         group.groupType === 'youtube_playlist' ? '📋 플레이리스트' : 
                         '🎵 단일 파일'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        {group.completedCount}곡
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(group.lastUpdated).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 검색 및 필터 */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="제목 또는 아티스트로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">모든 상태 ({statusStats.all})</option>
              <option value="queued">대기 중 ({statusStats.queued})</option>
              <option value="processing">처리 중 ({statusStats.processing})</option>
              <option value="paused">중지됨 ({statusStats.paused})</option>
              <option value="completed">완료 ({statusStats.completed})</option>
              <option value="failed">실패 ({statusStats.failed})</option>
            </select>
          </div>
        </div>

        {/* 일괄 작업 버튼 */}
        {downloadTasks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={toggleSelectAll} 
              variant="outline" 
              size="sm"
              className={selectedTasks.length === downloadTasks.length ? "bg-blue-100 dark:bg-blue-900" : ""}
            >
              {selectedTasks.length === downloadTasks.length ? "전체 선택 해제" : "전체 선택"}
            </Button>
            
            {selectedTasks.length > 0 && (
              <>
                <Button onClick={pauseSelectedTasks} variant="outline" size="sm">
                  <Pause className="w-4 h-4 mr-1" />
                  선택 중지
                </Button>
                <Button onClick={resumeSelectedTasks} variant="outline" size="sm">
                  <Play className="w-4 h-4 mr-1" />
                  선택 재개
                </Button>
                <Button onClick={deleteSelectedTasks} variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-1" />
                  선택 삭제
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 빈 상태 또는 필터링 결과 없음 */}
      {downloadTasks.length === 0 ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Archive className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">다운로드 목록이 비어있습니다</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              유튜브나 멜론 차트에서 다운로드를 시작해보세요
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => {}}>
                유튜브 다운로드
              </Button>
              <Button variant="outline" onClick={() => {}}>
                멜론 차트
              </Button>
            </div>
          </div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">검색 결과가 없습니다</h3>
            <p className="text-gray-500 dark:text-gray-400">
              다른 검색어나 필터를 시도해보세요
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <Card 
              key={task.jobId} 
              className={`overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer
                ${selectedTasks.includes(task.jobId) 
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              onClick={() => toggleSelectTask(task.jobId)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  {/* 왼쪽: 체크박스, 제목, 아티스트 */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedTasks.includes(task.jobId)}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleSelectTask(task.jobId)
                      }}
                      className="w-4 h-4 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    
                    {/* 썸네일 (있는 경우) */}
                    {task.coverUrl && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                        <Image 
                          src={task.coverUrl} 
                          alt="Cover" 
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          unoptimized
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate" title={task.title}>
                          {truncateMiddle(task.title, 35)}
                        </h3>
                        {task.type && (
                          <Badge 
                            variant={task.type === 'youtube' ? 'destructive' : 'default'}
                            className="text-xs"
                          >
                            {task.type === 'youtube' ? 'YouTube' : task.type === 'melon' ? 'Melon' : 'Playlist'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2" title={task.artist}>
                        {truncateMiddle(task.artist, 30)}
                      </p>
                      
                      {/* 진행률 바 (진행 중/대기 중/중지된 작업만) */}
                      {(task.status === 'processing' || task.status === 'queued' || task.status === 'paused') && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>진행률</span>
                            <span>{task.progress}%</span>
                          </div>
                          <Progress value={task.progress} className="h-2" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 오른쪽: 상태와 컨트롤 버튼 */}
                  <div className="flex items-center gap-3 ml-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {getStatusLabel(task.status)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {task.status === 'processing' && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            pauseDownload(task.jobId)
                          }}
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0 text-orange-500 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900"
                          title="중지"
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      )}
                      {task.status === 'paused' && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            resumeDownload(task.jobId)
                          }}
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0 text-green-500 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900"
                          title="재개"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      {(task.status === 'processing' || task.status === 'queued' || task.status === 'paused') && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            cancelDownload(task.jobId)
                          }}
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900"
                          title="취소"
                        >
                          <Square className="w-4 h-4" />
                        </Button>
                      )}
                      {task.status === 'completed' && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeCompletedTask(task.jobId)
                          }}
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="제거"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 하단 상태 메시지 */}
              {task.status === 'failed' && task.error && (
                <div className="px-4 pb-4">
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700 dark:text-red-300">{task.error}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {task.status === 'completed' && (
                <div className="px-4 pb-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <p className="text-sm text-green-700 dark:text-green-300">다운로드가 완료되었습니다.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {task.status === 'paused' && (
                <div className="px-4 pb-4">
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Pause className="w-4 h-4 text-orange-500" />
                      <p className="text-sm text-orange-700 dark:text-orange-300">다운로드가 중지되었습니다.</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}