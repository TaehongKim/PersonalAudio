"use client"

import { useState, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Music, Lock } from "lucide-react"
import { signIn } from "next-auth/react"

export function LoginScreen() {
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!password) {
      setError("비밀번호를 입력해주세요.")
      return
    }
    
    try {
      setIsLoading(true)
      setError("")
      
      // NextAuth로 로그인
      const result = await signIn('credentials', {
        password,
        redirect: false,
      })
      
      if (result?.error) {
        setError("비밀번호가 올바르지 않습니다.")
      } else if (result?.ok) {
        // 로그인 성공 - localStorage 설정 (호환성을 위해)
        if (rememberMe) {
          localStorage.setItem("isLoggedIn", "true")
        }
        // NextAuth가 자동으로 페이지를 새로고침하거나 리디렉션합니다
      }
    } catch (error) {
      setError("로그인 중 오류가 발생했습니다.")
      console.error("로그인 오류:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-900 to-black p-4">
      <Card className="w-full max-w-md bg-black/50 border-white/10 text-white backdrop-blur-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Music size={32} />
          </div>
          <CardTitle className="text-2xl font-bold">귀요미 윤채의 음악방</CardTitle>
          <CardDescription className="text-gray-300">유튜브 및 멜론 차트 음악 다운로더</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                비밀번호
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="bg-white/10 border-white/20 text-white pl-10"
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            {error && (
              <div className="text-sm text-red-400 bg-red-900/20 p-2 rounded">
                {error}
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="remember" 
                checked={rememberMe} 
                onCheckedChange={(checked) => setRememberMe(!!checked)} 
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                로그인 상태 유지
              </label>
            </div>
            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-400">
            <p>YC_mp3_Web은 개인 사용 목적으로만 이용해 주세요.</p>
            <p className="mt-1">저작권이 있는 콘텐츠는 개인 사용 목적으로만 다운로드 가능합니다.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
