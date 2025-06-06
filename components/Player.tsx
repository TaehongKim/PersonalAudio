"use client"

import React, { useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { usePlayer } from '@/contexts/PlayerContext'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Repeat1, 
  Shuffle,
  Music
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useMediaQuery } from '@/hooks/use-mobile'
import Image from 'next/image'

// 긴 텍스트를 중간에 ... 으로 줄이는 유틸리티 함수
const truncateMiddle = (text: string, maxLength: number = 25): string => {
  if (text.length <= maxLength) return text;
  
  const ellipsis = '...';
  const charsToShow = maxLength - ellipsis.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  
  return text.substring(0, frontChars) + ellipsis + text.substring(text.length - backChars);
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export const Player = memo(function Player() {
  const { 
    state, 
    play, 
    pause, 
    setVolume, 
    seek, 
    formatTime,
    next,
    previous,
    toggleRepeat,
    toggleShuffle
  } = usePlayer()
  const isMobile = useMediaQuery("(max-width: 768px)")

  // 메모화된 계산 값들
  const hasPlaylist = useMemo(() => state.playlist.length > 1, [state.playlist.length])
  const currentTrackNumber = useMemo(() => state.currentIndex + 1, [state.currentIndex])
  const totalTracks = useMemo(() => state.playlist.length, [state.playlist.length])
  
  if (!state.currentFile) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-2 md:p-4 z-50">
      <div className="flex flex-col md:flex-row items-center justify-between max-w-7xl mx-auto gap-2 md:gap-4">
        {/* 파일 정보 섹션 */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1 w-full md:w-auto">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
            {state.currentFile.thumbnailPath ? (
              <Image
                src={`/api/files/${state.currentFile.id}/thumbnail`}
                alt={`${state.currentFile.title} 썸네일`}
                width={48}
                height={48}
                className="w-full h-full object-cover rounded"
                unoptimized
              />
            ) : (
              <Music className="w-4 h-4 md:w-6 md:h-6 text-muted-foreground" />
            )}
          </div>
          
          <div className="text-xs md:text-sm min-w-0 flex-1">
            <div className="font-medium truncate" title={state.currentFile.title}>
              {truncateMiddle(state.currentFile.title, isMobile ? 20 : 30)}
            </div>
            <div className="text-muted-foreground truncate" title={state.currentFile.artist || '알 수 없는 아티스트'}>
              {truncateMiddle(state.currentFile.artist || '알 수 없는 아티스트', isMobile ? 15 : 25)}
            </div>
            {hasPlaylist && (
              <div className="text-xs text-muted-foreground">
                {currentTrackNumber} / {totalTracks}
              </div>
            )}
          </div>
        </div>
        
        {/* 컨트롤 섹션 */}
        <div className="flex flex-col items-center gap-1 md:gap-2 flex-1 max-w-md w-full">
          <div className="flex items-center gap-1 md:gap-2">
            {/* 셔플 버튼 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleShuffle}
              disabled={!hasPlaylist}
              className={`h-6 w-6 md:h-8 md:w-8 ${
                state.shuffle 
                  ? 'text-green-500 bg-green-500/10' 
                  : 'text-muted-foreground'
              }`}
              title="셔플"
            >
              <Shuffle className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
            
            {/* 이전 곡 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={previous}
              disabled={!hasPlaylist}
              className="h-6 w-6 md:h-8 md:w-8"
              title="이전 곡"
            >
              <SkipBack className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
            
            {/* 재생/일시정지 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (state.isPlaying) {
                  pause();
                } else {
                  play();
                }
              }}
              className="h-8 w-8 md:h-10 md:w-10 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {state.isPlaying ? <Pause className="h-4 w-4 md:h-5 md:w-5" /> : <Play className="h-4 w-4 md:h-5 md:w-5" />}
            </Button>
            
            {/* 다음 곡 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              disabled={!hasPlaylist}
              className="h-6 w-6 md:h-8 md:w-8"
              title="다음 곡"
            >
              <SkipForward className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
            
            {/* 반복 재생 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRepeat}
              disabled={!hasPlaylist}
              className={`h-6 w-6 md:h-8 md:w-8 ${
                state.repeat !== 'none'
                  ? 'text-green-500 bg-green-500/10' 
                  : 'text-muted-foreground'
              }`}
              title={
                state.repeat === 'none' ? '반복 끄기' : 
                state.repeat === 'all' ? '전체 반복' : 
                '한 곡 반복'
              }
            >
              {state.repeat === 'one' ? (
                <Repeat1 className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                <Repeat className="h-3 w-3 md:h-4 md:w-4" />
              )}
            </Button>
          </div>
          
          {/* 진행 상태 바 */}
          <div className="flex items-center gap-1 md:gap-2 w-full">
            <span className="text-xs text-muted-foreground min-w-[30px] md:min-w-[40px]">
              {formatTime(state.currentTime)}
            </span>
            <Slider
              value={[state.currentTime]}
              min={0}
              max={state.duration || 100}
              step={1}
              onValueChange={(value) => {
                seek(value[0])
              }}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground min-w-[30px] md:min-w-[40px]">
              {formatTime(state.duration)}
            </span>
          </div>
        </div>
        
        {/* 볼륨 섹션 */}
        <div className="hidden md:flex items-center gap-2 w-32 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setVolume(state.volume === 0 ? 1 : 0)
            }}
            className="h-8 w-8"
          >
            {state.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          
          <Slider
            value={[state.volume]}
            min={0}
            max={1}
            step={0.1}
            onValueChange={(value) => {
              setVolume(value[0])
            }}
            className="w-20"
          />
        </div>
      </div>
    </div>
  )
}); 