"use client"

import { Home, Search, Music, FileMusic, Share2, Settings, Download, ListMusic, Clock } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTheme } from "@/contexts/ThemeContext"

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const playlists = ["최근 다운로드", "인기 플레이리스트", "내 컬렉션", "오프라인 저장됨", "좋아하는 노래"]

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  return (
    <div
      className={`w-60 ${isDark ? "bg-black text-gray-300" : "bg-white text-gray-700 border-r border-gray-200"} flex flex-col h-screen`}
    >
      <div className="p-6">
        <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"} mb-6`}>YC_mp3_Web</h1>
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
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6">
            <h2 className="text-sm uppercase font-semibold mb-4">내 플레이리스트</h2>
            <ul className="space-y-2">
              {playlists.map((playlist, index) => (
                <li key={index}>
                  <a href="#" className={isDark ? "hover:text-white" : "hover:text-black"}>
                    {playlist}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </ScrollArea>
      </div>
      <div className="p-6">
        <button className={`flex items-center space-x-2 ${isDark ? "hover:text-white" : "hover:text-black"}`}>
          <Download size={24} />
          <span>앱 설치하기</span>
        </button>
      </div>
    </div>
  )
}
