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

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeTab, setActiveTab] = useState("youtube") // 기본 탭을 youtube로 변경
  const [shareCode, setShareCode] = useState<string | null>(null) // 공유 링크 코드
  const isMobile = useMediaQuery("(max-width: 768px)")

  // 페이지 로드 시 로그인 상태 확인
  useEffect(() => {
    const storedLoginState = localStorage.getItem("isLoggedIn")
    if (storedLoginState === "true") {
      setIsLoggedIn(true)
    }
  }, [])

  // 로그아웃 처리 함수
  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn")
    setIsLoggedIn(false)
  }

  if (!isLoggedIn) {
    return (
      <ThemeProvider>
        <LoginScreen setIsLoggedIn={setIsLoggedIn} />
      </ThemeProvider>
    );
  }

  // 공유 링크 접근 화면
  if (shareCode) {
    return (
      <ThemeProvider>
        <div className="flex flex-col h-screen">
          <div className="flex flex-1 overflow-hidden">
            <ShareLinkAccess />
          </div>
          <PlayerControls />
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
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
    </ThemeProvider>
  )
}
