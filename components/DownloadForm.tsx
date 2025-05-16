'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function DownloadForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [type, setType] = useState('mp3');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
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

    setIsLoading(true);

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

      // 다운로드 상태 페이지로 리다이렉트
      router.push(`/download/status/${data.data.id}`);
    } catch (err) {
      console.error('다운로드 요청 오류:', err);
      setError(err instanceof Error ? err.message : '다운로드 요청 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">유튜브 URL 입력</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">유튜브 URL</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label>다운로드 타입</Label>
            <RadioGroup 
              defaultValue={type} 
              className="flex space-x-4"
              onValueChange={(value) => setType(value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mp3" id="mp3" disabled={isLoading} />
                <Label htmlFor="mp3">MP3</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="video" id="video" disabled={isLoading} />
                <Label htmlFor="video">비디오 (720p)</Label>
              </div>
            </RadioGroup>
          </div>
          
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? '처리 중...' : '다운로드'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 