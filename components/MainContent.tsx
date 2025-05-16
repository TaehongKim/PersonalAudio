import { Download, Music, Video, Trash2, Search } from "lucide-react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const songs = [
  { title: "Bohemian Rhapsody", artist: "Queen", album: "A Night at the Opera", duration: "5:55" },
  { title: "Stairway to Heaven", artist: "Led Zeppelin", album: "Led Zeppelin IV", duration: "8:02" },
  { title: "Imagine", artist: "John Lennon", album: "Imagine", duration: "3:01" },
  { title: "Smells Like Teen Spirit", artist: "Nirvana", album: "Nevermind", duration: "5:01" },
  { title: "Billie Jean", artist: "Michael Jackson", album: "Thriller", duration: "4:54" },
]

const downloadQueue = [
  { title: "아이유 - 좋은 날", type: "MP3", progress: 100, status: "completed" },
  { title: "NewJeans - Ditto", type: "MP3", progress: 75, status: "processing" },
  { title: "BTS - Dynamite", type: "MP3", progress: 45, status: "processing" },
  { title: "BLACKPINK - Pink Venom", type: "720p", progress: 30, status: "processing" },
  { title: "TWICE - Feel Special", type: "MP3", progress: 0, status: "pending" },
]

export function MainContent() {
  return (
    <div className="flex-1 bg-gradient-to-b from-blue-900 to-black text-white p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">유튜브 다운로더</h1>
        <Card className="bg-white/10 border-none">
          <CardContent className="p-6">
            <div className="mb-4">
              <label htmlFor="youtube-url" className="block text-sm font-medium mb-2">
                유튜브 URL 입력
              </label>
              <div className="flex gap-2">
                <Input
                  id="youtube-url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="bg-white/5 border-white/20 text-white"
                />
                <Button className="bg-red-600 hover:bg-red-700">
                  <Search className="w-4 h-4 mr-2" />
                  검색
                </Button>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button className="bg-green-600 hover:bg-green-700 flex-1">
                <Music className="w-4 h-4 mr-2" />
                MP3 다운로드
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 flex-1">
                <Video className="w-4 h-4 mr-2" />
                720p 다운로드
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">다운로드 대기열</h2>
          <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
            모두 지우기
          </Button>
        </div>
        <div className="space-y-3">
          {downloadQueue.map((item, index) => (
            <Card key={index} className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative w-10 h-10 flex-shrink-0">
                      <Image
                        src="/placeholder.svg?height=40&width=40"
                        width={40}
                        height={40}
                        alt={`${item.title} thumbnail`}
                        className="rounded"
                      />
                      {item.type === "MP3" ? (
                        <Music className="absolute bottom-0 right-0 w-4 h-4 bg-green-600 rounded-full p-0.5" />
                      ) : (
                        <Video className="absolute bottom-0 right-0 w-4 h-4 bg-blue-600 rounded-full p-0.5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
                        <div
                          className={`h-1.5 rounded-full ${
                            item.status === "completed" ? "bg-green-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${item.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {item.status === "completed" && (
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
