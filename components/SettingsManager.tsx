"use client"

import { useState, useEffect, FormEvent } from "react"
import { Moon, Sun, Bell, Lock, HardDrive, Info, LogOut, Trash2, RefreshCw, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "@/contexts/ThemeContext"
import { type CheckedState } from "@radix-ui/react-checkbox"

interface SettingsManagerProps {
  handleLogout?: () => void;
}

interface TempFileStats {
  zipCache: {
    files: number;
    size: number;
    path: string;
  };
  tempFiles: {
    files: number;
    size: number;
    path: string;
  };
  fileCache: {
    totalFiles: number;
    temporaryFiles: number;
    permanentFiles: number;
    totalSize: number;
    temporarySize: number;
    totalSizeMB: number;
    temporarySizeMB: number;
  };
  total: {
    files: number;
    size: number;
  };
}

// 파일 크기 포맷팅 함수
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
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
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [currentStorageUsage, setCurrentStorageUsage] = useState({ used: 0, percentage: 0 })
  
  // 임시파일 관리 상태
  const [tempFileStats, setTempFileStats] = useState<TempFileStats | null>(null)
  const [tempFileLoading, setTempFileLoading] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupMessage, setCleanupMessage] = useState("")
  const [cacheStats, setCacheStats] = useState<{
    hitRatio: {
      totalHits: number;
      totalMisses: number;
      totalRequests: number;
      hitRatio: number;
      recentStats: Array<{ date: string; hits: number; misses: number; ratio: number }>;
    };
    cache: {
      totalFiles: number;
      temporaryFiles: number;
      permanentFiles: number;
      totalSize: number;
      temporarySize: number;
      totalSizeMB: number;
      temporarySizeMB: number;
    };
  } | null>(null)
  const [cacheStatsLoading, setCacheStatsLoading] = useState(false)

  const handleNotifyDownloadChange = (checked: CheckedState) => {
    setNotifyDownloadComplete(checked === true)
  }

  const handleNotifyErrorsChange = (checked: CheckedState) => {
    setNotifyErrors(checked === true)
  }

  const handleNotifyUpdatesChange = (checked: CheckedState) => {
    setNotifyUpdates(checked === true)
  }

  // 설정 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setSettingsLoading(true)
        
        // 설정 데이터 로드
        const settingsResponse = await fetch('/api/settings')
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json()
          setStorageLimit(settingsData.storageLimit)
        }
        
        // 현재 저장 공간 사용량 로드
        const statsResponse = await fetch('/api/files/stats')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          const usedMB = Math.floor(statsData.totalStorageUsed / (1024 * 1024))
          setCurrentStorageUsage({
            used: usedMB,
            percentage: statsData.storageUsagePercentage
          })
        }
      } catch (error) {
        console.error('설정 로드 오류:', error)
      } finally {
        setSettingsLoading(false)
      }
    }
    
    loadSettings()
    loadTempFileStats() // 임시파일 현황도 같이 로드
    loadCacheStats() // 캐시 통계도 같이 로드
  }, [])

  // 임시파일 현황 로드
  const loadTempFileStats = async () => {
    try {
      setTempFileLoading(true)
      const response = await fetch('/api/settings/cleanup')
      if (response.ok) {
        const data = await response.json()
        setTempFileStats(data)
      }
    } catch (error) {
      console.error('임시파일 현황 로드 오류:', error)
    } finally {
      setTempFileLoading(false)
    }
  }

  // 캐시 통계 로드
  const loadCacheStats = async () => {
    try {
      setCacheStatsLoading(true)
      const response = await fetch('/api/settings/cache-stats')
      if (response.ok) {
        const data = await response.json()
        setCacheStats(data)
      }
    } catch (error) {
      console.error('캐시 통계 로드 오류:', error)
    } finally {
      setCacheStatsLoading(false)
    }
  }

  // 임시파일 정리
  const handleCleanup = async (type: 'cache' | 'temp' | 'all', maxAgeHours?: number) => {
    try {
      setCleanupLoading(true)
      setCleanupMessage("")
      
      const params = new URLSearchParams({ type })
      if (maxAgeHours) {
        params.append('maxAge', maxAgeHours.toString())
      }
      
      const response = await fetch(`/api/settings/cleanup?${params}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        const result = await response.json()
        setCleanupMessage(result.message)
        // 정리 후 현황 다시 로드
        await loadTempFileStats()
      } else {
        const error = await response.json()
        setCleanupMessage(`오류: ${error.error}`)
      }
    } catch (error) {
      console.error('임시파일 정리 오류:', error)
      setCleanupMessage('임시파일 정리 중 오류가 발생했습니다.')
    } finally {
      setCleanupLoading(false)
    }
  }

  // 저장 공간 제한 업데이트
  const handleStorageLimitChange = async (newLimit: number) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storageLimit: newLimit
        })
      })
      
      if (response.ok) {
        setStorageLimit(newLimit)
      } else {
        console.error('저장 공간 제한 업데이트 실패')
      }
    } catch (error) {
      console.error('저장 공간 제한 업데이트 오류:', error)
    }
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
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          currentPassword, 
          newPassword 
        }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setPasswordSuccess("비밀번호가 성공적으로 변경되었습니다.")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        setPasswordError(data.error || "비밀번호 변경 실패")
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
                onValueChange={(value) => handleStorageLimitChange(value[0])}
                className="w-full"
                disabled={settingsLoading}
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>100 MB</span>
                <span>1000 MB</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-gray-400">현재 사용량</span>
                <span className="text-sm">
                  {settingsLoading ? '로딩 중...' : `${currentStorageUsage.used} MB (${currentStorageUsage.percentage.toFixed(1)}%)`}
                </span>
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

        {/* 임시파일 관리 */}
        <Card className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <FolderOpen className="h-5 w-5 mr-2" />
              임시파일 관리
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 현황 표시 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">현재 상황</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    loadTempFileStats()
                    loadCacheStats()
                  }}
                  disabled={tempFileLoading || cacheStatsLoading}
                  className={isDark ? "border-white/20 text-white hover:bg-white/10" : ""}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${(tempFileLoading || cacheStatsLoading) ? 'animate-spin' : ''}`} />
                  새로고침
                </Button>
              </div>
              
              {/* 캐시 효율성 */}
              {cacheStats && (
                <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                  <h4 className="font-medium text-blue-400 mb-3">📊 캐시 효율성</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-300">
                        {cacheStats.hitRatio.hitRatio.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-400">Hit Ratio</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-400">
                        {cacheStats.hitRatio.totalHits}
                      </div>
                      <div className="text-xs text-gray-400">Cache Hits</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-400">
                        {cacheStats.hitRatio.totalMisses}
                      </div>
                      <div className="text-xs text-gray-400">Cache Misses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-purple-400">
                        {cacheStats.hitRatio.totalRequests}
                      </div>
                      <div className="text-xs text-gray-400">Total Requests</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-400 text-center">
                    {cacheStats.hitRatio.totalRequests > 0 ? (
                      <span>
                        높은 Hit Ratio는 다운로드 속도 향상과 대역폭 절약을 의미합니다
                      </span>
                    ) : (
                      <span>아직 충분한 데이터가 수집되지 않았습니다</span>
                    )}
                  </div>
                </div>
              )}
              
              {tempFileStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* ZIP 캐시 */}
                  <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-400">ZIP 캐시</span>
                      <Badge variant="secondary" className="bg-blue-600/20 text-blue-300">
                        {tempFileStats.zipCache.files}개
                      </Badge>
                    </div>
                    <p className="text-lg font-bold">{formatFileSize(tempFileStats.zipCache.size)}</p>
                    <p className="text-xs text-gray-400 mt-1">압축 다운로드 캐시</p>
                  </div>
                  
                  {/* 임시 파일 */}
                  <div className={`p-3 rounded-lg ${isDark ? 'bg-yellow-900/20 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-yellow-400">임시 파일</span>
                      <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-300">
                        {tempFileStats.tempFiles.files}개
                      </Badge>
                    </div>
                    <p className="text-lg font-bold">{formatFileSize(tempFileStats.tempFiles.size)}</p>
                    <p className="text-xs text-gray-400 mt-1">다운로드 임시 파일</p>
                  </div>
                  
                  {/* 파일 캐시 */}
                  <div className={`p-3 rounded-lg ${isDark ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-400">파일 캐시</span>
                      <Badge variant="secondary" className="bg-green-600/20 text-green-300">
                        {tempFileStats.fileCache.temporaryFiles}개
                      </Badge>
                    </div>
                    <p className="text-lg font-bold">{tempFileStats.fileCache.temporarySizeMB.toFixed(1)}MB</p>
                    <p className="text-xs text-gray-400 mt-1">중복 방지용 임시 캐시</p>
                  </div>
                  
                  {/* 전체 */}
                  <div className={`p-3 rounded-lg ${isDark ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-400">전체</span>
                      <Badge variant="secondary" className="bg-purple-600/20 text-purple-300">
                        {tempFileStats.total.files}개
                      </Badge>
                    </div>
                    <p className="text-lg font-bold">{formatFileSize(tempFileStats.total.size)}</p>
                    <p className="text-xs text-gray-400 mt-1">모든 임시 파일</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  {tempFileLoading ? '로딩 중...' : '현황을 불러올 수 없습니다.'}
                </div>
              )}
            </div>
            
            {/* 정리 작업 */}
            <div className="space-y-3">
              <h3 className="font-medium">정리 작업</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button
                  onClick={() => handleCleanup('cache')}
                  disabled={cleanupLoading}
                  className={isDark ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  ZIP 캐시 정리
                </Button>
                
                <Button
                  onClick={() => handleCleanup('temp')}
                  disabled={cleanupLoading}
                  className={isDark ? "bg-yellow-600 hover:bg-yellow-700" : "bg-yellow-500 hover:bg-yellow-600"}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  임시 파일 정리
                </Button>
                
                <Button
                  onClick={() => handleCleanup('temp')}
                  disabled={cleanupLoading}
                  className={isDark ? "bg-green-600 hover:bg-green-700" : "bg-green-500 hover:bg-green-600"}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  파일 캐시 정리
                </Button>
                
                <Button
                  onClick={() => handleCleanup('all')}
                  disabled={cleanupLoading}
                  className={isDark ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600"}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  전체 정리
                </Button>
              </div>
              
              {/* 오래된 파일만 정리 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">오래된 파일만 정리 (선택)</label>
                <div className="flex gap-2">
                  <Select>
                    <SelectTrigger className={isDark ? "bg-white/10 border-white/20 text-white" : ""}>
                      <SelectValue placeholder="기간 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24시간 이전</SelectItem>
                      <SelectItem value="72">3일 이전</SelectItem>
                      <SelectItem value="168">1주일 이전</SelectItem>
                      <SelectItem value="720">30일 이전</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => handleCleanup('all', 168)} // 1주일 이전 파일 정리
                    disabled={cleanupLoading}
                    variant="outline"
                    className={isDark ? "border-white/20 text-white hover:bg-white/10" : ""}
                  >
                    조건부 정리
                  </Button>
                </div>
              </div>
            </div>
            
            {/* 결과 메시지 */}
            {cleanupMessage && (
              <div className={`p-3 rounded-lg text-sm ${
                cleanupMessage.includes('오류') 
                  ? (isDark ? 'bg-red-900/20 border border-red-500/30 text-red-300' : 'bg-red-50 border border-red-200 text-red-600')
                  : (isDark ? 'bg-green-900/20 border border-green-500/30 text-green-300' : 'bg-green-50 border border-green-200 text-green-600')
              }`}>
                {cleanupMessage}
              </div>
            )}
            
            {cleanupLoading && (
              <div className="text-center py-2 text-gray-400">
                <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                정리 중...
              </div>
            )}
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

export default SettingsManager;
