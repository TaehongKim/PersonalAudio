'use client';

import { useEffect, useState } from 'react';
import { useDownloadStatus } from '@/hooks/useSocket';
import Link from 'next/link';
import Image from 'next/image';

interface DownloadStatusProps {
  downloadId: string;
}

interface DownloadData {
  url: string;
  type: string;
  isPlaylist?: boolean;
  status?: string;
  progress?: number;
  error?: string;
  files?: Array<{
    id: string;
    title: string;
    artist?: string;
    fileSize: number;
  }>;
  coverUrl?: string;
  thumbnailPath?: string;
  title?: string;
  [key: string]: any;
}

export default function DownloadStatus({ downloadId }: DownloadStatusProps) {
  const { status, progress, error, playlistItems, isConnected } = useDownloadStatus(downloadId);
  const [downloadData, setDownloadData] = useState<DownloadData | null>(null);
  const [loading, setLoading] = useState(true);

  // 초기 상태 가져오기
  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch(`/api/youtube/status/${downloadId}`);
        if (!response.ok) {
          throw new Error('상태를 불러오는데 실패했습니다.');
        }
        const data = await response.json();
        setDownloadData(data.data);
        setLoading(false);
      } catch (err) {
        console.error('상태 조회 오류:', err);
        setLoading(false);
      }
    }

    fetchStatus();
  }, [downloadId]);

  // 다운로드 취소 처리
  async function handleCancel() {
    if (!downloadId) return;

    try {
      await fetch(`/api/youtube/cancel/${downloadId}`, {
        method: 'POST'
      });
      // 상태 갱신을 위해 페이지 새로고침
      window.location.reload();
    } catch (err) {
      console.error('취소 요청 오류:', err);
    }
  }
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!downloadData) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">오류</p>
        <p>다운로드 정보를 찾을 수 없습니다.</p>
        <Link href="/" className="text-blue-600 hover:underline mt-2 inline-block">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const isPlaylist = downloadData.isPlaylist;
  const statusText = {
    pending: '대기 중',
    processing: '처리 중',
    completed: '완료됨',
    failed: '실패'
  }[status || downloadData.status as 'pending' | 'processing' | 'completed' | 'failed'] || '알 수 없음';

  const currentProgress = progress || downloadData.progress || 0;

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-200">
        다운로드 상태
      </h2>
      
      <div className="space-y-4">
        <div className="border-b pb-4 mb-4 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">URL</p>
          <p className="text-slate-800 dark:text-slate-200 truncate">{downloadData.url}</p>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">형식</p>
          <p className="text-slate-800 dark:text-slate-200">
            {downloadData.type === 'mp3' || downloadData.type === 'playlist_mp3' ? 'MP3' : '비디오 (720p)'}
            {isPlaylist ? ' (플레이리스트)' : ''}
          </p>
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">상태: {statusText}</p>
            <p className="text-slate-700 dark:text-slate-300">{currentProgress}%</p>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div 
              className={`h-2.5 rounded-full ${
                status === 'failed' || downloadData.status === 'failed' 
                  ? 'bg-red-600' 
                  : 'bg-blue-600'
              }`} 
              style={{ width: `${currentProgress}%` }}
            ></div>
          </div>
          
          {(error || downloadData.error) && (
            <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <p className="font-bold">오류 발생</p>
              <p>{error || downloadData.error}</p>
            </div>
          )}
        </div>
        
        {/* 취소 버튼 (대기 중이거나 처리 중일 때만 표시) */}
        {(status === 'pending' || status === 'processing' || 
          downloadData.status === 'pending' || downloadData.status === 'processing') && (
          <div className="mt-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              다운로드 취소
            </button>
          </div>
        )}
        
        {/* 플레이리스트 항목 목록 */}
        {isPlaylist && playlistItems.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">
              플레이리스트 항목
            </h3>
            <div className="space-y-3">
              {playlistItems.map((item) => (
                <div 
                  key={item.index}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-3"
                >
                  <div className="flex justify-between mb-1">
                    <p className="font-medium text-slate-700 dark:text-slate-300 truncate pr-2">
                      {item.title || `항목 #${item.index + 1}`}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      {item.status === 'completed' ? '완료' : `${item.progress}%`}
                    </p>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div 
                      className="h-2 rounded-full bg-blue-600" 
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 다운로드 완료 후 파일 목록 */}
        {downloadData.status === 'completed' && downloadData.files && downloadData.files.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">
              다운로드된 파일
            </h3>
            <div className="space-y-3">
              {downloadData.files.map((file) => (
                <div 
                  key={file.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-3"
                >
                  <p className="font-medium text-slate-700 dark:text-slate-300">{file.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {file.artist || '알 수 없는 아티스트'} • {formatFileSize(file.fileSize)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 소켓 연결 상태 */}
        <div className="mt-4 text-right text-sm">
          <p className={`text-${isConnected ? 'green' : 'red'}-600`}>
            {isConnected ? '실시간 업데이트 활성화' : '실시간 업데이트 비활성화'}
          </p>
        </div>
        
        <div className="pt-4 mt-4 border-t dark:border-slate-700">
          <Link href="/" className="text-blue-600 hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

// 파일 크기 포맷팅 유틸리티 함수
function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 