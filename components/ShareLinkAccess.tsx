"use client"

import { useState, useEffect, useCallback } from 'react'
import { Download, Play, Clock, FileText, Loader2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ShareFile {
  id: string
  title: string
  artist: string | null
  fileType: string
  fileSize: number
  duration: number | null
  createdAt: string
}

interface ShareData {
  id: string
  shortCode: string
  createdAt: string
  expiresAt: string | null
  maxDownloads: number | null
  downloads: number
  files: ShareFile[]
}

interface ShareLinkAccessProps {
  code: string
}

export function ShareLinkAccess({ code }: ShareLinkAccessProps) {
  const [shareData, setShareData] = useState<ShareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set())
  const [bulkDownloading, setBulkDownloading] = useState(false)

  const loadShareData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/shares/code/access?code=${code}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('공유 링크를 찾을 수 없습니다.')
        } else if (response.status === 410) {
          throw new Error('만료된 공유 링크입니다.')
        } else if (response.status === 429) {
          throw new Error('다운로드 제한에 도달한 공유 링크입니다.')
        } else {
          throw new Error('공유 링크에 접근할 수 없습니다.')
        }
      }

      const data = await response.json()
      setShareData(data.share)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => {
    if (code) {
      loadShareData()
    }
  }, [code, loadShareData])

  const handleDownloadFile = async (fileId: string) => {
    if (!shareData) return

    try {
      setDownloadingFiles(prev => new Set(prev).add(fileId))

      // 다운로드 카운트 증가 API 호출
      await fetch(`/api/shares/code/access?code=${code}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileId })
      })

      // 실제 파일 다운로드
      const response = await fetch(`/api/files/${fileId}/download`)
      if (!response.ok) {
        throw new Error('파일 다운로드에 실패했습니다.')
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

      // 공유 데이터 새로고침 (다운로드 카운트 업데이트)
      await loadShareData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '다운로드 중 오류가 발생했습니다.')
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(fileId)
        return newSet
      })
    }
  }

  const handleBulkDownload = async () => {
    if (!shareData || shareData.files.length === 0) return

    try {
      setBulkDownloading(true)

      // 다운로드 카운트 증가 API 호출
      await fetch(`/api/shares/${code}/access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileIds: shareData.files.map(f => f.id) })
      })

      // 대량 다운로드 API 호출
      const response = await fetch('/api/files/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'download',
          fileIds: shareData.files.map(f => f.id)
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

      // 공유 데이터 새로고침
      await loadShareData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '대량 다운로드 중 오류가 발생했습니다.')
    } finally {
      setBulkDownloading(false)
    }
  }

  const handlePlayFile = (file: ShareFile) => {
    // TODO: Implement player integration
    console.log('Playing file:', file)
  }

  const handlePlayAll = () => {
    if (shareData && shareData.files.length > 0) {
      // TODO: Implement playlist integration
      console.log('Playing all files:', shareData.files)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      // TODO: 성공 토스트 메시지 추가
    } catch (err) {
      console.error('링크 복사 실패:', err)
    }
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

  const getExpiryText = (expiresAt: string | null) => {
    if (!expiresAt) return "무기한"

    const expiry = new Date(expiresAt)
    const now = new Date()
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return "만료됨"
    if (diffDays === 0) return "오늘 만료"
    if (diffDays === 1) return "내일 만료"
    return `${diffDays}일 남음`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>공유 링크를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-4 p-4 bg-red-900/50 border border-red-600 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
          <Button onClick={() => window.location.href = '/'} className="bg-purple-600 hover:bg-purple-700">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  if (!shareData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <p>공유 데이터를 찾을 수 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">공유된 파일</h1>
          
          <div className="flex justify-center items-center gap-4 mb-4">
            <Badge className="bg-blue-600">
              <FileText className="w-3 h-3 mr-1" />
              {shareData.files.length}개 파일
            </Badge>
            <Badge className="bg-purple-600">
              <Clock className="w-3 h-3 mr-1" />
              {getExpiryText(shareData.expiresAt)}
            </Badge>
            {shareData.maxDownloads && (
              <Badge className="bg-gray-600">
                다운로드 {shareData.downloads}/{shareData.maxDownloads}
              </Badge>
            )}
          </div>

          <div className="flex justify-center gap-2">
            <Button 
              onClick={handleCopyLink}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Copy className="w-4 h-4 mr-2" />
              링크 복사
            </Button>
            {shareData.files.some(f => f.fileType.toLowerCase().includes('mp3')) && (
              <Button 
                onClick={handlePlayAll}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                전체 재생
              </Button>
            )}
            <Button 
              onClick={handleBulkDownload}
              disabled={bulkDownloading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {bulkDownloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              전체 다운로드
            </Button>
          </div>
        </div>

        {/* 파일 목록 */}
        <div className="space-y-2">
          {shareData.files.map((file) => (
            <Card key={file.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="relative">
                    <div className="w-14 h-14 bg-white/10 rounded mr-4 flex items-center justify-center">
                      {file.fileType.toLowerCase().includes('mp3') ? (
                        <span className="text-xs font-medium">MP3</span>
                      ) : (
                        <span className="text-xs font-medium">MP4</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-medium truncate">{file.title}</p>
                    <p className="text-sm text-gray-400">
                      {file.artist || '알 수 없는 아티스트'} • {formatDuration(file.duration)}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Badge className={`mr-2 ${file.fileType.toLowerCase().includes('mp3') ? 'bg-green-600' : 'bg-blue-600'}`}>
                        {file.fileType.toUpperCase()}
                      </Badge>
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span className="mx-1">•</span>
                      <span>{formatDate(file.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {file.fileType.toLowerCase().includes('mp3') && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handlePlayFile(file)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8" 
                      onClick={() => handleDownloadFile(file.id)}
                      disabled={downloadingFiles.has(file.id)}
                    >
                      {downloadingFiles.has(file.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 푸터 정보 */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>생성일: {formatDate(shareData.createdAt)}</p>
          <p>총 다운로드: {shareData.downloads}회</p>
          <p className="mt-2">이 링크는 PersonalAudio에서 생성되었습니다.</p>
        </div>
      </div>
    </div>
  )
}
