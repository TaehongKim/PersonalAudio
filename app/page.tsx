"use client"

import { useState, useEffect, Suspense, lazy } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "../components/Sidebar"
import { MainContent } from "../components/MainContent"
import { MelonChart } from "../components/MelonChart"
import { FilesManager } from "../components/FilesManager"
import { SharesManager } from "../components/SharesManager"
import { SettingsManager } from "../components/SettingsManager"
import { ShareLinkAccess } from "../components/ShareLinkAccess"
import { LoginScreen } from "@/components/LoginScreen"
import { MobileNavigation } from "../components/MobileNavigation"
import { HomeContent } from "../components/HomeContent"
import { PlaylistManager } from "../components/PlaylistManager"
import { RecentPlayed } from "../components/RecentPlayed"
import { DownloadManager } from "../components/DownloadManager"
import { useMediaQuery } from "@/hooks/use-mobile"
import { useSession } from "@/hooks/useSession"
import { useTheme } from "@/contexts/ThemeContext"
import { PlaylistProvider } from "@/contexts/PlaylistContext"
import { Toaster } from "react-hot-toast"
import { MusicPlayerPage } from "../components/MusicPlayerPage"

// 모바일 헤더 컴포넌트
function MobileHeader({ activeTab, onMenuClick }: { activeTab: string, onMenuClick: () => void }) {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  
  const getPageTitle = (tab: string) => {
    switch (tab) {
      case "home": return "홈"
      case "youtube": return "유튜브"
      case "melon": return "멜론 차트"
      case "files": return "내 파일"
      case "playlist": return "플레이리스트"
      case "recent": return "최근 재생"
      case "downloads": return "다운로드"
      case "shares": return "공유 관리"
      case "settings": return "설정"
      case "player": return "음악 플레이어"
      default: return "귀요미 YC 음악방"
    }
  }

  return (
    <div className={`md:hidden fixed top-0 left-0 right-0 z-30 ${
      isDark ? "bg-black/95 border-b border-white/10" : "bg-white/95 border-b border-gray-200"
    } backdrop-blur-sm`}>
      <div className="flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="h-8 w-8"
        >
          <Menu size={20} />
        </Button>
        
        <h1 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
          {getPageTitle(activeTab)}
        </h1>
        
        <div className="w-8" /> {/* 중앙 정렬을 위한 placeholder */}
      </div>
    </div>
  )
}

const FilesManagerLazy = lazy(() => import('../components/FilesManager') as any as Promise<{ default: typeof FilesManager }>)
const SharesManagerLazy = lazy(() => import('../components/SharesManager') as any as Promise<{ default: typeof SharesManager }>)
const PlaylistManagerLazy = lazy(() => import('../components/PlaylistManager') as any as Promise<{ default: typeof PlaylistManager }>)
const DownloadManagerLazy = lazy(() => import('../components/DownloadManager') as any as Promise<{ default: typeof DownloadManager }>)
const MelonChartLazy = lazy(() => import('../components/MelonChart') as any as Promise<{ default: typeof MelonChart }>)
const MainContentLazy = lazy(() => import('../components/MainContent') as any as Promise<{ default: typeof MainContent }>)
const RecentPlayedLazy = lazy(() => import('../components/RecentPlayed') as any as Promise<{ default: typeof RecentPlayed }>)
const SettingsManagerLazy = lazy(() => import('../components/SettingsManager') as any as Promise<{ default: typeof SettingsManager }>)
const HomeContentLazy = lazy(() => import('../components/HomeContent') as any as Promise<{ default: typeof HomeContent }>)

// Skeleton 컴포넌트 예시 (간단한 뼈대 UI)
function PageSkeleton() {
  return <div className="p-8 animate-pulse text-center text-muted-foreground">로딩 중...</div>;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("home")
  const [shareCode] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { isLoggedIn, isLoading, signOut } = useSession()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    await signOut({ callbackUrl: "https://music.lunajj.com" })
    localStorage.removeItem("isLoggedIn")
  }

  const handleSidebarClose = () => {
    setSidebarOpen(false)
  }

  const handleMenuClick = () => {
    setSidebarOpen(true)
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
      <PlaylistProvider>
        <div className="flex flex-col h-screen">
          <div className="flex flex-1 overflow-hidden">
            <ShareLinkAccess code={shareCode || ''} />
          </div>
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
      </PlaylistProvider>
    )
  }

  return (
    <PlaylistProvider>
      <div className="flex min-h-screen">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          isOpen={isMobile ? sidebarOpen : true}
          onClose={handleSidebarClose}
        />
        
        <main className={`flex-1 ${isMobile ? '' : 'ml-60'}`}>
          <div className="min-h-screen bg-background flex flex-col">
            {/* 모바일 헤더 */}
            {isMobile && (
              <MobileHeader 
                activeTab={activeTab} 
                onMenuClick={handleMenuClick}
              />
            )}
            
            {/* 메인 콘텐츠 */}
            <div className={`flex flex-1 overflow-hidden ${isMobile ? 'pt-14 pb-36' : 'pb-20'}`}>
              {activeTab === "home" && <Suspense fallback={<PageSkeleton />}><HomeContentLazy setActiveTab={setActiveTab} /></Suspense>}
              {activeTab === "youtube" && <Suspense fallback={<PageSkeleton />}><MainContentLazy setActiveTab={setActiveTab} /></Suspense>}
              {activeTab === "melon" && <Suspense fallback={<PageSkeleton />}><MelonChartLazy /></Suspense>}
              {activeTab === "files" && <Suspense fallback={<PageSkeleton />}><FilesManagerLazy /></Suspense>}
              {activeTab === "playlist" && <Suspense fallback={<PageSkeleton />}><PlaylistManagerLazy /></Suspense>}
              {activeTab === "recent" && <Suspense fallback={<PageSkeleton />}><RecentPlayedLazy /></Suspense>}
              {activeTab === "downloads" && <Suspense fallback={<PageSkeleton />}><DownloadManagerLazy setActiveTab={setActiveTab} /></Suspense>}
              {activeTab === "shares" && <Suspense fallback={<PageSkeleton />}><SharesManagerLazy /></Suspense>}
              {activeTab === "settings" && (
                <Suspense fallback={<PageSkeleton />}>
                  <SettingsManagerLazy handleLogout={handleLogout} />
                </Suspense>
              )}
              {activeTab === "player" && <Suspense fallback={<PageSkeleton />}><MusicPlayerPage /></Suspense>}
            </div>
            
            {/* 모바일 네비게이션 */}
            {isMobile && activeTab !== "shares" && (
              <div className="fixed bottom-24 left-0 right-0 z-40">
                <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
              </div>
            )}
          </div>
        </main>
        
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
    </PlaylistProvider>
  )
}