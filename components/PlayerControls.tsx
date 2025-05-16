"use client"

import { Play, SkipBack, SkipForward, Volume2, List } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/contexts/ThemeContext"

export function PlayerControls() {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  return (
    <div
      className={`${isDark ? "bg-black text-white border-t border-white/10" : "bg-white text-gray-800 border-t border-gray-200"} p-4 flex items-center justify-between`}
    >
      <div className="flex items-center space-x-4">
        <Image
          src="/placeholder.svg?height=56&width=56"
          width={56}
          height={56}
          alt="Now playing"
          className="w-14 h-14 rounded"
        />
        <div>
          <p className="font-semibold">아이유 - 좋은 날</p>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>MP3 • 3:48</p>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className={isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}
          >
            <SkipBack size={20} />
          </Button>
          <Button
            className={`${isDark ? "bg-white text-black" : "bg-black text-white"} rounded-full h-10 w-10 p-0 hover:scale-105 transition`}
          >
            <Play fill="currentColor" size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}
          >
            <SkipForward size={20} />
          </Button>
        </div>
        <div className="w-full max-w-md mt-2">
          <div className={`${isDark ? "bg-gray-500" : "bg-gray-300"} rounded-full h-1 w-full`}>
            <div className={`${isDark ? "bg-white" : "bg-gray-800"} rounded-full h-1 w-1/3`}></div>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          className={isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}
        >
          <Volume2 size={20} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}
        >
          <List size={20} />
        </Button>
      </div>
    </div>
  )
}
