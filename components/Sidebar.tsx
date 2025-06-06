"use client"

import { Home, Search, Music, FileMusic, Share2, Settings, ListMusic, Clock, Download, X, Music2 } from "lucide-react"
import { useTheme } from "@/contexts/ThemeContext"
import { useDownload } from '@/contexts/DownloadContext'
import { usePlaylist } from '@/contexts/PlaylistContext'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ activeTab, setActiveTab, isOpen = true, onClose }: SidebarProps) {
  const { theme } = useTheme()
  const { downloadCount } = useDownload()
  const { playlists, loading: playlistLoading } = usePlaylist()
  const isDark = theme === "dark"

  const handleTabClick = (tab: string) => {
    setActiveTab(tab)
    // 모바일에서 탭 클릭 시 사이드바 닫기
    if (onClose) {
      onClose()
    }
  }

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* 사이드바 */}
      <div
        className={`
          ${isDark ? "bg-black text-gray-300 border-r border-white/10" : "bg-white text-gray-700 border-r border-gray-200"}
          fixed top-0 left-0 h-screen z-50 transition-transform duration-300 ease-in-out
          w-60 md:w-60
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              YC 음악방
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="md:hidden h-8 w-8"
            >
              <X size={20} />
            </Button>
          </div>

          {/* 메인 메뉴 */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              <Button
                onClick={() => handleTabClick("home")}
                variant={activeTab === "home" ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  activeTab === "home"
                    ? isDark ? "bg-white/10 text-white" : "bg-gray-100 text-black"
                    : isDark ? "text-gray-300 hover:text-white hover:bg-white/5" : "text-gray-700 hover:text-black hover:bg-gray-50"
                }`}
              >
                <Home size={20} />
                <span>홈</span>
              </Button>

              <Button
                onClick={() => handleTabClick("player")}
                variant={activeTab === "player" ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  activeTab === "player"
                    ? isDark ? "bg-white/10 text-white" : "bg-gray-100 text-black"
                    : isDark ? "text-gray-300 hover:text-white hover:bg-white/5" : "text-gray-700 hover:text-black hover:bg-gray-50"
                }`}
              >
                <Music size={20} />
                <span>음악 플레이어</span>
              </Button>

              <Button
                onClick={() => handleTabClick("melon")}
                variant={activeTab === "melon" ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  activeTab === "melon"
                    ? isDark ? "bg-white/10 text-white" : "bg-gray-100 text-black"
                    : isDark ? "text-gray-300 hover:text-white hover:bg-white/5" : "text-gray-700 hover:text-black hover:bg-gray-50"
                }`}
              >
                <Search size={20} />
                <span>멜론 차트</span>
              </Button>

              <Button
                onClick={() => handleTabClick("youtube")}
                variant={activeTab === "youtube" ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  activeTab === "youtube"
                    ? isDark ? "bg-white/10 text-white" : "bg-gray-100 text-black"
                    : isDark ? "text-gray-300 hover:text-white hover:bg-white/5" : "text-gray-700 hover:text-black hover:bg-gray-50"
                }`}
              >
                <Music size={20} />
                <span>유튜브</span>
              </Button>

              <Button
                onClick={() => handleTabClick("shares")}
                variant={activeTab === "shares" ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  activeTab === "shares"
                    ? isDark ? "bg-white/10 text-white" : "bg-gray-100 text-black"
                    : isDark ? "text-gray-300 hover:text-white hover:bg-white/5" : "text-gray-700 hover:text-black hover:bg-gray-50"
                }`}
              >
                <Share2 size={20} />
                <span>공유 관리</span>
              </Button>

              <Button
                onClick={() => handleTabClick("files")}
                variant={activeTab === "files" ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  activeTab === "files"
                    ? isDark ? "bg-white/10 text-white" : "bg-gray-100 text-black"
                    : isDark ? "text-gray-300 hover:text-white hover:bg-white/5" : "text-gray-700 hover:text-black hover:bg-gray-50"
                }`}
              >
                <FileMusic size={20} />
                <span>내 파일</span>
              </Button>

              <Button
                onClick={() => handleTabClick("downloads")}
                variant={activeTab === "downloads" ? "secondary" : "ghost"}
                className={`w-full justify-between ${
                  activeTab === "downloads"
                    ? isDark ? "bg-white/10 text-white" : "bg-gray-100 text-black"
                    : isDark ? "text-gray-300 hover:text-white hover:bg-white/5" : "text-gray-700 hover:text-black hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Download size={20} />
                  <span>다운로드</span>
                </div>
                {downloadCount > 0 && (
                  <Badge variant="secondary" className="bg-blue-500 text-white text-xs">
                    {downloadCount}
                  </Badge>
                )}
              </Button>

              <Button
                onClick={() => handleTabClick("recent")}
                variant={activeTab === "recent" ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  activeTab === "recent"
                    ? isDark ? "bg-white/10 text-white" : "bg-gray-100 text-black"
                    : isDark ? "text-gray-300 hover:text-white hover:bg-white/5" : "text-gray-700 hover:text-black hover:bg-gray-50"
                }`}
              >
                <Clock size={20} />
                <span>최근 재생</span>
              </Button>

              <Button
                onClick={() => handleTabClick("settings")}
                variant={activeTab === "settings" ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  activeTab === "settings"
                    ? isDark ? "bg-white/10 text-white" : "bg-gray-100 text-black"
                    : isDark ? "text-gray-300 hover:text-white hover:bg-white/5" : "text-gray-700 hover:text-black hover:bg-gray-50"
                }`}
              >
                <Settings size={20} />
                <span>설정</span>
              </Button>

              {/* 플레이리스트 섹션 */}
              <div className="pt-6">
                <div className={`px-2 py-2 text-sm font-medium ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  내 플레이리스트
                </div>
                
                {playlistLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-300"></div>
                  </div>
                ) : playlists.length > 0 ? (
                  <div className="space-y-1">
                    {playlists.map((playlist) => (
                      <Button
                        key={playlist.id}
                        variant="ghost"
                        className={`w-full justify-start gap-3 ${
                          isDark ? 'text-gray-300 hover:text-white hover:bg-white/5' : 'text-gray-700 hover:text-black hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          handleTabClick("playlist")
                          // TODO: 특정 플레이리스트로 이동하는 로직 추가
                        }}
                      >
                        <Music2 size={16} />
                        <span className="truncate text-sm">{playlist.name}</span>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className={`px-2 py-2 text-sm ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    플레이리스트가 없습니다
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  )
}
