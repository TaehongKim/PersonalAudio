"use client"

import type React from "react"
import {
  Music,
  FileMusic,
  Share2,
  Settings,
  Download,
  Clock,
  BarChart2,
  HardDrive,
  Youtube,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import Image from "next/image"
import { useTheme } from "@/contexts/ThemeContext"

interface QuickAccessItem {
  title: string
  icon: React.ElementType
  color: string
  onClick: () => void
}

interface RecentDownload {
  title: string
  artist: string
  type: string
  coverUrl: string
  date: string
}

interface StorageInfo {
  used: number
  total: number
  categories: {
    name: string
    size: number
    color: string
  }[]
}

export function HomeContent({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  // 최근 다운로드 데이터
  const recentDownloads: RecentDownload[] = [
    {
      title: "아이유 - 좋은 날",
      artist: "IU",
      type: "MP3",
      coverUrl: "/placeholder.svg?height=60&width=60",
      date: "오늘",
    },
    {
      title: "NewJeans - Ditto",
      artist: "NewJeans",
      type: "MP3",
      coverUrl: "/placeholder.svg?height=60&width=60",
      date: "오늘",
    },
    {
      title: "BTS - Dynamite",
      artist: "BTS",
      type: "MP3",
      coverUrl: "/placeholder.svg?height=60&width=60",
      date: "어제",
    },
    {
      title: "BLACKPINK - Pink Venom",
      artist: "BLACKPINK",
      type: "720p",
      coverUrl: "/placeholder.svg?height=60&width=60",
      date: "어제",
    },
  ]

  // 저장 공간 정보
  const storageInfo: StorageInfo = {
    used: 450,
    total: 1000,
    categories: [
      { name: "음악", size: 250, color: "bg-green-500" },
      { name: "비디오", size: 150, color: "bg-blue-500" },
      { name: "멜론 차트", size: 50, color: "bg-purple-500" },
    ],
  }

  // 빠른 접근 아이템
  const quickAccessItems: QuickAccessItem[] = [
    {
      title: "유튜브 다운로드",
      icon: Youtube,
      color: "bg-red-600",
      onClick: () => setActiveTab("youtube"),
    },
    {
      title: "멜론 차트",
      icon: BarChart2,
      color: "bg-green-600",
      onClick: () => setActiveTab("melon"),
    },
    {
      title: "내 파일",
      icon: FileMusic,
      color: "bg-purple-600",
      onClick: () => setActiveTab("files"),
    },
    {
      title: "공유 관리",
      icon: Share2,
      color: "bg-blue-600",
      onClick: () => setActiveTab("shares"),
    },
    {
      title: "설정",
      icon: Settings,
      color: "bg-gray-600",
      onClick: () => setActiveTab("settings"),
    },
  ]

  // 사용 공간 퍼센트 계산
  const usedPercentage = (storageInfo.used / storageInfo.total) * 100

  return (
    <div
      className={`flex-1 ${isDark ? "bg-gradient-to-b from-blue-900 to-black" : "bg-gradient-to-b from-blue-100 to-white"} text-${isDark ? "white" : "black"} p-4 md:p-8 overflow-y-auto`}
    >
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>안녕하세요!</h1>
        <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
          YC_mp3_Web에 오신 것을 환영합니다. 무엇을 도와드릴까요?
        </p>
      </div>

      {/* 빠른 접근 섹션 */}
      <div className="mb-8">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-800"}`}>빠른 접근</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {quickAccessItems.map((item, index) => (
            <Card
              key={index}
              className={`cursor-pointer hover:scale-105 transition-transform ${isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"}`}
              onClick={item.onClick}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className={`${item.color} w-12 h-12 rounded-full flex items-center justify-center mb-3`}>
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-medium">{item.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 최근 활동 및 통계 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 최근 다운로드 */}
        <Card
          className={`${isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"}`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              최근 다운로드
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-4">
              {recentDownloads.map((download, index) => (
                <div key={index} className="flex items-center">
                  <div className="relative">
                    <Image
                      src={download.coverUrl || "/placeholder.svg"}
                      width={40}
                      height={40}
                      alt={`${download.title} cover`}
                      className="rounded"
                    />
                    {download.type === "MP3" ? (
                      <Music className="absolute bottom-0 right-0 w-3 h-3 bg-green-600 rounded-full p-0.5" />
                    ) : (
                      <Youtube className="absolute bottom-0 right-0 w-3 h-3 bg-red-600 rounded-full p-0.5" />
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>{download.title}</p>
                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{download.artist}</p>
                  </div>
                  <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{download.date}</div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className={`w-full ${isDark ? "border-white/20 text-white hover:bg-white/10" : "border-gray-300 text-gray-800 hover:bg-gray-100"}`}
              onClick={() => setActiveTab("files")}
            >
              <FileMusic className="h-4 w-4 mr-2" />
              모든 파일 보기
            </Button>
          </CardFooter>
        </Card>

        {/* 저장 공간 */}
        <Card
          className={`${isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"}`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <HardDrive className="h-5 w-5 mr-2" />
              저장 공간
            </CardTitle>
            <CardDescription className={isDark ? "text-gray-400" : "text-gray-500"}>
              {storageInfo.used} MB / {storageInfo.total} MB 사용 중
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-4">
              <Progress value={usedPercentage} className="h-2" />

              <div className="space-y-2">
                {storageInfo.categories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full ${category.color} mr-2`}></div>
                      <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{category.name}</span>
                    </div>
                    <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{category.size} MB</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className={`w-full ${isDark ? "border-white/20 text-white hover:bg-white/10" : "border-gray-300 text-gray-800 hover:bg-gray-100"}`}
              onClick={() => setActiveTab("settings")}
            >
              <Settings className="h-4 w-4 mr-2" />
              저장 공간 관리
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* 추천 및 인기 콘텐츠 */}
      <div className="mb-8">
        <h2 className={`text-xl font-semibold mb-4 flex items-center ${isDark ? "text-white" : "text-gray-800"}`}>
          <TrendingUp className="h-5 w-5 mr-2" />
          인기 차트
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <Card
              key={item}
              className={`${isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"}`}
            >
              <div className="relative">
                <Image
                  src={`/placeholder.svg?height=150&width=150&text=Top ${item}`}
                  width={150}
                  height={150}
                  alt={`Top ${item} album cover`}
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute top-2 left-2">
                  <div
                    className={`${isDark ? "bg-green-600" : "bg-green-500"} text-white text-xs font-bold px-2 py-1 rounded-full`}
                  >
                    {item}
                  </div>
                </div>
              </div>
              <CardContent className="p-3">
                <p className={`font-medium truncate ${isDark ? "text-white" : "text-gray-800"}`}>인기곡 {item}</p>
                <p className={`text-sm truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}>아티스트 {item}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Button
            className={isDark ? "bg-green-600 hover:bg-green-700" : "bg-green-500 hover:bg-green-600"}
            onClick={() => setActiveTab("melon")}
          >
            <BarChart2 className="h-4 w-4 mr-2" />
            멜론 차트 전체보기
          </Button>
        </div>
      </div>

      {/* 빠른 유튜브 다운로드 */}
      <Card
        className={`mb-8 ${isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"}`}
      >
        <CardHeader>
          <CardTitle className="flex items-center">
            <Youtube className="h-5 w-5 mr-2 text-red-500" />
            빠른 유튜브 다운로드
          </CardTitle>
          <CardDescription className={isDark ? "text-gray-400" : "text-gray-500"}>
            유튜브 URL을 입력하여 빠르게 다운로드하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              className={`flex-1 px-3 py-2 rounded-md ${
                isDark
                  ? "bg-white/5 border-white/20 text-white focus:border-blue-500"
                  : "bg-gray-100 border-gray-300 text-gray-800 focus:border-blue-500"
              } border outline-none focus:ring-1 focus:ring-blue-500`}
            />
            <Button className={isDark ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600"}>
              <Download className="h-4 w-4 mr-2" />
              다운로드
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
