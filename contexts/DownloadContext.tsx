"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

interface DownloadContextType {
  downloadCount: number
  setDownloadCount: (count: number) => void
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined)

export function DownloadProvider({ children }: { children: ReactNode }) {
  const [downloadCount, setDownloadCount] = useState(0)

  return (
    <DownloadContext.Provider value={{ downloadCount, setDownloadCount }}>
      {children}
    </DownloadContext.Provider>
  )
}

export function useDownload() {
  const context = useContext(DownloadContext)
  if (context === undefined) {
    throw new Error('useDownload must be used within a DownloadProvider')
  }
  return context
} 