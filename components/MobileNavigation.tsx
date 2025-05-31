"use client"

import { Home, Music, Search, FileMusic, Share2, Settings, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/contexts/ThemeContext"

interface MobileNavigationProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function MobileNavigation({ activeTab, setActiveTab }: MobileNavigationProps) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const tabs = [
    { id: "home", label: "홈", icon: Home },
    { id: "youtube", label: "유튜브", icon: Music },
    { id: "melon", label: "멜론", icon: Search },
    { id: "files", label: "내 파일", icon: FileMusic },
    { id: "downloads", label: "다운로드", icon: Download },
    { id: "shares", label: "공유", icon: Share2 },
    { id: "settings", label: "설정", icon: Settings },
  ]

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 ${isDark ? "bg-black border-t border-white/10" : "bg-white border-t border-gray-200"} z-10 pb-safe overflow-x-auto`}
    >
      <div className="flex min-w-max px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              className={cn(
                "flex flex-col items-center justify-center py-3 px-3 min-h-[60px] min-w-[70px] transition-colors rounded-t-lg",
                "active:bg-gray-100 dark:active:bg-gray-800",
                activeTab === tab.id
                  ? isDark
                    ? "text-white bg-white/10"
                    : "text-black bg-gray-100"
                  : isDark
                    ? "text-gray-500 hover:text-gray-300"
                    : "text-gray-400 hover:text-gray-600",
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={20} />
              <span className="text-xs mt-1 font-medium truncate w-full">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
