"use client"

import React from 'react'
import { useMediaQuery } from "@/hooks/use-mobile"
import { MobileNavigation } from "./MobileNavigation"
import { PlayerControls } from "./PlayerControls"

interface GlobalLayoutProps {
  children: React.ReactNode
  showNavigation?: boolean
  activeTab?: string
  setActiveTab?: (tab: string) => void
}

export function GlobalLayout({ 
  children, 
  showNavigation = true, 
  activeTab = "home", 
  setActiveTab 
}: GlobalLayoutProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 메인 콘텐츠 */}
      <div className={`flex flex-1 overflow-hidden ${isMobile && showNavigation ? 'pb-36' : 'pb-20'}`}>
        {children}
      </div>
      
      {/* 모바일 네비게이션 */}
      {isMobile && showNavigation && setActiveTab && (
        <div className="fixed bottom-24 left-0 right-0 z-40">
          <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      )}
      
      {/* 플레이어 */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <PlayerControls />
      </div>
    </div>
  )
} 