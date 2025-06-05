'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PlaylistItem {
  id: string;
  playlistId: string;
  fileId: string;
  order: number;
  file: {
    id: string;
    title: string;
    artist: string;
    fileType: string;
    fileSize: number;
    duration?: number;
    thumbnailPath?: string;
    createdAt: string;
  };
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
  items: PlaylistItem[];
  _count: {
    items: number;
  };
}

interface PlaylistContextType {
  playlists: Playlist[];
  loading: boolean;
  error: string | null;
  refreshPlaylists: () => Promise<void>;
  addPlaylist: (playlist: Playlist) => void;
  removePlaylist: (id: string) => void;
  updatePlaylist: (id: string, data: Partial<Playlist>) => void;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizePlaylists = (playlists: Playlist[]): Playlist[] =>
    playlists.map(p => ({ ...p, isSystem: !!p.isSystem }));

  const refreshPlaylists = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/playlists');
      if (!response.ok) {
        throw new Error('플레이리스트를 불러올 수 없습니다.');
      }
      
      const data = await response.json();
      setPlaylists(normalizePlaylists(data.playlists || []));
    } catch (err) {
      console.error('플레이리스트 로드 오류:', err);
      setError(err instanceof Error ? err.message : '플레이리스트를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const addPlaylist = (playlist: Playlist) => {
    setPlaylists(prev => [
      ...normalizePlaylists([playlist]),
      ...prev
    ]);
  };

  const removePlaylist = (id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
  };

  const updatePlaylist = (id: string, data: Partial<Playlist>) => {
    setPlaylists(prev => prev.map(p => 
      p.id === id ? { ...p, ...data } : p
    ));
  };

  // 초기 로드
  useEffect(() => {
    refreshPlaylists();
  }, []);

  return (
    <PlaylistContext.Provider value={{
      playlists,
      loading,
      error,
      refreshPlaylists,
      addPlaylist,
      removePlaylist,
      updatePlaylist
    }}>
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylist() {
  const context = useContext(PlaylistContext);
  if (context === undefined) {
    throw new Error('usePlaylist must be used within a PlaylistProvider');
  }
  return context;
} 