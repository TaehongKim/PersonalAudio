"use client"

import type React from "react"

import { useState } from "react"
import {
  Download,
  Trash2,
  Search,
  Share2,
  Music,
  Video,
  SortDesc,
  Filter,
  ChevronRight,
  ArrowLeft,
  ListMusic,
  BarChart2,
  Play,
  FolderOpen,
} from "lucide-react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// 파일 그룹 타입 정의
type FileGroupType = "youtube-playlist" | "youtube-mp3" | "youtube-video" | "melon-chart"

interface FileGroup {
  id: string
  type: FileGroupType
  title: string
  count: number
  size: string
  date: string
  coverUrl: string
  icon: React.ElementType
}

// 개별 파일 타입 정의
type FileType = "MP3" | "720p" | "1080p"

interface FileItem {
  id: string
  groupId: string
  title: string
  artist: string
  type: FileType
  size: string
  duration: string
  date: string
  coverUrl: string
}

// 파일 그룹 데이터
const fileGroups: FileGroup[] = [
  {
    id: "playlist1",
    type: "youtube-playlist",
    title: "K-Pop 히트곡 모음",
    count: 15,
    size: "52.3 MB",
    date: "2023-05-15",
    coverUrl: "/placeholder.svg?height=80&width=80",
    icon: ListMusic,
  },
  {
    id: "playlist2",
    type: "youtube-playlist",
    title: "재즈 컬렉션",
    count: 8,
    size: "28.7 MB",
    date: "2023-05-10",
    coverUrl: "/placeholder.svg?height=80&width=80",
    icon: ListMusic,
  },
  {
    id: "mp3group",
    type: "youtube-mp3",
    title: "유튜브 단일 MP3",
    count: 12,
    size: "42.5 MB",
    date: "2023-05-14",
    coverUrl: "/placeholder.svg?height=80&width=80",
    icon: Music,
  },
  {
    id: "videogroup",
    type: "youtube-video",
    title: "유튜브 영상",
    count: 5,
    size: "385.2 MB",
    date: "2023-05-12",
    coverUrl: "/placeholder.svg?height=80&width=80",
    icon: Video,
  },
  {
    id: "melonchart1",
    type: "melon-chart",
    title: "멜론 TOP 100 (2023-05-08)",
    count: 100,
    size: "320.5 MB",
    date: "2023-05-08",
    coverUrl: "/placeholder.svg?height=80&width=80",
    icon: BarChart2,
  },
  {
    id: "melonchart2",
    type: "melon-chart",
    title: "멜론 TOP 50 (2023-05-01)",
    count: 50,
    size: "175.2 MB",
    date: "2023-05-01",
    coverUrl: "/placeholder.svg?height=80&width=80",
    icon: BarChart2,
  },
]

