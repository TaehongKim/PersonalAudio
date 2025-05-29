"use client"

import { Home, Music, Search, FileMusic, Share2, Settings } from "lucide-react"
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
    { id: "shares", label: "공유", icon: Share2 },
    { id: "settings", label: "설정", icon: Settings },
  ]

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 ${isDark ? "bg-black border-t border-white/10" : "bg-white border-t border-gray-200"} z-10 pb-safe`}
    >
      <div className="grid grid-cols-6">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              className={cn(
                "flex flex-col items-center justify-center py-3 px-1 min-h-[60px] transition-colors",
                "active:bg-gray-100 dark:active:bg-gray-800",
                activeTab === tab.id
                  ? isDark
                    ? "text-white"
                    : "text-black"
                  : isDark
                    ? "text-gray-500"
                    : "text-gray-400",
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={24} />
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
