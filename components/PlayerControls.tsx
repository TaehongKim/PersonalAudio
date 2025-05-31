"use client"

import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useTheme } from "@/contexts/ThemeContext"
import { usePlayer } from "@/contexts/PlayerContext"
import { useState } from "react"

export function PlayerControls() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const { state, togglePlay, next, previous, seek, setVolume, toggleRepeat, toggleShuffle, formatTime, jumpToIndex } = usePlayer()
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)

  // 현재 파일이 없으면 기본 플레이어 UI 표시

  const handleSeek = (value: number[]) => {
    seek(value[0])
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100)
  }

  // 플레이리스트 곡 선택
  const handlePlaylistItemClick = (index: number) => {
    if (index === state.currentIndex) {
      // 현재 재생 중인 곡이면 재생/일시정지 토글
      togglePlay()
    } else {
      // 다른 곡이면 해당 곡으로 이동 (자동 재생 포함)
      jumpToIndex(index)
    }
  }

  // const progressPercentage = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0

  return (
    <div
      className={`${isDark ? "bg-black text-white border-t border-white/10" : "bg-white text-gray-800 border-t border-gray-200"} p-4`}
    >
      {/* 에러 메시지 */}
      {state.error && (
        <div className="mb-2 p-2 bg-red-900/50 border border-red-600 rounded text-red-200 text-sm">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-between">
        {/* 현재 재생 정보 */}
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
            {state.currentFile ? (
              state.currentFile.fileType.toLowerCase().includes('mp3') ? (
                <span className="text-xs font-medium">MP3</span>
              ) : (
                <span className="text-xs font-medium">MP4</span>
              )
            ) : (
              <span className="text-xs font-medium opacity-50">♪</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {state.currentFile ? (
              <>
                <p className="font-semibold truncate">{state.currentFile.title}</p>
                <p className={`text-sm truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {state.currentFile.artist || '알 수 없는 아티스트'} • {state.currentFile.fileType.toUpperCase()}
                  {state.duration > 0 && ` • ${formatTime(state.duration)}`}
                </p>
                {state.playlist.length > 1 && (
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {state.currentIndex + 1} / {state.playlist.length}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold truncate opacity-50">재생 중인 파일 없음</p>
                <p className={`text-sm truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  파일을 선택하여 재생을 시작하세요
                </p>
              </>
            )}
          </div>
        </div>

        {/* 플레이어 컨트롤 */}
        <div className="flex flex-col items-center mx-8">
          {/* 컨트롤 버튼 */}
          <div className="flex items-center space-x-2">
            {/* 셔플 */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${state.shuffle ? 'text-purple-400' : isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
              onClick={toggleShuffle}
              disabled={!state.currentFile}
            >
              <Shuffle size={16} />
            </Button>
            
            {/* 이전 곡 */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-10 w-10 ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
              onClick={() => {
                console.log('이전 곡 버튼 클릭, 플레이리스트 길이:', state.playlist.length)
                previous()
              }}
              disabled={!state.currentFile}
            >
              <SkipBack size={20} />
            </Button>
            
            {/* 재생/일시정지 */}
            <Button
              className={`${isDark ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"} rounded-full h-12 w-12 p-0 hover:scale-105 transition disabled:opacity-50 disabled:hover:scale-100`}
              onClick={togglePlay}
              disabled={!state.currentFile || state.isLoading}
            >
              {state.isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
              ) : state.isPlaying ? (
                <Pause fill="currentColor" size={22} />
              ) : (
                <Play fill="currentColor" size={22} />
              )}
            </Button>
            
            {/* 다음 곡 */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-10 w-10 ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
              onClick={() => {
                console.log('다음 곡 버튼 클릭, 플레이리스트 길이:', state.playlist.length)
                next()
              }}
              disabled={!state.currentFile}
            >
              <SkipForward size={20} />
            </Button>
            
            {/* 반복 */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${state.repeat !== 'none' ? 'text-purple-400' : isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
              onClick={toggleRepeat}
              disabled={!state.currentFile}
            >
              <Repeat size={16} />
              {state.repeat === 'one' && (
                <span className="absolute text-xs font-bold">1</span>
              )}
            </Button>
          </div>

          {/* 진행 바 */}
          <div className="w-96 max-w-full mt-2 flex items-center space-x-2">
            <span className={`text-xs w-10 text-right ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {formatTime(state.currentTime)}
            </span>
            <div className="flex-1">
              <Slider
                value={[state.currentTime]}
                max={state.duration || 100}
                step={1}
                className="w-full"
                onValueChange={handleSeek}
                disabled={!state.currentFile}
              />
            </div>
            <span className={`text-xs w-10 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {formatTime(state.duration)}
            </span>
          </div>
        </div>

        {/* 볼륨 및 부가 컨트롤 */}
        <div className="flex items-center space-x-2">
          {/* 볼륨 컨트롤 */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className={isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            >
              {state.volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </Button>
            
            {showVolumeSlider && (
              <div className={`absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 p-2 rounded shadow-lg ${
                isDark ? "bg-gray-800 border border-gray-600" : "bg-white border border-gray-200"
              }`}>
                <div className="w-24">
                  <Slider
                    value={[state.volume * 100]}
                    max={100}
                    step={1}
                    orientation="vertical"
                    className="h-20"
                    onValueChange={handleVolumeChange}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 플레이리스트 표기 (2곡 이상일 때) */}
      {state.playlist.length > 1 && (
        <div className="mt-2 max-h-32 overflow-y-auto rounded bg-black/10 dark:bg-white/10 p-2">
          <div className="text-xs mb-1 text-gray-500 dark:text-gray-400">
            플레이리스트 ({state.playlist.length}곡)
          </div>
          <ul className="space-y-1">
            {state.playlist.map((file, idx) => (
              <li
                key={file.id}
                className={`
                  truncate px-2 py-1 rounded text-sm cursor-pointer transition-colors
                  ${idx === state.currentIndex 
                    ? (isDark ? 'bg-purple-800 text-white font-bold' : 'bg-purple-100 text-purple-900 font-bold')
                    : (isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700')
                  }
                `}
                onClick={() => handlePlaylistItemClick(idx)}
                title={`${file.title} ${file.artist ? `- ${file.artist}` : ''}`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-6 text-center">
                    {idx + 1}
                  </span>
                  {idx === state.currentIndex && (
                    <div className="flex-shrink-0">
                      {state.isPlaying ? (
                        <Pause size={12} className="text-green-400" />
                      ) : (
                        <Play size={12} className="text-green-400" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="truncate">
                      {file.title}
                      {file.artist && <span className="text-gray-500"> - {file.artist}</span>}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}