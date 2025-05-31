"use client"

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'

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
  jumpToIndex: (index: number) => void
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

  // 재생 기록 저장 함수
  const recordPlayHistory = useCallback(async (fileId: string, duration?: number, completed: boolean = false) => {
    try {
      console.log('재생 기록 저장:', { fileId, duration, completed })
      await fetch('/api/play-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, duration, completed })
      });
      console.log('재생 기록 저장 완료')
    } catch (error) {
      console.error('재생 기록 저장 오류:', error);
    }
  }, [])

  // 내부 파일 로딩 함수 (가장 먼저 선언)
  const loadFileInternal = useCallback((file: FileData) => {
    console.log('파일 로드:', file.title)
    
    setState(prev => ({ 
      ...prev, 
      currentFile: file,
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
  }, [])

  // 다음 곡 함수
  const handleNext = useCallback(() => {
    setState(prevState => {
      const currentPlaylist = prevState.playlist
      const currentIdx = prevState.currentIndex
      
      console.log('handleNext 호출:', { 
        currentIndex: currentIdx, 
        playlistLength: currentPlaylist.length,
        shuffle: prevState.shuffle,
        repeat: prevState.repeat
      })
      
      if (currentPlaylist.length <= 1) {
        console.log('플레이리스트가 1곡 이하, 다음곡 없음')
        return prevState
      }

      let nextIndex = currentIdx + 1

      if (prevState.shuffle) {
        // 셔플 모드: 랜덤 인덱스
        const availableIndices = currentPlaylist
          .map((_, i) => i)
          .filter(i => i !== currentIdx)
        if (availableIndices.length > 0) {
          nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
        }
      } else if (nextIndex >= currentPlaylist.length) {
        // 일반 모드: 끝에 도달
        if (prevState.repeat === 'all') {
          nextIndex = 0
        } else {
          console.log('플레이리스트 끝에 도달, 재생 종료')
          return prevState // 재생 종료
        }
      }

      console.log('다음 곡으로 이동:', { from: currentIdx, to: nextIndex })
      
      // 다음 파일 로드
      const nextFile = currentPlaylist[nextIndex]
      if (nextFile) {
        // 파일 로드를 별도로 처리
        setTimeout(() => {
          loadFileInternal(nextFile)
        }, 50)
      }
      
      return {
        ...prevState,
        currentIndex: nextIndex
      }
    })
  }, [loadFileInternal])

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
      console.log('재생 시작됨')
      setState(prevState => {
        // 재생 시작 기록 저장
        if (prevState.currentFile) {
          recordPlayHistory(prevState.currentFile.id)
        }
        return { ...prevState, isPlaying: true }
      })
    }

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }))
    }

    const handleEnded = () => {
      console.log('곡이 끝났습니다. 다음 곡으로 넘어갑니다.')
      setState(prevState => {
        // 완료 기록 저장
        if (prevState.currentFile && prevState.duration) {
          recordPlayHistory(prevState.currentFile.id, Math.floor(prevState.duration), true)
        }
        return { ...prevState, isPlaying: false }
      })
      
      // repeat 모드 확인을 위해 현재 상태 사용
      setState(currentState => {
        if (currentState.repeat === 'one') {
          // 한 곡 반복
          setTimeout(() => {
            if (media) {
              media.currentTime = 0
              media.play()
            }
          }, 100)
        } else {
          // 다음 곡으로 넘어가기
          setTimeout(() => {
            handleNext()
          }, 100)
        }
        return currentState
      })
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
  }, [currentMediaRef, state.currentFile, handleNext, recordPlayHistory])

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
  const loadFile = useCallback((file: FileData) => {
    console.log('외부 loadFile 호출:', file.title)
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
  }, [])

  // 플레이리스트 로딩
  const loadPlaylist = useCallback((files: FileData[], startIndex = 0) => {
    console.log('플레이리스트 로드:', { fileCount: files.length, startIndex })
    if (files.length === 0) return

    const validIndex = Math.max(0, Math.min(startIndex, files.length - 1))
    setState(prev => ({ 
      ...prev, 
      playlist: files,
      currentIndex: validIndex
    }))

    loadFileInternal(files[validIndex])
  }, [loadFileInternal])

  // 이전 곡
  const previous = useCallback(() => {
    setState(prevState => {
      const currentPlaylist = prevState.playlist
      const currentIdx = prevState.currentIndex
      
      console.log('previous 호출:', { 
        currentIndex: currentIdx, 
        playlistLength: currentPlaylist.length 
      })

      if (currentPlaylist.length <= 1) {
        console.log('플레이리스트가 1곡 이하, 이전곡 없음')
        return prevState
      }

      let prevIndex = currentIdx - 1

      if (prevIndex < 0) {
        if (prevState.repeat === 'all') {
          prevIndex = currentPlaylist.length - 1
        } else {
          prevIndex = 0
        }
      }

      console.log('이전 곡으로 이동:', { from: currentIdx, to: prevIndex })
      
      // 이전 파일 로드
      const prevFile = currentPlaylist[prevIndex]
      if (prevFile) {
        // 파일 로드를 별도로 처리
        setTimeout(() => {
          loadFileInternal(prevFile)
        }, 50)
      }

      return {
        ...prevState,
        currentIndex: prevIndex
      }
    })
  }, [loadFileInternal])

  const next = useCallback(() => {
    handleNext()
  }, [handleNext])

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

  // 특정 인덱스로 점프
  const jumpToIndex = useCallback((index: number) => {
    if (index < 0 || index >= state.playlist.length) {
      console.log('잘못된 인덱스:', index)
      return
    }

    console.log('플레이리스트 인덱스로 이동:', { from: state.currentIndex, to: index })
    
    setState(prev => ({ ...prev, currentIndex: index }))
    
    const targetFile = state.playlist[index]
    if (targetFile) {
      loadFileInternal(targetFile)
      
      // 잠시 후 자동 재생
      setTimeout(() => {
        const media = targetFile.fileType.toLowerCase().includes('mp3') ? audioRef.current : videoRef.current
        if (media) {
          media.play().catch((error) => {
            console.error('자동 재생 실패:', error)
          })
        }
      }, 200)
    }
  }, [state.playlist, state.currentIndex, loadFileInternal, audioRef, videoRef])

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
    jumpToIndex,
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