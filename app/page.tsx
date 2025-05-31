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
import { PlaylistManager } from "../components/PlaylistManager"
import { RecentPlayed } from "../components/RecentPlayed"
import { DownloadManager } from "../components/DownloadManager"
import { useMediaQuery } from "@/hooks/use-mobile"
import { useSession } from "@/hooks/useSession"
import { Toaster } from "react-hot-toast"

export default function Home() {
  const [activeTab, setActiveTab] = useState("home")
  const [shareCode] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { isLoggedIn, isLoading, signOut } = useSession()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    await signOut()
    localStorage.removeItem("isLoggedIn")
  }

  // 클라이언트 사이드 렌더링을 위해 마운트 되기 전까지는 아무것도 렌더링하지 않음
  if (!mounted) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <>
        <LoginScreen />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </>
    )
  }

  if (shareCode) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex flex-1 overflow-hidden">
          <ShareLinkAccess code={shareCode || ''} />
        </div>
        <PlayerControls />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 ml-60">
        <div className="min-h-screen bg-background flex flex-col">
          <div className="flex flex-1 overflow-hidden pb-20">
            {activeTab === "home" && <HomeContent setActiveTab={setActiveTab} />}
            {activeTab === "youtube" && <MainContent setActiveTab={setActiveTab} />}
            {activeTab === "melon" && <MelonChart />}
            {activeTab === "files" && <FilesManager />}
            {activeTab === "playlist" && <PlaylistManager />}
            {activeTab === "recent" && <RecentPlayed />}
            {activeTab === "downloads" && <DownloadManager />}
            {activeTab === "shares" && <SharesManager />}
            {activeTab === "settings" && (
              <SettingsManager handleLogout={handleLogout} />
            )}
          </div>
          
          <div className="fixed bottom-0 left-0 right-0 z-50">
            <PlayerControls />
          </div>
          {isMobile && (
            <div className="fixed bottom-20 left-0 right-0 z-40">
              <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
          )}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </main>
    </div>
  )
}
