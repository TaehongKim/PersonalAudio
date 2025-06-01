"use client"

import { Home, Music, Search, FileMusic, Share2, Settings, Download, ListMusic, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/contexts/ThemeContext"
import { useDownload } from '@/contexts/DownloadContext'
import { Badge } from "@/components/ui/badge"

interface MobileNavigationProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function MobileNavigation({ activeTab, setActiveTab }: MobileNavigationProps) {
  const { theme } = useTheme()
  const { downloadCount } = useDownload()
  const isDark = theme === "dark"

  const tabs = [
    { id: "home", label: "홈", icon: Home },
    { id: "youtube", label: "유튜브", icon: Music },
    { id: "melon", label: "멜론", icon: Search },
    { id: "files", label: "파일", icon: FileMusic },
    { id: "downloads", label: "다운로드", icon: Download, badge: downloadCount },
  ]

  const moreItems = [
    { id: "playlist", label: "플레이리스트", icon: ListMusic },
    { id: "recent", label: "최근재생", icon: Clock },
    { id: "shares", label: "공유", icon: Share2 },
    { id: "settings", label: "설정", icon: Settings },
  ]

  const isMoreTabActive = moreItems.some(item => item.id === activeTab)

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 ${
        isDark ? "bg-black/95 border-t border-white/10" : "bg-white/95 border-t border-gray-200"
      } backdrop-blur-sm z-40 pb-safe`}
    >
      <div className="flex items-center justify-around px-2 py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 min-h-[56px] min-w-[60px] transition-all duration-200 rounded-lg relative",
                "active:scale-95",
                isActive
                  ? isDark
                    ? "text-white bg-white/10"
                    : "text-blue-600 bg-blue-50"
                  : isDark
                    ? "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="relative">
                <Icon size={20} />
                {tab.badge && tab.badge > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
              {isActive && (
                <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
                  isDark ? "bg-white" : "bg-blue-600"
                }`} />
              )}
            </button>
          )
        })}
        
        {/* 더보기 버튼 */}
        <button
          className={cn(
            "flex flex-col items-center justify-center py-2 px-3 min-h-[56px] min-w-[60px] transition-all duration-200 rounded-lg relative",
            "active:scale-95",
            isMoreTabActive
              ? isDark
                ? "text-white bg-white/10"
                : "text-blue-600 bg-blue-50"
              : isDark
                ? "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
          )}
          onClick={() => {
            // 현재 활성화된 탭이 더보기 항목 중 하나가 아니면 첫 번째 더보기 항목으로
            if (!isMoreTabActive) {
              setActiveTab(moreItems[0].id)
            }
          }}
        >
          <div className="flex items-center justify-center w-5 h-5">
            <div className="grid grid-cols-2 gap-0.5">
              <div className={`w-1 h-1 rounded-full ${isMoreTabActive ? (isDark ? "bg-white" : "bg-blue-600") : "bg-current"}`} />
              <div className={`w-1 h-1 rounded-full ${isMoreTabActive ? (isDark ? "bg-white" : "bg-blue-600") : "bg-current"}`} />
              <div className={`w-1 h-1 rounded-full ${isMoreTabActive ? (isDark ? "bg-white" : "bg-blue-600") : "bg-current"}`} />
              <div className={`w-1 h-1 rounded-full ${isMoreTabActive ? (isDark ? "bg-white" : "bg-blue-600") : "bg-current"}`} />
            </div>
          </div>
          <span className="text-xs mt-1 font-medium">더보기</span>
          {isMoreTabActive && (
            <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
              isDark ? "bg-white" : "bg-blue-600"
            }`} />
          )}
        </button>
      </div>
      
      {/* 더보기 항목들 (활성화시에만 표시) */}
      {isMoreTabActive && (
        <div className={`border-t ${isDark ? "border-white/10" : "border-gray-200"} px-4 py-2`}>
          <div className="flex items-center justify-around">
            {moreItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-2 min-h-[48px] min-w-[64px] transition-all duration-200 rounded-lg",
                    "active:scale-95",
                    isActive
                      ? isDark
                        ? "text-white bg-white/10"
                        : "text-blue-600 bg-blue-50"
                      : isDark
                        ? "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
                  )}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon size={18} />
                  <span className="text-xs mt-1 font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
