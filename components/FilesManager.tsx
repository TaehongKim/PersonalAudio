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
  Grid3X3,
  List,
  ChevronDown,
  ChevronRight,
  Edit3,
  Check,
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HardDrive,
  Database,
  ExternalLink,
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
  sourceUrl: string | null
  createdAt: string
  downloads: number
  groupType?: string
  groupName?: string
  rank?: number
  melonCoverUrl?: string
}

// 파일 그룹 인터페이스
interface FileGroup {
  groupType: string
  groupName: string
  files: FileData[]
  createdAt: string
}

// 파일 동기화 상태 인터페이스
interface FileSyncStatus {
  id: string
  title: string
  path: string
  dbSize: number
  actualSize: number
  exists: boolean
  sizeMatch: boolean
  status: 'ok' | 'missing' | 'size_mismatch' | 'error'
  createdAt: string
}

interface SyncStats {
  total: number
  ok: number
  missing: number
  sizeMismatch: number
  error: number
}

interface SyncResponse {
  success: boolean
  files: FileSyncStatus[]
  stats: SyncStats
  orphanedFiles: string[]
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

// 파일을 그룹별로 분류하는 함수
const groupFiles = (files: FileData[]): FileGroup[] => {
  const grouped = files.reduce((acc, file) => {
    const groupKey = `${file.groupType || 'unknown'}_${file.groupName || 'unknown'}`
    
    if (!acc[groupKey]) {
      acc[groupKey] = {
        groupType: file.groupType || 'unknown',
        groupName: file.groupName || 'unknown',
        files: [],
        createdAt: file.createdAt
      }
    }
    
    acc[groupKey].files.push(file)
    
    // 가장 오래된 파일의 날짜를 그룹 생성일로 사용
    if (file.createdAt < acc[groupKey].createdAt) {
      acc[groupKey].createdAt = file.createdAt
    }
    
    return acc
  }, {} as Record<string, FileGroup>)
  
  return Object.values(grouped).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

// 그룹 타입별 표시명
const getGroupTypeDisplayName = (groupType: string): string => {
  switch (groupType) {
    case 'youtube_single':
      return '유튜브 단일 파일'
    case 'youtube_playlist':
      return '유튜브 플레이리스트'
    case 'melon_chart':
      return '멜론차트'
    default:
      return '기타'
  }
}

export function FilesManager() {
  // 상태 관리
  const [files, setFiles] = useState<FileData[]>([])
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'groups'>('groups')
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState("desc")
  const [filterType, setFilterType] = useState("all")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const { state: playerState, loadFile, loadPlaylist, play, pause } = usePlayer()
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<FilesResponse['pagination'] | null>(null)
  const [processingAction, setProcessingAction] = useState<string | null>(null)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareFormData, setShareFormData] = useState({
    expiresIn: 168 as number | null, // 7일 (시간 단위)
    maxDownloads: null as number | null
  })
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState("")
  const [melonCoverCache, setMelonCoverCache] = useState<Record<string, string>>({})
  
  // 파일 동기화 관련 상태
  const [showSyncPanel, setShowSyncPanel] = useState(false)
  const [syncData, setSyncData] = useState<SyncResponse | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null)

  // 멜론 앨범 커버 가져오기 함수
  const fetchMelonCover = useCallback(async (title: string, artist: string): Promise<string | null> => {
    const cacheKey = `${artist}_${title}`
    if (melonCoverCache[cacheKey]) {
      return melonCoverCache[cacheKey]
    }

    try {
      const response = await fetch(`/api/melon-cover?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`)
      if (response.ok) {
        const data = await response.json()
        const coverUrl = data.coverUrl
        if (coverUrl) {
          setMelonCoverCache(prev => ({ ...prev, [cacheKey]: coverUrl }))
          return coverUrl
        }
      }
    } catch (error) {
      console.error('멜론 앨범 커버 가져오기 실패:', error)
    }
    return null
  }, [melonCoverCache])

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
      
      // 파일을 그룹별로 분류
      const groups = groupFiles(data.files)
      setFileGroups(groups)
      
