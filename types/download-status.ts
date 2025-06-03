// 다운로드 작업 상태
export enum DownloadStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused',
}

// 다운로드 타입
export enum DownloadType {
  MP3 = 'mp3',
  VIDEO = 'video720p',
  PLAYLIST_MP3 = 'playlist_mp3',
  PLAYLIST_VIDEO = 'playlist_video',
}

// 파일 그룹 타입
export enum FileGroupType {
  YOUTUBE_SINGLE = 'youtube_single',
  YOUTUBE_PLAYLIST = 'youtube_playlist',
  MELON_CHART = 'melon_chart',
} 