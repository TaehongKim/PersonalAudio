"use client"

import type React from "react"

import { useState } from "react"
import { Download, Filter, X, Music, Clock, RefreshCw } from "lucide-react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const chartSongs = [
  {
    rank: 1,
    title: "Ditto",
    artist: "NewJeans",
    album: "NewJeans 'OMG'",
    coverUrl: "/placeholder.svg?height=120&width=120",
  },
  {
    rank: 2,
    title: "Hype Boy",
    artist: "NewJeans",
    album: "NewJeans 1st EP 'New Jeans'",
    coverUrl: "/placeholder.svg?height=120&width=120",
  },
  {
    rank: 3,
    title: "사건의 지평선",
    artist: "윤하 (YOUNHA)",
    album: "YOUNHA 6th Album 'END THEORY'",
    coverUrl: "/placeholder.svg?height=120&width=120",
  },
  {
    rank: 4,
    title: "ANTIFRAGILE",
    artist: "LE SSERAFIM (르세라핌)",
    album: "ANTIFRAGILE",
    coverUrl: "/placeholder.svg?height=120&width=120",
  },
  {
    rank: 5,
    title: "Attention",
    artist: "NewJeans",
    album: "NewJeans 1st EP 'New Jeans'",
    coverUrl: "/placeholder.svg?height=120&width=120",
  },
  {
    rank: 6,
    title: "Nxde",
    artist: "(여자)아이들",
    album: "I love",
    coverUrl: "/placeholder.svg?height=120&width=120",
  },
  {
    rank: 7,
    title: "After LIKE",
    artist: "IVE (아이브)",
    album: "After LIKE",
    coverUrl: "/placeholder.svg?height=120&width=120",
  },
  {
    rank: 8,
    title: "Shut Down",
    artist: "BLACKPINK",
    album: "BORN PINK",
    coverUrl: "/placeholder.svg?height=120&width=120",
  },
  {
    rank: 9,
    title: "Pink Venom",
    artist: "BLACKPINK",
    album: "BORN PINK",
    coverUrl: "/placeholder.svg?height=120&width=120",
  },
  {
    rank: 10,
    title: "Monologue",
    artist: "테이 (Tei)",
    album: "Monologue",
    coverUrl: "/placeholder.svg?height=120&width=120",
  },
]

const downloadTasks = [
  {
    title: "NewJeans - Ditto",
    progress: 100,
    status: "completed",
    coverUrl: "/placeholder.svg?height=60&width=60",
  },
  {
    title: "윤하 - 사건의 지평선",
    progress: 75,
    status: "processing",
    coverUrl: "/placeholder.svg?height=60&width=60",
  },
  {
    title: "LE SSERAFIM - ANTIFRAGILE",
    progress: 30,
    status: "processing",
    coverUrl: "/placeholder.svg?height=60&width=60",
  },
]

export function MelonChart() {
  const [chartSize, setChartSize] = useState("30")
  const [customChartSize, setCustomChartSize] = useState("")
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)

  const handleAddKeyword = () => {
    if (keywordInput.trim() !== "" && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()])
      setKeywordInput("")
    }
  }

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddKeyword()
    }
  }

  const handleChartSizeChange = (value: string) => {
    setChartSize(value)
    setShowCustomInput(value === "custom")
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-green-900 to-black text-white p-4 md:p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">멜론 차트</h1>
        <Card className="bg-white/10 border-none">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium mb-3">차트 크기 선택</p>
                <div className="flex flex-wrap gap-4">
                  <RadioGroup value={chartSize} onValueChange={handleChartSizeChange} className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="30" id="r30" />
                      <Label htmlFor="r30">TOP 30</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="50" id="r50" />
                      <Label htmlFor="r50">TOP 50</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="100" id="r100" />
                      <Label htmlFor="r100">TOP 100</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="rcustom" />
                      <Label htmlFor="rcustom">직접 입력</Label>
                    </div>
                  </RadioGroup>

                  {showCustomInput && (
                    <div className="w-24">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="숫자 입력"
                        value={customChartSize}
                        onChange={(e) => setCustomChartSize(e.target.value)}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">제외 키워드 설정</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {keywords.map((keyword, index) => (
                    <Badge key={index} className="bg-green-700 hover:bg-green-600 px-3 py-1 flex items-center gap-1">
                      {keyword}
                      <button
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="ml-1 hover:bg-green-800 rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="제외할 키워드 입력 후 Enter"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="bg-white/5 border-white/20 text-white"
                  />
                  <Button
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                    onClick={handleAddKeyword}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    추가
                  </Button>
                </div>
              </div>

              <Button className="w-full bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                차트 전체 다운로드
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="preview">
        <TabsList className="bg-white/10 border-white/20">
          <TabsTrigger value="preview">차트 미리보기</TabsTrigger>
          <TabsTrigger value="downloads">
            다운로드 진행중 ({downloadTasks.filter((t) => t.status === "processing").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {chartSongs.map((song) => (
              <Card key={song.rank} className="bg-white/5 border-white/10 overflow-hidden">
                <div className="relative">
                  <Image
                    src={song.coverUrl || "/placeholder.svg"}
                    width={200}
                    height={200}
                    alt={`${song.title} album cover`}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-green-600 px-2 py-1">{song.rank}</Badge>
                  </div>
                  <Button
                    size="icon"
                    className="absolute bottom-2 right-2 bg-green-600 hover:bg-green-500 rounded-full h-10 w-10"
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                </div>
                <CardContent className="p-3">
                  <p className="font-medium truncate">{song.title}</p>
                  <p className="text-sm text-gray-400 truncate">{song.artist}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="downloads" className="mt-4">
          <div className="space-y-4">
            {downloadTasks.map((task, index) => (
              <Card key={index} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Image
                      src={task.coverUrl || "/placeholder.svg"}
                      width={60}
                      height={60}
                      alt={`${task.title} cover`}
                      className="rounded"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-medium">{task.title}</p>
                        <div className="flex items-center">
                          {task.status === "processing" ? (
                            <Badge className="bg-blue-600">
                              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              진행중
                            </Badge>
                          ) : (
                            <Badge className="bg-green-600">완료</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={task.progress} className="h-2 flex-1" />
                        <span className="text-xs text-gray-400 min-w-[40px] text-right">{task.progress}%</span>
                      </div>
                      <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                        <div className="flex items-center">
                          <Music className="w-3 h-3 mr-1" />
                          <span>MP3</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>
                            {task.status === "completed"
                              ? "완료됨"
                              : task.progress < 50
                                ? "약 2분 남음"
                                : "약 1분 남음"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
