"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react"
import { X, CheckCircle, AlertCircle, Clock, Loader2, Music, Pause, Play, Square, Trash2, Search, Archive, RotateCcw, RefreshCw } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSocket } from "@/hooks/useSocket"
import { useSession } from "@/hooks/useSession"
import { useDownload } from '@/contexts/DownloadContext'
import Image from 'next/image'
import { DownloadStatus, DownloadType, FileGroupType } from '../types/download-status';

interface DownloadTask {
  jobId: string
  title: string
  artist: string
  progress: number
  status: DownloadStatus
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

// DownloadQueue 타입을 직접 정의 (prisma schema 기반)
type DownloadQueue = {
  id: string;
  url: string;
  type: string;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
  fileId?: string;
  file?: FileMinimal;
};

// File 타입 최소 정의 (필요한 필드만)
type FileMinimal = {
  id: string;
  title: string;
  artist?: string;
  fileType: string;
  fileSize: number;
  duration?: number;
  thumbnailPath?: string;
  createdAt: string;
};

export const DownloadManager = memo(function DownloadManager() {
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

  // 메모화된 큐 상태 요약 로드
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

  // 메모화된 큐 상태 로드
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
      const tasks: DownloadTask[] = (queueData || []).map((item: DownloadQueue) => {
        let options: Record<string, unknown> = {};
        let errorMessage = undefined;
        try {
          if (item.error && item.error.startsWith('{')) {
            options = JSON.parse(item.error);
          } else if (item.error) {
            errorMessage = item.error;
          }
        } catch {
          errorMessage = item.error;
        }
        const status = (item.status || '').toLowerCase() as DownloadStatus;
        return {
          jobId: item.id,
          title: typeof options.title === 'string' ? options.title : item.url,
          artist: typeof options.artist === 'string' ? options.artist : '알 수 없음',
          progress: item.progress,
          status,
          error: status === 'failed' ? errorMessage : undefined,
          coverUrl: typeof options.coverUrl === 'string' ? options.coverUrl : undefined,
          createdAt: item.createdAt,
          type: item.url.includes('melon') || options.isMelonChart ? 'melon' : 'youtube',
          data: {
            url: item.url,
            type: item.type,
            options: options,
            ...options
          }
        }
      })
      setDownloadTasks(tasks)
      setDownloadCount(tasks.length)
    } catch (err) {
      console.error('Failed to load queue:', err)
      setError(err instanceof Error ? err.message : '큐를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn, setDownloadCount])

  // 메모화된 Socket 이벤트 핸들러들
  const handleDownloadStatus = useCallback((data: { jobId: string; status: DownloadStatus; progress: number }) => {
    setDownloadTasks(prev => prev.map(task => 
      task.jobId === data.jobId 
        ? { ...task, status: data.status, progress: data.progress }
        : task
    ))
  }, [])

  const handleDownloadComplete = useCallback((data: { jobId: string; fileId: string; file?: File }) => {
    setDownloadTasks(prev => prev.map(task => 
      task.jobId === data.jobId 
        ? { ...task, status: DownloadStatus.COMPLETED, progress: 100 }
        : task
    ))
    // 완료된 작업은 3초 후 목록에서 제거
    setTimeout(() => {
      setDownloadTasks(prev => prev.filter(task => task.jobId !== data.jobId))
    }, 3000)
  }, [])

  const handleDownloadError = useCallback((data: { jobId: string; error: string }) => {
    setDownloadTasks(prev => prev.map(task => 
      task.jobId === data.jobId 
        ? { ...task, status: DownloadStatus.FAILED, error: data.error }
        : task
    ))
  }, [])

  const handlePlaylistItemProgress = useCallback((data: { jobId: string; itemTitle: string; progress: number }) => {
    setDownloadTasks(prev => prev.map(task => 
      task.jobId === data.jobId 
        ? { ...task, title: `${task.title} - ${data.itemTitle}`, progress: data.progress }
        : task
    ))
  }, [])

  // Socket 이벤트 리스너
  useEffect(() => {
    if (!socket) return

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
  }, [socket, handleDownloadStatus, handleDownloadComplete, handleDownloadError, handlePlaylistItemProgress])

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

  // 메모화된 다운로드 취소
  const cancelDownload = useCallback(async (jobId: string) => {
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
  }, [])

  // 메모화된 다운로드 중지
  const pauseDownload = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/youtube/pause/${jobId}`, {
        method: 'POST',
        credentials: 'include'
      })
      
      if (response.ok) {
        setDownloadTasks(prev => prev.map(task => 
          task.jobId === jobId 
            ? { ...task, status: DownloadStatus.PENDING }
            : task
        ))
      }
    } catch (err) {
      console.error('Failed to pause download:', err)
    }
  }, [])

  // 메모화된 다운로드 재개
  const resumeDownload = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/youtube/resume/${jobId}`, {
        method: 'POST',
        credentials: 'include'
      })
      
      if (response.ok) {
        setDownloadTasks(prev => prev.map(task => 
          task.jobId === jobId 
            ? { ...task, status: DownloadStatus.PENDING }
            : task
        ))
      }
    } catch (err) {
      console.error('Failed to resume download:', err)
    }
  }, [])

  // 완료된 작업 제거
  const removeCompletedTask = (jobId: string) => {
    setDownloadTasks(prev => prev.filter(task => task.jobId !== jobId))
  }

  // 상태별 아이콘
  const getStatusIcon = (status: DownloadStatus) => {
    switch (status) {
      case DownloadStatus.COMPLETED:
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case DownloadStatus.FAILED:
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case DownloadStatus.PROCESSING:
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      case DownloadStatus.PENDING:
        return <Clock className="w-5 h-5 text-yellow-500" />
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />
    }
  }

  // 상태별 라벨
  const getStatusLabel = (status: DownloadStatus) => {
    switch (status) {
      case DownloadStatus.COMPLETED:
        return '완료'
      case DownloadStatus.FAILED:
        return '실패'
      case DownloadStatus.PROCESSING:
        return '처리 중'
      case DownloadStatus.PENDING:
        return '대기 중'
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
      if (task && [DownloadStatus.PROCESSING, DownloadStatus.PENDING].includes(task.status)) {
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

  // 실패한 다운로드 재시도
  const retryDownload = async (task: DownloadTask) => {
    try {
      // task.data에서 원본 URL 추출
      const url = task.data?.url;
      if (!url) {
        console.error('재시도할 URL을 찾을 수 없습니다:', task);
        alert('재시도할 URL을 찾을 수 없습니다. 원본 다운로드 요청을 다시 시도해주세요.');
        return;
      }

      // 다운로드 타입 결정
      let downloadType = 'mp3'; // 기본값
      
      if (task.data?.type) {
        // DownloadType enum 값을 문자열로 변환
        if (task.data.type.includes('VIDEO') || task.data.type === 'VIDEO') {
          downloadType = 'video';
        } else if (task.data.type.includes('PLAYLIST')) {
          downloadType = task.data.type.includes('VIDEO') ? 'playlist-video' : 'playlist-mp3';
        }
      }

      console.log(`재시도 중: ${task.title} - URL: ${url}, Type: ${downloadType}`);

      const response = await fetch('/api/youtube/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, type: downloadType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '재시도 중 오류가 발생했습니다.');
      }

      // 기존 실패한 작업을 목록에서 제거
      setDownloadTasks(prev => prev.filter(t => t.jobId !== task.jobId));
      
      console.log(`재시도 성공: ${task.title}, 새 Job ID: ${data.data.id}`);
      
      // 성공 알림
      // alert(`"${task.title}" 재시도가 시작되었습니다.`);
    } catch (err) {
      console.error('재시도 오류:', err);
      alert(`재시도 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    }
  };

  // 선택된 실패 작업들 재시도
  const retrySelectedTasks = async () => {
    const failedTasks = downloadTasks.filter(task => 
      selectedTasks.includes(task.jobId) && task.status === DownloadStatus.FAILED
    );

    for (const task of failedTasks) {
      await retryDownload(task);
    }
    
    setSelectedTasks([]);
  };

  // 모든 실패 작업 재시도
  const retryAllFailedTasks = async () => {
    const failedTasks = downloadTasks.filter(task => task.status === DownloadStatus.FAILED);
    
    for (const task of failedTasks) {
      await retryDownload(task);
    }
  };

  // 실패한 작업들 삭제
  const deleteFailedTasks = async (jobIds: string[]) => {
    try {
      // 일괄 삭제 API 호출
      const response = await fetch('/api/youtube/delete-batch', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ids: jobIds })
      });

      if (response.ok) {
        // 성공 시 프론트엔드 상태에서 제거
        setDownloadTasks(prev => prev.filter(task => !jobIds.includes(task.jobId)));
        
        // 선택된 작업 목록에서도 제거
        setSelectedTasks(prev => prev.filter(id => !jobIds.includes(id)));
        
        console.log(`${jobIds.length}개의 실패 작업이 삭제되었습니다.`);
      } else {
        const error = await response.json();
        console.error('삭제 실패:', error.message);
      }
    } catch (error) {
      console.error('삭제 요청 실패:', error);
    }
  };

  // 모든 실패 작업 삭제
  const clearAllFailedTasks = async () => {
    const failedJobIds = downloadTasks.filter(task => task.status === DownloadStatus.FAILED).map(task => task.jobId);
    await deleteFailedTasks(failedJobIds);
  };

  // 선택된 실패 작업들 삭제
  const deleteSelectedFailedTasks = async () => {
    const selectedFailedJobIds = downloadTasks
      .filter(task => selectedTasks.includes(task.jobId) && task.status === DownloadStatus.FAILED)
      .map(task => task.jobId);
    
    await deleteFailedTasks(selectedFailedJobIds);
    setSelectedTasks([]);
  };

  // filterStatus를 항상 소문자로 유지
  const handleFilterStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value.toLowerCase())
  }

  // 메모화된 필터링된 작업 목록
  const filteredTasks = useMemo(() => {
    return downloadTasks.filter(task => {
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus
      const matchesSearch = searchQuery === '' || 
        (task.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (task.artist?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [downloadTasks, filterStatus, searchQuery])

  // 메모화된 상태별 통계
  const statusStats = useMemo(() => {
    return {
      all: downloadTasks.length,
      pending: downloadTasks.filter(t => t.status === DownloadStatus.PENDING).length,
      processing: downloadTasks.filter(t => t.status === DownloadStatus.PROCESSING).length,
      completed: downloadTasks.filter(t => t.status === DownloadStatus.COMPLETED).length,
      failed: downloadTasks.filter(t => t.status === DownloadStatus.FAILED).length,
    }
  }, [downloadTasks])

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-48 sm:h-64">
        <div className="text-center">
          <Music className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 text-sm sm:text-base">로그인이 필요합니다.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 sm:h-64">
        <div className="text-center">
          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-4 animate-spin text-blue-500" />
          <p className="text-gray-600 text-sm sm:text-base">다운로드 상태를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 sm:h-64">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-red-500" />
          <p className="text-red-600 mb-4 text-sm sm:text-base">{error}</p>
          <Button onClick={loadQueue} variant="outline" size="sm" className="text-sm">
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* 헤더 섹션 */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">다운로드 관리</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">대기 중</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300">{queueSummary.pending}</p>
                </div>
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 sm:p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400">처리 중</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-700 dark:text-yellow-300">{queueSummary.processing}</p>
                </div>
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 animate-spin" />
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">완료</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300">{queueSummary.completed}</p>
                </div>
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 p-3 sm:p-4 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">실패</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-300">{queueSummary.failed}</p>
                </div>
                <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {queueSummary.recentGroups.slice(0, 6).map((group, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" title={group.groupName}>
                        {truncateMiddle(group.groupName, window.innerWidth < 640 ? 20 : 25)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {group.groupType === 'melon_chart' ? '🍈 멜론차트' : 
                         group.groupType === 'youtube_playlist' ? '📋 플레이리스트' : 
                         '🎵 단일 파일'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
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
        <div className="flex flex-col gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="제목 또는 아티스트로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>
          
          <div className="flex justify-start">
            <select
              value={filterStatus}
              onChange={handleFilterStatusChange}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm sm:text-base min-w-0 max-w-full"
            >
              <option value="all">모든 상태 ({statusStats.all})</option>
              <option value="pending">대기 중 ({statusStats.pending})</option>
              <option value="processing">처리 중 ({statusStats.processing})</option>
              <option value="completed">완료 ({statusStats.completed})</option>
              <option value="failed">실패 ({statusStats.failed})</option>
            </select>
          </div>
        </div>

        {/* 일괄 작업 버튼 */}
        {downloadTasks.length > 0 && (
          <div className="flex flex-wrap gap-2 text-sm">
            <Button 
              onClick={toggleSelectAll} 
              variant="outline" 
              size="sm"
              className={`text-xs sm:text-sm ${selectedTasks.length === downloadTasks.length ? "bg-blue-100 dark:bg-blue-900" : ""}`}
            >
              <span className="hidden sm:inline">{selectedTasks.length === downloadTasks.length ? "전체 선택 해제" : "전체 선택"}</span>
              <span className="sm:hidden">{selectedTasks.length === downloadTasks.length ? "전체 해제" : "전체"}</span>
            </Button>
            
            {selectedTasks.length > 0 && (
              <>
                <Button onClick={pauseSelectedTasks} variant="outline" size="sm" className="text-xs sm:text-sm">
                  <Pause className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                  <span className="hidden sm:inline">선택 중지</span>
                  <span className="sm:hidden">중지</span>
                </Button>
                <Button onClick={resumeSelectedTasks} variant="outline" size="sm" className="text-xs sm:text-sm">
                  <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                  <span className="hidden sm:inline">선택 재개</span>
                  <span className="sm:hidden">재개</span>
                </Button>
                <Button onClick={deleteSelectedTasks} variant="destructive" size="sm" className="text-xs sm:text-sm">
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                  <span className="hidden sm:inline">선택 삭제</span>
                  <span className="sm:hidden">삭제</span>
                </Button>
                
                {/* 선택된 작업 중 실패한 것들에 대한 특별 액션 */}
                {downloadTasks.some(task => selectedTasks.includes(task.jobId) && task.status === DownloadStatus.FAILED) && (
                  <>
                    <Button onClick={retrySelectedTasks} variant="outline" size="sm" className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm">
                      <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                      <span className="hidden sm:inline">선택 재시도</span>
                      <span className="sm:hidden">재시도</span>
                    </Button>
                    <Button onClick={deleteSelectedFailedTasks} variant="destructive" size="sm" className="text-xs sm:text-sm">
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                      <span className="hidden sm:inline">실패 작업 삭제</span>
                      <span className="sm:hidden">실패 삭제</span>
                    </Button>
                  </>
                )}
              </>
            )}

            {/* 실패 필터 상태일 때 특별 액션들 */}
            {filterStatus === DownloadStatus.FAILED && statusStats.failed > 0 && (
              <>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
                <Button onClick={retryAllFailedTasks} variant="outline" size="sm" className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm">
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                  <span className="hidden sm:inline">모든 실패 작업 재시도</span>
                  <span className="sm:hidden">전체 재시도</span>
                </Button>
                <Button onClick={clearAllFailedTasks} variant="destructive" size="sm" className="text-xs sm:text-sm">
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                  <span className="hidden sm:inline">모든 실패 작업 삭제</span>
                  <span className="sm:hidden">전체 삭제</span>
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
          {/* 실패 필터 상태일 때 스크롤 가능한 컨테이너 */}
          {filterStatus === DownloadStatus.FAILED ? (
            <div className="max-h-96 overflow-y-auto space-y-3 pr-2 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  실패한 다운로드 목록
                </h3>
                <Badge variant="destructive" className="text-sm">
                  {filteredTasks.length}개
                </Badge>
              </div>
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
                  <div className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      {/* 왼쪽: 체크박스, 제목, 아티스트 */}
                      <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.jobId)}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleSelectTask(task.jobId)
                          }}
                          className="w-4 h-4 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                        />
                        
                        {/* 썸네일 (있는 경우) */}
                        {task.coverUrl && (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
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
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm sm:text-base" title={task.title}>
                              {truncateMiddle(task.title, window.innerWidth < 640 ? 20 : 35)}
                            </h3>
                            {task.type && (
                              <Badge 
                                variant={task.type === 'youtube' ? 'destructive' : 'default'}
                                className="text-xs flex-shrink-0"
                              >
                                {task.type === 'youtube' ? 'YT' : task.type === 'melon' ? 'ML' : 'PL'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate mb-2" title={task.artist}>
                            {truncateMiddle(task.artist, window.innerWidth < 640 ? 15 : 30)}
                          </p>
                        </div>
                      </div>

                      {/* 오른쪽: 상태와 컨트롤 버튼 */}
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 ml-2 sm:ml-4 flex-shrink-0">
                        <div className="flex items-center gap-1 sm:gap-2">
                          {getStatusIcon(task.status)}
                          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
                            {getStatusLabel(task.status)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              retryDownload(task)
                            }}
                            variant="ghost"
                            size="sm"
                            className="w-7 h-7 sm:w-8 sm:h-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
                            title="재시도"
                          >
                            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteFailedTasks([task.jobId])
                            }}
                            variant="ghost"
                            size="sm"
                            className="w-7 h-7 sm:w-8 sm:h-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900"
                            title="삭제"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* 하단 상태 메시지 */}
                    {task.status === DownloadStatus.FAILED && task.error && (
                      <div className="mt-3">
                        <div className="p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                            <div className="flex items-start gap-2 flex-1">
                              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-red-800 dark:text-red-200 mb-1">다운로드 실패</p>
                                <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 break-words">{task.error}</p>
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  retryDownload(task)
                                }}
                                size="sm"
                                variant="outline"
                                className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs"
                              >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                재시도
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteFailedTasks([task.jobId])
                                }}
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                삭제
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* 일반 목록 (기존 코드) */
            filteredTasks.map((task) => (
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
                        {[DownloadStatus.PROCESSING, DownloadStatus.PENDING].includes(task.status) && (
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
                        {task.status === DownloadStatus.PROCESSING && (
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
                        {task.status === DownloadStatus.PENDING && (
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
                        {[DownloadStatus.PROCESSING, DownloadStatus.PENDING].includes(task.status) && (
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
                        {task.status === DownloadStatus.FAILED && (
                          <>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                retryDownload(task)
                              }}
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
                              title="재시도"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteFailedTasks([task.jobId])
                              }}
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {task.status === DownloadStatus.COMPLETED && (
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
                  
                  {/* 하단 상태 메시지 */}
                  {task.status === DownloadStatus.FAILED && task.error && (
                    <div className="px-4 pb-4">
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 flex-1">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">다운로드 실패</p>
                              <p className="text-sm text-red-700 dark:text-red-300">{task.error}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                retryDownload(task)
                              }}
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              재시도
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteFailedTasks([task.jobId])
                              }}
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              삭제
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {task.status === DownloadStatus.COMPLETED && (
                    <div className="px-4 pb-4">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <p className="text-sm text-green-700 dark:text-green-300">다운로드가 완료되었습니다.</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {task.status === DownloadStatus.PENDING && (
                    <div className="px-4 pb-4">
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-yellow-500" />
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">다운로드가 대기 중입니다.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* 실패 상태 전용 안내 메시지 */}
      {filterStatus === DownloadStatus.FAILED && statusStats.failed > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-red-800 dark:text-red-200 mb-1">
                실패한 다운로드 {statusStats.failed}개
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                네트워크 오류, 동영상 삭제, 또는 기타 문제로 다운로드에 실패한 항목들입니다. 
                개별 재시도하거나 일괄로 처리할 수 있습니다.
              </p>
              <div className="flex gap-2">
                <Button onClick={retryAllFailedTasks} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  모두 재시도
                </Button>
                <Button onClick={clearAllFailedTasks} variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-1" />
                  모두 삭제
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
});

export default DownloadManager;