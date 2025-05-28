"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import {
  Download,
  Trash2,
  Search,
  Share2,
  Music,
  Video,
  SortDesc,
  Filter,
  Play,
  Pause,
  FolderOpen,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { usePlayer } from "@/contexts/PlayerContext"

// API 응답 타입 정의
interface FileData {
  id: string
  title: string
  artist: string | null
  fileType: string
  fileSize: number
  duration: number | null
  thumbnailPath: string | null
  createdAt: string
  downloads: number
}

interface FilesResponse {
  files: FileData[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  totalStorageUsed: number
}

interface StatsResponse {
  totalFiles: number
  totalStorageUsed: number
  storageLimit: number
  storageUsagePercentage: number
  fileTypeStats: {
    fileType: string
    count: number
    totalSize: number
  }[]
  recentFiles: FileData[]
  popularFiles: FileData[]
}

// 유틸리티 함수들
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('ko-KR')
}

export function FilesManager() {
  // 상태 관리
  const [files, setFiles] = useState<FileData[]>([])
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState("desc")
  const [filterType, setFilterType] = useState("all")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const { state: playerState, loadFile, loadPlaylist } = usePlayer()
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<FilesResponse['pagination'] | null>(null)
  const [processingAction, setProcessingAction] = useState<string | null>(null)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareFormData, setShareFormData] = useState({
    expiresIn: 168 as number | null, // 7일 (시간 단위)
    maxDownloads: null as number | null
  })

  // 데이터 로딩 함수
  const loadFiles = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
        ...(sortBy && { sortBy }),
        ...(sortOrder && { sortOrder }),
        ...(filterType !== 'all' && { fileType: filterType })
      })

      const response = await fetch(`/api/files?${params}`)
      if (!response.ok) {
        throw new Error('파일 목록을 불러오는데 실패했습니다.')
      }

      const data: FilesResponse = await response.json()
      setFiles(data.files)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchQuery, sortBy, sortOrder, filterType])

  // 통계 데이터 로딩
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch('/api/files/stats')
      if (!response.ok) {
        throw new Error('통계 정보를 불러오는데 실패했습니다.')
      }

      const data: StatsResponse = await response.json()
      setStats(data)
    } catch (err) {
      console.error('통계 로딩 오류:', err)
    }
  }, [])

  // 컴포넌트 마운트 시 데이터 로딩
  useEffect(() => {
    loadFiles()
    loadStats()
  }, [loadFiles, loadStats])

  // 검색 쿼리 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy, sortOrder, filterType])

  // 파일 액션 함수들
  const toggleItemSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((itemId) => itemId !== id))
    } else {
      setSelectedItems([...selectedItems, id])
    }
  }

  const toggleSelectAll = () => {
    const currentFileIds = files.map((file) => file.id)
    if (selectedItems.length === currentFileIds.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(currentFileIds)
    }
  }

  const handleDownloadFile = async (fileId: string) => {
    try {
      setProcessingAction(`download-${fileId}`)
      const response = await fetch(`/api/files/${fileId}/download`)
      if (!response.ok) {
        throw new Error('다운로드에 실패했습니다.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'download'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '다운로드 중 오류가 발생했습니다.')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('정말로 이 파일을 삭제하시겠습니까?')) return

    try {
      setProcessingAction(`delete-${fileId}`)
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('파일 삭제에 실패했습니다.')
      }

      await loadFiles()
      await loadStats()
      setSelectedItems(selectedItems.filter(id => id !== fileId))
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 삭제 중 오류가 발생했습니다.')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleBulkDownload = async () => {
    if (selectedItems.length === 0) return

    try {
      setProcessingAction('bulk-download')
      const response = await fetch('/api/files/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'download',
          fileIds: selectedItems
        })
      })

      if (!response.ok) {
        throw new Error('대량 다운로드에 실패했습니다.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'files.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setSelectedItems([])
    } catch (err) {
      setError(err instanceof Error ? err.message : '대량 다운로드 중 오류가 발생했습니다.')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return
    if (!confirm(`선택한 ${selectedItems.length}개 파일을 모두 삭제하시겠습니까?`)) return

    try {
      setProcessingAction('bulk-delete')
      const response = await fetch('/api/files/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'delete',
          fileIds: selectedItems
        })
      })

      if (!response.ok) {
        throw new Error('대량 삭제에 실패했습니다.')
      }

      await loadFiles()
      await loadStats()
      setSelectedItems([])
    } catch (err) {
      setError(err instanceof Error ? err.message : '대량 삭제 중 오류가 발생했습니다.')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleRefresh = () => {
    loadFiles()
    loadStats()
  }

  const togglePlayFile = (file: FileData, e: React.MouseEvent) => {
    e.stopPropagation()
    if (playerState.currentFile?.id === file.id && playerState.isPlaying) {
      // 현재 재생 중인 파일이면 플레이어를 통해 일시정지
      // 이 경우 PlayerControls에서 직접 제어하도록 함
      return
    } else {
      // 새로운 파일 재생
      loadFile(file)
    }
  }

  const playAllFiles = () => {
    if (files.length > 0) {
      loadPlaylist(files, 0)
    }
  }

  const handleCreateShare = async () => {
    if (selectedItems.length === 0) {
      setError('공유할 파일을 선택해주세요.')
      return
    }

    try {
      setProcessingAction('create-share')
      const response = await fetch('/api/shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileIds: selectedItems,
          ...shareFormData
        })
      })

      if (!response.ok) {
        throw new Error('공유 링크 생성에 실패했습니다.')
      }

      const data = await response.json()
      
      // 링크 복사
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(data.share.shareUrl)
      }
      
      setSelectedItems([])
      setShowShareDialog(false)
      // TODO: 성공 메시지 표시
    } catch (err) {
      setError(err instanceof Error ? err.message : '공유 링크 생성 중 오류가 발생했습니다.')
    } finally {
      setProcessingAction(null)
    }
  }

  const highlightText = (text: string) => {
    if (!searchQuery) return text

    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"))
    return parts.map((part, index) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <span key={index} className="bg-yellow-500/30">
          {part}
        </span>
      ) : (
        part
      ),
    )
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.toLowerCase().includes('mp3') || fileType.toLowerCase().includes('audio')) {
      return <Music className="h-4 w-4 text-green-400" />
    } else {
      return <Video className="h-4 w-4 text-blue-400" />
    }
  }

  const getFileBadgeColor = (fileType: string) => {
    if (fileType.toLowerCase().includes('mp3') || fileType.toLowerCase().includes('audio')) {
      return "bg-green-600"
    } else {
      return "bg-blue-600"
    }
  }

  if (loading && files.length === 0) {
    return (
      <div className="flex-1 bg-gradient-to-b from-purple-900 to-black text-white p-4 md:p-8 overflow-y-auto">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>파일 목록을 불러오는 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-purple-900 to-black text-white p-4 md:p-8 overflow-y-auto">
      <div className="mb-6">
        {/* 브레드크럼 네비게이션 */}
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink className="flex items-center text-gray-300">
                <FolderOpen className="h-4 w-4 mr-1" />내 파일
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* 에러 표시 */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-600 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center">
            <h1 className="text-3xl font-bold">내 파일</h1>
            <Button
              variant="outline"
              size="sm"
              className="ml-4 border-white/20 hover:bg-white/10"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedItems.length > 0 ? (
              <>
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => setSelectedItems([])}
                  disabled={processingAction !== null}
                >
                  취소
                </Button>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700" 
                  onClick={toggleSelectAll}
                  disabled={processingAction !== null}
                >
                  {selectedItems.length === files.length ? "전체 선택 해제" : "전체 선택"}
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleBulkDownload}
                  disabled={processingAction !== null}
                >
                  {processingAction === 'bulk-download' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  다운로드 ({selectedItems.length})
                </Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleBulkDelete}
                  disabled={processingAction !== null}
                >
                  {processingAction === 'bulk-delete' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  삭제 ({selectedItems.length})
                </Button>
              </>
            ) : (
              <>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={playAllFiles}
                  disabled={processingAction !== null || files.length === 0}
                >
                  <Play className="w-4 h-4 mr-2" />
                  전체 재생
                </Button>
                <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-purple-600 hover:bg-purple-700"
                      disabled={processingAction !== null || selectedItems.length === 0}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      공유 링크 생성
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-800 text-white">
                    <DialogHeader>
                      <DialogTitle>공유 링크 생성</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-400 mb-4">
                          선택한 {selectedItems.length}개 파일을 공유할 링크를 생성합니다.
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="expiry">만료 시간</Label>
                        <Select 
                          value={shareFormData.expiresIn?.toString() || 'null'} 
                          onValueChange={(value) => setShareFormData(prev => ({
                            ...prev,
                            expiresIn: value === 'null' ? null : parseInt(value)
                          }))}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="만료일 선택" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 text-white">
                            <SelectItem value="24">1일</SelectItem>
                            <SelectItem value="168">7일</SelectItem>
                            <SelectItem value="720">30일</SelectItem>
                            <SelectItem value="2160">90일</SelectItem>
                            <SelectItem value="null">무기한</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="maxDownloads">최대 다운로드 횟수</Label>
                        <Input
                          type="number"
                          placeholder="제한 없음"
                          value={shareFormData.maxDownloads || ''}
                          onChange={(e) => setShareFormData(prev => ({
                            ...prev,
                            maxDownloads: e.target.value ? parseInt(e.target.value) : null
                          }))}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10"
                          onClick={() => setShowShareDialog(false)}
                          disabled={processingAction !== null}
                        >
                          취소
                        </Button>
                        <Button 
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={handleCreateShare}
                          disabled={processingAction !== null}
                        >
                          {processingAction === 'create-share' ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Share2 className="w-4 h-4 mr-2" />
                          )}
                          공유 링크 생성
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative col-span-1 md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="파일 검색..."
              className="bg-white/10 border-white/20 text-white pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-')
              setSortBy(field)
              setSortOrder(order)
            }}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <div className="flex items-center">
                  <SortDesc className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="정렬 기준" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">최신순</SelectItem>
                <SelectItem value="createdAt-asc">오래된순</SelectItem>
                <SelectItem value="title-asc">제목순 (가나다)</SelectItem>
                <SelectItem value="title-desc">제목순 (하바타)</SelectItem>
                <SelectItem value="artist-asc">아티스트순 (가나다)</SelectItem>
                <SelectItem value="fileSize-desc">크기순 (큰 것부터)</SelectItem>
                <SelectItem value="fileSize-asc">크기순 (작은 것부터)</SelectItem>
                <SelectItem value="downloads-desc">인기순</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <div className="flex items-center">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="파일 유형" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 파일</SelectItem>
                <SelectItem value="mp3">MP3</SelectItem>
                <SelectItem value="mp4">비디오</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {stats && (
          <div className="bg-white/5 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-400">저장 공간</p>
              <p className="font-medium">
                {formatFileSize(stats.totalStorageUsed)} 사용 중 ({formatFileSize(stats.storageLimit)} 중)
              </p>
              <p className="text-xs text-gray-500 mt-1">
                총 {stats.totalFiles}개 파일
              </p>
            </div>
            <div className="w-full md:w-1/2 flex items-center gap-4">
              <Progress value={stats.storageUsagePercentage} className="h-2 flex-1" />
              <div className="relative w-16 h-16 flex-shrink-0">
                <div className="absolute inset-0 rounded-full bg-white/10"></div>
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-purple-600"
                    strokeDasharray={`${stats.storageUsagePercentage * 1.76} 176`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                  {stats.storageUsagePercentage.toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 파일 목록 표시 */}
      {files.length === 0 && !loading ? (
        <div className="text-center py-12 bg-white/5 rounded-lg">
          <p className="text-gray-400">파일을 찾을 수 없습니다.</p>
          {searchQuery && <p className="text-sm text-gray-500 mt-2">검색어: &quot;{searchQuery}&quot;</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <Card key={file.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-center">
                  <div className="mr-3" onClick={(e) => toggleItemSelection(file.id, e)}>
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(file.id)}
                      onChange={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-500 bg-transparent"
                    />
                  </div>
                  <div className="relative">
                    <div className="w-14 h-14 bg-white/10 rounded mr-3 flex items-center justify-center">
                      {getFileIcon(file.fileType)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="font-medium truncate">{highlightText(file.title)}</p>
                    <p className="text-sm text-gray-400">
                      {highlightText(file.artist || '알 수 없는 아티스트')} • {formatDuration(file.duration)}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Badge className={`mr-2 ${getFileBadgeColor(file.fileType)}`}>
                        {file.fileType.toUpperCase()}
                      </Badge>
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span className="mx-1">•</span>
                      <span>{formatDate(file.createdAt)}</span>
                      <span className="mx-1">•</span>
                      <span>다운로드 {file.downloads}회</span>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    {file.fileType.toLowerCase().includes('mp3') && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => togglePlayFile(file, e)}
                      >
                        {playerState.currentFile?.id === file.id && playerState.isPlaying ? (
                          <Pause className="h-4 w-4 text-green-400" fill="currentColor" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8" 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownloadFile(file.id)
                      }}
                      disabled={processingAction === `download-${file.id}`}
                    >
                      {processingAction === `download-${file.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteFile(file.id)
                      }}
                      disabled={processingAction === `delete-${file.id}`}
                    >
                      {processingAction === `delete-${file.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* 페이지네이션 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-4">
          <Button
            variant="outline"
            className="border-white/20 hover:bg-white/10"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={!pagination.hasPrev || loading}
          >
            이전
          </Button>
          <span className="text-sm text-gray-400">
            {pagination.page} / {pagination.totalPages} 페이지
          </span>
          <Button
            variant="outline"
            className="border-white/20 hover:bg-white/10"
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={!pagination.hasNext || loading}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  )
}