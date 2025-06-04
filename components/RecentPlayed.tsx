'use client';

import { useState, useEffect, useCallback } from "react";
import { Play, Clock, TrendingUp, Calendar } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface File {
  id: string;
  title: string;
  artist?: string;
  duration?: number;
  thumbnailPath?: string;
  groupType?: string;
  groupName?: string;
}

interface TopPlayedItem {
  file: File;
  playCount: number;
}

interface PlayHistoryItem {
  id: string;
  playedAt: string;
  duration?: number;
  completed: boolean;
  file: File;
}

interface PlayHistoryData {
  topPlayed: TopPlayedItem[];
  recentHistory: PlayHistoryItem[];
  period: {
    days: number;
    from: string;
    to: string;
  };
}

interface RecentPlayedProps {
  onPlayFile?: (file: File) => void;
}

// 안전한 썸네일 URL 생성 함수
const getThumbnailUrl = (file: File): string => {
  if (!file.thumbnailPath || file.thumbnailPath.trim() === '') {
    return "/placeholder.svg";
  }
  
  // 이미 완전한 URL인 경우 그대로 반환
  if (file.thumbnailPath.startsWith('http')) {
    return file.thumbnailPath;
  }
  
  // API 엔드포인트 URL 생성
  return `/api/files/${file.id}/thumbnail`;
};

export function RecentPlayed({ onPlayFile }: RecentPlayedProps) {
  const [data, setData] = useState<PlayHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('14');

  // 재생 기록 데이터 가져오기
  const fetchPlayHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/play-history?days=${selectedPeriod}&limit=30`);
      if (response.ok) {
        const historyData = await response.json();
        setData(historyData);
      } else {
        throw new Error('재생 기록을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('재생 기록 조회 오류:', error);
      setError('재생 기록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchPlayHistory();
  }, [selectedPeriod, fetchPlayHistory]);

  // 재생 기록 추가 (파일 재생 시 호출)
  async function recordPlay(fileId: string, duration?: number, completed: boolean = false) {
    try {
      await fetch('/api/play-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, duration, completed })
      });
    } catch (error) {
      console.error('재생 기록 추가 오류:', error);
    }
  }

  // 파일 재생 및 기록
  function playFileAndRecord(file: File) {
    if (onPlayFile) {
      onPlayFile(file);
      // 재생 시작 기록
      recordPlay(file.id);
    }
  }

  // 시간 포맷팅
  function formatDuration(seconds?: number): string {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // 상대적 시간 포맷팅
  function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}분 전`;
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`;
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString();
    }
  }

  // 이미지 오류 처리
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = "/placeholder.svg";
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-gradient-to-b from-purple-900 to-black text-white p-4 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-purple-900 to-black text-white p-4 md:p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">최근 재생</h1>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32 bg-white/10 border-white/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="7">7일</SelectItem>
              <SelectItem value="14">2주</SelectItem>
              <SelectItem value="30">30일</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchPlayHistory}
            className="border-white/20 text-white hover:bg-white/10"
          >
            새로고침
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
          {error}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setError(null)}
            className="ml-2 text-red-200 hover:text-red-100"
          >
            ✕
          </Button>
        </div>
      )}

      <Tabs defaultValue="top-played" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white/10">
          <TabsTrigger value="top-played" className="data-[state=active]:bg-purple-600">
            <TrendingUp className="w-4 h-4 mr-2" />
            인기곡 TOP 30
          </TabsTrigger>
          <TabsTrigger value="recent-history" className="data-[state=active]:bg-purple-600">
            <Clock className="w-4 h-4 mr-2" />
            최근 재생 기록
          </TabsTrigger>
        </TabsList>

        <TabsContent value="top-played" className="mt-6">
          {!data || data.topPlayed.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8 text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-gray-400 mb-2">최근 {selectedPeriod}일간 재생 기록이 없습니다</p>
                <p className="text-sm text-gray-500">음악을 재생하면 인기곡 순위가 표시됩니다</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data.topPlayed.map((item, index) => (
                <Card key={item.file.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      {/* 순위 */}
                      <div className="w-8 text-center">
                        <span className={`text-lg font-bold ${
                          index < 3 ? 'text-yellow-400' : 'text-gray-400'
                        }`}>
                          #{index + 1}
                        </span>
                      </div>

                      {/* 썸네일 */}
                      <div className="w-12 h-12 relative flex-shrink-0">
                        <Image
                          src={getThumbnailUrl(item.file)}
                          width={48}
                          height={48}
                          alt={`${item.file.title} 썸네일`}
                          className="rounded object-cover"
                          onError={handleImageError}
                        />
                      </div>

                      {/* 곡 정보 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{item.file.title}</h3>
                        <div className="flex items-center space-x-3 text-sm text-gray-400 mt-1">
                          <span>{item.file.artist}</span>
                          <span>{formatDuration(item.file.duration)}</span>
                          <span className="text-purple-400 font-medium">
                            {item.playCount}회 재생
                          </span>
                        </div>
                      </div>

                      {/* 재생 버튼 */}
                      <Button
                        size="sm"
                        onClick={() => playFileAndRecord(item.file)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent-history" className="mt-6">
          {!data || data.recentHistory.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-gray-400 mb-2">최근 재생 기록이 없습니다</p>
                <p className="text-sm text-gray-500">음악을 재생하면 기록이 표시됩니다</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data.recentHistory.map((item) => (
                <Card key={item.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      {/* 썸네일 */}
                      <div className="w-10 h-10 relative flex-shrink-0">
                        <Image
                          src={getThumbnailUrl(item.file)}
                          width={40}
                          height={40}
                          alt={`${item.file.title} 썸네일`}
                          className="rounded object-cover"
                          onError={handleImageError}
                        />
                      </div>

                      {/* 곡 정보 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{item.file.title}</h3>
                        <div className="flex items-center space-x-3 text-sm text-gray-400 mt-1">
                          <span>{item.file.artist}</span>
                          <span>{formatDuration(item.file.duration)}</span>
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>{formatRelativeTime(item.playedAt)}</span>
                          </div>
                          {item.completed && (
                            <span className="text-green-400 text-xs">완료</span>
                          )}
                        </div>
                      </div>

                      {/* 재생 버튼 */}
                      <Button
                        size="sm"
                        onClick={() => playFileAndRecord(item.file)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {data && (
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>
            최근 {data.period.days}일간의 데이터 
            ({new Date(data.period.from).toLocaleDateString()} ~ {new Date(data.period.to).toLocaleDateString()})
          </p>
        </div>
      )}
    </div>
  );
}

export default RecentPlayed;