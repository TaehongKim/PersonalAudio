'use client';

import { useState, useEffect } from "react";
import { Plus, Play, Trash2, ListMusic } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface File {
  id: string;
  title: string;
  artist?: string;
  duration?: number;
  thumbnailPath?: string;
  groupType?: string;
  groupName?: string;
}

interface PlaylistItem {
  id: string;
  order: number;
  file: File;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  items: PlaylistItem[];
  _count: { items: number };
}

interface Group {
  groupType: string;
  groupName: string;
  fileCount: number;
  files: File[];
}

interface PlaylistManagerProps {
  onPlayFile?: (file: File) => void;
}

export function PlaylistManager({ onPlayFile }: PlaylistManagerProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');

  // 플레이리스트 목록 가져오기
  async function fetchPlaylists() {
    try {
      const response = await fetch('/api/playlists');
      if (response.ok) {
        const data = await response.json();
        setPlaylists(data.playlists || []);
      } else {
        throw new Error('플레이리스트를 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('플레이리스트 조회 오류:', error);
      setError('플레이리스트를 불러오는 중 오류가 발생했습니다.');
    }
  }

  // 다운로드 그룹 목록 가져오기
  async function fetchGroups() {
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        const data = await response.json();
        const groupMap = new Map<string, Group>();
        
        data.files?.forEach((file: File) => {
          if (file.groupType && file.groupName) {
            const key = `${file.groupType}:${file.groupName}`;
            if (!groupMap.has(key)) {
              groupMap.set(key, {
                groupType: file.groupType,
                groupName: file.groupName,
                fileCount: 0,
                files: []
              });
            }
            const group = groupMap.get(key)!;
            group.fileCount++;
            group.files.push(file);
          }
        });
        
        setGroups(Array.from(groupMap.values()));
      }
    } catch (error) {
      console.error('그룹 조회 오류:', error);
    }
  }

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      await Promise.all([fetchPlaylists(), fetchGroups()]);
      setIsLoading(false);
    }
    loadData();
  }, []);

  // 플레이리스트 생성
  async function createPlaylist() {
    if (!newPlaylistName.trim()) {
      setError('플레이리스트 이름을 입력해주세요.');
      return;
    }

    try {
      const requestBody: any = {
        name: newPlaylistName.trim(),
        description: newPlaylistDescription.trim() || undefined
      };

      // 선택된 그룹이 있으면 그룹에서 플레이리스트 생성
      if (selectedGroup) {
        const [groupType, groupName] = selectedGroup.split(':');
        requestBody.groupType = groupType;
        requestBody.groupName = groupName;
      }

      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        setIsCreateDialogOpen(false);
        setNewPlaylistName('');
        setNewPlaylistDescription('');
        setSelectedGroup('');
        await fetchPlaylists();
      } else {
        const data = await response.json();
        setError(data.error || '플레이리스트 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('플레이리스트 생성 오류:', error);
      setError('플레이리스트 생성 중 오류가 발생했습니다.');
    }
  }

  // 플레이리스트 삭제
  async function deletePlaylist(playlistId: string) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    if (playlist.isSystem) {
      setError('시스템 플레이리스트는 삭제할 수 없습니다.');
      return;
    }

    if (!confirm(`"${playlist.name}" 플레이리스트를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchPlaylists();
      } else {
        const data = await response.json();
        setError(data.error || '플레이리스트 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('플레이리스트 삭제 오류:', error);
      setError('플레이리스트 삭제 중 오류가 발생했습니다.');
    }
  }

  // 플레이리스트 전체 재생
  async function playPlaylist(playlist: Playlist) {
    if (playlist.items.length === 0) {
      setError('빈 플레이리스트입니다.');
      return;
    }

    // 첫 번째 곡 재생
    const firstItem = playlist.items[0];
    if (onPlayFile) {
      onPlayFile(firstItem.file);
    }
  }

  // 시간 포맷팅
  function formatDuration(seconds?: number): string {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // 이미지 오류 처리
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = "/placeholder.svg";
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-gradient-to-b from-purple-900 to-black text-white p-4 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-purple-900 to-black text-white p-4 md:p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">내 플레이리스트</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              플레이리스트 생성
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 text-white border-gray-700">
            <DialogHeader>
              <DialogTitle>새 플레이리스트 생성</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">플레이리스트 이름</label>
                <Input
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="플레이리스트 이름을 입력하세요"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">설명 (선택사항)</label>
                <Input
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  placeholder="플레이리스트 설명을 입력하세요"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">다운로드 그룹에서 생성 (선택사항)</label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="그룹을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="">그룹 없음 (빈 플레이리스트)</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={`${group.groupType}:${group.groupName}`} value={`${group.groupType}:${group.groupName}`}>
                        {group.groupName} ({group.fileCount}곡)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button onClick={createPlaylist} className="flex-1 bg-purple-600 hover:bg-purple-700">
                  생성
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(false)} variant="outline" className="flex-1">
                  취소
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
          {error}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setError(null)}
            className="ml-2 text-red-200 hover:text-red-100"
          >
            ✕
          </Button>
        </div>
      )}

      {playlists.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8 text-center">
            <ListMusic className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-gray-400 mb-2">플레이리스트가 없습니다</p>
            <p className="text-sm text-gray-500">위의 버튼을 클릭하여 새 플레이리스트를 생성하세요</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((playlist) => (
            <Card key={playlist.id} className="bg-white/10 border-white/20 hover:bg-white/15 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold truncate">{playlist.name}</CardTitle>
                    {playlist.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{playlist.description}</p>
                    )}
                  </div>
                  {!playlist.isSystem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePlaylist(playlist.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20 ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400">
                    {playlist._count.items}곡
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(playlist.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                {playlist.items.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {playlist.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center space-x-2 text-sm">
                        <div className="w-8 h-8 relative flex-shrink-0">
                          <Image
                            src={item.file.thumbnailPath || "/placeholder.svg"}
                            width={32}
                            height={32}
                            alt={`${item.file.title} 썸네일`}
                            className="rounded object-cover"
                            onError={handleImageError}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium text-sm">{item.file.title}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {item.file.artist} {formatDuration(item.file.duration)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {playlist.items.length > 3 && (
                      <p className="text-xs text-gray-400 text-center">
                        +{playlist.items.length - 3}곡 더...
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => playPlaylist(playlist)}
                    disabled={playlist.items.length === 0}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    재생
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}