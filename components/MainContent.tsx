'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { Download, Music, Video, Trash2, Search, List, ExternalLink, Clock, Eye, User } from "lucide-react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

// 검색 결과 타입 정의
interface SearchResult {
  id: string;
  title: string;
  uploader: string;
  duration: string;
  view_count: number;
  view_count_formatted: string;
  url: string;
  thumbnail: string;
  description: string;
}

// 대기열 항목 타입 정의
interface QueueItem {
  id: string;
  title?: string;
  type: string;
  progress: number;
  status: string;
  url: string;
  thumbnailPath?: string | null;
  createdAt: string;
}

interface MainContentProps {
  setActiveTab: (tab: string) => void
}

// 디바운스 함수 구현
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T & { cancel: () => void } {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const debouncedFunction = useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    }) as T,
    [callback, delay]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return Object.assign(debouncedFunction, { cancel });
}

export function MainContent({ setActiveTab }: MainContentProps) {
  const [downloadQueue, setDownloadQueue] = useState<QueueItem[]>([]);
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // 검색 관련 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // 검색 함수 (디바운스 적용)
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '검색 중 오류가 발생했습니다.');
      }

      setSearchResults(data.data.results || []);
    } catch (err) {
      console.error('검색 오류:', err);
      setSearchError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // 디바운스된 검색 함수
  const debouncedSearch = useDebounce(performSearch, 500);

  // 검색어 변경 시 디바운스된 검색 실행
  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery]);

  // 플레이리스트 URL 패턴 감지
  function isPlaylistUrl(url: string): boolean {
    return url.includes('playlist?list=') || url.includes('&list=');
  }

  // 대기열 목록 가져오기
  async function fetchQueue() {
    try {
      const response = await fetch('/api/youtube/queue');
      if (response.ok) {
        const data = await response.json();
        setDownloadQueue(data.queue || []);
      }
    } catch (error) {
      console.error('대기열 조회 실패:', error);
    }
  }

  // 컴포넌트 마운트 시 대기열 로드
  useEffect(() => {
    fetchQueue();
    
    // 5초마다 대기열 상태 갱신
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  // 실제 다운로드 요청 함수
  async function downloadVideo(videoUrl: string, downloadType: string) {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/youtube/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl, type: downloadType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '다운로드 요청 중 오류가 발생했습니다.');
      }

      setSuccessMessage(`다운로드가 시작되었습니다! (ID: ${data.data.id})`);
      fetchQueue(); // 대기열 갱신
    } catch (err) {
      console.error('다운로드 요청 오류:', err);
      setError(err instanceof Error ? err.message : '다운로드 요청 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  // 유튜브 URL로 다운로드 요청
  async function downloadYoutube(type: string) {
    if (!url) {
      setError('URL을 입력해주세요.');
      return;
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      setError('유효한 유튜브 URL을 입력해주세요.');
      return;
    }

    const isPlaylist = isPlaylistUrl(url);
    
    // 플레이리스트인 경우 확인 메시지
    if (isPlaylist) {
      const confirm = window.confirm(
        `플레이리스트 다운로드를 시작하시겠습니까?\n\n` +
        `• 플레이리스트의 모든 동영상이 개별적으로 다운로드됩니다.\n` +
        `• 대량의 파일이 생성될 수 있습니다.\n` +
        `• 다운로드 시간이 오래 걸릴 수 있습니다.`
      );
      
      if (!confirm) {
        return;
      }
    }

    const downloadType = isPlaylist 
      ? (type === 'mp3' ? 'playlist_mp3' : 'playlist_video')
      : (type === 'mp3' ? 'mp3' : 'video720p');

    await downloadVideo(url, downloadType);
    
    if (!error) {
      setUrl(''); // 성공 시 URL 입력 필드 초기화
    }
  }

  // 검색 결과 다운로드 처리
  async function handleSearchDownload(result: SearchResult, downloadType: string) {
    await downloadVideo(result.url, downloadType);
  }

  // 다운로드 항목 삭제
  async function removeQueueItem(id: string) {
    try {
      const response = await fetch(`/api/youtube/cancel/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDownloadQueue(prev => prev.filter(item => item.id !== id));
        setSuccessMessage('다운로드 항목이 제거되었습니다.');
      } else {
        setError('항목 제거에 실패했습니다.');
      }
    } catch (error) {
      console.error('항목 제거 실패:', error);
      setError('네트워크 오류가 발생했습니다.');
    }
  }

  // 이미지 오류 처리 함수
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    img.src = "/placeholder.svg";
  };

  // 검색 결과 항목 렌더링
  const renderSearchResult = (result: SearchResult, index: number) => (
    <div 
      key={result.id}
      className="p-4 border border-white/20 bg-white/5 rounded-lg transition-all duration-200 hover:bg-white/10"
    >
      <div className="flex gap-4">
        {/* 썸네일 */}
        <div className="flex-shrink-0">
          <div className="w-32 h-20 bg-gray-700 rounded overflow-hidden relative">
            {result.thumbnail && (
              <Image
                src={result.thumbnail}
                alt={result.title}
                width={128}
                height={80}
                className="w-full h-full object-cover"
                unoptimized
              />
            )}
            {/* 재생 시간 오버레이 */}
            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
              {result.duration}
            </div>
          </div>
        </div>

        {/* 비디오 정보 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm leading-tight mb-2 line-clamp-2 text-white">
            {result.title}
          </h3>
          
          <div className="flex items-center gap-2 text-xs text-gray-300 mb-2">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{result.uploader}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{result.view_count_formatted} 조회</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{result.duration}</span>
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => handleSearchDownload(result, 'mp3')}
              disabled={isLoading}
              className="text-xs bg-green-600 hover:bg-green-700"
            >
              <Download className="w-3 h-3 mr-1" />
              MP3
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSearchDownload(result, 'video')}
              disabled={isLoading}
              className="text-xs border-white/20 text-white hover:bg-white/10"
            >
              <Download className="w-3 h-3 mr-1" />
              Video
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(result.url, '_blank')}
              className="text-xs text-white hover:bg-white/10"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              YouTube
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-gradient-to-b from-purple-900 to-black text-white p-4 md:p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">유튜브 다운로더</h1>
        
        {/* 오류 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* 성공 메시지 */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-200 text-sm">
            {successMessage}
          </div>
        )}

        {/* 다운로드 폼 - 탭 구조 */}
        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-6">
            <Tabs defaultValue="search" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/10">
                <TabsTrigger value="search" className="data-[state=active]:bg-white/20 text-white">
                  <Search className="w-4 h-4 mr-2" />
                  검색
                </TabsTrigger>
                <TabsTrigger value="url" className="data-[state=active]:bg-white/20 text-white">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  URL 입력
                </TabsTrigger>
              </TabsList>
              
              {/* 검색 탭 */}
              <TabsContent value="search" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="search" className="text-white">곡명 또는 아티스트 검색</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="예: BTS Dynamite, 아이유 좋은날..."
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* 검색 상태 및 오류 */}
                {searchLoading && (
                  <div className="text-center py-4 text-gray-300">
                    <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full"></div>
                    <p className="mt-2">검색 중...</p>
                  </div>
                )}

                {searchError && (
                  <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
                    {searchError}
                  </div>
                )}

                {/* 검색 결과 */}
                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-white">검색 결과</h3>
                      <Badge variant="secondary" className="bg-white/20 text-white">{searchResults.length}개</Badge>
                    </div>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {searchResults.map((result, index) => renderSearchResult(result, index))}
                    </div>
                  </div>
                )}

                {/* 검색 결과 없음 */}
                {searchQuery && !searchLoading && searchResults.length === 0 && !searchError && (
                  <div className="text-center py-8 text-gray-400">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>검색 결과를 찾을 수 없습니다.</p>
                    <p className="text-sm">다른 검색어를 시도해보세요.</p>
                  </div>
                )}
              </TabsContent>
              
              {/* URL 입력 탭 */}
              <TabsContent value="url" className="space-y-4 mt-4">
                <div>
                  <Label className="text-white">유튜브 URL</Label>
                  <Input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400 mt-2"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => downloadYoutube('mp3')}
                    disabled={isLoading || !url}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Music className="w-4 h-4 mr-2" />
                    {isLoading ? '처리 중...' : 'MP3 다운로드'}
                  </Button>
                  
                  <Button
                    onClick={() => downloadYoutube('video')}
                    disabled={isLoading || !url}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    {isLoading ? '처리 중...' : '동영상 다운로드'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* 다운로드 대기열 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">다운로드 대기열</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchQueue}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Search className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>

        {downloadQueue.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-gray-400">다운로드 대기열이 비어있습니다</p>
              <p className="text-sm text-gray-500 mt-2">위에서 유튜브 URL을 입력하여 다운로드를 시작하세요</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {downloadQueue.map((item) => (
              <Card key={item.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative w-10 h-10 flex-shrink-0">
                        <Image
                          src={item.thumbnailPath || "/placeholder.svg"}
                          width={40}
                          height={40}
                          alt={`${item.title || '다운로드 항목'} 썸네일`}
                          className="rounded object-cover"
                          onError={handleImageError}
                        />
                        {item.type.includes('playlist') ? (
                          <List className="absolute bottom-0 right-0 w-4 h-4 bg-purple-600 rounded-full p-0.5" />
                        ) : item.type.includes('mp3') ? (
                          <Music className="absolute bottom-0 right-0 w-4 h-4 bg-green-600 rounded-full p-0.5" />
                        ) : (
                          <Video className="absolute bottom-0 right-0 w-4 h-4 bg-blue-600 rounded-full p-0.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.title || `다운로드 항목 #${item.id.slice(0, 8)}`}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                          <span>상태: {item.status}</span>
                          <span>진행률: {item.progress}%</span>
                          <span>유형: {item.type.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-white/10 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQueueItem(item.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 빠른 링크 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400 mb-4">
            다운로드가 완료된 파일은 파일 관리에서 확인할 수 있습니다
          </p>
          <Button 
            variant="outline" 
            className="border-white/20 text-white hover:bg-white/10"
            onClick={() => setActiveTab("files")}
          >
            파일 관리로 이동
          </Button>
        </div>
      </div>
    </div>
  );
}