// 개별 파일 데이터
const files: FileItem[] = [
  {
    id: "file1",
    groupId: "playlist1",
    title: "아이유 - 좋은 날",
    artist: "IU",
    type: "MP3",
    size: "3.2 MB",
    duration: "3:48",
    date: "2023-05-15",
    coverUrl: "/placeholder.svg?height=60&width=60",
  },
  {
    id: "file2",
    groupId: "playlist1",
    title: "NewJeans - Ditto",
    artist: "NewJeans",
    type: "MP3",
    size: "4.1 MB",
    duration: "3:05",
    date: "2023-05-14",
    coverUrl: "/placeholder.svg?height=60&width=60",
  },
  {
    id: "file3",
    groupId: "playlist1",
    title: "BTS - Dynamite",
    artist: "BTS",
    type: "MP3",
    size: "3.8 MB",
    duration: "3:19",
    date: "2023-05-12",
    coverUrl: "/placeholder.svg?height=60&width=60",
  },
  {
    id: "file4",
    groupId: "videogroup",
    title: "BLACKPINK - Pink Venom",
    artist: "BLACKPINK",
    type: "720p",
    size: "78.5 MB",
    duration: "3:07",
    date: "2023-05-10",
    coverUrl: "/placeholder.svg?height=60&width=60",
  },
  {
    id: "file5",
    groupId: "mp3group",
    title: "TWICE - Feel Special",
    artist: "TWICE",
    type: "MP3",
    size: "3.5 MB",
    duration: "3:29",
    date: "2023-05-08",
    coverUrl: "/placeholder.svg?height=60&width=60",
  },
  {
    id: "file6",
    groupId: "videogroup",
    title: "BLACKPINK - How You Like That",
    artist: "BLACKPINK",
    type: "1080p",
    size: "124.8 MB",
    duration: "3:01",
    date: "2023-05-05",
    coverUrl: "/placeholder.svg?height=60&width=60",
  },
  {
    id: "file7",
    groupId: "playlist1",
    title: "TWICE - Fancy",
    artist: "TWICE",
    type: "MP3",
    size: "3.7 MB",
    duration: "3:34",
    date: "2023-05-13",
    coverUrl: "/placeholder.svg?height=60&width=60",
  },
  {
    id: "file8",
    groupId: "playlist1",
    title: "Red Velvet - Psycho",
    artist: "Red Velvet",
    type: "MP3",
    size: "3.9 MB",
    duration: "3:42",
    date: "2023-05-11",
    coverUrl: "/placeholder.svg?height=60&width=60",
  },
  {
    id: "file9",
    groupId: "playlist2",
    title: "Chet Baker - My Funny Valentine",
    artist: "Chet Baker",
    type: "MP3",
    size: "4.2 MB",
    duration: "4:15",
    date: "2023-05-10",
    coverUrl: "/placeholder.svg?height=60&width=60",
  },
  {
    id: "file10",
    groupId: "playlist2",
    title: "Miles Davis - So What",
    artist: "Miles Davis",
    type: "MP3",
    size: "5.1 MB",
    duration: "5:37",
    date: "2023-05-09",
    coverUrl: "/placeholder.svg?height=60&width=60",
  },
]

