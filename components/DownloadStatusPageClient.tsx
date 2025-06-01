'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import DownloadStatus from '@/components/DownloadStatus';
import { GlobalLayout } from '@/components/GlobalLayout';

export default function DownloadStatusPageClient({ id }: { id: string }) {
  const [isValidDownload, setIsValidDownload] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 다운로드 ID 유효성 검사
    async function validateDownloadId() {
      try {
        const response = await fetch(`/api/youtube/status/${id}`);
        setIsValidDownload(response.ok);
      } catch (error) {
        console.error('다운로드 ID 검증 오류:', error);
        setIsValidDownload(false);
      } finally {
        setLoading(false);
      }
    }

    validateDownloadId();
  }, [id]);

  // 로딩 중 상태
  if (loading) {
    return (
      <GlobalLayout showNavigation={false}>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </GlobalLayout>
    );
  }

  // 유효하지 않은 다운로드 ID
  if (!isValidDownload) {
    return notFound();
  }

  return (
    <GlobalLayout showNavigation={false}>
      <div className="container mx-auto py-8 px-4">
        <DownloadStatus downloadId={id} />
      </div>
    </GlobalLayout>
  );
}