      // 멜론 차트 파일들의 앨범 커버 가져오기 (썸네일이 없는 경우만)
      const melonFiles = data.files.filter(file => 
        file.groupType === 'melon_chart' && 
        !file.thumbnailPath && 
        file.title && 
        file.artist &&
        !melonCoverCache[`${file.artist}_${file.title}`]
      )
      
      // 비동기로 앨범 커버 가져오기
      melonFiles.forEach(async (file) => {
        if (file.title && file.artist) {
          await fetchMelonCover(file.title, file.artist)
        }
      })
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

  // 그룹이 변경될 때 모든 그룹을 기본적으로 펼치기
  useEffect(() => {
    if (fileGroups.length > 0) {
      const allGroupKeys = fileGroups.map(group => `${group.groupType}_${group.groupName}`)
      setExpandedGroups(new Set(allGroupKeys))
    }
  }, [fileGroups])

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

  const toggleGroupExpansion = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey)
    } else {
      newExpanded.add(groupKey)
    }
    setExpandedGroups(newExpanded)
  }

  const toggleGroupSelection = (groupFiles: FileData[]) => {
    const groupFileIds = groupFiles.map(f => f.id)
    const allGroupSelected = groupFileIds.every(id => selectedItems.includes(id))
    
    if (allGroupSelected) {
      // 그룹의 모든 파일을 선택 해제
      setSelectedItems(selectedItems.filter(id => !groupFileIds.includes(id)))
    } else {
      // 그룹의 모든 파일을 선택
      const newSelected = [...selectedItems]
      groupFileIds.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id)
        }
      })
      setSelectedItems(newSelected)
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
      
      // Content-Disposition 헤더에서 파일명 추출 (UTF-8 인코딩 지원)
      const contentDisposition = response.headers.get('Content-Disposition')
      let fileName = 'download'
      if (contentDisposition) {
        // filename*=UTF-8''encoded_name 형식 파싱
        const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/)
        if (filenameStarMatch) {
          fileName = decodeURIComponent(filenameStarMatch[1])
        } else {
          // 일반 filename= 형식 파싱 (fallback)
          const filenameMatch = contentDisposition.match(/filename="?([^"]*)"?/)
          if (filenameMatch) {
            fileName = filenameMatch[1]
          }
        }
      }
      
      a.download = fileName
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
      
      // Content-Disposition 헤더에서 파일명 추출 (UTF-8 인코딩 지원)
      const contentDisposition = response.headers.get('Content-Disposition')
      let fileName = 'files.zip'
      if (contentDisposition) {
        // filename*=UTF-8''encoded_name 형식 파싱
        const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/)
        if (filenameStarMatch) {
          fileName = decodeURIComponent(filenameStarMatch[1])
        } else {
          // 일반 filename= 형식 파싱 (fallback)
          const filenameMatch = contentDisposition.match(/filename="?([^"]*)"?/)
          if (filenameMatch) {
            fileName = filenameMatch[1]
          }
        }
      }
      
      a.download = fileName
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
    console.log('파일 재생 버튼 클릭:', {
      fileId: file.id,
      title: file.title,
      currentFileId: playerState.currentFile?.id,
      isPlaying: playerState.isPlaying,
      fileType: file.fileType
    })
    
    if (playerState.currentFile?.id === file.id && playerState.isPlaying) {
      // 현재 재생 중인 파일이면 일시정지
      console.log('현재 파일 일시정지')
      pause()
    } else if (playerState.currentFile?.id === file.id && !playerState.isPlaying) {
      // 현재 파일이지만 재생되지 않고 있으면 재생
      console.log('현재 파일 재생')
      play()
    } else {
      // 새로운 파일 로드 후 자동 재생
      console.log('새 파일 로드 및 재생')
      loadFile(file)
      // loadFile 이후 잠시 대기 후 재생 시작
      setTimeout(() => {
        console.log('자동 재생 시작')
        play()
      }, 100)
    }
  }

  const playAllFiles = () => {
    if (files.length > 0) {
      loadPlaylist(files, 0)
      setTimeout(() => {
        play()
      }, 100)
    }
  }

  const playGroupFiles = (groupFiles: FileData[]) => {
    const audioFiles = groupFiles.filter(file => file.fileType.toLowerCase().includes('mp3'))
    if (audioFiles.length > 0) {
      loadPlaylist(audioFiles, 0)
      setTimeout(() => {
        play()
      }, 100)
    }
  }

  const startEditingGroup = (groupKey: string, currentName: string) => {
    setEditingGroup(groupKey)
    setEditingGroupName(currentName)
  }

  const cancelEditingGroup = () => {
    setEditingGroup(null)
    setEditingGroupName("")
  }

  const saveGroupName = async (groupKey: string, newName: string) => {
    if (!newName.trim()) {
      cancelEditingGroup()
      return
    }

    try {
      setProcessingAction(`rename-group-${groupKey}`)
      
      // groupKey 형태: "groupType_groupName"에서 첫 번째 언더스코어를 기준으로 분리
      const firstUnderscoreIndex = groupKey.indexOf('_')
      if (firstUnderscoreIndex === -1) {
        throw new Error('잘못된 그룹 키 형식입니다.')
      }
      
      const groupType = groupKey.substring(0, firstUnderscoreIndex)
      const oldGroupName = groupKey.substring(firstUnderscoreIndex + 1)
      
      // 해당 그룹에 파일이 있는지 확인
      const groupExists = fileGroups.some(group => 
        `${group.groupType}_${group.groupName}` === groupKey && group.files.length > 0
      )
      
      if (!groupExists) {
        throw new Error('변경하려는 그룹에 파일이 없거나 그룹을 찾을 수 없습니다.')
      }
      
      console.log('그룹명 변경 요청:', { 
        groupKey, 
        groupType, 
        oldGroupName, 
        newName: newName.trim() 
      })
      
      const response = await fetch('/api/files/rename-group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          groupType,
          oldGroupName,
          newGroupName: newName.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `HTTP ${response.status}: 그룹명 변경에 실패했습니다.`
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('그룹명 변경 성공:', result)

      // 파일 목록 새로고침
      await loadFiles()
      cancelEditingGroup()
    } catch (err) {
      console.error('그룹명 변경 오류:', err)
      setError(err instanceof Error ? err.message : '그룹명 변경 중 오류가 발생했습니다.')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleGroupDownload = async (groupFiles: FileData[]) => {
    if (!groupFiles || groupFiles.length === 0) {
      setError('다운로드할 파일이 없습니다. 그룹이 비어있거나 파일을 찾을 수 없습니다.')
      return
    }

    try {
      setProcessingAction('group-download')
      const fileIds = groupFiles.map(f => f.id)
      
      console.log('그룹 다운로드 요청:', { fileCount: groupFiles.length, fileIds })
      
      const response = await fetch('/api/files/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'download',
          fileIds: fileIds
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `HTTP ${response.status}: 그룹 다운로드에 실패했습니다.`
        throw new Error(errorMessage)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Content-Disposition 헤더에서 파일명 추출 (UTF-8 인코딩 지원)
      const contentDisposition = response.headers.get('Content-Disposition')
      let fileName = 'group-files.zip'
      if (contentDisposition) {
        // filename*=UTF-8''encoded_name 형식 파싱
        const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/)
        if (filenameStarMatch) {
          fileName = decodeURIComponent(filenameStarMatch[1])
        } else {
          // 일반 filename= 형식 파싱 (fallback)
          const filenameMatch = contentDisposition.match(/filename="?([^"]*)"?/)
          if (filenameMatch) {
            fileName = filenameMatch[1]
          }
        }
      }
      
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('그룹 다운로드 오류:', err)
      setError(err instanceof Error ? err.message : '그룹 다운로드 중 오류가 발생했습니다.')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleCreateShare = async () => {
    if (selectedItems.length === 0) return

    try {
      setProcessingAction('share')
      
      const shareData = {
        fileIds: selectedItems,
        expiresIn: shareFormData.expiresIn,
        maxDownloads: shareFormData.maxDownloads
      }

      const response = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shareData)
      })

      if (response.ok) {
        const result = await response.json()
        alert(`공유 링크가 생성되었습니다: ${window.location.origin}/share/${result.shortCode}`)
        setShowShareDialog(false)
        setSelectedItems([])
      } else {
        throw new Error('공유 링크 생성 실패')
      }
    } catch (error) {
      console.error('공유 링크 생성 오류:', error)
      alert('공유 링크 생성 중 오류가 발생했습니다.')
    } finally {
      setProcessingAction(null)
    }
  }

  // 파일 동기화 체크 함수
  const checkFileSync = async () => {
    try {
      setSyncLoading(true)
      const response = await fetch('/api/files/sync')
      if (response.ok) {
        const data: SyncResponse = await response.json()
        setSyncData(data)
        setSyncStats(data.stats)
      } else {
        throw new Error('동기화 체크 실패')
      }
    } catch (error) {
      console.error('파일 동기화 체크 오류:', error)
      alert('파일 동기화 체크 중 오류가 발생했습니다.')
    } finally {
      setSyncLoading(false)
    }
  }

  // 누락된 파일들을 DB에서 정리
  const cleanupMissingFiles = async () => {
    if (!syncData) return
    
    const missingFileIds = syncData.files
      .filter(f => f.status === 'missing')
      .map(f => f.id)
    
    if (missingFileIds.length === 0) {
      alert('정리할 누락된 파일이 없습니다.')
      return
    }
    
    if (!confirm(`${missingFileIds.length}개의 누락된 파일을 DB에서 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return
    }
    
    try {
      setSyncLoading(true)
      const response = await fetch('/api/files/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cleanup_missing',
          fileIds: missingFileIds
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(result.message)
        // 동기화 데이터 다시 로드
        await checkFileSync()
        // 파일 목록도 새로고침
        await loadFiles()
      } else {
        throw new Error('파일 정리 실패')
      }
    } catch (error) {
      console.error('파일 정리 오류:', error)
      alert('파일 정리 중 오류가 발생했습니다.')
    } finally {
      setSyncLoading(false)
    }
  }

  // 파일 상태에 따른 아이콘과 색상 반환
  const getFileStatusInfo = (status: string) => {
    switch (status) {
      case 'ok':
        return { icon: CheckCircle, color: 'text-green-500', text: '정상' }
      case 'missing':
        return { icon: XCircle, color: 'text-red-500', text: '파일 없음' }
      case 'size_mismatch':
        return { icon: AlertTriangle, color: 'text-yellow-500', text: '크기 불일치' }
      case 'error':
        return { icon: XCircle, color: 'text-red-500', text: '오류' }
      default:
        return { icon: AlertTriangle, color: 'text-gray-500', text: '알 수 없음' }
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
            <Button
              variant="outline"
              size="sm"
              className="ml-2 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
              onClick={() => setShowSyncPanel(!showSyncPanel)}
              disabled={loading}
            >
              <Database className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* 뷰 모드 토글 */}
            <div className="flex bg-white/10 rounded-lg p-1">
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                className={`px-3 ${viewMode === 'list' ? 'bg-white text-black' : 'text-white hover:bg-white/20'}`}
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4 mr-1" />
                목록
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'groups' ? 'default' : 'ghost'}
                className={`px-3 ${viewMode === 'groups' ? 'bg-white text-black' : 'text-white hover:bg-white/20'}`}
                onClick={() => setViewMode('groups')}
              >
                <Grid3X3 className="w-4 h-4 mr-1" />
                그룹
              </Button>
            </div>
            
            {/* 전체 선택 버튼은 항상 표시 */}
            <Button 
              className="bg-purple-600 hover:bg-purple-700" 
              onClick={toggleSelectAll}
              disabled={processingAction !== null || files.length === 0}
            >
              {selectedItems.length === files.length && files.length > 0 ? "전체 선택 해제" : "전체 선택"}
            </Button>
            
            {selectedItems.length > 0 ? (
              <>
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => setSelectedItems([])}
                  disabled={processingAction !== null}
                >
                  선택 취소
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
                <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-yellow-600 hover:bg-yellow-700"
                      disabled={processingAction !== null}
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
                          {processingAction === 'share' ? (
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

      {/* 파일 동기화 패널 */}
      {showSyncPanel && (
        <Card className="bg-yellow-900/20 border-yellow-500/30 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <HardDrive className="h-5 w-5 text-yellow-400 mr-2" />
                <h3 className="text-lg font-semibold text-yellow-400">파일 동기화 상태</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={checkFileSync}
                  disabled={syncLoading}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  {syncLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  동기화 체크
                </Button>
                {syncData && syncStats && syncStats.missing > 0 && (
                  <Button
                    onClick={cleanupMissingFiles}
                    disabled={syncLoading}
                    size="sm"
                    variant="destructive"
                  >
                    누락된 파일 정리 ({syncStats.missing})
                  </Button>
                )}
              </div>
            </div>

            {syncData && syncStats ? (
              <div className="space-y-4">
                {/* 통계 요약 */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <CheckCircle className="h-4 w-4 text-green-400 mr-1" />
                      <span className="text-sm text-green-400">정상</span>
                    </div>
                    <div className="text-lg font-bold text-white">{syncStats.ok}</div>
                  </div>
                  <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <XCircle className="h-4 w-4 text-red-400 mr-1" />
                      <span className="text-sm text-red-400">파일 없음</span>
                    </div>
                    <div className="text-lg font-bold text-white">{syncStats.missing}</div>
                  </div>
                  <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-400 mr-1" />
                      <span className="text-sm text-yellow-400">크기 불일치</span>
                    </div>
                    <div className="text-lg font-bold text-white">{syncStats.sizeMismatch}</div>
                  </div>
                  <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <XCircle className="h-4 w-4 text-red-400 mr-1" />
                      <span className="text-sm text-red-400">오류</span>
                    </div>
                    <div className="text-lg font-bold text-white">{syncStats.error}</div>
                  </div>
                  <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Database className="h-4 w-4 text-blue-400 mr-1" />
                      <span className="text-sm text-blue-400">총 파일</span>
                    </div>
                    <div className="text-lg font-bold text-white">{syncStats.total}</div>
                  </div>
                </div>

                {/* Orphaned 파일들 */}
                {syncData.orphanedFiles.length > 0 && (
                  <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-400 mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      DB에 없는 파일들 ({syncData.orphanedFiles.length}개)
                    </h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {syncData.orphanedFiles.map((filePath, index) => (
                        <div key={index} className="text-sm text-gray-300 bg-black/20 p-2 rounded">
                          {filePath.replace(process.cwd(), '.')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 문제가 있는 파일들 */}
                {syncData.files.some(f => f.status !== 'ok') && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-red-400 mb-2">문제가 있는 파일들</h4>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {syncData.files
                        .filter(f => f.status !== 'ok')
                        .map((file) => {
                          const statusInfo = getFileStatusInfo(file.status)
                          const StatusIcon = statusInfo.icon
                          return (
                            <div key={file.id} className="bg-black/20 p-3 rounded-lg flex items-center justify-between">
                              <div className="flex items-center flex-1 min-w-0">
                                <StatusIcon className={`h-4 w-4 mr-3 ${statusInfo.color}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{file.title}</p>
                                  <p className="text-sm text-gray-400 truncate">{file.path}</p>
                                  {file.status === 'size_mismatch' && (
                                    <p className="text-xs text-yellow-400">
                                      DB: {formatFileSize(file.dbSize)} ↔ 실제: {formatFileSize(file.actualSize)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Badge className={statusInfo.color.replace('text-', 'bg-').replace('-500', '-900/50 border-').replace('-500', '-500/50')}>
                                {statusInfo.text}
                              </Badge>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">파일 동기화 상태를 확인하려면 버튼을 클릭하세요.</p>
                <Button
                  onClick={checkFileSync}
                  disabled={syncLoading}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  {syncLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <HardDrive className="w-4 h-4 mr-2" />
                  )}
                  동기화 체크 시작
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 파일 목록 표시 */}
      {files.length === 0 && !loading ? (
        <div className="text-center py-12 bg-white/5 rounded-lg">
          <p className="text-gray-400">파일을 찾을 수 없습니다.</p>
          {searchQuery && <p className="text-sm text-gray-500 mt-2">검색어: &quot;{searchQuery}&quot;</p>}
        </div>
      ) : viewMode === 'groups' ? (
        <div className="space-y-4">
          {fileGroups.map((group) => {
            const groupKey = `${group.groupType}_${group.groupName}`
            const isExpanded = expandedGroups.has(groupKey)
            // const groupFileIds = group.files.map(f => f.id)
            const selectedInGroup = group.files.filter(f => selectedItems.includes(f.id)).length
            const allGroupSelected = selectedInGroup === group.files.length && group.files.length > 0
            
            return (
              <Card key={groupKey} className="bg-white/5 border-white/10">
                <CardContent className="p-0">
                  {/* 그룹 헤더 */}
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="p-1 h-6 w-6"
                          onClick={() => toggleGroupExpansion(groupKey)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={allGroupSelected}
                            onChange={() => toggleGroupSelection(group.files)}
                            className="h-4 w-4 rounded border-gray-500 bg-transparent"
                          />
                          <FolderOpen className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{getGroupTypeDisplayName(group.groupType)}</h3>
                          <div className="flex items-center space-x-2">
                            {editingGroup === groupKey ? (
                              <div className="flex items-center space-x-1">
                                <Input
                                  value={editingGroupName}
                                  onChange={(e) => setEditingGroupName(e.target.value)}
                                  className="h-6 text-sm bg-white/10 border-white/20 text-white"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      saveGroupName(groupKey, editingGroupName)
                                    } else if (e.key === 'Escape') {
                                      cancelEditingGroup()
                                    }
                                  }}
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => saveGroupName(groupKey, editingGroupName)}
                                  disabled={processingAction === `rename-group-${groupKey}`}
                                >
                                  <Check className="h-3 w-3 text-green-400" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={cancelEditingGroup}
                                >
                                  <X className="h-3 w-3 text-red-400" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1">
                                <span className="text-sm text-gray-400">{group.groupName}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
                                  onClick={() => startEditingGroup(groupKey, group.groupName)}
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            <span className="text-xs text-gray-500">
                              • {group.files.length}개 파일 • {formatDate(group.createdAt)}
                              {selectedInGroup > 0 && ` • ${selectedInGroup}개 선택됨`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* 그룹 액션 버튼들 */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-400 hover:bg-green-900/20"
                          onClick={() => playGroupFiles(group.files)}
                          disabled={group.files.filter(f => f.fileType.toLowerCase().includes('mp3')).length === 0}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          재생
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-400 hover:bg-blue-900/20"
                          onClick={() => handleGroupDownload(group.files)}
                          disabled={processingAction === 'group-download'}
                        >
                          {processingAction === 'group-download' ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-1" />
                          )}
                          다운로드
                        </Button>
                        <Badge variant="secondary" className="bg-white/10">
                          {formatFileSize(group.files.reduce((total, file) => total + file.fileSize, 0))}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* 그룹 파일 목록 */}
                  {isExpanded && (
                    <div className="space-y-1 p-2">
                      {group.files.map((file) => (
                        <div key={file.id} className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors">
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
                              <div className="w-12 h-12 bg-white/10 rounded mr-3 flex items-center justify-center overflow-hidden">
                                {file.fileType.toLowerCase().includes('mp3') ? (
                                  <>
                                    {/* 멜론 차트 파일인 경우 멜론 앨범 커버 우선 표시 */}
                                    {file.groupType === 'melon_chart' && file.title && file.artist && melonCoverCache[`${file.artist}_${file.title}`] ? (
                                      <img 
                                        src={melonCoverCache[`${file.artist}_${file.title}`]}
                                        alt={`${file.title} 앨범 커버`}
                                        className="w-full h-full object-cover rounded"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            const thumbnailImg = parent.querySelector('.thumbnail-img');
                                            if (thumbnailImg) {
                                              (thumbnailImg as HTMLElement).style.display = 'block';
                                            } else {
                                              const iconElement = parent.querySelector('.fallback-icon');
                                              if (iconElement) {
                                                iconElement.classList.remove('hidden');
                                              }
                                            }
                                          }
                                        }}
                                      />
                                    ) : null}
                                    {/* 기존 썸네일 이미지 (멜론 커버가 없을 때만 표시) */}
                                    {file.thumbnailPath && !(file.groupType === 'melon_chart' && melonCoverCache[`${file.artist}_${file.title}`]) ? (
                                      <img 
                                        src={`/api/files/${file.id}/thumbnail`}
                                        alt={`${file.title} 앨범 커버`}
                                        className="thumbnail-img w-full h-full object-cover rounded"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            const iconElement = parent.querySelector('.fallback-icon');
                                            if (iconElement) {
                                              iconElement.classList.remove('hidden');
                                            }
                                          }
                                        }}
                                      />
                                    ) : null}
                                  </>
                                ) : null}
                                <div className={`fallback-icon ${(file.thumbnailPath || (file.groupType === 'melon_chart' && melonCoverCache[`${file.artist}_${file.title}`])) && file.fileType.toLowerCase().includes('mp3') ? 'hidden' : ''}`}>
                                  {getFileIcon(file.fileType)}
                                </div>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 mr-2">
                              <div className="flex items-center space-x-2">
                                {file.rank && (
                                  <Badge className="bg-yellow-600 text-xs px-1">
                                    #{file.rank}
                                  </Badge>
                                )}
                                <p className="font-medium truncate">{highlightText(file.title)}</p>
                              </div>
                              <p className="text-sm text-gray-400">
                                {highlightText(file.artist || '알 수 없는 아티스트')} • {formatDuration(file.duration)}
                              </p>
                              <div className="flex items-center text-xs text-gray-500 mt-1">
                                <Badge className={`mr-2 ${getFileBadgeColor(file.fileType)} text-xs`}>
                                  {file.fileType.toUpperCase()}
                                </Badge>
                                <span>{formatFileSize(file.fileSize)}</span>
                                <span className="mx-1">•</span>
                                <span>다운로드 {file.downloads}회</span>
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              {file.fileType.toLowerCase().includes('mp3') && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-10 w-10 md:h-8 md:w-8"
                                  onClick={(e) => togglePlayFile(file, e)}
                                >
                                  {playerState.currentFile?.id === file.id && playerState.isPlaying ? (
                                    <Pause className="h-5 w-5 md:h-4 md:w-4 text-green-400" fill="currentColor" />
                                  ) : (
                                    <Play className="h-5 w-5 md:h-4 md:w-4" />
                                  )}
                                </Button>
                              )}
                              {!file.fileType.toLowerCase().includes('mp3') && file.sourceUrl && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-10 w-10 md:h-8 md:w-8 text-blue-400 hover:bg-blue-900/20"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    window.open(file.sourceUrl!, '_blank')
                                  }}
                                  title="원본 링크 열기"
                                >
                                  <ExternalLink className="h-5 w-5 md:h-4 md:w-4" />
                                </Button>
                              )}
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-10 w-10 md:h-8 md:w-8" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDownloadFile(file.id)
                                }}
                                disabled={processingAction === `download-${file.id}`}
                              >
                                {processingAction === `download-${file.id}` ? (
                                  <Loader2 className="h-5 w-5 md:h-4 md:w-4 animate-spin" />
                                ) : (
                                  <Download className="h-5 w-5 md:h-4 md:w-4" />
                                )}
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-10 w-10 md:h-8 md:w-8 text-red-400 hover:bg-red-900/20" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteFile(file.id)
                                }}
                                disabled={processingAction === `delete-${file.id}`}
                              >
                                {processingAction === `delete-${file.id}` ? (
                                  <Loader2 className="h-5 w-5 md:h-4 md:w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
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
                    <div className="w-12 h-12 bg-white/10 rounded mr-3 flex items-center justify-center overflow-hidden">
                      {file.fileType.toLowerCase().includes('mp3') ? (
                        <>
                          {/* 멜론 차트 파일인 경우 멜론 앨범 커버 우선 표시 */}
                          {file.groupType === 'melon_chart' && file.title && file.artist && melonCoverCache[`${file.artist}_${file.title}`] ? (
                            <img 
                              src={melonCoverCache[`${file.artist}_${file.title}`]}
                              alt={`${file.title} 앨범 커버`}
                              className="w-full h-full object-cover rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const thumbnailImg = parent.querySelector('.thumbnail-img');
                                  if (thumbnailImg) {
                                    (thumbnailImg as HTMLElement).style.display = 'block';
                                  } else {
                                    const iconElement = parent.querySelector('.fallback-icon');
                                    if (iconElement) {
                                      iconElement.classList.remove('hidden');
                                    }
                                  }
                                }
                              }}
                            />
                          ) : null}
                          {/* 기존 썸네일 이미지 (멜론 커버가 없을 때만 표시) */}
                          {file.thumbnailPath && !(file.groupType === 'melon_chart' && melonCoverCache[`${file.artist}_${file.title}`]) ? (
                            <img 
                              src={`/api/files/${file.id}/thumbnail`}
                              alt={`${file.title} 앨범 커버`}
                              className="thumbnail-img w-full h-full object-cover rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const iconElement = parent.querySelector('.fallback-icon');
                                  if (iconElement) {
                                    iconElement.classList.remove('hidden');
                                  }
                                }
                              }}
                            />
                          ) : null}
                        </>
                      ) : null}
                      <div className={`fallback-icon ${(file.thumbnailPath || (file.groupType === 'melon_chart' && melonCoverCache[`${file.artist}_${file.title}`])) && file.fileType.toLowerCase().includes('mp3') ? 'hidden' : ''}`}>
                        {getFileIcon(file.fileType)}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="flex items-center space-x-2">
                      {file.rank && (
                        <Badge className="bg-yellow-600 text-xs px-1">
                          #{file.rank}
                        </Badge>
                      )}
                      <p className="font-medium truncate">{highlightText(file.title)}</p>
                    </div>
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
                      {file.groupType && (
                        <>
                          <span className="mx-1">•</span>
                          <span className="text-blue-400">{getGroupTypeDisplayName(file.groupType)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    {file.fileType.toLowerCase().includes('mp3') && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 md:h-8 md:w-8"
                        onClick={(e) => togglePlayFile(file, e)}
                      >
                        {playerState.currentFile?.id === file.id && playerState.isPlaying ? (
                          <Pause className="h-5 w-5 md:h-4 md:w-4 text-green-400" fill="currentColor" />
                        ) : (
                          <Play className="h-5 w-5 md:h-4 md:w-4" />
                        )}
                      </Button>
                    )}
                    {!file.fileType.toLowerCase().includes('mp3') && file.sourceUrl && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 md:h-8 md:w-8 text-blue-400 hover:bg-blue-900/20"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(file.sourceUrl!, '_blank')
                        }}
                        title="원본 링크 열기"
                      >
                        <ExternalLink className="h-5 w-5 md:h-4 md:w-4" />
                      </Button>
                    )}
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-10 w-10 md:h-8 md:w-8" 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownloadFile(file.id)
                      }}
                      disabled={processingAction === `download-${file.id}`}
                    >
                      {processingAction === `download-${file.id}` ? (
                        <Loader2 className="h-5 w-5 md:h-4 md:w-4 animate-spin" />
                      ) : (
                        <Download className="h-5 w-5 md:h-4 md:w-4" />
                      )}
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-10 w-10 md:h-8 md:w-8 text-red-400 hover:bg-red-900/20" 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteFile(file.id)
                      }}
                      disabled={processingAction === `delete-${file.id}`}
                    >
                      {processingAction === `delete-${file.id}` ? (
                        <Loader2 className="h-5 w-5 md:h-4 md:w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
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