'use client';

import { useState, useEffect } from "react";
import { Download, Music, Video, Trash2, Search, List } from "lucide-react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

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

export function MainContent({ setActiveTab }: MainContentProps) {
  const [downloadQueue, setDownloadQueue] = useState<QueueItem[]>([]);
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const downloadType = isPlaylist 
        ? (type === 'mp3' ? 'playlist_mp3' : 'playlist_video')
        : (type === 'mp3' ? 'mp3' : 'video720p');

      const response = await fetch('/api/youtube/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          type: downloadType
        }),
      });

      const result = await response.json();

      if (response.ok) {
        if (isPlaylist) {
          setSuccessMessage(`플레이리스트 다운로드가 시작되었습니다. (ID: ${result.downloadId})`);
        } else {
          setSuccessMessage(`다운로드가 시작되었습니다. (ID: ${result.downloadId})`);
        }
        setUrl(''); // URL 입력 필드 초기화
        fetchQueue(); // 대기열 갱신
      } else {
        setError(result.error || '다운로드를 시작할 수 없습니다.');
      }
    } catch (err) {
      console.error('다운로드 요청 실패:', err);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
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

        {/* URL 입력 및 다운로드 */}
        <Card className="bg-white/10 border-none">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">유튜브 URL</label>
                <Input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
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

              <div className="text-xs text-gray-400 mt-2">
                <p>• 개별 동영상과 플레이리스트 모두 지원</p>
                <p>• 플레이리스트의 경우 각 동영상이 개별적으로 다운로드됩니다</p>
                <p>• 다운로드 진행 상황은 아래에서 확인할 수 있습니다</p>
              </div>
            </div>
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
