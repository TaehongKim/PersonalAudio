'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Download, ExternalLink, Clock, Eye, User } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import Image from 'next/image';

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

export default function DownloadForm() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  // URL 다운로드 상태
  const [url, setUrl] = useState('');
  const [type, setType] = useState('mp3');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 검색 관련 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

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

  // URL 다운로드 처리
  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    if (!url) {
      setError('URL을 입력해주세요.');
      return;
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      setError('유효한 유튜브 URL을 입력해주세요.');
      return;
    }

    await downloadVideo(url, type);
  }

  // 검색 결과 다운로드 처리
  async function handleSearchDownload(result: SearchResult, downloadType: string) {
    await downloadVideo(result.url, downloadType);
  }

  // 실제 다운로드 요청 함수
  async function downloadVideo(videoUrl: string, downloadType: string) {
    setIsLoading(true);
    setError(null);

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

      // 다운로드 상태 페이지로 리다이렉트
      router.push(`/download/status/${data.data.id}`);
    } catch (err) {
      console.error('다운로드 요청 오류:', err);
      setError(err instanceof Error ? err.message : '다운로드 요청 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  // 검색 결과 항목 렌더링
  const renderSearchResult = (result: SearchResult, index: number) => (
    <div 
      key={result.id}
      className={`p-3 sm:p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${
        isDark 
          ? 'border-white/10 bg-white/5 hover:bg-white/10' 
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex gap-2 sm:gap-4">
        {/* 썸네일 */}
        <div className="flex-shrink-0">
          <div className="w-24 h-16 sm:w-32 sm:h-20 bg-gray-300 dark:bg-gray-700 rounded overflow-hidden relative">
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
          <h3 className="font-medium text-xs sm:text-sm leading-tight mb-1 sm:mb-2 line-clamp-2">
            {result.title}
          </h3>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span className="truncate">{result.uploader}</span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{result.view_count_formatted} 조회</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{result.duration}</span>
              </div>
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex flex-wrap gap-1 sm:gap-2 mt-2 sm:mt-3">
            <Button
              size="sm"
              onClick={() => handleSearchDownload(result, 'mp3')}
              disabled={isLoading}
              className="text-xs h-7 px-2 sm:h-8 sm:px-3"
            >
              <Download className="w-3 h-3 mr-1" />
              MP3
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSearchDownload(result, 'video')}
              disabled={isLoading}
              className="text-xs h-7 px-2 sm:h-8 sm:px-3"
            >
              <Download className="w-3 h-3 mr-1" />
              Video
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(result.url, '_blank')}
              className="text-xs h-7 px-2 sm:h-8 sm:px-3"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">YouTube</span>
              <span className="sm:hidden">YT</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6 py-3 sm:py-6">
        <CardTitle className="text-lg sm:text-xl">YouTube 다운로드</CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        {error && (
          <div className="mb-4 p-2 sm:p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded text-sm sm:text-base">
            {error}
          </div>
        )}
        
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="text-sm sm:text-base">
              <Search className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">검색</span>
              <span className="sm:hidden">검색</span>
            </TabsTrigger>
            <TabsTrigger value="url" className="text-sm sm:text-base">
              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">URL 입력</span>
              <span className="sm:hidden">URL</span>
            </TabsTrigger>
          </TabsList>
          
          {/* 검색 탭 */}
          <TabsContent value="search" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm sm:text-base">곡명 또는 아티스트 검색</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="예: BTS Dynamite, 아이유 좋은날..."
                  className="pl-10 text-sm sm:text-base"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* 검색 상태 및 오류 */}
            {searchLoading && (
              <div className="text-center py-3 sm:py-4 text-gray-500">
                <div className="animate-spin inline-block w-5 h-5 sm:w-6 sm:h-6 border-2 border-current border-t-transparent rounded-full"></div>
                <p className="mt-2 text-sm sm:text-base">검색 중...</p>
              </div>
            )}

            {searchError && (
              <div className="p-2 sm:p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded text-sm sm:text-base">
                {searchError}
              </div>
            )}

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm sm:text-base">검색 결과</h3>
                  <Badge variant="secondary" className="text-xs sm:text-sm">{searchResults.length}개</Badge>
                </div>
                
                <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
                  {searchResults.map((result, index) => renderSearchResult(result, index))}
                </div>
              </div>
            )}

            {/* 검색 결과 없음 */}
            {searchQuery && !searchLoading && searchResults.length === 0 && !searchError && (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <Search className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm sm:text-base">검색 결과를 찾을 수 없습니다.</p>
                <p className="text-xs sm:text-sm">다른 검색어를 시도해보세요.</p>
              </div>
            )}
          </TabsContent>
          
          {/* URL 입력 탭 */}
          <TabsContent value="url" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            <form onSubmit={handleUrlSubmit} className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url" className="text-sm sm:text-base">유튜브 URL</Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  disabled={isLoading}
                  className="text-sm sm:text-base"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">다운로드 타입</Label>
                <RadioGroup 
                  defaultValue={type} 
                  className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"
                  onValueChange={(value) => setType(value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mp3" id="mp3" disabled={isLoading} />
                    <Label htmlFor="mp3" className="text-sm sm:text-base">MP3</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="video" id="video" disabled={isLoading} />
                    <Label htmlFor="video" className="text-sm sm:text-base">비디오 (720p)</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full text-sm sm:text-base"
              >
                {isLoading ? '처리 중...' : '다운로드'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 