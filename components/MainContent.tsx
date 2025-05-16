'use client';

import { useState, useEffect } from "react";
import { Download, Music, Video, Trash2, Search } from "lucide-react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

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

export function MainContent() {
  const [downloadQueue, setDownloadQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 다운로드 큐 로드
  useEffect(() => {
    async function fetchQueue() {
      try {
        // 처리 중 및 대기 중인 다운로드 불러오기
        const response = await fetch('/api/youtube/queue');
        if (response.ok) {
          const data = await response.json();
          setDownloadQueue(data.data || []);
        }
      } catch (err) {
        console.error('다운로드 큐 로드 오류:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchQueue();
    // 5초마다 큐 갱신
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  // 다운로드 항목 취소
  async function cancelDownload(id: string) {
    try {
      await fetch(`/api/youtube/cancel/${id}`, {
        method: 'POST'
      });
      
      // 상태 즉시 업데이트 (UI 반응성)
      setDownloadQueue(prev => 
        prev.map(item => 
          item.id === id ? { ...item, status: 'failed', progress: 0 } : item
        )
      );
    } catch (err) {
      console.error('다운로드 취소 오류:', err);
    }
  }

  // 모든 항목 취소
  async function cancelAllDownloads() {
    const processingItems = downloadQueue.filter(
      item => item.status === 'pending' || item.status === 'processing'
    );
    
    for (const item of processingItems) {
      await cancelDownload(item.id);
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

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/youtube/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '다운로드 요청 중 오류가 발생했습니다.');
      }
      
      // 성공 시 입력 필드 초기화
      setUrl('');
    } catch (err) {
      console.error('다운로드 요청 오류:', err);
      setError(err instanceof Error ? err.message : '다운로드 요청 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-blue-900 to-black text-white p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">유튜브 다운로더</h1>
        <Card className="bg-white/10 border-none">
          <CardContent className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-400/30 text-red-300 rounded text-sm">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label htmlFor="youtube-url" className="block text-sm font-medium mb-2">
                유튜브 URL 입력
              </label>
              <div className="flex gap-2">
                <Input
                  id="youtube-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="bg-white/5 border-white/20 text-white"
                  disabled={isLoading}
                />
                <Button 
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isLoading}
                  onClick={() => url && window.open(url, '_blank')}
                >
                  <Search className="w-4 h-4 mr-2" />
                  검색
                </Button>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                className="bg-green-600 hover:bg-green-700 flex-1"
                disabled={isLoading}
                onClick={() => downloadYoutube('mp3')}
              >
                <Music className="w-4 h-4 mr-2" />
                MP3 다운로드
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 flex-1"
                disabled={isLoading}
                onClick={() => downloadYoutube('video')}
              >
                <Video className="w-4 h-4 mr-2" />
                720p 다운로드
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">다운로드 대기열</h2>
          {downloadQueue.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="border-white/20 text-white hover:bg-white/10"
              onClick={cancelAllDownloads}
            >
              모두 취소
            </Button>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : downloadQueue.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 text-center text-gray-400">
              <p>대기 중인 다운로드가 없습니다.</p>
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
                          src={item.thumbnailPath || "/placeholder.svg?height=40&width=40"}
                          width={40}
                          height={40}
                          alt={`${item.title || '다운로드 항목'} 썸네일`}
                          className="rounded"
                        />
                        {item.type.includes('mp3') ? (
                          <Music className="absolute bottom-0 right-0 w-4 h-4 bg-green-600 rounded-full p-0.5" />
                        ) : (
                          <Video className="absolute bottom-0 right-0 w-4 h-4 bg-blue-600 rounded-full p-0.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/download/status/${item.id}`} className="hover:underline">
                          <p className="font-medium truncate">
                            {item.title || item.url.substring(0, 50) + '...'}
                          </p>
                        </Link>
                        <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded-full ${
                              item.status === 'completed'
                                ? 'bg-green-500'
                                : item.status === 'failed'
                                ? 'bg-red-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${item.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {item.status === 'pending' && '대기 중'}
                          {item.status === 'processing' && `처리 중 (${item.progress}%)`}
                          {item.status === 'completed' && '완료됨'}
                          {item.status === 'failed' && '실패'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.status === 'completed' ? (
                        <Link href={`/download/status/${item.id}`}>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          onClick={() => cancelDownload(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
