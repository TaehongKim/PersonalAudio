"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "../components/Sidebar"
import { MainContent } from "../components/MainContent"
import { MelonChart } from "../components/MelonChart"
import { FilesManager } from "../components/FilesManager"
import { SharesManager } from "../components/SharesManager"
import { SettingsManager } from "../components/SettingsManager"
import { ShareLinkAccess } from "../components/ShareLinkAccess"
import { PlayerControls } from "../components/PlayerControls"
import { LoginScreen } from "@/components/LoginScreen"
import { MobileNavigation } from "../components/MobileNavigation"
import { HomeContent } from "../components/HomeContent"
import { useMediaQuery } from "@/hooks/use-mobile"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { PlayerProvider } from "@/contexts/PlayerContext"
import { useSession } from "@/hooks/useSession"

export default function Home() {
  const [activeTab, setActiveTab] = useState("youtube") // 기본 탭을 youtube로 변경
  const [shareCode] = useState<string | null>(null) // 공유 링크 코드
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { isLoggedIn, isLoading, signOut } = useSession()

  // 로그아웃 처리 함수
  const handleLogout = async () => {
    await signOut()
    localStorage.removeItem("isLoggedIn") // 기존 localStorage도 정리
  }

  // 세션 로딩 중이면 로딩 표시
  if (isLoading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-gray-100 dark:bg-zinc-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </ThemeProvider>
    )
  }

  if (!isLoggedIn) {
    return (
      <ThemeProvider>
        <LoginScreen />
      </ThemeProvider>
    );
  }

  // 공유 링크 접근 화면
  if (shareCode) {
    return (
      <ThemeProvider>
        <PlayerProvider>
          <div className="flex flex-col h-screen">
            <div className="flex flex-1 overflow-hidden">
              <ShareLinkAccess code={shareCode || ''} />
            </div>
            <PlayerControls />
          </div>
        </PlayerProvider>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <PlayerProvider>
        <div className="min-h-screen bg-gray-100 dark:bg-zinc-900 dark:text-white flex flex-col">
          <div className="flex flex-1 overflow-hidden">
            {!isMobile && <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />}
            
            {activeTab === "home" && <HomeContent setActiveTab={setActiveTab} />}
            {activeTab === "youtube" && <MainContent />}
            {activeTab === "melon" && <MelonChart />}
            {activeTab === "files" && <FilesManager />}
            {activeTab === "shares" && <SharesManager />}
            {activeTab === "settings" && (
              <SettingsManager handleLogout={handleLogout} />
            )}
          </div>
          <PlayerControls />
          {isMobile && <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} />}
        </div>
      </PlayerProvider>
    </ThemeProvider>
  )
}
