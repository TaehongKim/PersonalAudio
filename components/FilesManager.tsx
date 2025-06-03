"use client"

import * as React from 'react'

import { useState, useEffect, useCallback, useMemo, memo } from "react"
import {
  Download,
  Trash2,
  Share2,
  Music,
  Video,
  Play,
  FolderOpen,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Edit3,
  Check,
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Database,
  ChevronsUpDown,
  ChevronsDownUp,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { usePlayer } from "@/contexts/PlayerContext"
import { useSocket } from "@/hooks/useSocket"
import { useMediaQuery } from "@/hooks/use-mobile"
import { toast } from "react-toastify"
import { FileItem } from '@/components/FileItem';

// Debounce 유틸리티 함수
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
}

// 긴 텍스트를 중간에 ... 으로 줄이는 유틸리티 함수
const truncateMiddle = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  
  const ellipsis = '...';
  const charsToShow = maxLength - ellipsis.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  
  return text.substring(0, frontChars) + ellipsis + text.substring(text.length - backChars);
};

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
  rank: number | null
  melonCoverUrl?: string
  groupTotalCount?: number
}

interface FileGroup {
  groupType: string
  groupName: string
  files: FileData[]
  createdAt: string
  totalFiles: number
}

interface SyncStatus {
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
  files: SyncStatus[]
  stats: SyncStats
  orphanedFiles: string[]
}

