import DownloadStatusPageClient from '@/components/DownloadStatusPageClient';

export default async function DownloadStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return <DownloadStatusPageClient id={id} />;
}