"use client"

import React, { createContext, useContext, useState, useRef, useEffect } from 'react'

interface FileData {
  id: string
  title: string
  artist: string | null
  fileType: string
  fileSize: number
  duration: number | null
  thumbnailPath: string | null
  createdAt: string
  downloads: number
}

interface PlayerState {
  currentFile: FileData | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isLoading: boolean
  error: string | null
  playlist: FileData[]
  currentIndex: number
  repeat: 'none' | 'one' | 'all'
  shuffle: boolean
}

interface PlayerContextType {
  state: PlayerState
  audioRef: React.RefObject<HTMLAudioElement | null>
  videoRef: React.RefObject<HTMLVideoElement | null>
  // 기본 컨트롤
  play: () => void
  pause: () => void
  togglePlay: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  // 파일/플레이리스트 관리
  loadFile: (file: FileData) => void
  loadPlaylist: (files: FileData[], startIndex?: number) => void
  next: () => void
  previous: () => void
  // 설정
  toggleRepeat: () => void
  toggleShuffle: () => void
  // 상태
  formatTime: (seconds: number) => string
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  
  const [state, setState] = useState<PlayerState>({
    currentFile: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isLoading: false,
    error: null,
    playlist: [],
    currentIndex: -1,
    repeat: 'none',
    shuffle: false,
  })

  const currentMediaRef = state.currentFile?.fileType.toLowerCase().includes('mp3') 
    ? audioRef 
    : videoRef

  // 미디어 이벤트 핸들러
  useEffect(() => {
    const media = currentMediaRef.current
    if (!media) return

    const handleLoadStart = () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
    }

    const handleLoadedMetadata = () => {
      setState(prev => ({ 
        ...prev, 
        duration: media.duration || 0,
        isLoading: false 
      }))
    }

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: media.currentTime || 0 }))
    }

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }))
    }

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }))
    }

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false }))
      handleNext()
    }

    const handleError = () => {
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        isLoading: false,
        error: '재생 중 오류가 발생했습니다.' 
      }))
    }

    const handleVolumeChange = () => {
      setState(prev => ({ ...prev, volume: media.volume }))
    }

    media.addEventListener('loadstart', handleLoadStart)
    media.addEventListener('loadedmetadata', handleLoadedMetadata)
    media.addEventListener('timeupdate', handleTimeUpdate)
    media.addEventListener('play', handlePlay)
    media.addEventListener('pause', handlePause)
    media.addEventListener('ended', handleEnded)
    media.addEventListener('error', handleError)
    media.addEventListener('volumechange', handleVolumeChange)

    return () => {
      media.removeEventListener('loadstart', handleLoadStart)
      media.removeEventListener('loadedmetadata', handleLoadedMetadata)
      media.removeEventListener('timeupdate', handleTimeUpdate)
      media.removeEventListener('play', handlePlay)
      media.removeEventListener('pause', handlePause)
      media.removeEventListener('ended', handleEnded)
      media.removeEventListener('error', handleError)
      media.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [currentMediaRef, state.currentFile])

  // 기본 컨트롤 함수들
  const play = () => {
    const media = currentMediaRef.current
    if (media) {
      media.play().catch(() => {
        setState(prev => ({ 
          ...prev, 
          error: '재생할 수 없습니다. 파일을 확인해주세요.' 
        }))
      })
    }
  }

  const pause = () => {
    const media = currentMediaRef.current
    if (media) {
      media.pause()
    }
  }

  const togglePlay = () => {
    if (state.isPlaying) {
      pause()
    } else {
      play()
    }
  }

  const seek = (time: number) => {
    const media = currentMediaRef.current
    if (media) {
      media.currentTime = time
    }
  }

  const setVolume = (volume: number) => {
    const media = currentMediaRef.current
    if (media) {
      media.volume = Math.max(0, Math.min(1, volume))
    }
  }

  // 파일 로딩
  const loadFile = (file: FileData) => {
    setState(prev => ({ 
      ...prev, 
      currentFile: file,
      playlist: [file],
      currentIndex: 0,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      error: null
    }))

    // 기존 미디어 정지
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }

    // 새로운 미디어 소스 설정
    const media = file.fileType.toLowerCase().includes('mp3') ? audioRef.current : videoRef.current
    if (media) {
      media.src = `/api/files/${file.id}/stream`
      media.load()
    }
  }

  // 플레이리스트 로딩
  const loadPlaylist = (files: FileData[], startIndex = 0) => {
    if (files.length === 0) return

    const validIndex = Math.max(0, Math.min(startIndex, files.length - 1))
    setState(prev => ({ 
      ...prev, 
      playlist: files,
      currentIndex: validIndex
    }))

    loadFile(files[validIndex])
  }

  // 다음 곡
  const handleNext = () => {
    let nextIndex = state.currentIndex + 1
    let targetPlaylist = state.playlist

    if (targetPlaylist.length <= 1) return

    if (state.shuffle) {
      // 셔플 모드: 랜덤 인덱스
      const availableIndices = targetPlaylist
        .map((_, i) => i)
        .filter(i => i !== state.currentIndex)
      nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
    } else if (nextIndex >= targetPlaylist.length) {
      // 일반 모드: 끝에 도달
      if (state.repeat === 'all') {
        nextIndex = 0
      } else {
        return // 재생 종료
      }
    }

    setState(prev => ({ ...prev, currentIndex: nextIndex }))
    loadFile(targetPlaylist[nextIndex])
  }

  // 이전 곡
  const previous = () => {
    if (state.playlist.length <= 1) return

    let prevIndex = state.currentIndex - 1

    if (prevIndex < 0) {
      if (state.repeat === 'all') {
        prevIndex = state.playlist.length - 1
      } else {
        prevIndex = 0
      }
    }

    setState(prev => ({ ...prev, currentIndex: prevIndex }))
    loadFile(state.playlist[prevIndex])
  }

  const next = () => {
    handleNext()
  }

  // 반복 모드 토글
  const toggleRepeat = () => {
    setState(prev => ({ 
      ...prev, 
      repeat: prev.repeat === 'none' ? 'all' : prev.repeat === 'all' ? 'one' : 'none'
    }))
  }

  // 셔플 토글
  const toggleShuffle = () => {
    setState(prev => ({ ...prev, shuffle: !prev.shuffle }))
  }

  // 시간 포맷팅
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const value: PlayerContextType = {
    state,
    audioRef,
    videoRef,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    loadFile,
    loadPlaylist,
    next,
    previous,
    toggleRepeat,
    toggleShuffle,
    formatTime,
  }

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* 숨겨진 오디오/비디오 엘리먼트 */}
      <audio ref={audioRef} preload="metadata" />
      <video ref={videoRef} preload="metadata" style={{ display: 'none' }} />
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}