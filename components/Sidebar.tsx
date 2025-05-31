"use client"

import { Home, Search, Music, FileMusic, Share2, Settings, ListMusic, Clock, Download } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTheme } from "@/contexts/ThemeContext"
import { useState, useEffect } from "react"
import { useDownload } from '@/contexts/DownloadContext'
import { Badge } from "@/components/ui/badge"

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
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

  return (
    <div
      className={`w-60 ${isDark ? "bg-black text-gray-300" : "bg-white text-gray-700 border-r border-gray-200"} fixed top-0 left-0 h-screen overflow-y-auto`}
    >
      <div className="p-6">
        <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"} mb-6`}>귀요미 YC 음악방</h1>
        <nav>
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveTab("home")}
                className={`flex items-center space-x-2 w-full text-left ${
                  activeTab === "home"
                    ? isDark
                      ? "text-white"
                      : "text-black font-medium"
                    : isDark
                      ? "text-gray-300 hover:text-white"
                      : "text-gray-700 hover:text-black"
                }`}
              >
                <Home size={24} />
                <span>홈</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("youtube")}
                className={`flex items-center space-x-2 w-full text-left ${
                  activeTab === "youtube"
                    ? isDark
                      ? "text-white"
                      : "text-black font-medium"
                    : isDark
                      ? "text-gray-300 hover:text-white"
                      : "text-gray-700 hover:text-black"
                }`}
              >
                <Music size={24} />
                <span>유튜브</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("melon")}
                className={`flex items-center space-x-2 w-full text-left ${
                  activeTab === "melon"
                    ? isDark
                      ? "text-white"
                      : "text-black font-medium"
                    : isDark
                      ? "text-gray-300 hover:text-white"
                      : "text-gray-700 hover:text-black"
                }`}
              >
                <Search size={24} />
                <span>멜론 차트</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("files")}
                className={`flex items-center space-x-2 w-full text-left ${
                  activeTab === "files"
                    ? isDark
                      ? "text-white"
                      : "text-black font-medium"
                    : isDark
                      ? "text-gray-300 hover:text-white"
                      : "text-gray-700 hover:text-black"
                }`}
              >
                <FileMusic size={24} />
                <span>내 파일</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("playlist")}
                className={`flex items-center space-x-2 w-full text-left ${
                  activeTab === "playlist"
                    ? isDark
                      ? "text-white"
                      : "text-black font-medium"
                    : isDark
                      ? "text-gray-300 hover:text-white"
                      : "text-gray-700 hover:text-black"
                }`}
              >
                <ListMusic size={24} />
                <span>플레이리스트</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("recent")}
                className={`flex items-center space-x-2 w-full text-left ${
                  activeTab === "recent"
                    ? isDark
                      ? "text-white"
                      : "text-black font-medium"
                    : isDark
                      ? "text-gray-300 hover:text-white"
                      : "text-gray-700 hover:text-black"
                }`}
              >
                <Clock size={24} />
                <span>최근 재생</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("downloads")}
                className={`flex items-center justify-between w-full text-left ${
                  activeTab === "downloads"
                    ? isDark
                      ? "text-white"
                      : "text-black font-medium"
                    : isDark
                      ? "text-gray-300 hover:text-white"
                      : "text-gray-700 hover:text-black"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Download size={24} />
                  <span>다운로드</span>
                </div>
                {downloadCount > 0 && (
                  <Badge variant="secondary" className="bg-blue-500 text-white">
                    {downloadCount}
                  </Badge>
                )}
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("shares")}
                className={`flex items-center space-x-2 w-full text-left ${
                  activeTab === "shares"
                    ? isDark
                      ? "text-white"
                      : "text-black font-medium"
                    : isDark
                      ? "text-gray-300 hover:text-white"
                      : "text-gray-700 hover:text-black"
                }`}
              >
                <Share2 size={24} />
                <span>공유 관리</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex items-center space-x-2 w-full text-left ${
                  activeTab === "settings"
                    ? isDark
                      ? "text-white"
                      : "text-black font-medium"
                    : isDark
                      ? "text-gray-300 hover:text-white"
                      : "text-gray-700 hover:text-black"
                }`}
              >
                <Settings size={24} />
                <span>설정</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <div className="flex-1">
          <div className="p-6">
          <h2 className="text-sm uppercase font-semibold mb-4 text-blue-500">내 플레이리스트</h2>
          {loading ? (
            <div className="text-xs text-gray-400">로딩 중...</div>
          ) : error ? (
            <div className="text-xs text-red-400">{error}</div>
          ) : (
            <ul className="space-y-2">
              {playlists.map((playlist) => (
                <li key={playlist.id}>
                  <a href="#" className={isDark ? "hover:text-white" : "hover:text-yellow"}>
                    {playlist.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
      </div>
      </div>
    </div>
  )
}