export function FilesManager() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("date")
  const [filterType, setFilterType] = useState("all")
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [playingFileId, setPlayingFileId] = useState<string | null>(null)

  // 현재 보고 있는 그룹 정보 가져오기
  const currentGroup = currentGroupId ? fileGroups.find((group) => group.id === currentGroupId) : null

  // 그룹 필터링 및 정렬
  const filteredGroups = fileGroups.filter((group) => {
    // 검색어 필터링
    const matchesSearch = group.title.toLowerCase().includes(searchQuery.toLowerCase())

    // 파일 타입 필터링
    const matchesType =
      filterType === "all" ||
      (filterType === "playlist" && group.type === "youtube-playlist") ||
      (filterType === "mp3" && group.type === "youtube-mp3") ||
      (filterType === "video" && group.type === "youtube-video") ||
      (filterType === "melon" && group.type === "melon-chart")

    return matchesSearch && matchesType
  })

  // 정렬된 그룹
  const sortedGroups = [...filteredGroups].sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title)
      case "count":
        return b.count - a.count
      case "size":
        return Number.parseFloat(b.size) - Number.parseFloat(a.size)
      case "date":
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime()
    }
  })

  // 현재 그룹의 파일 필터링 및 정렬
  const filteredFiles = files
    .filter((file) => file.groupId === currentGroupId)
    .filter((file) => {
      // 검색어 필터링
      return (
        file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })

  // 정렬된 파일
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title)
      case "artist":
        return a.artist.localeCompare(b.artist)
      case "size":
        return Number.parseFloat(b.size) - Number.parseFloat(a.size)
      case "date":
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime()
    }
  })

  // 아이템 선택 토글
  const toggleItemSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // 이벤트 전파 중지
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((itemId) => itemId !== id))
    } else {
      setSelectedItems([...selectedItems, id])
    }
  }

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (currentGroupId) {
      // 현재 그룹의 파일들
      const groupFileIds = sortedFiles.map((file) => file.id)
      if (selectedItems.length === groupFileIds.length) {
        setSelectedItems([])
      } else {
        setSelectedItems(groupFileIds)
      }
    } else {
      // 모든 그룹
      const allGroupIds = sortedGroups.map((group) => group.id)
      if (selectedItems.length === allGroupIds.length) {
        setSelectedItems([])
      } else {
        setSelectedItems(allGroupIds)
      }
    }
  }

  // 그룹 열기
  const openGroup = (groupId: string) => {
    setCurrentGroupId(groupId)
    setSelectedItems([])
  }

  // 그룹 목록으로 돌아가기
  const goBackToGroups = () => {
    setCurrentGroupId(null)
    setSelectedItems([])
  }

  // 파일 재생 토글
  const togglePlayFile = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation() // 이벤트 전파 중지
    if (playingFileId === fileId) {
      setPlayingFileId(null)
    } else {
      setPlayingFileId(fileId)
    }
  }

  // 검색어 하이라이트 함수
  const highlightText = (text: string) => {
    if (!searchQuery) return text

    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"))
    return parts.map((part, index) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <span key={index} className="bg-yellow-500/30">
          {part}
        </span>
      ) : (
        part
      ),
    )
  }

  // 사용 공간 계산
  const totalSpace = 1000 // MB
  const usedSpace = fileGroups.reduce((acc, group) => acc + Number.parseFloat(group.size), 0)
  const usedPercentage = (usedSpace / totalSpace) * 100

  // 그룹 아이콘 가져오기
  const getGroupIcon = (type: FileGroupType) => {
    switch (type) {
      case "youtube-playlist":
        return <ListMusic className="h-5 w-5 text-red-400" />
      case "youtube-mp3":
        return <Music className="h-5 w-5 text-green-400" />
      case "youtube-video":
        return <Video className="h-5 w-5 text-blue-400" />
      case "melon-chart":
        return <BarChart2 className="h-5 w-5 text-green-400" />
    }
  }

  // 그룹 배지 색상 가져오기
  const getGroupBadgeColor = (type: FileGroupType) => {
    switch (type) {
      case "youtube-playlist":
        return "bg-red-600"
      case "youtube-mp3":
        return "bg-green-600"
      case "youtube-video":
        return "bg-blue-600"
      case "melon-chart":
        return "bg-green-600"
    }
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-purple-900 to-black text-white p-4 md:p-8 overflow-y-auto">
      <div className="mb-6">
        {/* 브레드크럼 네비게이션 */}
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={goBackToGroups} className="flex items-center text-gray-300 hover:text-white">
                <FolderOpen className="h-4 w-4 mr-1" />내 파일
              </BreadcrumbLink>
            </BreadcrumbItem>
            {currentGroup && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink className="text-white">{currentGroup.title}</BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center">
            {currentGroupId && (
              <Button
                variant="outline"
                size="sm"
                className="mr-3 border-white/20 hover:bg-white/10 flex items-center"
                onClick={goBackToGroups}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                상위 그룹으로
              </Button>
            )}
            <h1 className="text-3xl font-bold">{currentGroup ? currentGroup.title : "내 파일"}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedItems.length > 0 ? (
              <>
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => setSelectedItems([])}
                >
                  취소
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={toggleSelectAll}>
                  {currentGroupId
                    ? selectedItems.length === sortedFiles.length
                      ? "전체 선택 해제"
                      : "전체 선택"
                    : selectedItems.length === sortedGroups.length
                      ? "전체 선택 해제"
                      : "전체 선택"}
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Download className="w-4 h-4 mr-2" />
                  다운로드 ({selectedItems.length})
                </Button>
                <Button className="bg-red-600 hover:bg-red-700">
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제 ({selectedItems.length})
                </Button>
              </>
            ) : (
              <>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Download className="w-4 h-4 mr-2" />
                  전체 다운로드
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Share2 className="w-4 h-4 mr-2" />
                  공유 링크 생성
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative col-span-1 md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={currentGroupId ? "파일 검색..." : "그룹 검색..."}
              className="bg-white/10 border-white/20 text-white pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <div className="flex items-center">
                  <SortDesc className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="정렬 기준" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">날짜순</SelectItem>
                <SelectItem value="title">제목순</SelectItem>
                {currentGroupId ? (
                  <SelectItem value="artist">아티스트순</SelectItem>
                ) : (
                  <SelectItem value="count">파일 수</SelectItem>
                )}
                <SelectItem value="size">크기순</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <div className="flex items-center">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="파일 유형" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 파일</SelectItem>
                <SelectItem value="playlist">유튜브 플레이리스트</SelectItem>
                <SelectItem value="mp3">유튜브 MP3</SelectItem>
                <SelectItem value="video">유튜브 영상</SelectItem>
                <SelectItem value="melon">멜론 차트</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-400">저장 공간</p>
            <p className="font-medium">
              {usedSpace.toFixed(1)} MB 사용 중 ({totalSpace} MB 중)
            </p>
          </div>
          <div className="w-full md:w-1/2 flex items-center gap-4">
            <Progress value={usedPercentage} className="h-2 flex-1" />
            <div className="relative w-16 h-16 flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-white/10"></div>
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-purple-600"
                  strokeDasharray={`${usedPercentage * 1.76} 176`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                {usedPercentage.toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 그룹 상세 보기에서 상위 그룹으로 돌아가는 버튼 (모바일용) */}
      {currentGroupId && (
        <Button
          variant="outline"
          className="w-full mb-4 border-white/20 hover:bg-white/10 md:hidden"
          onClick={goBackToGroups}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          상위 그룹으로 돌아가기
        </Button>
      )}

      {/* 그룹 목록 또는 파일 목록 표시 */}
      {currentGroupId ? (
        // 파일 목록 표시
        <>
          {sortedFiles.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-lg">
              <p className="text-gray-400">파일을 찾을 수 없습니다.</p>
              {searchQuery && <p className="text-sm text-gray-500 mt-2">검색어: "{searchQuery}"</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedFiles.map((file) => (
                <Card key={file.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center">
                      <div className="mr-3" onClick={(e) => toggleItemSelection(file.id, e)}>
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(file.id)}
                          onChange={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-gray-500 bg-transparent"
                        />
                      </div>
                      <div className="relative">
                        <Image
                          src={file.coverUrl || "/placeholder.svg"}
                          width={60}
                          height={60}
                          alt={`${file.title} cover`}
                          className="rounded mr-3"
                        />
                        {file.type === "MP3" ? (
                          <Music className="absolute bottom-0 right-0 w-4 h-4 bg-green-600 rounded-full p-0.5" />
                        ) : (
                          <Video className="absolute bottom-0 right-0 w-4 h-4 bg-blue-600 rounded-full p-0.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-medium truncate">{highlightText(file.title)}</p>
                        <p className="text-sm text-gray-400">
                          {highlightText(file.artist)} • {file.duration}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Badge
                            className={`mr-2 ${
                              file.type === "MP3"
                                ? "bg-green-700"
                                : file.type === "720p"
                                  ? "bg-blue-700"
                                  : "bg-purple-700"
                            }`}
                          >
                            {file.type}
                          </Badge>
                          <span>{file.size}</span>
                          <span className="mx-1">•</span>
                          <span>{file.date}</span>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        {file.type === "MP3" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => togglePlayFile(file.id, e)}
                          >
                            <Play
                              className={`h-4 w-4 ${playingFileId === file.id ? "text-green-400" : ""}`}
                              fill={playingFileId === file.id ? "currentColor" : "none"}
                            />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 그룹 상세 보기에서 상위 그룹으로 돌아가는 버튼 (하단 고정) */}
          <div className="mt-6 sticky bottom-4 flex justify-center">
            <Button
              variant="outline"
              className="border-white/20 bg-black/50 backdrop-blur-sm hover:bg-white/10"
              onClick={goBackToGroups}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              상위 그룹으로 돌아가기
            </Button>
          </div>
        </>
      ) : (
        // 그룹 목록 표시
        <>
          {sortedGroups.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-lg">
              <p className="text-gray-400">파일 그룹을 찾을 수 없습니다.</p>
              {searchQuery && <p className="text-sm text-gray-500 mt-2">검색어: "{searchQuery}"</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedGroups.map((group) => (
                <Card
                  key={group.id}
                  className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => openGroup(group.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center">
                      <div className="mr-3" onClick={(e) => toggleItemSelection(group.id, e)}>
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(group.id)}
                          onChange={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-gray-500 bg-transparent"
                        />
                      </div>
                      <div className="relative">
                        <div className="w-16 h-16 bg-white/10 rounded flex items-center justify-center mr-3">
                          {getGroupIcon(group.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-medium truncate">{highlightText(group.title)}</p>
                        <div className="flex items-center text-sm text-gray-400 mt-1">
                          <Badge className={`mr-2 ${getGroupBadgeColor(group.type)}`}>
                            {group.type === "youtube-playlist"
                              ? "플레이리스트"
                              : group.type === "youtube-mp3"
                                ? "MP3"
                                : group.type === "youtube-video"
                                  ? "영상"
                                  : "멜론 차트"}
                          </Badge>
                          <span>파일 {group.count}개</span>
                          <span className="mx-1">•</span>
                          <span>{group.size}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{group.date}</p>
                      </div>
                      <div className="flex space-x-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
