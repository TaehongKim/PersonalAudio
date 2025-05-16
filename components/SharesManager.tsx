"use client"

import { useState } from "react"
import { Trash2, Copy, RefreshCw, QrCode, Clock, Link, ExternalLink, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"

interface ShareLink {
  id: string
  name: string
  url: string
  shortCode: string
  expiresAt: string | null
  createdAt: string
  downloads: number
  fileCount: number
}

const shareLinks: ShareLink[] = [
  {
    id: "1",
    name: "K-Pop 컬렉션",
    url: "https://ycmp3.com/share/abc123",
    shortCode: "abc123",
    expiresAt: "2023-06-15",
    createdAt: "2023-05-15",
    downloads: 12,
    fileCount: 5,
  },
  {
    id: "2",
    name: "BTS 앨범",
    url: "https://ycmp3.com/share/def456",
    shortCode: "def456",
    expiresAt: null,
    createdAt: "2023-05-10",
    downloads: 8,
    fileCount: 3,
  },
  {
    id: "3",
    name: "BLACKPINK 뮤직비디오",
    url: "https://ycmp3.com/share/ghi789",
    shortCode: "ghi789",
    expiresAt: "2023-07-01",
    createdAt: "2023-05-05",
    downloads: 24,
    fileCount: 4,
  },
]

export function SharesManager() {
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null)
  const [newExpiryDate, setNewExpiryDate] = useState<string>("7days")

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    // 여기에 복사 성공 알림을 추가할 수 있습니다
  }

  const getExpiryText = (expiresAt: string | null) => {
    if (!expiresAt) return "무기한"

    const expiry = new Date(expiresAt)
    const now = new Date()
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return "만료됨"
    if (diffDays === 0) return "오늘 만료"
    if (diffDays === 1) return "내일 만료"
    return `${diffDays}일 남음`
  }

  const getExpiryColor = (expiresAt: string | null) => {
    if (!expiresAt) return "bg-green-600"

    const expiry = new Date(expiresAt)
    const now = new Date()
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return "bg-red-600"
    if (diffDays <= 3) return "bg-yellow-600"
    return "bg-blue-600"
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-blue-900 to-black text-white p-4 md:p-8 overflow-y-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">공유 관리</h1>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Link className="w-4 h-4 mr-2" />새 공유 링크 생성
          </Button>
        </div>

        <p className="text-gray-400 mb-6">
          생성한 공유 링크를 관리하고 QR 코드를 생성할 수 있습니다. 링크는 만료일에 자동으로 비활성화됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shareLinks.map((share) => (
          <Card key={share.id} className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg truncate pr-2">{share.name}</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-white">
                    <DropdownMenuItem className="hover:bg-gray-700" onClick={() => handleCopyLink(share.url)}>
                      <Copy className="h-4 w-4 mr-2" />
                      링크 복사
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-gray-700" onClick={() => setSelectedShareId(share.id)}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      만료일 변경
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-gray-700 text-red-400">
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center mb-3">
                <Badge className={`mr-2 ${getExpiryColor(share.expiresAt)}`}>
                  <Clock className="w-3 h-3 mr-1" />
                  {getExpiryText(share.expiresAt)}
                </Badge>
                <Badge className="bg-purple-600">파일 {share.fileCount}개</Badge>
              </div>

              <div className="flex items-center bg-black/30 rounded p-2 mb-3">
                <Input
                  value={share.url}
                  readOnly
                  className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto text-sm"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 ml-1 hover:bg-white/10"
                  onClick={() => handleCopyLink(share.url)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              <div className="text-xs text-gray-400">
                <div className="flex justify-between mb-1">
                  <span>생성일</span>
                  <span>{share.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span>다운로드 횟수</span>
                  <span>{share.downloads}회</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-between">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                    <QrCode className="w-4 h-4 mr-2" />
                    QR 코드
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-800 text-white">
                  <DialogHeader>
                    <DialogTitle>QR 코드</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-4 rounded-lg mb-4">
                      <Image
                        src={`/placeholder.svg?height=200&width=200&text=QR:${share.shortCode}`}
                        width={200}
                        height={200}
                        alt="QR Code"
                      />
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{share.name}</p>
                    <p className="text-xs text-gray-500 mb-4">{share.url}</p>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <Copy className="w-4 h-4 mr-2" />
                      QR 코드 이미지 저장
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="w-4 h-4 mr-2" />
                링크 열기
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* 만료일 변경 다이얼로그 */}
      <Dialog open={!!selectedShareId} onOpenChange={(open) => !open && setSelectedShareId(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>만료일 변경</DialogTitle>
          </DialogHeader>
          <div>
            <p className="text-sm text-gray-400 mb-4">
              공유 링크의 새로운 만료일을 선택하세요. 무기한으로 설정하면 수동으로 삭제하기 전까지 링크가 유효합니다.
            </p>
            <Select value={newExpiryDate} onValueChange={setNewExpiryDate}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white mb-4">
                <SelectValue placeholder="만료일 선택" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="1day">1일</SelectItem>
                <SelectItem value="7days">7일</SelectItem>
                <SelectItem value="30days">30일</SelectItem>
                <SelectItem value="90days">90일</SelectItem>
                <SelectItem value="unlimited">무기한</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => setSelectedShareId(null)}
              >
                취소
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                만료일 변경
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