interface FilesResponse {
  files: FileData[]
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

interface DownloadQueue {
  status: string
  progress: number
  id: string
  [key: string]: any
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
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

const groupFiles = (files: FileData[]): FileGroup[] => {
  const grouped = files.reduce((acc, file) => {
    const groupKey = `${file.groupType || 'unknown'}_${file.groupName || 'unknown'}`;
    if (!acc[groupKey]) {
      acc[groupKey] = {
        groupType: file.groupType || 'unknown',
        groupName: file.groupName || 'unknown',
        files: [],
        createdAt: file.createdAt,
        totalFiles: file.groupTotalCount || 0
      };
    }
    acc[groupKey].files.push(file);
    if (file.createdAt < acc[groupKey].createdAt) {
      acc[groupKey].createdAt = file.createdAt;
    }
    return acc;
  }, {} as Record<string, FileGroup>);
  return Object.values(grouped).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

const getGroupTypeDisplayName = (groupType: string): string => {
  switch (groupType) {
    case 'youtube_single': return '유튜브 단일 파일'
    case 'youtube_playlist': return '유튜브 플레이리스트'
    case 'melon_chart': return '멜론차트'
    default: return '기타'
  }
}

export const FilesManager = memo(function FilesManager() {
  const [files, setFiles] = useState<FileData[]>([])
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'groups'>('groups')
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState("desc")
  const [filterType, setFilterType] = useState("all")
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareFormData, setShareFormData] = useState({
    expiresIn: 168 as number | null,
    maxDownloads: null as number | null
  })
  const [processingAction, setProcessingAction] = useState<string | null>(null)
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState("")
  const [melonCoverCache, setMelonCoverCache] = useState<Record<string, string>>({})
  const [downloadQueues, setDownloadQueues] = useState<Record<string, DownloadQueue>>({})
  const [isExpanded, setIsExpanded] = useState<Record<string, boolean>>({})
  const [allGroupsExpanded, setAllGroupsExpanded] = useState(false);
  const [melonRankFilter, setMelonRankFilter] = useState<Record<string, number | null>>({});
  const [downloadMode, setDownloadMode] = useState<'zip' | 'sequential'>('zip');
  const [showFileSyncDialog, setShowFileSyncDialog] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  const { 
    state: playerState, 
    play, 
    pause, 
    loadFile, 
    loadPlaylist, 
    audioRef, 
    videoRef, 
    togglePlay, 
    seek,
    setVolume
  } = usePlayer()
  const socket = useSocket()
  const isMobile = useMediaQuery("(max-width: 768px)")

  const loadFiles = useCallback(async () => {
      setLoading(true)
      setError(null)
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        sortBy: sortBy,
        sortOrder: sortOrder,
        fileType: filterType === "all" ? "" : filterType,
      })
      const response = await fetch(`/api/files?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }
      const data: FilesResponse = await response.json()
      setFiles(data.files)
      const grouped = groupFiles(data.files)
      setFileGroups(grouped)
      
      setIsExpanded((prevExpanded: Record<string, boolean>) => {
        const newExpandedState: Record<string, boolean> = {};
        grouped.forEach((group: FileGroup) => {
          const groupKey = `${group.groupType}_${group.groupName}`;
          newExpandedState[groupKey] = prevExpanded[groupKey] !== undefined ? prevExpanded[groupKey] : allGroupsExpanded;
        });
        return newExpandedState;
      });

    } catch (e: any) {
      setError(e.message)
      toast.error(`파일 로드 실패: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, sortBy, sortOrder, filterType, allGroupsExpanded])

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch("/api/files/stats")
      if (!response.ok) {
        throw new Error('통계 정보를 불러오는데 실패했습니다.')
      }
      const data: StatsResponse = await response.json()
      setStats(data)
    } catch (e: any) {
      toast.error(`통계 로드 실패: ${e.message}`)
    }
  }, [])

  useEffect(() => {
    loadFiles()
    loadStats()
  }, [loadFiles, loadStats])

  const fetchMelonCover = useCallback(async (title: string, artist: string) => {
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
          setMelonCoverCache((prev: Record<string, string>) => ({ ...prev, [cacheKey]: coverUrl }))
          return coverUrl
        }
      }
    } catch (error) {
      console.error('멜론 앨범 커버 가져오기 실패:', error)
    }
    return null
  }, [melonCoverCache]);

  useEffect(() => {
    const melonFilesToFetch = files.filter((file: FileData) => 
      file.groupType === 'melon_chart' && 
      !file.thumbnailPath && 
      file.title && 
      file.artist &&
      !melonCoverCache[`${file.artist}_${file.title}`]
    );
    melonFilesToFetch.forEach((file: FileData) => {
      if (file.title && file.artist) {
        fetchMelonCover(file.title, file.artist);
      }
    });
  }, [files, fetchMelonCover, melonCoverCache]);

  const calculateFilesInRank = useCallback((groupKey: string, rank: number | null) => {
    if (!rank) return fileGroups.find((g: FileGroup) => `${g.groupType}_${g.groupName}` === groupKey)?.files.length || 0;
    return fileGroups.find((g: FileGroup) => `${g.groupType}_${g.groupName}` === groupKey)?.files.filter((f: FileData) => f.rank && f.rank <= rank).length || 0;
  }, [fileGroups]);

  const filterMelonChartByRank = (groupKey: string, rank: number | null) => {
    setMelonRankFilter((prev: Record<string, number | null>) => ({ ...prev, [groupKey]: rank }));
  };

  const getGroupDisplayName = (group: FileGroup): string => {
    const baseName = getGroupTypeDisplayName(group.groupType);
    const maxLength = isMobile ? 15 : 25; // 모바일에서는 더 짧게 축약
    
    if (group.groupType === 'melon_chart') {
      const rankSuffix = melonRankFilter[`${group.groupType}_${group.groupName}`] ? 
        ` (TOP ${melonRankFilter[`${group.groupType}_${group.groupName}`]})` : ' (전체)';
      const filesInRank = calculateFilesInRank(`${group.groupType}_${group.groupName}`, melonRankFilter[`${group.groupType}_${group.groupName}`]);
      return `${baseName} - ${truncateMiddle(group.groupName, maxLength)}${rankSuffix} (${filesInRank} / ${group.totalFiles}곡)`;
    }
    return `${baseName} - ${truncateMiddle(group.groupName, maxLength)} (${group.files.length} / ${group.totalFiles}곡)`;
  };
  
  const toggleItemSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItems((prev: string[]) =>
      prev.includes(id) ? prev.filter((item: string) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === files.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(files.map((file: FileData) => file.id));
    }
  };

  const toggleGroupSelection = (groupFiles: FileData[]) => {
    const groupFileIds = groupFiles.map(f => f.id);
    const allSelectedInGroup = groupFileIds.every(id => selectedItems.includes(id));
    
    if (allSelectedInGroup) {
      setSelectedItems((prev: string[]) => prev.filter((id: string) => !groupFileIds.includes(id)));
    } else {
      setSelectedItems((prev: string[]) => [
        ...prev.filter((id: string) => !groupFileIds.includes(id)),
        ...groupFileIds
      ]);
    }
  };

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
      
      const contentDisposition = response.headers.get('Content-Disposition')
      let fileName = 'download'
      if (contentDisposition) {
        const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/)
        if (filenameStarMatch) {
          fileName = decodeURIComponent(filenameStarMatch[1])
        } else {
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
        const errorData = await response.json()
        throw new Error(errorData.error || '파일 삭제에 실패했습니다.')
      }

      const result = await response.json()
      if (result.success) {
      await loadFiles()
      await loadStats()
      setSelectedItems(selectedItems.filter((id: string) => id !== fileId))
      } else {
        throw new Error(result.error || '파일 삭제 중 오류가 발생했습니다.')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '파일 삭제 중 오류가 발생했습니다.'
      setError(errorMessage)
      alert(`파일 삭제 실패: ${errorMessage}`)
    } finally {
      setProcessingAction(null)
    }
  }

  const handleBulkDownload = async (mode: 'zip' | 'sequential' = downloadMode) => {
    if (selectedItems.length === 0) return

    if (mode === 'sequential') {
      return handleSequentialDownload(selectedItems)
    }

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
      
      const contentDisposition = response.headers.get('Content-Disposition')
      let fileName = 'files.zip'
      if (contentDisposition) {
        const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/)
        if (filenameStarMatch) {
          fileName = decodeURIComponent(filenameStarMatch[1])
        } else {
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

  const handleSequentialDownload = async (fileIds: string[]) => {
    try {
      setProcessingAction('sequential-download')
      const response = await fetch(`/api/files?fileIds=${fileIds.join(',')}`)
      if (!response.ok) {
        throw new Error('파일 정보를 가져올 수 없습니다.')
      }
      const data = await response.json()
      const filesList = data.files || []

      for (let i = 0; i < fileIds.length; i++) {
        const fileId = fileIds[i]
        const fileInfo = filesList.find((f: any) => f.id === fileId)
        
        try {
          const response = await fetch(`/api/files/${fileId}/download`)
          if (!response.ok) {
            console.error(`파일 ${fileId} 다운로드 실패: ${response.status}`)
            continue
          }

          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          
          const contentDisposition = response.headers.get('Content-Disposition')
          let fileName = fileInfo ? `${fileInfo.title}.${fileInfo.fileType.toLowerCase()}` : `file_${i + 1}`
          if (contentDisposition) {
            const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/)
            if (filenameStarMatch) {
              fileName = decodeURIComponent(filenameStarMatch[1])
    } else {
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

          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.error(`파일 ${fileId} 다운로드 중 오류:`, error)
        }
      }

      setSelectedItems([])
    } catch (err) {
      setError(err instanceof Error ? err.message : '순차 다운로드 중 오류가 발생했습니다.')
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
        const errorData = await response.json()
        throw new Error(errorData.error || '대량 삭제에 실패했습니다.')
      }

      const result = await response.json()
      if (result.success) {
        await loadFiles()
        await loadStats()
        setSelectedItems([])
        
        const successCount = result.deletedCount
        const failedCount = result.requestedCount - result.deletedCount
        
        let message = `${successCount}개 파일이 삭제되었습니다.`
        if (failedCount > 0) {
          message += `\n${failedCount}개 파일 삭제 실패`
          if (result.deletionResults) {
            const failedResults = result.deletionResults.filter((r: string) => r.includes('실패'))
            message += '\n\n실패한 파일:\n' + failedResults.join('\n')
          }
        }
        
        alert(message)
      } else {
        throw new Error(result.error || '파일 삭제 중 오류가 발생했습니다.')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '대량 삭제 중 오류가 발생했습니다.'
      setError(errorMessage)
      alert(`파일 삭제 실패: ${errorMessage}`)
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
        if (result.success && result.share?.shortCode) {
          const shareUrl = `${window.location.origin}/share/${result.share.shortCode}`
          
          await navigator.clipboard.writeText(shareUrl)
          
          toast.success(
            <div>
              공유 링크가 생성되었습니다!
              <a 
                href={shareUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block mt-1 text-blue-400 hover:text-blue-300"
              >
                {shareUrl}
              </a>
            </div>,
            {
              style: {
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)'
              }
            }
          )
          
        setShowShareDialog(false)
        setSelectedItems([])
        } else {
          throw new Error('공유 코드가 생성되지 않았습니다.')
        }
      } else {
        throw new Error('공유 링크 생성 실패')
      }
    } catch (error) {
      console.error('공유 링크 생성 오류:', error)
      toast.error('공유 링크 생성 중 오류가 발생했습니다.')
    } finally {
      setProcessingAction(null)
    }
  }

  const checkFileSync = async () => {
    try {
      setSyncLoading(true)
      const response = await fetch('/api/files/sync')
      if (response.ok) {
        const data: SyncResponse = await response.json()
        setSyncResult(data)
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

  const cleanupMissingFiles = async () => {
    if (!syncResult) return
    
    const missingFileIds = syncResult.files
      .filter((f: SyncStatus) => f.status === 'missing')
      .map((f: SyncStatus) => f.id)
    
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
        await checkFileSync()
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

  useEffect(() => {
    if (!socket.isConnected) return
    const handleDownloadStatus = (data: any) => {
      setDownloadQueues((prev: Record<string, DownloadQueue>) => ({
        ...prev,
        [data.id]: {
          status: data.status,
          progress: data.progress,
          ...data.data
        }
      }))
      if (data.status === 'completed') {
        console.log('다운로드 완료 감지, 파일 목록 새로고침 실행:', data);
        loadFiles();
        loadStats();
      }
    }
    const cleanup = socket.on('download:status', handleDownloadStatus)
    return cleanup
  }, [socket, loadFiles, loadStats])

  const debouncedRefreshAllData = useCallback(debounce(async () => {
    console.log('Debounced: 파일 목록 및 통계 새로고침 실행');
    await loadFiles();
    await loadStats();
  }, 1000), [loadFiles, loadStats]);

  useEffect(() => {
    if (!socket.isConnected) return;
    const handleFileChanged = (data: { path: string, type: string }) => {
      console.log(`파일 시스템 변경 감지 (${data.type}): ${data.path}, 새로고침 예약`);
      debouncedRefreshAllData();
    };
    const cleanup = socket.on('file:changed', handleFileChanged);
    return cleanup;
  }, [socket, debouncedRefreshAllData]);

  useEffect(() => {
    async function loadInitialDownloadQueues() {
      try {
        const response = await fetch("/api/youtube/queue");
        if (response.ok) {
          const data = await response.json();
          
          // data가 배열인지 확인
          if (!Array.isArray(data)) {
            console.warn('API 응답이 배열이 아닙니다:', data);
            return;
          }
          
          const initialQueues: Record<string, DownloadQueue> = {};
          data.forEach((queue: any) => {
            initialQueues[queue.id] = {
              id: queue.id,
              status: queue.status,
              progress: queue.progress,
              type: queue.type,
              url: queue.originalUrl,
              title: queue.options?.title || queue.originalUrl,
              playlistTitle: queue.options?.playlistTitle,
              playlistItemId: queue.options?.playlistItemId,
              playlistTotalItems: queue.options?.playlistTotalItems,
            };
          });
          setDownloadQueues(initialQueues);
        } else {
          console.warn('다운로드 큐 API 응답 실패:', response.status, response.statusText);
        }
      } catch (error) {
        console.error("다운로드 큐 로드 실패:", error);
      }
    }
    loadInitialDownloadQueues();
  }, []);

  function getGroupKeyFromQueue(queue: any): string | null {
    try {
      if (queue.options?.isMelonChart) {
        const chartSize = queue.options.chartSize || 30
        return `MELON_CHART_TOP${chartSize}`
      }
      
      if (queue.type?.includes('PLAYLIST')) {
        return `YOUTUBE_PLAYLIST_${queue.options?.playlistName || 'playlist'}`
      }
      
      if (queue.type?.includes('MP3') || queue.type?.includes('VIDEO')) {
        const date = new Date(queue.createdAt).toISOString().slice(0, 10).replace(/-/g, '')
        return `YOUTUBE_SINGLE_${date}`
      }
      
      return null
    } catch {
      return null
    }
  }

  function getGroupDownloadStatus(group: FileGroup) {
    const groupKey = `${group.groupType}_${group.groupName}`
    const queueData = downloadQueues[groupKey]
    
    if (!queueData) {
      return { status: 'none', progress: 0 }
    }
    
    if (queueData.status === 'processing') {
      return { status: 'processing', progress: queueData.progress || 0 }
    }
    
    if (queueData.status === 'completed') {
      return { status: 'completed', progress: 100 }
    }
    
    if (queueData.status === 'failed') {
      return { status: 'failed', progress: 0 }
    }
    
    return { status: 'none', progress: 0 }
  }

  const renderFileItem = (file: FileData) => (
    <FileItem
      key={file.id}
      file={file}
      isPlaying={playerState.currentFile?.id === file.id && playerState.isPlaying}
      isSelected={selectedItems.includes(file.id)}
      melonCoverCache={melonCoverCache}
      processingAction={processingAction}
      onToggleSelect={toggleItemSelection}
      onTogglePlay={togglePlayFile}
      onDownload={handleDownloadFile}
      onDelete={handleDeleteFile}
      highlightText={highlightText}
      formatFileSize={formatFileSize}
      formatDuration={formatDuration}
      getFileIcon={getFileIcon}
      getFileBadgeColor={getFileBadgeColor}
    />
  );

  const playAllFiles = () => {
    const audioFiles = files.filter(f => f.fileType.toLowerCase().includes('mp3'));
    if (audioFiles.length > 0) {
      loadPlaylist(audioFiles);
      play();
    }
  };

  const playGroupFiles = (groupFilesInput: FileData[]) => {
    const audioFiles = groupFilesInput.filter(f => f.fileType.toLowerCase().includes('mp3'));
    if (audioFiles.length > 0) {
      loadPlaylist(audioFiles);
      play();
    }
  };

  const togglePlayFile = (file: FileData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (file.fileType.toLowerCase().includes('mp3')) {
      if (playerState.currentFile?.id === file.id) {
        togglePlay();
      } else {
        loadFile(file);
      }
    }
  };

  const startEditingGroup = (groupKey: string, groupName: string) => {
    setEditingGroup(groupKey);
    setEditingGroupName(groupName);
  };

  const cancelEditingGroup = () => {
    setEditingGroup(null);
    setEditingGroupName("");
  };

  const saveGroupName = async (groupKey: string, newName: string) => {
    try {
      setProcessingAction(`rename-group-${groupKey}`);
      const response = await fetch('/api/files/rename-group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          groupKey,
          newName
        })
      });

      if (!response.ok) {
        throw new Error('그룹 이름 변경에 실패했습니다.');
      }

      await loadFiles();
      setEditingGroup(null);
      setEditingGroupName("");
    } catch (error) {
      setError(error instanceof Error ? error.message : '그룹 이름 변경 중 오류가 발생했습니다.');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleGroupDownload = async (groupFiles: FileData[], mode: 'zip' | 'sequential' = 'zip') => {
    const fileIds = groupFiles.map(f => f.id);
    if (mode === 'sequential') {
      await handleSequentialDownload(fileIds);
    } else {
      try {
        setProcessingAction('group-download');
        const response = await fetch('/api/files/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'download',
            fileIds
          })
        });

        if (!response.ok) {
          throw new Error('그룹 다운로드에 실패했습니다.');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = 'group_files.zip';
        if (contentDisposition) {
          const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
          if (filenameStarMatch) {
            fileName = decodeURIComponent(filenameStarMatch[1]);
          } else {
            const filenameMatch = contentDisposition.match(/filename="?([^"]*)"?/);
            if (filenameMatch) {
              fileName = filenameMatch[1];
            }
          }
        }
        
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : '그룹 다운로드 중 오류가 발생했습니다.');
      } finally {
        setProcessingAction(null);
      }
    }
  };

  const handleGroupDelete = async (groupFiles: FileData[]) => {
    const fileIds = groupFiles.map(f => f.id)
    if (!confirm(`이 그룹의 파일 ${fileIds.length}개를 모두 삭제하시겠습니까?`)) return

    try {
      setProcessingAction('group-delete')
      const response = await fetch('/api/files/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'delete',
          fileIds
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '그룹 삭제에 실패했습니다.')
      }

      const result = await response.json()
      if (result.success) {
        await loadFiles()
        await loadStats()
        setSelectedItems(selectedItems.filter((id: string) => !fileIds.includes(id)))
        
        const successCount = result.deletedCount
        const failedCount = result.requestedCount - result.deletedCount
        
        let message = `${successCount}개 파일이 삭제되었습니다.`
        if (failedCount > 0) {
          message += `\n${failedCount}개 파일 삭제 실패`
          if (result.deletionResults) {
            const failedResults = result.deletionResults.filter((r: string) => r.includes('실패'))
            message += '\n\n실패한 파일:\n' + failedResults.join('\n')
          }
        }
        
        alert(message)
      } else {
        throw new Error(result.error || '파일 삭제 중 오류가 발생했습니다.')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '그룹 삭제 중 오류가 발생했습니다.'
      setError(errorMessage)
      alert(`파일 삭제 실패: ${errorMessage}`)
    } finally {
      setProcessingAction(null)
    }
  }

  const toggleAllGroups = () => {
    setAllGroupsExpanded(prevAllExpanded => {
      const newAllExpandedState = !prevAllExpanded;
      setIsExpanded((prevExpanded: Record<string, boolean>) => {
        const newExpandedRecords: Record<string, boolean> = {};
        fileGroups.forEach((group: FileGroup) => {
          const groupKey = `${group.groupType}_${group.groupName}`;
          newExpandedRecords[groupKey] = newAllExpandedState;
        });
        return newExpandedRecords;
      });
      return newAllExpandedState;
    });
  };

  const toggleGroupExpansion = (groupKey: string) => {
    setIsExpanded((prev: Record<string, boolean>) => ({ ...prev, [groupKey]: !prev[groupKey] }))
  }
  
  const renderSelectedFilesActions = () => {
    if (selectedItems.length === 0) return null
    return (
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm p-4 rounded-md shadow mb-4 flex flex-wrap gap-2 items-center">
        <p className="text-sm font-medium mr-2">
          {selectedItems.length}개 파일 선택됨
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBulkDownload(downloadMode)}
          disabled={processingAction === 'bulkDownload'}
        >
          {processingAction === 'bulkDownload' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          선택 다운로드 ({downloadMode === 'zip' ? 'ZIP' : '개별'})
        </Button>
        <Select value={downloadMode} onValueChange={(value: 'zip' | 'sequential') => setDownloadMode(value)}>
          <SelectTrigger className="w-[100px] h-9 text-xs">
            <SelectValue placeholder="다운로드 방식" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="zip">ZIP 압축</SelectItem>
            <SelectItem value="sequential">개별 파일</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleBulkDelete}
          disabled={processingAction === 'bulkDelete'}
        >
          {processingAction === 'bulkDelete' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          선택 삭제
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)}>
          <Share2 className="mr-2 h-4 w-4" />
          공유
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink className="flex items-center text-gray-300">
                <FolderOpen className="h-4 w-4 mr-1" />내 파일
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

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
            onClick={loadFiles}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="ml-2 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
            onClick={() => setShowFileSyncDialog(!showFileSyncDialog)}
              disabled={loading}
            >
              <Database className="h-4 w-4" />
            </Button>
          </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={toggleAllGroups} title={allGroupsExpanded ? "모든 그룹 접기" : "모든 그룹 펼치기"}>
            {allGroupsExpanded ? <ChevronsDownUp className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />}
              </Button>
            </div>
                      </div>

      {renderSelectedFilesActions()}

      {loading && (
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      </div>
      )}
      {error && (
        <Card className="bg-destructive/10 border-destructive text-destructive-foreground">
          <CardContent className="p-4 flex items-center">
            <AlertTriangle className="h-6 w-6 mr-3" />
            <div>
              <p className="font-semibold">오류 발생</p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <>
          {viewMode === 'groups' && fileGroups.map((group, groupIndex) => {
            const groupKey = `${group.groupType}_${group.groupName}`
            const currentGroupIsExpanded = isExpanded[groupKey]
            const selectedInGroup = group.files.filter(f => selectedItems.includes(f.id)).length
            const allGroupSelected = selectedInGroup === group.files.length && group.files.length > 0
            
            return (
              <Card key={groupKey} className="bg-white/5 border-white/10">
                <CardContent className="p-0">
                  <div className="p-4 border-b border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="p-1 h-6 w-6"
                          onClick={() => toggleGroupExpansion(groupKey)}
                        >
                          {currentGroupIsExpanded ? (
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
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-lg">{getGroupDisplayName(group)}</h3>
                            <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 text-xs">
                              {group.totalFiles}개 파일
                            </Badge>
                          </div>
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
                                <span className="text-sm text-gray-400" title={group.groupName}>
                                  {truncateMiddle(group.groupName, isMobile ? 12 : 20)}
                                </span>
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
                            {(() => {
                              const dstatus = getGroupDownloadStatus(group)
                              if (dstatus.status === 'processing') {
                                return (
                                  <span className="flex items-center text-xs text-blue-500">
                                    <Progress value={dstatus.progress} className="w-16 h-2 mr-2" />
                                    진행중 {dstatus.progress}%
                            </span>
                                )
                              }
                              if (dstatus.status === 'completed') {
                                return <span className="text-xs text-green-500 ml-2">다운로드 완료</span>
                              }
                              return null
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 mt-2 sm:mt-0">
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
                        onClick={() => handleGroupDownload(group.files, 'zip')}
                        disabled={processingAction === 'group-download'}
                      >
                        {(processingAction === 'group-download' && downloadMode === 'zip') ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-1" />
                        )}
                        압축
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-indigo-400 hover:bg-indigo-900/20"
                        onClick={() => handleGroupDownload(group.files, 'sequential')}
                        disabled={processingAction === 'sequential-download'}
                      >
                        {processingAction === 'sequential-download' ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-1" />
                        )}
                        순차
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:bg-red-900/20"
                        onClick={() => handleGroupDelete(group.files)}
                        disabled={processingAction === 'group-delete'}
                      >
                        {processingAction === 'group-delete' ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-1" />
                        )}
                        삭제
                      </Button>
                    </div>
                  </div>
                  
                  {currentGroupIsExpanded && (
                    (() => {
                      console.log(`[${groupKey}] Rendering group content. melonRankFilter:`, melonRankFilter[groupKey], 'Original group.files count:', group.files.length);

                      let filesToDisplay = [...group.files];
                      
                      if (group.groupType === 'melon_chart' && melonRankFilter[groupKey]) {
                        console.log(`[${groupKey}] Applying melon chart filter. Rank:`, melonRankFilter[groupKey]);
                        const rankFilterValue = melonRankFilter[groupKey];
                        if (rankFilterValue) {
                            filesToDisplay = filesToDisplay.filter((f: FileData) => f.rank && f.rank <= rankFilterValue);
                        }
                      }
                      
                      console.log(`[${groupKey}] Files to display count after potential melon filter:`, filesToDisplay.length);

                      if (filesToDisplay.length === 0) {
                        console.log(`[${groupKey}] No files to display.`);
                        return (
                          <div className="space-y-1 p-2">
                            <div className="text-center py-4 text-gray-400">
                              표시할 파일이 없습니다.
                      </div>
                    </div>
                        );
                      }

                      const summary = group.groupType === 'melon_chart' && melonRankFilter[groupKey] ? (
                        <div className="text-sm text-yellow-400 mb-2 px-2">
                          TOP {melonRankFilter[groupKey]} ({filesToDisplay.length}곡)
                  </div>
                      ) : null;

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-2">
                          {filesToDisplay.map(file => (
                            <div key={file.id} className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors w-full min-w-0 flex-1 max-w-full overflow-hidden">
                              {renderFileItem(file)}
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </CardContent>
              </Card>
            )
          })}
        </>
      )}
      
      {/* 공유 대화상자 */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">파일 공유</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-300">
              선택된 파일: <span className="font-semibold text-blue-400">{selectedItems.length}개</span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="expiresIn" className="text-gray-300">만료 시간</Label>
              <Select 
                value={shareFormData.expiresIn?.toString() || "unlimited"}
                onValueChange={(value) => 
                  setShareFormData(prev => ({ 
                    ...prev, 
                    expiresIn: value === "unlimited" ? null : parseInt(value)
                  }))
                }
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue placeholder="만료 시간 선택" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="1">1시간</SelectItem>
                  <SelectItem value="24">24시간</SelectItem>
                  <SelectItem value="168">7일</SelectItem>
                  <SelectItem value="720">30일</SelectItem>
                  <SelectItem value="unlimited">무제한</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxDownloads" className="text-gray-300">최대 다운로드 횟수</Label>
              <Input
                id="maxDownloads"
                type="number"
                min="1"
                placeholder="무제한 (비워두면 무제한)"
                value={shareFormData.maxDownloads || ""}
                onChange={(e) => 
                  setShareFormData(prev => ({ 
                    ...prev, 
                    maxDownloads: e.target.value ? parseInt(e.target.value) : null 
                  }))
                }
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowShareDialog(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                취소
              </Button>
              <Button 
                onClick={handleCreateShare}
                disabled={processingAction === 'share' || selectedItems.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {processingAction === 'share' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    공유 링크 생성
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
});