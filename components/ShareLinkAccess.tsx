"use client"

import { useState } from "react"
import { Download, Play, Pause, Clock, Music, Video, Info, CheckCircle } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface SharedFile {
  id: string
  title: string
  artist: string
  type: "MP3" | "720p" | "1080p"
  size: string
  duration: string
  coverUrl: string
}

const sharedFiles: SharedFile[] = [
  {
    id: "1",
    title: "아이유 - 좋은 날",
    artist: "IU",
    type: "MP3",
    size: "3.2 MB",
    duration: "3:48",
    coverUrl: "/placeholder.svg?height=60&width=60",
  },
  {
    id: "2",
    title: "NewJeans - Ditto",
    artist: "NewJeans",
    type: "MP3",
    size: "4.1 MB",
    duration: "3:05",
    coverUrl: "/placeholder.svg?height=60&width=60",
  },
  {
    id: "3",
    title: "BTS - Dynamite",
    artist: "BTS",
    type: "MP3",
    size: "3.8 MB",
    duration: "3:19",
    coverUrl: "/placeholder.svg?height=60&width=60",
  },
  {
    id: "4",
    title: "BLACKPINK - Pink Venom",
    artist: "BLACKPINK",
    type: "720p",
    size: "78.5 MB",
    duration: "3:07",
    coverUrl: "/placeholder.svg?height=60&width=60",
  },
]

export function ShareLinkAccess() {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})

  const togglePlay = (id: string) => {
    if (playingId === id) {
      setPlayingId(null)
    } else {
      setPlayingId(id)
    }
  }

  const toggleFileSelection = (id: string) => {
    if (selectedFiles.includes(id)) {
      setSelectedFiles(selectedFiles.filter((fileId) => fileId !== id))
    } else {
      setSelectedFiles([...selectedFiles, id])
    }
  }

  const toggleSelectAll = () => {
    if (selectedFiles.length === sharedFiles.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(sharedFiles.map((file) => file.id))
    }
  }

  const downloadFile = (id: string) => {
    // 실제로는 파일 다운로드 로직이 들어갈 자리입니다
    // 여기서는 진행 상태를 시뮬레이션합니다
    setDownloadProgress((prev) => ({ ...prev, [id]: 0 }))

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        const newProgress = (prev[id] || 0) + 10
        if (newProgress >= 100) {
          clearInterval(interval)
        }
        return { ...prev, [id]: newProgress }
      })
    }, 300)
  }

  const downloadSelected = () => {
    selectedFiles.forEach((id) => downloadFile(id))
  }

  // 만료 정보
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + 7) // 7일 후
  const expiryDateString = expiryDate.toLocaleDateString()

  return (
    <div className="flex-1 bg-gradient-to-b from-indigo-900 to-black text-white p-4 md:p-8 overflow-y-auto">
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">K-Pop 컬렉션</CardTitle>
              <p className="text-gray-400 text-sm mt-1">공유된 파일 {sharedFiles.length}개</p>
            </div>
            <div className="flex items-center">
              <Badge className="bg-blue-600 mr-2">
                <Clock className="w-3 h-3 mr-1" />
                {expiryDateString}까지 유효
              </Badge>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={toggleSelectAll}>
                {selectedFiles.length === sharedFiles.length ? "전체 선택 해제" : "전체 선택"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="mb-6 flex justify-between items-center">
        <Tabs defaultValue="all">
          <TabsList className="bg-white/10 border-white/20">
            <TabsTrigger value="all">전체 ({sharedFiles.length})</TabsTrigger>
            <TabsTrigger value="mp3">MP3 ({sharedFiles.filter((f) => f.type === "MP3").length})</TabsTrigger>
            <TabsTrigger value="video">비디오 ({sharedFiles.filter((f) => f.type !== "MP3").length})</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          className="bg-indigo-600 hover:bg-indigo-700"
          disabled={selectedFiles.length === 0}
          onClick={downloadSelected}
        >
          <Download className="w-4 h-4 mr-2" />
          선택 다운로드 ({selectedFiles.length})
        </Button>
      </div>

      <div className="space-y-3">
        {sharedFiles.map((file) => {
          const isDownloading = downloadProgress[file.id] !== undefined && downloadProgress[file.id] < 100
          const isDownloaded = downloadProgress[file.id] === 100
          const isPlaying = playingId === file.id
          const isSelected = selectedFiles.includes(file.id)

          return (
            <Card
              key={file.id}
              className={`bg-white/5 border-white/10 transition-colors ${isSelected ? "bg-white/10" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-4">
                    <div className="relative">
                      <Image
                        src={file.coverUrl || "/placeholder.svg"}
                        width={60}
                        height={60}
                        alt={`${file.title} cover`}
                        className="rounded"
                      />
                      {file.type === "MP3" ? (
                        <Music className="absolute bottom-0 right-0 w-4 h-4 bg-green-600 rounded-full p-0.5" />
                      ) : (
                        <Video className="absolute bottom-0 right-0 w-4 h-4 bg-blue-600 rounded-full p-0.5" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFileSelection(file.id)}
                        className="mr-3 h-4 w-4 rounded border-gray-500 bg-transparent"
                      />
                      <div>
                        <p className="font-medium truncate">{file.title}</p>
                        <p className="text-sm text-gray-400">
                          {file.artist} • {file.duration} • {file.size}
                        </p>
                      </div>
                    </div>

                    {isDownloading && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <Progress value={downloadProgress[file.id]} className="h-1 flex-1" />
                          <span className="text-xs text-gray-400 min-w-[40px] text-right">
                            {downloadProgress[file.id]}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-2">
                    {file.type === "MP3" && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => togglePlay(file.id)}>
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    )}

                    {isDownloaded ? (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => downloadFile(file.id)}
                        disabled={isDownloading}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-300">
            <p>
              이 링크는 <span className="text-white font-medium">{expiryDateString}</span>까지 유효합니다.
            </p>
            <p className="mt-1">파일은 개인 사용 목적으로만 다운로드해 주세요.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
