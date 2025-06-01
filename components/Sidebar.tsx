"use client"

import { Home, Search, Music, FileMusic, Share2, Settings, ListMusic, Clock, Download, X } from "lucide-react"
import { useTheme } from "@/contexts/ThemeContext"
import { useState, useEffect } from "react"
import { useDownload } from '@/contexts/DownloadContext'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ activeTab, setActiveTab, isOpen = true, onClose }: SidebarProps) {
  const { theme } = useTheme()
  const { downloadCount } = useDownload()
  const isDark = theme === "dark"
  const [playlists, setPlaylists] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPlaylists() {
      try {
        const response = await fetch('/api/playlists')
        if (response.ok) {
          const data = await response.json()
          setPlaylists((data.playlists || []).map((p: any) => ({ id: p.id, name: p.name })))
        } else {
          throw new Error('플레이리스트를 불러올 수 없습니다.')
        }
      } catch {
        setError('플레이리스트를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }
    fetchPlaylists()
  }, [])

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
          ${isDark ? "bg-black text-gray-300" : "bg-white text-gray-700 border-r border-gray-200"}
          fixed top-0 left-0 h-screen overflow-y-auto z-50 transition-transform duration-300 ease-in-out
          w-60 md:w-60
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* 모바일 헤더 (닫기 버튼 포함) */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
            귀요미 YC 음악방
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X size={20} />
          </Button>
        </div>

        <div className="p-6">
          {/* 데스크톱 헤더 */}
          <h1 className={`hidden md:block text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"} mb-6`}>
            귀요미 YC 음악방
          </h1>
          
          <nav>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleTabClick("home")}
                  className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors ${
                    activeTab === "home"
                      ? isDark
                        ? "bg-white/10 text-white"
                        : "bg-gray-100 text-black font-medium"
                      : isDark
                        ? "text-gray-300 hover:text-white hover:bg-white/5"
                        : "text-gray-700 hover:text-black hover:bg-gray-50"
                  }`}
                >
                  <Home size={20} />
                  <span>홈</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabClick("youtube")}
                  className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors ${
                    activeTab === "youtube"
                      ? isDark
                        ? "bg-white/10 text-white"
                        : "bg-gray-100 text-black font-medium"
                      : isDark
                        ? "text-gray-300 hover:text-white hover:bg-white/5"
                        : "text-gray-700 hover:text-black hover:bg-gray-50"
                  }`}
                >
                  <Music size={20} />
                  <span>유튜브</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabClick("melon")}
                  className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors ${
                    activeTab === "melon"
                      ? isDark
                        ? "bg-white/10 text-white"
                        : "bg-gray-100 text-black font-medium"
                      : isDark
                        ? "text-gray-300 hover:text-white hover:bg-white/5"
                        : "text-gray-700 hover:text-black hover:bg-gray-50"
                  }`}
                >
                  <Search size={20} />
                  <span>멜론 차트</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabClick("files")}
                  className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors ${
                    activeTab === "files"
                      ? isDark
                        ? "bg-white/10 text-white"
                        : "bg-gray-100 text-black font-medium"
                      : isDark
                        ? "text-gray-300 hover:text-white hover:bg-white/5"
                        : "text-gray-700 hover:text-black hover:bg-gray-50"
                  }`}
                >
                  <FileMusic size={20} />
                  <span>내 파일</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabClick("playlist")}
                  className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors ${
                    activeTab === "playlist"
                      ? isDark
                        ? "bg-white/10 text-white"
                        : "bg-gray-100 text-black font-medium"
                      : isDark
                        ? "text-gray-300 hover:text-white hover:bg-white/5"
                        : "text-gray-700 hover:text-black hover:bg-gray-50"
                  }`}
                >
                  <ListMusic size={20} />
                  <span>플레이리스트</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabClick("recent")}
                  className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors ${
                    activeTab === "recent"
                      ? isDark
                        ? "bg-white/10 text-white"
                        : "bg-gray-100 text-black font-medium"
                      : isDark
                        ? "text-gray-300 hover:text-white hover:bg-white/5"
                        : "text-gray-700 hover:text-black hover:bg-gray-50"
                  }`}
                >
                  <Clock size={20} />
                  <span>최근 재생</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabClick("downloads")}
                  className={`flex items-center justify-between w-full text-left p-3 rounded-lg transition-colors ${
                    activeTab === "downloads"
                      ? isDark
                        ? "bg-white/10 text-white"
                        : "bg-gray-100 text-black font-medium"
                      : isDark
                        ? "text-gray-300 hover:text-white hover:bg-white/5"
                        : "text-gray-700 hover:text-black hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Download size={20} />
                    <span>다운로드</span>
                  </div>
                  {downloadCount > 0 && (
                    <Badge variant="secondary" className="bg-blue-500 text-white text-xs">
                      {downloadCount}
                    </Badge>
                  )}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabClick("shares")}
                  className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors ${
                    activeTab === "shares"
                      ? isDark
                        ? "bg-white/10 text-white"
                        : "bg-gray-100 text-black font-medium"
                      : isDark
                        ? "text-gray-300 hover:text-white hover:bg-white/5"
                        : "text-gray-700 hover:text-black hover:bg-gray-50"
                  }`}
                >
                  <Share2 size={20} />
                  <span>공유 관리</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabClick("settings")}
                  className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors ${
                    activeTab === "settings"
                      ? isDark
                        ? "bg-white/10 text-white"
                        : "bg-gray-100 text-black font-medium"
                      : isDark
                        ? "text-gray-300 hover:text-white hover:bg-white/5"
                        : "text-gray-700 hover:text-black hover:bg-gray-50"
                  }`}
                >
                  <Settings size={20} />
                  <span>설정</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
        
        {/* 플레이리스트 섹션 */}
        <div className="flex-1 px-6 pb-6">
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h2 className="text-sm uppercase font-semibold mb-4 text-blue-500">내 플레이리스트</h2>
            {loading ? (
              <div className="text-xs text-gray-400">로딩 중...</div>
            ) : error ? (
              <div className="text-xs text-red-400">{error}</div>
            ) : (
              <ul className="space-y-2">
                {playlists.map((playlist) => (
                  <li key={playlist.id}>
                    <button 
                      className={`text-sm w-full text-left p-2 rounded transition-colors ${
                        isDark ? "hover:text-white hover:bg-white/5" : "hover:text-black hover:bg-gray-50"
                      }`}
                      onClick={() => handleTabClick("playlist")}
                    >
                      {playlist.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
