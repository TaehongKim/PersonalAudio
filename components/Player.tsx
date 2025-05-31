"use client"

import React, { useRef, useEffect } from 'react'
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

export function Player() {
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
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (audioRef.current) {
      if (state.isPlaying) {
        audioRef.current.play()
      } else {
        audioRef.current.pause()
      }
    }
  }, [state.isPlaying])

  useEffect(() => {
    if (audioRef.current && state.currentFile) {
      audioRef.current.src = `/api/files/${state.currentFile.id}/stream`
      audioRef.current.load()
      if (state.isPlaying) {
        audioRef.current.play()
      }
    }
  }, [state.currentFile, state.isPlaying])

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      seek(audioRef.current.currentTime)
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const volume = value[0]
    setVolume(volume)
  }

  const handleProgressChange = (value: number[]) => {
    if (audioRef.current) {
      const time = value[0]
      seek(time)
    }
  }

  if (!state.currentFile) return null

  const hasPlaylist = state.playlist.length > 1
  const currentTrackNumber = state.currentIndex + 1
  const totalTracks = state.playlist.length

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 z-50">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            seek(0)
          }
        }}
      />
      
      <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
        {/* 파일 정보 섹션 */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
            {state.currentFile.thumbnailPath ? (
              <img
                src={`/api/files/${state.currentFile.id}/thumbnail`}
                alt={`${state.currentFile.title} 썸네일`}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <Music className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          
          <div className="text-sm min-w-0 flex-1">
            <div className="font-medium truncate">{state.currentFile.title}</div>
            <div className="text-muted-foreground truncate">
              {state.currentFile.artist || '알 수 없는 아티스트'}
            </div>
            {hasPlaylist && (
              <div className="text-xs text-muted-foreground">
                {currentTrackNumber} / {totalTracks}
              </div>
            )}
          </div>
        </div>
        
        {/* 컨트롤 섹션 */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-md">
          <div className="flex items-center gap-2">
            {/* 셔플 버튼 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleShuffle}
              disabled={!hasPlaylist}
              className={`h-8 w-8 ${
                state.shuffle 
                  ? 'text-green-500 bg-green-500/10' 
                  : 'text-muted-foreground'
              }`}
              title="셔플"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            
            {/* 이전 곡 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={previous}
              disabled={!hasPlaylist}
              className="h-8 w-8"
              title="이전 곡"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            {/* 재생/일시정지 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => state.isPlaying ? pause() : play()}
              className="h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {state.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            
            {/* 다음 곡 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              disabled={!hasPlaylist}
              className="h-8 w-8"
              title="다음 곡"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            
            {/* 반복 재생 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRepeat}
              disabled={!hasPlaylist}
              className={`h-8 w-8 ${
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
                <Repeat1 className="h-4 w-4" />
              ) : (
                <Repeat className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* 진행 상태 바 */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-muted-foreground min-w-[40px]">
              {formatTime(state.currentTime)}
            </span>
            <Slider
              value={[state.currentTime]}
              min={0}
              max={state.duration || 100}
              step={1}
              onValueChange={handleProgressChange}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground min-w-[40px]">
              {formatTime(state.duration)}
            </span>
          </div>
        </div>
        
        {/* 볼륨 섹션 */}
        <div className="flex items-center gap-2 w-32 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleVolumeChange([state.volume === 0 ? 1 : 0])}
            className="h-8 w-8"
          >
            {state.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          
          <Slider
            value={[state.volume]}
            min={0}
            max={1}
            step={0.1}
            onValueChange={handleVolumeChange}
            className="w-20"
          />
        </div>
      </div>
    </div>
  )
} 