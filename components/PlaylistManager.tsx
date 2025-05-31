'use client';

import { useState, useEffect } from "react";
import { Plus, Play, Trash2, ListMusic, Edit, Save, X, Music, MoreVertical } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePlayer } from "@/contexts/PlayerContext";

interface File {
  id: string;
  title: string;
  artist?: string;
  duration?: number;
  thumbnailPath?: string;
  groupType?: string;
  groupName?: string;
  fileType?: string;
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

export function PlaylistManager() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('none');
  const [editingPlaylist, setEditingPlaylist] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  // 플레이어 컨텍스트 사용
  const { loadFile, loadPlaylist, play } = usePlayer();

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
      if (selectedGroup && selectedGroup !== 'none') {
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
        setSelectedGroup('none');
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

    try {
      // 플레이리스트의 모든 파일을 플레이어에 로드
      const files = playlist.items
        .sort((a, b) => a.order - b.order) // 순서대로 정렬
        .map(item => item.file as any); // FileData 타입으로 변환
      
      // 플레이리스트 로드 후 재생
      loadPlaylist(files, 0);
      
      // 잠시 후 재생 시작 (로딩 시간 고려)
      setTimeout(() => {
        play();
      }, 100);
    } catch (error) {
      console.error('플레이리스트 재생 오류:', error);
      setError('플레이리스트 재생 중 오류가 발생했습니다.');
    }
  }

  // 단일 곡 재생
  function playSingleSong(file: File) {
    try {
      loadFile(file as any);
      setTimeout(() => {
        play();
      }, 100);
    } catch (error) {
      console.error('곡 재생 오류:', error);
      setError('곡 재생 중 오류가 발생했습니다.');
    }
  }

  // 플레이리스트 편집 시작
  function startEditingPlaylist(playlist: Playlist) {
    setEditingPlaylist(playlist.id);
    setEditingName(playlist.name);
    setEditingDescription(playlist.description || '');
  }

  // 플레이리스트 편집 취소
  function cancelEditingPlaylist() {
    setEditingPlaylist(null);
    setEditingName('');
    setEditingDescription('');
  }

  // 플레이리스트 정보 저장
  async function savePlaylistInfo(playlistId: string) {
    if (!editingName.trim()) {
      setError('플레이리스트 이름을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingName.trim(),
          description: editingDescription.trim() || null
        })
      });

      if (response.ok) {
        await fetchPlaylists();
        cancelEditingPlaylist();
      } else {
        const data = await response.json();
        setError(data.error || '플레이리스트 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('플레이리스트 수정 오류:', error);
      setError('플레이리스트 수정 중 오류가 발생했습니다.');
    }
  }

  // 플레이리스트에서 곡 제거
  async function removeFromPlaylist(playlistId: string, itemId: string) {
    try {
      console.log('곡 제거 요청:', { playlistId, itemId });
      
      const response = await fetch(`/api/playlists/${playlistId}/items/${itemId}`, {
        method: 'DELETE'
      });

      console.log('API 응답 상태:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('곡 제거 성공:', result);
        
        await fetchPlaylists();
        
        // 상세 다이얼로그가 열려있다면 선택된 플레이리스트 업데이트
        if (selectedPlaylist && selectedPlaylist.id === playlistId) {
          const updatedPlaylist = playlists.find(p => p.id === playlistId);
          if (updatedPlaylist) {
            setSelectedPlaylist(updatedPlaylist);
          }
        }
      } else {
        const errorText = await response.text();
        console.error('API 오류 응답:', errorText);
        
        try {
          const data = JSON.parse(errorText);
          setError(data.error || '곡 제거에 실패했습니다.');
        } catch {
          setError(`곡 제거에 실패했습니다. (${response.status})`);
        }
      }
    } catch (error) {
      console.error('곡 제거 오류:', error);
      setError('곡 제거 중 네트워크 오류가 발생했습니다.');
    }
  }

  // 플레이리스트 상세 보기
  function showPlaylistDetail(playlist: Playlist) {
    setSelectedPlaylist(playlist);
    setShowDetailDialog(true);
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

  // 안전한 썸네일 URL 생성
  const getThumbnailUrl = (file: File): string => {
    if (file.thumbnailPath && file.thumbnailPath.trim()) {
      return `/api/files/${file.id}/thumbnail`;
    }
    return "/placeholder.svg";
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
                    <SelectItem value="none">그룹 없음 (빈 플레이리스트)</SelectItem>
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
                    {editingPlaylist === playlist.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="bg-white/10 border-white/20 text-white"
                          placeholder="플레이리스트 이름"
                        />
                        <Input
                          value={editingDescription}
                          onChange={(e) => setEditingDescription(e.target.value)}
                          className="bg-white/10 border-white/20 text-white"
                          placeholder="설명 (선택사항)"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => savePlaylistInfo(playlist.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            저장
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditingPlaylist}
                            className="border-white/20"
                          >
                            <X className="w-3 h-3 mr-1" />
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <CardTitle className="text-lg font-semibold truncate">{playlist.name}</CardTitle>
                        {playlist.description && (
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{playlist.description}</p>
                        )}
                      </>
                    )}
                  </div>
                  {editingPlaylist !== playlist.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white hover:bg-white/10"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-800 border-gray-600 text-white">
                        <DropdownMenuItem onClick={() => showPlaylistDetail(playlist)}>
                          <ListMusic className="w-4 h-4 mr-2" />
                          상세 보기
                        </DropdownMenuItem>
                        {!playlist.isSystem && (
                          <>
                            <DropdownMenuItem onClick={() => startEditingPlaylist(playlist)}>
                              <Edit className="w-4 h-4 mr-2" />
                              편집
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deletePlaylist(playlist.id)}
                              className="text-red-400 focus:text-red-300"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                            src={getThumbnailUrl(item.file)}
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

      {/* 플레이리스트 상세 다이얼로그 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-gray-900 text-white border-gray-700 max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ListMusic className="w-5 h-5 mr-2" />
              {selectedPlaylist?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedPlaylist && (
            <div className="space-y-4 overflow-y-auto">
              {selectedPlaylist.description && (
                <p className="text-gray-400">{selectedPlaylist.description}</p>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  총 {selectedPlaylist.items.length}곡
                </span>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => playPlaylist(selectedPlaylist)}
                  disabled={selectedPlaylist.items.length === 0}
                >
                  <Play className="w-4 h-4 mr-1" />
                  전체 재생
                </Button>
              </div>

              {selectedPlaylist.items.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>플레이리스트가 비어있습니다</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedPlaylist.items
                    .sort((a, b) => a.order - b.order)
                    .map((item, index) => (
                      <div 
                        key={item.id} 
                        className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <span className="text-sm text-gray-400 w-6 text-center">
                          {index + 1}
                        </span>
                        <div className="w-10 h-10 relative flex-shrink-0">
                          <Image
                            src={getThumbnailUrl(item.file)}
                            width={40}
                            height={40}
                            alt={`${item.file.title} 썸네일`}
                            className="rounded object-cover"
                            onError={handleImageError}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.file.title}</p>
                          <p className="text-sm text-gray-400 truncate">
                            {item.file.artist} {formatDuration(item.file.duration)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => playSingleSong(item.file)}
                            className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                          {!selectedPlaylist.isSystem && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFromPlaylist(selectedPlaylist.id, item.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
