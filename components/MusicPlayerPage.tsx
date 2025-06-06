import React, { useState } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Plus, Trash2, FolderPlus, ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const MusicPlayerPage = MusicPlayerPageImpl;

function MusicPlayerPageImpl() {
  const { state, play, pause, next, previous, toggleRepeat, toggleShuffle, loadFile, loadPlaylist } = usePlayer();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [groupList, setGroupList] = useState<any[]>([]);
  const [playlistList, setPlaylistList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [dragList, setDragList] = useState<any[]>(state.playlist);
  const [sortKey, setSortKey] = useState<'added'|'title'|'artist'>('added');
  const [filter, setFilter] = useState('');

  React.useEffect(() => {
    setDragList(state.playlist);
    console.log('state.playlist 변경됨:', state.playlist);
  }, [state.playlist]);

  React.useEffect(() => {
    console.log('usePlayer context state:', state);
  }, []);

  // 파일 목록 불러오기
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      console.log('fetchFiles 응답:', data);
      setFileList(data.files || []);
    } catch (e) {
      console.error('fetchFiles 에러:', e);
    }
    setLoading(false);
  };
  // 그룹(폴더) 목록 불러오기
  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/files/groups');
      const data = await res.json();
      console.log('fetchGroups 응답:', data);
      setGroupList(data.groups || []);
    } catch (e) {
      console.error('fetchGroups 에러:', e);
    }
    setLoading(false);
  };
  // 플레이리스트 목록 불러오기
  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/playlists');
      const data = await res.json();
      console.log('fetchPlaylists 응답:', data);
      setPlaylistList(data.playlists || []);
    } catch (e) {
      console.error('fetchPlaylists 에러:', e);
    }
    setLoading(false);
  };

  // FileData 타입 변환 함수
  function toFileData(file: any): any {
    return {
      id: file.id,
      title: file.title || '',
      artist: file.artist || '',
      fileType: file.fileType || 'mp3',
      fileSize: file.fileSize || 0,
      duration: file.duration ?? null,
      thumbnailPath: file.thumbnailPath ?? null,
      createdAt: file.createdAt || new Date().toISOString(),
      downloads: file.downloads || 0,
    };
  }

  // 단일 파일 추가
  const handleAddFile = (file: any) => {
    console.log('handleAddFile 호출:', file);
    if (!file || !file.id) return;
    const exists = state.playlist.some((f: any) => f.id === file.id);
    if (exists) return;
    const newList = [...state.playlist, toFileData(file)];
    console.log('handleAddFile newList:', newList);
    loadPlaylist(newList);
    setDragList(newList);
    setShowFileDialog(false);
    setShowAddMenu(false);
  };
  // 폴더(그룹) 전체 추가
  const handleAddGroup = (group: any) => {
    console.log('handleAddGroup 호출:', group);
    if (group.files && group.files.length > 0) {
      const unique = group.files.filter((f: any) => f && f.id && !state.playlist.some((p: any) => p.id === f.id));
      const newList = [...state.playlist, ...unique.map((f: any) => toFileData(f))];
      console.log('handleAddGroup newList:', newList);
      loadPlaylist(newList);
      setDragList(newList);
    }
    setShowFolderDialog(false);
    setShowAddMenu(false);
  };
  // 플레이리스트에서 추가
  const handleAddPlaylist = (playlist: any) => {
    console.log('handleAddPlaylist 호출:', playlist);
    if (playlist.items && playlist.items.length > 0) {
      const files = playlist.items.map((item: any) => item.file).filter((f: any) => f && f.id && !state.playlist.some((p: any) => p.id === f.id));
      const newList = [...state.playlist, ...files.map((f: any) => toFileData(f))];
      console.log('handleAddPlaylist newList:', newList);
      loadPlaylist(newList);
      setDragList(newList);
    }
    setShowPlaylistDialog(false);
    setShowAddMenu(false);
  };
  // 곡 삭제
  const handleRemoveFile = (fileId: string) => {
    const newList = state.playlist.filter((f) => f.id !== fileId);
    loadPlaylist(newList);
    setSelected(selected.filter(id => id !== fileId));
  };
  const handleRemoveSelected = () => {
    const newList = state.playlist.filter((f) => !selected.includes(f.id));
    loadPlaylist(newList);
    setSelected([]);
  };
  const handleSelect = (fileId: string) => {
    setSelected(prev => prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]);
  };
  const handleSelectAll = () => {
    if (selected.length === state.playlist.length) setSelected([]);
    else setSelected(state.playlist.map(f => f.id));
  };
  // 중복 곡 삭제 함수
  const handleRemoveDuplicates = () => {
    const seen = new Set();
    const uniqueList = state.playlist.filter(f => {
      // id가 다르더라도 title+artist가 같으면 중복으로 간주
      const key = (f.title || '') + '___' + (f.artist || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    loadPlaylist(uniqueList);
    setSelected(selected.filter(id => uniqueList.some(f => f.id === id)));
  };

  // 드래그 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // dnd-kit용 드래그 엔드 핸들러
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = dragList.findIndex((f) => f.id === active.id);
    const newIndex = dragList.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newList = arrayMove(dragList, oldIndex, newIndex);
    setDragList(newList);
    loadPlaylist(newList);
  };

  const getThumbnailUrl = (file: any) => file.thumbnailPath ? `/api/files/${file.id}/thumbnail` : '/placeholder.svg';

  // 정렬/필터 적용된 리스트
  const filteredList = dragList.filter(f => {
    if (!filter) return true;
    return (
      (f.title && f.title.toLowerCase().includes(filter.toLowerCase())) ||
      (f.artist && f.artist.toLowerCase().includes(filter.toLowerCase()))
    );
  });
  const sortedList = [...filteredList].sort((a, b) => {
    if (sortKey === 'title') return (a.title||'').localeCompare(b.title||'');
    if (sortKey === 'artist') return (a.artist||'').localeCompare(b.artist||'');
    return 0; // added순(기본)
  });

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-extrabold mb-8 flex items-center gap-3 text-primary drop-shadow-lg">
        <ListMusic className="w-8 h-8" /> 음악 플레이어
      </h1>
      {/* 플레이어 컨트롤 */}
      <div className="relative flex flex-col items-center justify-center mb-10">
        <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-purple-500/30 via-blue-400/20 to-pink-400/20 backdrop-blur-2xl shadow-2xl border border-white/10" style={{ minHeight: 220 }} />
        {/* 곡 추가 버튼 - 제목 위 우측 상단으로 이동 */}
        <div className="absolute top-0 right-0 md:top-4 md:right-8 z-20 flex justify-end w-full pr-2 md:pr-0">
          <Button variant="outline" size="sm" onClick={() => setShowAddMenu(!showAddMenu)} className="flex items-center gap-1 shadow-md">
            <Plus className="w-4 h-4" /> 곡 추가
          </Button>
          {showAddMenu && (
            <div className="absolute mt-2 right-0 bg-white dark:bg-gray-900 border rounded shadow-lg p-2 z-50 flex flex-col gap-2 min-w-[160px]">
              <Button variant="ghost" size="sm" onClick={() => { fetchFiles(); setShowFileDialog(true); setShowAddMenu(false); }} className="flex items-center gap-2"><Plus /> 단일 파일 추가</Button>
              <Button variant="ghost" size="sm" onClick={() => { fetchGroups(); setShowFolderDialog(true); setShowAddMenu(false); }} className="flex items-center gap-2"><FolderPlus /> 폴더 전체 추가</Button>
              <Button variant="ghost" size="sm" onClick={() => { fetchPlaylists(); setShowPlaylistDialog(true); setShowAddMenu(false); }} className="flex items-center gap-2"><ListMusic /> 플레이리스트에서 추가</Button>
            </div>
          )}
        </div>
        <div className="flex flex-col md:flex-row items-center gap-8 p-8">
          {/* 앨범아트 */}
          <div className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden shadow-lg border-4 border-white/30 bg-white/10 flex items-center justify-center">
            {state.currentFile ? (
              <Image src={getThumbnailUrl(state.currentFile)} width={160} height={160} alt="앨범아트" className="object-cover w-full h-full" />
            ) : (
              <ListMusic className="w-16 h-16 text-gray-300" />
            )}
          </div>
          {/* 곡 정보 및 컨트롤 */}
          <div className="flex-1 flex flex-col items-center md:items-start gap-4">
            <div className="text-center md:text-left">
              <div className="text-2xl font-bold text-white drop-shadow-sm truncate max-w-xs md:max-w-md">
                {state.currentFile ? state.currentFile.title : '재생 중인 곡 없음'}
              </div>
              <div className="text-lg text-blue-200 font-medium truncate max-w-xs md:max-w-md">
                {state.currentFile?.artist || '알 수 없는 아티스트'}
              </div>
              <div className="text-xs text-gray-200 mt-1">
                {state.currentFile?.fileType?.toUpperCase() || ''}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <Button variant="ghost" size="icon" onClick={toggleShuffle} className={state.shuffle ? 'text-green-400 scale-110' : 'text-gray-300 hover:text-white'} title="셔플">
                <Shuffle className="w-7 h-7" />
              </Button>
              <Button variant="ghost" size="icon" onClick={previous} className="text-gray-300 hover:text-white" title="이전 곡">
                <SkipBack className="w-9 h-9" />
              </Button>
              <Button variant="default" size="icon" onClick={state.isPlaying ? pause : play} className="bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg scale-125 hover:scale-135 transition-transform" title="재생/멈춤">
                {state.isPlaying ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={next} className="text-gray-300 hover:text-white" title="다음 곡">
                <SkipForward className="w-9 h-9" />
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleRepeat} className={state.repeat !== 'none' ? 'text-green-400 scale-110' : 'text-gray-300 hover:text-white'} title="반복">
                <Repeat className="w-7 h-7" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* 플레이리스트 목록 */}
      <div className="bg-white/70 dark:bg-black/60 rounded-3xl p-6 shadow-xl border border-white/10 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2 sm:gap-0">
          {/* <h2 className="text-xl font-bold text-gray-800 dark:text-white drop-shadow mb-2 sm:mb-0">플레이리스트</h2> */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <input type="text" placeholder="검색(제목/아티스트)" value={filter} onChange={e => setFilter(e.target.value)} className="px-2 py-1 rounded border text-sm bg-white/80 dark:bg-black/40" style={{width:120}} />
            <select value={sortKey} onChange={e => setSortKey(e.target.value as any)} className="px-2 py-1 rounded border text-sm bg-white/80 dark:bg-black/40">
              <option value="added">추가순</option>
              <option value="title">제목순</option>
              <option value="artist">아티스트순</option>
            </select>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>{selected.length === state.playlist.length ? '선택 해제' : '전체 선택'}</Button>
            <Button variant="destructive" size="sm" onClick={handleRemoveSelected} disabled={selected.length === 0}>선택 삭제</Button>
            <Button variant="destructive" size="sm" onClick={() => { loadPlaylist([]); setSelected([]); }}>전체 삭제</Button>
            <Button variant="secondary" size="sm" onClick={handleRemoveDuplicates}>중복 삭제</Button>
          </div>
        </div>
        {state.playlist.length === 0 ? (
          <div className="text-muted-foreground">플레이리스트에 곡이 없습니다.</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={dragList.map(f => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="divide-y divide-border">
                {sortedList.map((file, idx) => (
                  <SortableItem
                    key={file.id}
                    file={file}
                    idx={idx}
                    selected={selected}
                    handleSelect={handleSelect}
                    handleRemoveFile={handleRemoveFile}
                    getThumbnailUrl={getThumbnailUrl}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
      {/* 단일 파일 추가 다이얼로그 */}
      <Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
        <DialogContent style={{ zIndex: 9999, pointerEvents: 'auto' }}>
          <DialogHeader>
            <DialogTitle>단일 파일 추가</DialogTitle>
          </DialogHeader>
          {loading ? <div>로딩 중...</div> : (
            <ul className="max-h-60 overflow-y-auto divide-y">
              {fileList.length === 0 ? <li>파일이 없습니다.</li> : fileList.map(file => (
                <li key={file.id} tabIndex={0} className="flex items-center gap-2 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2" onClick={() => {console.log('파일 li 클릭:', file); handleAddFile(file);}}>
                  <Image src={getThumbnailUrl(file)} width={32} height={32} alt="썸네일" className="rounded" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{file.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{file.artist || '알 수 없는 아티스트'}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
      {/* 폴더(그룹) 전체 추가 다이얼로그 */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent style={{ zIndex: 9999, pointerEvents: 'auto' }}>
          <DialogHeader>
            <DialogTitle>폴더 전체 추가</DialogTitle>
          </DialogHeader>
          {loading ? <div>로딩 중...</div> : (
            <ul className="max-h-60 overflow-y-auto divide-y">
              {groupList.length === 0 ? <li>폴더가 없습니다.</li> : groupList.map(group => (
                <li key={(group.groupType||'')+'_'+(group.groupName||'')}
                    tabIndex={0}
                    className="flex items-center gap-2 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2"
                    onClick={() => {console.log('폴더 li 클릭:', group); handleAddGroup(group);}}>
                  <FolderPlus className="w-6 h-6 text-blue-400" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{group.groupName || group.name || '(이름없음)'}</div>
                    <div className="text-xs text-muted-foreground truncate">{group.files?.length || group.fileCount || 0}곡</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
      {/* 플레이리스트에서 추가 다이얼로그 */}
      <Dialog open={showPlaylistDialog} onOpenChange={setShowPlaylistDialog}>
        <DialogContent style={{ zIndex: 9999, pointerEvents: 'auto' }}>
          <DialogHeader>
            <DialogTitle>플레이리스트에서 추가</DialogTitle>
          </DialogHeader>
          {loading ? <div>로딩 중...</div> : (
            <ul className="max-h-60 overflow-y-auto divide-y">
              {playlistList.length === 0 ? <li>플레이리스트가 없습니다.</li> : playlistList.map(playlist => (
                <li key={playlist.id} tabIndex={0} className="flex items-center gap-2 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2" onClick={() => {console.log('플리 li 클릭:', playlist); handleAddPlaylist(playlist);}}>
                  <ListMusic className="w-6 h-6 text-purple-400" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{playlist.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{playlist.items?.length || 0}곡</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableItem({ file, idx, selected, handleSelect, handleRemoveFile, getThumbnailUrl }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: file.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    boxShadow: isDragging ? '0 4px 16px rgba(0,0,0,0.15)' : undefined,
    background: isDragging ? '#f3f4f6' : undefined,
  };
  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners} className={`flex items-center justify-between py-2 bg-white/5 rounded`}>
      <input type="checkbox" checked={selected.includes(file.id)} onChange={() => handleSelect(file.id)} className="mr-2" />
      <Image src={getThumbnailUrl(file)} width={40} height={40} alt="앨범아트" className="rounded mr-2 object-cover" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{file.title}</div>
        <div className="text-xs text-muted-foreground truncate">{file.artist || '알 수 없는 아티스트'}</div>
      </div>
      <Button variant="ghost" size="icon" onClick={() => handleRemoveFile(file.id)} title="삭제">
        <Trash2 className="w-4 h-4 text-red-500" />
      </Button>
    </li>
  );
} 