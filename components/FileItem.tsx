'use client';

import { Download, Trash2, Play, Pause, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FileItemProps {
  file: {
    id: string;
    title: string;
    artist: string | null;
    fileType: string;
    fileSize: number;
    duration: number | null;
    thumbnailPath: string | null;
    sourceUrl: string | null;
    createdAt: string;
    downloads: number;
    groupType?: string;
    groupName?: string;
    rank: number | null;
  };
  isPlaying: boolean;
  isSelected: boolean;
  melonCoverCache: Record<string, string>;
  processingAction: string | null;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
  onTogglePlay: (file: any, e: React.MouseEvent) => void;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  highlightText: (text: string) => React.ReactNode;
  formatFileSize: (bytes: number) => string;
  formatDuration: (seconds: number | null) => string;
  getFileIcon: (fileType: string) => React.ReactNode;
  getFileBadgeColor: (fileType: string) => string;
}

export function FileItem({
  file,
  isPlaying,
  isSelected,
  melonCoverCache,
  processingAction,
  onToggleSelect,
  onTogglePlay,
  onDownload,
  onDelete,
  highlightText,
  formatFileSize,
  formatDuration,
  getFileIcon,
  getFileBadgeColor,
}: FileItemProps) {
  return (
    <div className="flex items-center">
      <div className="mr-3" onClick={(e) => onToggleSelect(file.id, e)}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-gray-500 bg-transparent"
        />
      </div>
      <div className="relative">
        <div className="w-12 h-12 bg-white/10 rounded mr-3 flex items-center justify-center overflow-hidden">
          {file.fileType.toLowerCase().includes('mp3') ? (
            <>
              {/* 멜론 차트 파일인 경우 멜론 앨범 커버 우선 표시 */}
              {file.groupType === 'melon_chart' && file.title && file.artist && melonCoverCache[`${file.artist}_${file.title}`] ? (
                <img 
                  src={melonCoverCache[`${file.artist}_${file.title}`]}
                  alt={`${file.title} 앨범 커버`}
                  className="w-full h-full object-cover rounded"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const thumbnailImg = parent.querySelector('.thumbnail-img');
                      if (thumbnailImg) {
                        (thumbnailImg as HTMLElement).style.display = 'block';
                      } else {
                        const iconElement = parent.querySelector('.fallback-icon');
                        if (iconElement) {
                          iconElement.classList.remove('hidden');
                        }
                      }
                    }
                  }}
                />
              ) : null}
              {/* 기존 썸네일 이미지 (멜론 커버가 없을 때만 표시) */}
              {file.thumbnailPath && !(file.groupType === 'melon_chart' && melonCoverCache[`${file.artist}_${file.title}`]) ? (
                <img 
                  src={`/api/files/${file.id}/thumbnail`}
                  alt={`${file.title} 앨범 커버`}
                  className="thumbnail-img w-full h-full object-cover rounded"
                  loading="lazy"
                  onError={(e) => {
                    e.preventDefault();
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const iconElement = parent.querySelector('.fallback-icon');
                      if (iconElement) {
                        iconElement.classList.remove('hidden');
                      }
                    }
                  }}
                />
              ) : null}
            </>
          ) : null}
          <div className={`fallback-icon ${(file.thumbnailPath || (file.groupType === 'melon_chart' && melonCoverCache[`${file.artist}_${file.title}`])) && file.fileType.toLowerCase().includes('mp3') ? 'hidden' : ''} flex items-center justify-center w-full h-full bg-gradient-to-br from-gray-800 to-gray-900`}>
            {getFileIcon(file.fileType)}
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0 mr-2">
        <div className="flex items-center space-x-2">
          {file.rank && (
            <Badge className="bg-yellow-600 text-xs px-1">
              #{file.rank}
            </Badge>
          )}
          <p className="font-medium truncate">{highlightText(file.title)}</p>
        </div>
        <p className="text-sm text-gray-400">
          {highlightText(file.artist || '알 수 없는 아티스트')} • {formatDuration(file.duration)}
        </p>
        <div className="flex items-center text-xs text-gray-500 mt-1">
          <Badge className={`mr-2 ${getFileBadgeColor(file.fileType)}`}>
            {file.fileType.toUpperCase()}
          </Badge>
          <span>{formatFileSize(file.fileSize)}</span>
          <span className="mx-1">•</span>
          <span>다운로드 {file.downloads}회</span>
        </div>
      </div>
      <div className="flex space-x-1">
        {file.fileType.toLowerCase().includes('mp3') && (
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 md:h-8 md:w-8"
            onClick={(e) => onTogglePlay(file, e)}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 md:h-4 md:w-4 text-green-400" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5 md:h-4 md:w-4" />
            )}
          </Button>
        )}
        {!file.fileType.toLowerCase().includes('mp3') && file.sourceUrl && (
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 md:h-8 md:w-8 text-blue-400 hover:bg-blue-900/20"
            onClick={(e) => {
              e.stopPropagation()
              window.open(file.sourceUrl!, '_blank')
            }}
            title="원본 링크 열기"
          >
            <ExternalLink className="h-5 w-5 md:h-4 md:w-4" />
          </Button>
        )}
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-10 w-10 md:h-8 md:w-8" 
          onClick={(e) => {
            e.stopPropagation()
            onDownload(file.id)
          }}
          disabled={processingAction === `download-${file.id}`}
        >
          {processingAction === `download-${file.id}` ? (
            <Loader2 className="h-5 w-5 md:h-4 md:w-4 animate-spin" />
          ) : (
            <Download className="h-5 w-5 md:h-4 md:w-4" />
          )}
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-10 w-10 md:h-8 md:w-8 text-red-400 hover:bg-red-900/20" 
          onClick={(e) => {
            e.stopPropagation()
            onDelete(file.id)
          }}
          disabled={processingAction === `delete-${file.id}`}
        >
          {processingAction === `delete-${file.id}` ? (
            <Loader2 className="h-5 w-5 md:h-4 md:w-4 animate-spin" />
          ) : (
            <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
          )}
        </Button>
      </div>
    </div>
  );
} 