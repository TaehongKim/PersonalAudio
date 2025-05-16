"use client"

import { useState, FormEvent } from "react"
import { Moon, Sun, Bell, Lock, HardDrive, Info, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useTheme } from "@/contexts/ThemeContext"
import { type CheckedState } from "@radix-ui/react-checkbox"

interface SettingsManagerProps {
  handleLogout?: () => void;
}

export function SettingsManager({ handleLogout }: SettingsManagerProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  const [notifyDownloadComplete, setNotifyDownloadComplete] = useState(true)
  const [notifyErrors, setNotifyErrors] = useState(true)
  const [notifyUpdates, setNotifyUpdates] = useState(false)
  const [storageLimit, setStorageLimit] = useState(500) // MB
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleNotifyDownloadChange = (checked: CheckedState) => {
    setNotifyDownloadComplete(checked === true)
  }

  const handleNotifyErrorsChange = (checked: CheckedState) => {
    setNotifyErrors(checked === true)
  }

  const handleNotifyUpdatesChange = (checked: CheckedState) => {
    setNotifyUpdates(checked === true)
  }

  const handlePasswordChange = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPasswordError("")
    setPasswordSuccess("")
    
    if (!currentPassword) {
      setPasswordError("현재 비밀번호를 입력해주세요.")
      return
    }
    
    if (!newPassword) {
      setPasswordError("새 비밀번호를 입력해주세요.")
      return
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.")
      return
    }
    
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          currentPassword, 
          newPassword 
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setPasswordSuccess("비밀번호가 성공적으로 변경되었습니다.")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        setPasswordError(data.message || "비밀번호 변경 실패")
      }
    } catch (error) {
      console.error("비밀번호 변경 오류:", error)
      setPasswordError("비밀번호 변경 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={`flex-1 ${isDark ? "bg-gradient-to-b from-gray-800 to-black text-white" : "bg-gradient-to-b from-gray-100 to-white text-gray-800"} p-4 md:p-8 overflow-y-auto`}
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-6">설정</h1>
      </div>

      <div className="space-y-6 max-w-3xl mx-auto">
        {/* 로그아웃 버튼 */}
        {handleLogout && (
          <Card className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}>
            <CardContent className="py-4">
              <Button 
                variant="destructive" 
                className="w-full flex items-center justify-center" 
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* 테마 설정 */}
        <Card className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">테마 설정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <span>{isDark ? "다크 모드" : "라이트 모드"}</span>
              </div>
              <Switch checked={isDark} onCheckedChange={toggleTheme} />
            </div>
          </CardContent>
        </Card>

        {/* 알림 설정 */}
        <Card className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">알림 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify-download"
                checked={notifyDownloadComplete}
                onCheckedChange={handleNotifyDownloadChange}
              />
              <label
                htmlFor="notify-download"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                다운로드 완료 알림
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="notify-errors" 
                checked={notifyErrors} 
                onCheckedChange={handleNotifyErrorsChange} 
              />
              <label
                htmlFor="notify-errors"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                오류 알림
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="notify-updates" 
                checked={notifyUpdates} 
                onCheckedChange={handleNotifyUpdatesChange} 
              />
              <label
                htmlFor="notify-updates"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                업데이트 알림
              </label>
            </div>
          </CardContent>
        </Card>

        {/* 저장 공간 관리 */}
        <Card className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">저장 공간 관리</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>저장 공간 제한</span>
                <span className="font-medium">{storageLimit} MB</span>
              </div>
              <Slider
                value={[storageLimit]}
                min={100}
                max={1000}
                step={100}
                onValueChange={(value) => setStorageLimit(value[0])}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>100 MB</span>
                <span>1000 MB</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-gray-400">현재 사용량</span>
                <span className="text-sm">93.1 MB (18.6%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 비밀번호 변경 */}
        <Card className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">비밀번호 변경</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handlePasswordChange}>
              <div className="space-y-2">
                <label htmlFor="current-password" className="text-sm">
                  현재 비밀번호
                </label>
                <div className="relative">
                  <Lock
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  />
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={
                      isDark
                        ? "bg-white/10 border-white/20 text-white pl-10"
                        : "bg-white border-gray-300 text-gray-800 pl-10"
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="new-password" className="text-sm">
                  새 비밀번호
                </label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={
                    isDark ? "bg-white/10 border-white/20 text-white" : "bg-white border-gray-300 text-gray-800"
                  }
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm">
                  비밀번호 확인
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={
                    isDark ? "bg-white/10 border-white/20 text-white" : "bg-white border-gray-300 text-gray-800"
                  }
                />
              </div>
              
              {passwordError && (
                <div className="text-sm text-red-400 bg-red-900/20 p-2 rounded">
                  {passwordError}
                </div>
              )}
              
              {passwordSuccess && (
                <div className="text-sm text-green-400 bg-green-900/20 p-2 rounded">
                  {passwordSuccess}
                </div>
              )}
              
              <Button
                type="submit"
                disabled={isLoading}
                className={isDark ? "w-full bg-blue-600 hover:bg-blue-700" : "w-full bg-blue-500 hover:bg-blue-600"}
              >
                {isLoading ? "비밀번호 변경 중..." : "비밀번호 변경"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 정보 및 도움말 */}
        <Card className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">정보 및 도움말</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className={isDark ? "border-white/10" : "border-gray-200"}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center">
                    <Info className="h-4 w-4 mr-2" />앱 정보
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm text-gray-400">
                    <p>YC_mp3_Web 버전 1.0.0</p>
                    <p>© 2023 YC_mp3_Web. All rights reserved.</p>
                    <p>이 앱은 개인 사용 목적으로만 이용해 주세요.</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2" className={isDark ? "border-white/10" : "border-gray-200"}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center">
                    <HardDrive className="h-4 w-4 mr-2" />
                    저장 공간 관리 방법
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm text-gray-400">
                    <p>저장 공간이 부족할 경우:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>오래된 파일을 삭제하세요.</li>
                      <li>더 이상 필요하지 않은 비디오 파일을 삭제하세요.</li>
                      <li>설정에서 저장 공간 제한을 늘릴 수 있습니다.</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3" className={isDark ? "border-white/10" : "border-gray-200"}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center">
                    <Bell className="h-4 w-4 mr-2" />
                    알림 설정 방법
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm text-gray-400">
                    <p>알림을 받으려면:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>브라우저 알림 권한을 허용해야 합니다.</li>
                      <li>모바일에서는 PWA로 설치하면 더 나은 알림을 받을 수 있습니다.</li>
                      <li>설정에서 원하는 알림 유형을 선택하세요.</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
