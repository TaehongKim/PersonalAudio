import fs from 'fs/promises'
import path from 'path'
import type { ChartSong } from '@/types/chart'

const CACHE_DIR = path.join(process.cwd(), 'storage', 'cache', 'melon')
const CHART_CACHE_FILE = path.join(CACHE_DIR, 'chart_cache.json')
const CACHE_TTL = 1000 * 60 * 30 // 30분

interface ChartCache {
  timestamp: number
  data: ChartSong[]
}

export async function getChartCache(): Promise<ChartCache | null> {
  try {
    const exists = await fs.access(CHART_CACHE_FILE)
      .then(() => true)
      .catch(() => false)
    
    if (!exists) {
      return null
    }
    
    const cacheData = await fs.readFile(CHART_CACHE_FILE, 'utf-8')
    const cache: ChartCache = JSON.parse(cacheData)
    
    // 캐시 만료 확인
    if (Date.now() - cache.timestamp > CACHE_TTL) {
      return null
    }
    
    return cache
  } catch (error) {
    console.error('차트 캐시 읽기 실패:', error)
    return null
  }
}

export async function setChartCache(data: ChartSong[]): Promise<void> {
  try {
    // 캐시 디렉토리 생성
    await fs.mkdir(CACHE_DIR, { recursive: true })
    
    const cache: ChartCache = {
      timestamp: Date.now(),
      data
    }
    
    await fs.writeFile(CHART_CACHE_FILE, JSON.stringify(cache, null, 2))
  } catch (error) {
    console.error('차트 캐시 저장 실패:', error)
  }
} 