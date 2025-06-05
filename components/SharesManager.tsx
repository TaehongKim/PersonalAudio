"use client"

import { useState, useEffect, useCallback } from "react"
import { Trash2, Copy, RefreshCw, Clock, ExternalLink, MoreVertical, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface ShareData {
  id: string
  shortCode: string
  expiresAt: string | null
  maxDownloads: number | null
  downloads: number
  createdAt: string
  files: {
    id: string
    title: string
    artist: string | null
    fileType: string
    fileSize: number
    duration: number | null
  }[]
  isExpired: boolean
  isDownloadLimitReached: boolean
}

interface ShareFormData {
  expiresIn: number | null
  maxDownloads: number | null
}

// 긴 텍스트를 중간에 ... 으로 줄이는 유틸리티 함수
const truncateMiddle = (text: string, maxLength: number = 25): string => {
  if (text.length <= maxLength) return text;
  const ellipsis = '...';
  const charsToShow = maxLength - ellipsis.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  return text.substring(0, frontChars) + ellipsis + text.substring(text.length - backChars);
};

export function SharesManager() {
  const [shares, setShares] = useState<ShareData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null)
  const [processingAction, setProcessingAction] = useState<string | null>(null)
  const [formData, setFormData] = useState<ShareFormData>({
    expiresIn: 168, // 7일 (시간 단위)
    maxDownloads: null
  })

  // 공유 목록 로딩
  const loadShares = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/shares')
      if (!response.ok) {
        throw new Error('공유 목록을 불러오는데 실패했습니다.')
      }

      const data = await response.json()
      setShares(data.shares)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadShares()
  }, [loadShares])

  // 링크 복사
  const handleCopyLink = async (shortCode: string) => {
    try {
      const url = `${window.location.origin}/share/${shortCode}`
      await navigator.clipboard.writeText(url)
      // TODO: 성공 토스트 메시지 추가
    } catch (err) {
      console.error('링크 복사 실패:', err)
      // TODO: 에러 토스트 메시지 추가
    }
  }

  // 공유 삭제
  const handleDeleteShare = async (shareId: string) => {
    if (!confirm('정말로 이 공유 링크를 삭제하시겠습니까?')) return

    try {
      setProcessingAction(`delete-${shareId}`)
      const response = await fetch(`/api/shares/${shareId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('공유 링크 삭제에 실패했습니다.')
      }

      await loadShares()
    } catch (err) {
      setError(err instanceof Error ? err.message : '공유 링크 삭제 중 오류가 발생했습니다.')
    } finally {
      setProcessingAction(null)
    }
  }

  // 만료일 변경
  const handleUpdateExpiry = async () => {
    if (!selectedShareId) return

    try {
      setProcessingAction(`update-${selectedShareId}`)
      const response = await fetch(`/api/shares/${selectedShareId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('공유 링크 수정에 실패했습니다.')
      }

      await loadShares()
      setSelectedShareId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '공유 링크 수정 중 오류가 발생했습니다.')
    } finally {
      setProcessingAction(null)
    }
  }

  // 만료일 표시 텍스트
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

  // 만료일 상태에 따른 색상
  const getExpiryColor = (expiresAt: string | null, isExpired: boolean) => {
    if (isExpired) return "bg-red-600"
    if (!expiresAt) return "bg-green-600"

    const expiry = new Date(expiresAt)
    const now = new Date()
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 3) return "bg-yellow-600"
    return "bg-blue-600"
  }

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // 날짜 포맷팅
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  if (loading) {
    return (
      <div className="flex-1 bg-gradient-to-b from-blue-900 to-black text-white p-4 md:p-8 overflow-y-auto">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>공유 목록을 불러오는 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-blue-900 to-black text-white p-4 md:p-8 overflow-y-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">공유 관리</h1>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={loadShares}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>

        {/* 에러 표시 */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-600 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        <p className="text-gray-400 mb-6">
          생성한 공유 링크를 관리하고 QR 코드를 생성할 수 있습니다. 링크는 만료일에 자동으로 비활성화됩니다.
        </p>
      </div>

      {shares.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-lg">
          <p className="text-gray-400">생성된 공유 링크가 없습니다.</p>
          <p className="text-sm text-gray-500 mt-2">파일 관리에서 파일을 선택하여 공유 링크를 생성해보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shares.map((share) => (
            <Card
              key={share.id}
              className="bg-white/5 border-white/10 overflow-visible cursor-pointer"
              onClick={() => setSelectedShareId(share.id)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg truncate pr-2">
                    {share.files.length > 0 ? truncateMiddle(share.files[0].title, 25) : '제목 없음'}
                    {share.files.length > 1 && ` 외 ${share.files.length - 1}곡`}
                  </h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        onClick={e => e.stopPropagation()}
                      >
                        {processingAction?.includes(share.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreVertical className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-white z-50">
                      <DropdownMenuItem 
                        className="hover:bg-gray-700" 
                        onClick={e => { e.stopPropagation(); handleCopyLink(share.shortCode); }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        링크 복사
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="hover:bg-gray-700" 
                        onClick={e => { e.stopPropagation(); setSelectedShareId(share.id); }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        설정 변경
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="hover:bg-gray-700 text-red-400"
                        onClick={e => { e.stopPropagation(); handleDeleteShare(share.id); }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center mb-3 gap-2 flex-wrap">
                  <Badge className={`${getExpiryColor(share.expiresAt, share.isExpired)}`}>
                    <Clock className="w-3 h-3 mr-1" />
                    {getExpiryText(share.expiresAt)}
                  </Badge>
                  <Badge className="bg-purple-600">파일 {share.files.length}개</Badge>
                  {share.maxDownloads && (
                    <Badge className={`${share.isDownloadLimitReached ? 'bg-red-600' : 'bg-gray-600'}`}>
                      제한 {share.downloads}/{share.maxDownloads}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center bg-black/30 rounded p-2 mb-3">
                  <Input
                    value={`${window.location.origin}/share/${share.shortCode}`}
                    readOnly
                    className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto text-sm"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 ml-1 hover:bg-white/10"
                    onClick={() => handleCopyLink(share.shortCode)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                <div className="text-xs text-gray-400">
                  <div className="flex justify-between mb-1">
                    <span>생성일</span>
                    <span>{formatDate(share.createdAt)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>다운로드 횟수</span>
                    <span>{share.downloads}회</span>
                  </div>
                  <div className="flex justify-between">
                    <span>총 파일 크기</span>
                    <span>{formatFileSize(share.files.reduce((sum, file) => sum + file.fileSize, 0))}</span>
                  </div>
                </div>

                {/* 파일 목록 */}
                {share.files.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-gray-500 mb-2">포함된 파일:</p>
                    <div className="space-y-1">
                      {share.files.slice(0, 3).map((file) => (
                        <div key={file.id} className="text-xs text-gray-400">
                          <span className="truncate">{truncateMiddle(file.title, 25)}</span>
                          <span className="text-gray-500 ml-1">({file.fileType})</span>
                        </div>
                      ))}
                      {share.files.length > 3 && (
                        <div className="text-xs text-gray-500">
                          ... 외 {share.files.length - 3}개 파일
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => window.open(`/share/${share.shortCode}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  미리보기
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* 설정 변경 다이얼로그 */}
      <Dialog open={!!selectedShareId} onOpenChange={(open: boolean) => !open && setSelectedShareId(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>공유 링크 설정 변경</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="expiry">만료 시간</Label>
              <Select 
                value={formData.expiresIn?.toString() || 'null'} 
                onValueChange={(value: string) => setFormData(prev => ({
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
                value={formData.maxDownloads || ''}
                onChange={(e) => setFormData(prev => ({
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
                onClick={() => setSelectedShareId(null)}
                disabled={processingAction !== null}
              >
                취소
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleUpdateExpiry}
                disabled={processingAction !== null}
              >
                {processingAction?.includes('update') ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                설정 변경
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SharesManager;