"use client"

import { useState, useEffect, useCallback } from 'react'
import { use } from 'react'
import { Share2, Download, Copy, Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'react-toastify'
import { usePlayer } from '@/contexts/PlayerContext'

interface SharedFileData {
  id: string
  title: string
  artist: string | null
  fileType: string
  fileSize: number
  duration: number | null
  thumbnailPath: string | null
  downloads?: number
  createdAt: string
  groupType?: string
  groupName?: string
  rank?: number | null
}

interface ShareData {
  id: string
  shortCode: string
  files: SharedFileData[]
  expiresAt: string | null
  maxDownloads: number | null
  currentDownloads: number
  createdAt: string
}

export default function SharePage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params)
  const [shareData, setShareData] = useState<ShareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [melonCoverCache, setMelonCoverCache] = useState<Record<string, string>>({})
  const { state: playerState, loadFile, loadPlaylist, play, pause, next, previous, toggleRepeat, toggleShuffle } = usePlayer()

  // 멜론 앨범 커버 가져오기 함수
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
          setMelonCoverCache(prev => ({ ...prev, [cacheKey]: coverUrl }))
          return coverUrl
        }
      }
    } catch (error) {
      console.error('멜론 앨범 커버 가져오기 실패:', error)
    }
    return null
  }, [melonCoverCache]);

  // 멜론차트 파일의 앨범 커버 자동 로드 (개선된 버전)
  useEffect(() => {
    if (!shareData) return;

    const filesToFetch = shareData.files.filter(file => 
      (
        (file.groupType === 'melon_chart') ||  // 명시적 멜론차트 파일
        (file.title && file.artist && !file.thumbnailPath)  // 제목+아티스트 있고 썸네일 없는 모든 파일
      ) &&
      file.title && 
      file.artist &&
      !melonCoverCache[`${file.artist}_${file.title}`]
    );
    
    console.log('멜론 커버 로드 대상 파일들:', filesToFetch.map(f => ({ title: f.title, artist: f.artist, groupType: f.groupType })));
    
    filesToFetch.forEach(file => {
      if (file.title && file.artist) {
        fetchMelonCover(file.title, file.artist);
      }
    });
  }, [shareData, fetchMelonCover, melonCoverCache]);

  // 썸네일 이미지 URL 생성 함수
  const getThumbnailUrl = useCallback((file: SharedFileData) => {
    // 1. 기본 썸네일이 있는 경우
    if (file.thumbnailPath) {
      return `/api/files/${file.id}/thumbnail`
    }

    // 2. 멜론차트 파일의 경우 캐시된 앨범 커버 사용 (groupType 체크)
    if (file.groupType === 'melon_chart' && file.title && file.artist) {
      const cacheKey = `${file.artist}_${file.title}`
      const cachedCover = melonCoverCache[cacheKey]
      if (cachedCover) {
        return cachedCover
      }
    }

    // 3. groupType이 없어도 title과 artist가 있으면 멜론 커버 시도
    if (file.title && file.artist && !file.thumbnailPath) {
      const cacheKey = `${file.artist}_${file.title}`
      const cachedCover = melonCoverCache[cacheKey]
      if (cachedCover) {
        return cachedCover
      }
    }

    // 4. 기본값: null (아이콘 표시)
    return null
  }, [melonCoverCache]);

  useEffect(() => {
    async function loadShareData() {
      try {
        const response = await fetch(`/api/shares/code/access?code=${resolvedParams.code}`)
        if (!response.ok) {
          throw new Error('공유 데이터를 불러올 수 없습니다.')
        }
        const data = await response.json()
        setShareData(data.share)
        
        // 플레이리스트 자동 로드
        if (data.share.files.length > 0) {
          const audioFiles = data.share.files.map((file: SharedFileData) => ({
            id: file.id,
            title: file.title,
            artist: file.artist,
            fileType: file.fileType,
            fileSize: file.fileSize,
            duration: file.duration,
            thumbnailPath: file.thumbnailPath,
            downloads: 0,
            createdAt: file.createdAt
          }))
          loadPlaylist(audioFiles)
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }
    loadShareData()
  }, [resolvedParams.code, loadPlaylist])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('링크가 클립보드에 복사되었습니다.')
    } catch {
      toast.error('링크 복사에 실패했습니다.')
    }
  }

  const handleDownload = async (fileId: string) => {
    try {
      const response = await fetch(`/api/shares/code/access?code=${resolvedParams.code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      })

      if (!response.ok) {
        throw new Error('다운로드 권한을 얻을 수 없습니다.')
      }

      const { success } = await response.json()
      if (success) {
        // 다운로드 URL로 리다이렉트
        window.location.href = `/api/files/${fileId}/download`
      } else {
        throw new Error('다운로드 권한을 얻을 수 없습니다.')
      }
    } catch (error) {
      toast.error('다운로드에 실패했습니다.')
    }
  }

  // 전체 다운로드 함수 추가
  const handleBulkDownload = async () => {
    if (!shareData || shareData.files.length === 0) return;

    try {
      toast.info('전체 다운로드를 준비 중입니다...');
      
      const fileIds = shareData.files.map(file => file.id);
      
      // 각 파일의 다운로드 권한을 먼저 확인
      for (const fileId of fileIds) {
        const response = await fetch(`/api/shares/code/access?code=${resolvedParams.code}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId })
        });
        
        if (!response.ok) {
          throw new Error('일부 파일의 다운로드 권한을 얻을 수 없습니다.');
        }
      }

      // ZIP 파일 생성 및 다운로드
      const bulkResponse = await fetch('/api/files/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'download',
          fileIds: fileIds
        })
      });

      if (!bulkResponse.ok) {
        throw new Error('전체 다운로드에 실패했습니다.');
      }

      const blob = await bulkResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const contentDisposition = bulkResponse.headers.get('Content-Disposition');
      let fileName = `shared_files_${shareData.shortCode}.zip`;
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

      toast.success('전체 다운로드가 완료되었습니다!');

    } catch (error) {
      console.error('전체 다운로드 오류:', error);
      toast.error(error instanceof Error ? error.message : '전체 다운로드 중 오류가 발생했습니다.');
    }
  };

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

  const handlePlayAll = () => {
    if (shareData && shareData.files.length > 0) {
      const audioFiles = shareData.files
        .filter(file => file.fileType.toLowerCase().includes('mp3'))
        .map(file => ({
          id: file.id,
          title: file.title,
          artist: file.artist,
          fileType: file.fileType,
          fileSize: file.fileSize,
          duration: file.duration,
          thumbnailPath: file.thumbnailPath,
          downloads: 0,
          createdAt: file.createdAt
        }))
      if (audioFiles.length > 0) {
        loadPlaylist(audioFiles)
        play()
      }
    }
  }

  const togglePlayFile = (file: SharedFileData) => {
    const audioFile = {
      id: file.id,
      title: file.title,
      artist: file.artist,
      fileType: file.fileType,
      fileSize: file.fileSize,
      duration: file.duration,
      thumbnailPath: file.thumbnailPath,
      downloads: 0,
      createdAt: file.createdAt
    }
    
    if (playerState.currentFile?.id === file.id) {
      if (playerState.isPlaying) {
        pause()
      } else {
        play()
      }
    } else {
      loadFile(audioFile)
      play()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-white/10 rounded w-1/3 mb-4"></div>
            <div className="h-32 bg-white/10 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-20 bg-white/10 rounded"></div>
              <div className="h-20 bg-white/10 rounded"></div>
              <div className="h-20 bg-white/10 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-900/20 border-red-500/30">
            <CardContent className="p-6">
              <h1 className="text-2xl font-bold text-red-400 mb-2">오류 발생</h1>
              <p className="text-gray-300">{error || '공유 데이터를 찾을 수 없습니다.'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">공유된 파일</h1>
            <p className="text-gray-400">
              {formatDate(shareData.createdAt)}에 공유됨 • {shareData.files.length}개 파일
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleBulkDownload}
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={shareData.files.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              전체 다운로드
            </Button>
            <Button
              onClick={handleCopyLink}
              className="bg-white text-black hover:bg-gray-200"
            >
              <Copy className="w-4 h-4 mr-2" />
              링크 복사
            </Button>
          </div>
        </div>

        <Card className="bg-white/5 border-white/10 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Share2 className="w-5 h-5 text-purple-400" />
                  <span className="font-medium">공유 정보</span>
                </div>
                <div className="text-sm text-gray-400">
                  {shareData.maxDownloads && (
                    <span className="mr-3">
                      다운로드 제한: {shareData.currentDownloads}/{shareData.maxDownloads}회
                    </span>
                  )}
                  {shareData.expiresAt && (
                    <span>
                      만료일: {formatDate(shareData.expiresAt)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  className={`h-10 w-10 ${
                    playerState.shuffle 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-green-600/20 hover:bg-green-600/30'
                  }`}
                  size="icon"
                  onClick={toggleShuffle}
                  disabled={!shareData?.files.some(f => f.fileType.toLowerCase().includes('mp3'))}
                  title="셔플"
                >
                  <Shuffle className="w-4 h-4" />
                </Button>
                <Button
                  className="bg-green-600/20 hover:bg-green-600/30 h-10 w-10"
                  size="icon"
                  onClick={previous}
                  disabled={!shareData?.files.some(f => f.fileType.toLowerCase().includes('mp3'))}
                >
                  <SkipBack className="w-5 h-5" />
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 px-4 h-10"
                  onClick={handlePlayAll}
                  disabled={!shareData?.files.some(f => f.fileType.toLowerCase().includes('mp3'))}
                >
                  {playerState.isPlaying ? (
                    <Pause className="w-5 h-5 mr-2" />
                  ) : (
                    <Play className="w-5 h-5 mr-2" />
                  )}
                  전체 재생
                </Button>
                <Button
                  className="bg-green-600/20 hover:bg-green-600/30 h-10 w-10"
                  size="icon"
                  onClick={next}
                  disabled={!shareData?.files.some(f => f.fileType.toLowerCase().includes('mp3'))}
                >
                  <SkipForward className="w-5 h-5" />
                </Button>
                <Button
                  className={`h-10 w-10 ${
                    playerState.repeat !== 'none'
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-green-600/20 hover:bg-green-600/30'
                  }`}
                  size="icon"
                  onClick={toggleRepeat}
                  disabled={!shareData?.files.some(f => f.fileType.toLowerCase().includes('mp3'))}
                  title={playerState.repeat === 'none' ? '반복 끄기' : playerState.repeat === 'all' ? '전체 반복' : '한 곡 반복'}
                >
                  {playerState.repeat === 'one' ? (
                    <Repeat1 className="w-4 h-4" />
                  ) : (
                    <Repeat className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <ScrollArea className="h-[calc(100vh-20rem)] rounded-lg">
          <div className="space-y-2 pr-4">
            {shareData.files.map((file) => {
              const thumbnailUrl = getThumbnailUrl(file);
              
              return (
                <Card key={file.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center">
                      <div className="relative">
                        <div className="w-12 h-12 bg-white/10 rounded mr-3 flex items-center justify-center overflow-hidden">
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={`${file.title} 썸네일`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // 이미지 로드 실패 시 기본 아이콘으로 변경
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = file.fileType.toLowerCase().includes('mp3') 
                                    ? '<div class="text-gray-400 text-xl">🎵</div>' 
                                    : '<div class="text-gray-400 text-xl">📄</div>';
                                }
                              }}
                            />
                          ) : (
                            <div className="text-gray-400 text-xl">
                              {file.fileType.toLowerCase().includes('mp3') ? '🎵' : '📄'}
                            </div>
                          )}
                          
                          {/* 현재 재생 중인 파일 표시 */}
                          {playerState.currentFile?.id === file.id && playerState.isPlaying && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <div className="text-green-400 animate-pulse">
                                <Play className="h-4 w-4" fill="currentColor" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="font-medium truncate">{file.title}</p>
                        <p className="text-sm text-gray-400">
                          {file.artist || '알 수 없는 아티스트'} • {formatDuration(file.duration)}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Badge className="mr-2 bg-blue-600">
                            {file.fileType.toUpperCase()}
                          </Badge>
                          <span>{formatFileSize(file.fileSize)}</span>
                          {file.rank && (
                            <Badge className="ml-2 bg-yellow-600/20 text-yellow-400 text-xs">
                              #{file.rank}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {file.fileType.toLowerCase().includes('mp3') && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => togglePlayFile(file)}
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
                          onClick={() => handleDownload(file.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}