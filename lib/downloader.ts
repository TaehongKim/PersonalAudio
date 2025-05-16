import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from './prisma';
import { 
  emitDownloadStatusUpdate, 
  emitDownloadComplete, 
  emitDownloadError,
  emitPlaylistItemProgress,
  emitPlaylistItemComplete
} from './socket-server';
import { getBinaryPaths } from './utils/binary-installer';

// 바이너리 경로 가져오기
const { ytdlp: YTDLP_PATH, ffmpeg: FFMPEG_PATH } = getBinaryPaths();

// 미디어 파일 저장 경로
const MEDIA_STORAGE_PATH = process.env.MEDIA_STORAGE_PATH || './storage';

// 다운로드 작업 상태
export enum DownloadStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// 다운로드 타입
export enum DownloadType {
  MP3 = 'mp3',
  VIDEO = 'video720p',
  PLAYLIST_MP3 = 'playlist_mp3',
  PLAYLIST_VIDEO = 'playlist_video',
}

// 유튜브 정보 타입 정의
interface YoutubeInfo {
  id: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  [key: string]: any;
}

/**
 * 유틸리티 존재 여부 확인
 */
let ytdlpChecked = false;
let ffmpegChecked = false;
let ytdlpAvailable = false;
let ffmpegAvailable = false;

/**
 * yt-dlp 및 ffmpeg 존재 확인
 */
export async function checkUtilities() {
  if (!ytdlpChecked) {
    try {
      // yt-dlp 버전 확인
      const ytdlpProcess = spawn(YTDLP_PATH, ['--version']);
      await new Promise((resolve) => {
        ytdlpProcess.on('close', (code) => {
          ytdlpAvailable = code === 0;
          resolve(null);
        });
      });
    } catch (error) {
      console.error('yt-dlp 확인 오류:', error);
      ytdlpAvailable = false;
    } finally {
      ytdlpChecked = true;
    }
  }

  if (!ffmpegChecked) {
    try {
      // ffmpeg 버전 확인
      const ffmpegProcess = spawn(FFMPEG_PATH, ['-version']);
      await new Promise((resolve) => {
        ffmpegProcess.on('close', (code) => {
          ffmpegAvailable = code === 0;
          resolve(null);
        });
      });
    } catch (error) {
      console.error('ffmpeg 확인 오류:', error);
      ffmpegAvailable = false;
    } finally {
      ffmpegChecked = true;
    }
  }

  return {
    ytdlp: ytdlpAvailable,
    ffmpeg: ffmpegAvailable
  };
}

/**
 * 유튜브 URL 정보 가져오기
 */
export async function getYoutubeInfo(url: string): Promise<YoutubeInfo> {
  const { ytdlp } = await checkUtilities();
  
  return new Promise((resolve, reject) => {
    if (ytdlp) {
      const ytdlpProcess = spawn(YTDLP_PATH, [
        '--dump-json',
        url
      ]);

      let output = '';
      ytdlpProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      ytdlpProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const info: YoutubeInfo = JSON.parse(output);
            resolve(info);
          } catch (error) {
            reject(new Error('JSON 파싱 오류'));
          }
        } else {
          reject(new Error(`yt-dlp 프로세스가 코드 ${code}로 종료됨`));
        }
      });
    } else {
      // 개발용 더미 데이터
      setTimeout(() => {
        resolve({
          id: 'dummyId',
          title: '샘플 유튜브 영상',
          thumbnail: 'https://example.com/thumbnail.jpg',
          duration: 180, // 3분
          uploader: '샘플 업로더',
        });
      }, 500);
    }
  });
}

/**
 * 유튜브 플레이리스트 정보 가져오기
 */
export async function getPlaylistInfo(url: string): Promise<any> {
  const { ytdlp } = await checkUtilities();
  
  return new Promise((resolve, reject) => {
    if (ytdlp) {
      const ytdlpProcess = spawn(YTDLP_PATH, [
        '--dump-json',
        '--flat-playlist',
        url
      ]);

      let output = '';
      ytdlpProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      ytdlpProcess.on('close', (code) => {
        if (code === 0) {
          try {
            // 각 라인이 JSON 객체이므로 라인별로 파싱
            const entries = output.trim().split('\n').map(line => JSON.parse(line));
            
            // 플레이리스트 정보 생성
            const playlistInfo = {
              id: entries[0]?.playlist_id || 'unknown',
              title: entries[0]?.playlist_title || '알 수 없는 플레이리스트',
              uploader: entries[0]?.playlist_uploader || '알 수 없는 업로더',
              entries: entries,
              count: entries.length
            };
            
            resolve(playlistInfo);
          } catch (error) {
            reject(new Error('플레이리스트 JSON 파싱 오류'));
          }
        } else {
          reject(new Error(`yt-dlp 프로세스가 코드 ${code}로 종료됨`));
        }
      });
    } else {
      // 개발용 더미 데이터
      setTimeout(() => {
        const entries = Array.from({ length: 5 }, (_, index) => ({
          id: `dummy_video_${index + 1}`,
          title: `샘플 플레이리스트 영상 ${index + 1}`,
          uploader: '샘플 업로더',
          thumbnail: 'https://example.com/thumbnail.jpg',
          duration: 180 + index * 30, // 3~5분
          url: `https://youtube.com/watch?v=dummy_video_${index + 1}`,
        }));

        resolve({
          id: 'dummyPlaylistId',
          title: '샘플 플레이리스트',
          uploader: '샘플 채널',
          entries,
          count: entries.length
        });
      }, 800);
    }
  });
}

/**
 * URL이 플레이리스트인지 확인
 */
export function isPlaylistUrl(url: string): boolean {
  return url.includes('playlist?list=') || url.includes('&list=');
}

/**
 * 유튜브 MP3 다운로드
 */
export async function downloadYoutubeMp3(queueId: string, url: string) {
  try {
    // 작업 상태 업데이트
    await prisma.downloadQueue.update({
      where: { id: queueId },
      data: { status: DownloadStatus.PROCESSING, progress: 0 }
    });
    
    // 소켓 이벤트 발신
    emitDownloadStatusUpdate(queueId, DownloadStatus.PROCESSING, 0);

    // 스토리지 디렉토리 생성
    await fs.mkdir(MEDIA_STORAGE_PATH, { recursive: true });
    
    // 파일명 생성
    const timestamp = Date.now();
    const outputPath = path.join(MEDIA_STORAGE_PATH, `${timestamp}.mp3`);
    
    // 유틸리티 확인
    const { ytdlp, ffmpeg } = await checkUtilities();
    
    if (ytdlp && ffmpeg) {
      return new Promise((resolve, reject) => {
        const ytdlpProcess = spawn(YTDLP_PATH, [
          '-x',
          '--audio-format', 'mp3',
          '--audio-quality', '0',
          '-o', outputPath,
          '--ffmpeg-location', FFMPEG_PATH,
          url
        ]);
        
        let lastProgress = 0;
        
        ytdlpProcess.stdout.on('data', (data) => {
          // 진행률 파싱 로직 (yt-dlp 출력을 분석해 진행률 업데이트)
          const output = data.toString();
          const progressMatch = output.match(/(\d+\.?\d*)%/);
          if (progressMatch && progressMatch[1]) {
            const progress = parseInt(progressMatch[1], 10);
            if (progress > lastProgress) {
              lastProgress = progress;
              prisma.downloadQueue.update({
                where: { id: queueId },
                data: { progress }
              }).catch(console.error);
              
              // 소켓 이벤트 발신
              emitDownloadStatusUpdate(queueId, DownloadStatus.PROCESSING, progress);
            }
          }
        });
        
        ytdlpProcess.stderr.on('data', (data) => {
          console.log(`[yt-dlp stderr] ${data.toString()}`);
        });
        
        ytdlpProcess.on('close', async (code) => {
          if (code === 0) {
            try {
              // 다운로드 정보 가져오기
              const info: YoutubeInfo = await getYoutubeInfo(url);
              
              // 파일 정보 DB에 저장
              const fileInfo = await prisma.file.create({
                data: {
                  title: info.title || '제목 없음',
                  artist: info.uploader || '알 수 없는 아티스트',
                  fileType: 'mp3',
                  fileSize: (await fs.stat(outputPath)).size,
                  duration: info.duration || 0,
                  path: outputPath,
                  thumbnailPath: info.thumbnail || null,
                }
              });
              
              // 다운로드 완료 업데이트
              await prisma.downloadQueue.update({
                where: { id: queueId },
                data: {
                  status: DownloadStatus.COMPLETED,
                  progress: 100
                }
              });
              
              // 소켓 이벤트 발신
              emitDownloadStatusUpdate(queueId, DownloadStatus.COMPLETED, 100);
              emitDownloadComplete(queueId, fileInfo.id, fileInfo);
              
              resolve(fileInfo);
            } catch (error: any) {
              console.error('파일 정보 저장 오류:', error);
              
              await prisma.downloadQueue.update({
                where: { id: queueId },
                data: {
                  status: DownloadStatus.FAILED,
                  error: `파일 정보 저장 중 오류 발생: ${error.message || '알 수 없는 오류'}`
                }
              });
              
              emitDownloadStatusUpdate(queueId, DownloadStatus.FAILED, 0);
              emitDownloadError(queueId, `파일 정보 저장 중 오류 발생: ${error.message || '알 수 없는 오류'}`);
              
              reject(error);
            }
          } else {
            const errorMessage = `다운로드 실패: yt-dlp가 코드 ${code}로 종료됨`;
            
            await prisma.downloadQueue.update({
              where: { id: queueId },
              data: {
                status: DownloadStatus.FAILED,
                error: errorMessage
              }
            });
            
            emitDownloadStatusUpdate(queueId, DownloadStatus.FAILED, 0);
            emitDownloadError(queueId, errorMessage);
            
            reject(new Error(errorMessage));
          }
        });
      });
    } else {
      // 필요한 유틸리티가 없는 경우
      const missingUtils = [];
      if (!ytdlp) missingUtils.push('yt-dlp');
      if (!ffmpeg) missingUtils.push('ffmpeg');
      
      const errorMessage = `다운로드 실패: 필요한 유틸리티가 없습니다 (${missingUtils.join(', ')})`;
      
      await prisma.downloadQueue.update({
        where: { id: queueId },
        data: {
          status: DownloadStatus.FAILED,
          error: errorMessage
        }
      });
      
      emitDownloadStatusUpdate(queueId, DownloadStatus.FAILED, 0);
      emitDownloadError(queueId, errorMessage);
      
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    console.error('MP3 다운로드 실패:', error);
    
    // 오류 상태 업데이트
    await prisma.downloadQueue.update({
      where: { id: queueId },
      data: {
        status: DownloadStatus.FAILED,
        error: error.message || '알 수 없는 오류'
      }
    });
    
    emitDownloadStatusUpdate(queueId, DownloadStatus.FAILED, 0);
    emitDownloadError(queueId, error.message || '알 수 없는 오류');
    
    throw error;
  }
}

/**
 * 유튜브 720p 비디오 다운로드
 */
export async function downloadYoutubeVideo(queueId: string, url: string) {
  try {
    // 작업 상태 업데이트
    await prisma.downloadQueue.update({
      where: { id: queueId },
      data: { status: DownloadStatus.PROCESSING, progress: 0 }
    });
    
    // 소켓 이벤트 발신
    emitDownloadStatusUpdate(queueId, DownloadStatus.PROCESSING, 0);

    // 스토리지 디렉토리 생성
    await fs.mkdir(MEDIA_STORAGE_PATH, { recursive: true });
    
    // 파일명 생성
    const timestamp = Date.now();
    const outputPath = path.join(MEDIA_STORAGE_PATH, `${timestamp}.mp4`);
    
    // 유틸리티 확인
    const { ytdlp } = await checkUtilities();
    
    if (ytdlp) {
      return new Promise((resolve, reject) => {
        const ytdlpProcess = spawn(YTDLP_PATH, [
          '-f', 'bestvideo[height<=720]+bestaudio/best[height<=720]',
          '-o', outputPath,
          url
        ]);
        
        ytdlpProcess.stdout.on('data', (data) => {
          // 진행률 파싱 로직
          const output = data.toString();
          const progressMatch = output.match(/(\d+\.?\d*)%/);
          if (progressMatch && progressMatch[1]) {
            const progress = parseInt(progressMatch[1], 10);
            prisma.downloadQueue.update({
              where: { id: queueId },
              data: { progress }
            }).catch(console.error);
            
            // 소켓 이벤트 발신
            emitDownloadStatusUpdate(queueId, DownloadStatus.PROCESSING, progress);
          }
        });
        
        ytdlpProcess.stderr.on('data', (data) => {
          console.log('yt-dlp 오류 출력:', data.toString());
        });
        
        ytdlpProcess.on('close', async (code) => {
          if (code === 0) {
            // 파일 정보 가져오기
            const info = await getYoutubeInfo(url) as any;
            
            // 파일 DB에 저장
            const file = await prisma.file.create({
              data: {
                title: info.title || '알 수 없는 제목',
                artist: info.uploader || '알 수 없는 아티스트',
                fileType: 'MP4',
                fileSize: (await fs.stat(outputPath)).size,
                duration: info.duration || 0,
                path: outputPath,
                thumbnailPath: info.thumbnail || null,
              }
            });
            
            // 작업 완료 상태 업데이트
            await prisma.downloadQueue.update({
              where: { id: queueId },
              data: { status: DownloadStatus.COMPLETED, progress: 100 }
            });
            
            // 소켓 이벤트 발신
            emitDownloadComplete(queueId, file.id, file);
            
            resolve(file);
          } else {
            // 작업 실패 상태 업데이트
            await prisma.downloadQueue.update({
              where: { id: queueId },
              data: { 
                status: DownloadStatus.FAILED, 
                error: `yt-dlp 프로세스가 코드 ${code}로 종료됨` 
              }
            });
            
            // 소켓 이벤트 발신
            emitDownloadError(queueId, `yt-dlp 프로세스가 코드 ${code}로 종료됨`);
            
            reject(new Error(`yt-dlp 프로세스가 코드 ${code}로 종료됨`));
          }
        });
      });
    } else {
      // 개발용 더미 구현 (실제 다운로드 없이 성공한 것처럼 처리)
      console.log('yt-dlp가 없어 더미 구현으로 작동합니다.');
      
      return new Promise((resolve) => {
        let progress = 0;
        
        // 진행률 시뮬레이션
        const interval = setInterval(async () => {
          progress += 5;
          
          await prisma.downloadQueue.update({
            where: { id: queueId },
            data: { progress }
          });
          
          // 소켓 이벤트 발신
          emitDownloadStatusUpdate(queueId, DownloadStatus.PROCESSING, progress);
          
          if (progress >= 100) {
            clearInterval(interval);
            
            // 더미 파일 생성
            await fs.writeFile(outputPath, 'Dummy MP4 file');
            
            // 파일 정보 가져오기
            const info = await getYoutubeInfo(url) as any;
            
            // 파일 DB에 저장
            const file = await prisma.file.create({
              data: {
                title: info.title || '알 수 없는 제목',
                artist: info.uploader || '알 수 없는 아티스트',
                fileType: 'MP4',
                fileSize: 10 * 1024 * 1024, // 10MB 더미 크기
                duration: info.duration || 0,
                path: outputPath,
                thumbnailPath: info.thumbnail || null,
              }
            });
            
            // 작업 완료 상태 업데이트
            await prisma.downloadQueue.update({
              where: { id: queueId },
              data: { status: DownloadStatus.COMPLETED, progress: 100 }
            });
            
            // 소켓 이벤트 발신
            emitDownloadComplete(queueId, file.id, file);
            
            resolve(file);
          }
        }, 500);
      });
    }
  } catch (error) {
    console.error('비디오 다운로드 오류:', error);
    
    // 작업 실패 상태 업데이트
    await prisma.downloadQueue.update({
      where: { id: queueId },
      data: { 
        status: DownloadStatus.FAILED, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      }
    });
    
    // 소켓 이벤트 발신
    emitDownloadError(queueId, error instanceof Error ? error.message : '알 수 없는 오류');
    
    throw error;
  }
}

/**
 * 유튜브 플레이리스트 MP3 다운로드
 */
export async function downloadPlaylistMp3(queueId: string, url: string) {
  try {
    // 작업 상태 업데이트
    await prisma.downloadQueue.update({
      where: { id: queueId },
      data: { status: DownloadStatus.PROCESSING, progress: 0 }
    });
    
    // 소켓 이벤트 발신
    emitDownloadStatusUpdate(queueId, DownloadStatus.PROCESSING, 0);

    // 플레이리스트 정보 가져오기
    const playlistInfo = await getPlaylistInfo(url) as any;
    const { entries } = playlistInfo;
    
    if (!entries || entries.length === 0) {
      throw new Error('플레이리스트가 비어있거나 항목을 가져올 수 없습니다.');
    }
    
    // 플레이리스트 폴더 생성
    const timestamp = Date.now();
    const playlistFolder = path.join(MEDIA_STORAGE_PATH, `playlist_${timestamp}`);
    await fs.mkdir(playlistFolder, { recursive: true });
    
    const totalItems = entries.length;
    let completedItems = 0;
    const files = [];
    
    // 유틸리티 확인
    const { ytdlp, ffmpeg } = await checkUtilities();
    
    // 각 항목 개별 다운로드
    for (const [index, entry] of entries.entries()) {
      const itemUrl = entry.url || `https://youtube.com/watch?v=${entry.id}`;
      const itemOutputPath = path.join(playlistFolder, `${index + 1}_${timestamp}.mp3`);
      
      try {
        // 진행률 업데이트
        const entryProgress = Math.floor((index / totalItems) * 100);
        await prisma.downloadQueue.update({
          where: { id: queueId },
          data: { progress: entryProgress }
        });
        
        // 소켓 이벤트 발신
        emitDownloadStatusUpdate(queueId, DownloadStatus.PROCESSING, entryProgress);
        emitPlaylistItemProgress(queueId, index, totalItems, entry.title, 0);
        
        if (ytdlp && ffmpeg) {
          await new Promise((resolve, reject) => {
            const ytdlpProcess = spawn(YTDLP_PATH, [
              '-x',
              '--audio-format', 'mp3',
              '--audio-quality', '0',
              '-o', itemOutputPath,
              '--ffmpeg-location', FFMPEG_PATH,
              itemUrl
            ]);
            
            ytdlpProcess.stdout.on('data', (data) => {
              // 진행률 파싱 로직
              const output = data.toString();
              const progressMatch = output.match(/(\d+\.?\d*)%/);
              if (progressMatch && progressMatch[1]) {
                const itemProgress = parseInt(progressMatch[1], 10);
                // 항목 진행률 이벤트 발신
                emitPlaylistItemProgress(queueId, index, totalItems, entry.title, itemProgress);
              }
            });
            
            ytdlpProcess.stderr.on('data', (data) => {
              console.log(`항목 ${index + 1} 오류 출력:`, data.toString());
            });
            
            ytdlpProcess.on('close', (code) => {
              if (code === 0) {
                resolve(null);
              } else {
                reject(new Error(`항목 다운로드 실패 (${index + 1}/${totalItems}): 코드 ${code}`));
              }
            });
          });
        } else {
          // 개발용 더미 구현
          console.log(`항목 ${index + 1} 다운로드 중 (더미 구현)`);
          await new Promise(resolve => {
            let itemProgress = 0;
            const itemInterval = setInterval(() => {
              itemProgress += 20;
              // 항목 진행률 이벤트 발신
              emitPlaylistItemProgress(queueId, index, totalItems, entry.title, itemProgress);
              if (itemProgress >= 100) {
                clearInterval(itemInterval);
                resolve(null);
              }
            }, 300);
          });
          
          await fs.writeFile(itemOutputPath, `Dummy MP3 file for ${entry.title}`);
        }
        
        // 파일 DB에 저장
        const file = await prisma.file.create({
          data: {
            title: entry.title || `플레이리스트 항목 #${index + 1}`,
            artist: entry.uploader || playlistInfo.uploader || '알 수 없는 아티스트',
            fileType: 'MP3',
            fileSize: ytdlp && ffmpeg 
              ? (await fs.stat(itemOutputPath)).size 
              : 1024 * 1024, // 더미 크기
            duration: entry.duration || 0,
            path: itemOutputPath,
            thumbnailPath: entry.thumbnail || null,
          }
        });
        
        // 항목 완료 이벤트 발신
        emitPlaylistItemComplete(queueId, index, totalItems, file.id, file);
        
        files.push(file);
        completedItems++;
        
      } catch (itemError) {
        console.error(`항목 다운로드 오류 (${index + 1}/${totalItems}):`, itemError);
        // 항목 오류 이벤트 발신
        emitDownloadError(queueId, `항목 다운로드 오류 (${index + 1}/${totalItems}): ${itemError instanceof Error ? itemError.message : '알 수 없는 오류'}`);
        // 개별 항목 오류는 기록하되 계속 진행
      }
    }
    
    // 작업 완료 상태 업데이트
    await prisma.downloadQueue.update({
      where: { id: queueId },
      data: {
        status: DownloadStatus.COMPLETED,
        progress: 100,
        error: completedItems < totalItems
          ? `${totalItems}개 중 ${completedItems}개 항목만 성공적으로 다운로드됨`
          : null
      }
    });
    
    // 소켓 이벤트 발신
    emitDownloadStatusUpdate(queueId, DownloadStatus.COMPLETED, 100, {
      totalItems,
      completedItems,
      files: files.map(f => f.id)
    });
    
    return files;
    
  } catch (error) {
    console.error('플레이리스트 MP3 다운로드 오류:', error);
    
    // 작업 실패 상태 업데이트
    await prisma.downloadQueue.update({
      where: { id: queueId },
      data: { 
        status: DownloadStatus.FAILED, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      }
    });
    
    // 소켓 이벤트 발신
    emitDownloadError(queueId, error instanceof Error ? error.message : '알 수 없는 오류');
    
    throw error;
  }
}

/**
 * 유튜브 플레이리스트 비디오 다운로드
 */
export async function downloadPlaylistVideo(queueId: string, url: string) {
  try {
    // 작업 상태 업데이트
    await prisma.downloadQueue.update({
      where: { id: queueId },
      data: { status: DownloadStatus.PROCESSING, progress: 0 }
    });
    
    // 소켓 이벤트 발신
    emitDownloadStatusUpdate(queueId, DownloadStatus.PROCESSING, 0);

    // 플레이리스트 정보 가져오기
    const playlistInfo = await getPlaylistInfo(url) as any;
    const { entries } = playlistInfo;
    
    if (!entries || entries.length === 0) {
      throw new Error('플레이리스트가 비어있거나 항목을 가져올 수 없습니다.');
    }
    
    // 플레이리스트 폴더 생성
    const timestamp = Date.now();
    const playlistFolder = path.join(MEDIA_STORAGE_PATH, `playlist_video_${timestamp}`);
    await fs.mkdir(playlistFolder, { recursive: true });
    
    const totalItems = entries.length;
    let completedItems = 0;
    const files = [];
    
    // 유틸리티 확인
    const { ytdlp } = await checkUtilities();
    
    // 각 항목 개별 다운로드
    for (const [index, entry] of entries.entries()) {
      const itemUrl = entry.url || `https://youtube.com/watch?v=${entry.id}`;
      const itemOutputPath = path.join(playlistFolder, `${index + 1}_${timestamp}.mp4`);
      
      try {
        // 진행률 업데이트
        const entryProgress = Math.floor((index / totalItems) * 100);
        await prisma.downloadQueue.update({
          where: { id: queueId },
          data: { progress: entryProgress }
        });
        
        // 소켓 이벤트 발신
        emitDownloadStatusUpdate(queueId, DownloadStatus.PROCESSING, entryProgress);
        emitPlaylistItemProgress(queueId, index, totalItems, entry.title, 0);
        
        if (ytdlp) {
          await new Promise((resolve, reject) => {
            const ytdlpProcess = spawn(YTDLP_PATH, [
              '-f', 'bestvideo[height<=720]+bestaudio/best[height<=720]',
              '-o', itemOutputPath,
              '--ffmpeg-location', FFMPEG_PATH,
              itemUrl
            ]);
            
            ytdlpProcess.stdout.on('data', (data) => {
              // 진행률 파싱 로직
              const output = data.toString();
              const progressMatch = output.match(/(\d+\.?\d*)%/);
              if (progressMatch && progressMatch[1]) {
                const itemProgress = parseInt(progressMatch[1], 10);
                // 항목 진행률 이벤트 발신
                emitPlaylistItemProgress(queueId, index, totalItems, entry.title, itemProgress);
              }
            });
            
            ytdlpProcess.stderr.on('data', (data) => {
              console.log(`항목 ${index + 1} 오류 출력:`, data.toString());
            });
            
            ytdlpProcess.on('close', (code) => {
              if (code === 0) {
                resolve(null);
              } else {
                reject(new Error(`항목 다운로드 실패 (${index + 1}/${totalItems}): 코드 ${code}`));
              }
            });
          });
        } else {
          // 개발용 더미 구현
          console.log(`항목 ${index + 1} 비디오 다운로드 중 (더미 구현)`);
          await new Promise(resolve => {
            let itemProgress = 0;
            const itemInterval = setInterval(() => {
              itemProgress += 20;
              // 항목 진행률 이벤트 발신
              emitPlaylistItemProgress(queueId, index, totalItems, entry.title, itemProgress);
              if (itemProgress >= 100) {
                clearInterval(itemInterval);
                resolve(null);
              }
            }, 400);
          });
          
          await fs.writeFile(itemOutputPath, `Dummy MP4 file for ${entry.title}`);
        }
        
        // 파일 DB에 저장
        const file = await prisma.file.create({
          data: {
            title: entry.title || `플레이리스트 항목 #${index + 1}`,
            artist: entry.uploader || playlistInfo.uploader || '알 수 없는 아티스트',
            fileType: 'MP4',
            fileSize: ytdlp 
              ? (await fs.stat(itemOutputPath)).size 
              : 10 * 1024 * 1024, // 더미 크기
            duration: entry.duration || 0,
            path: itemOutputPath,
            thumbnailPath: entry.thumbnail || null,
          }
        });
        
        // 항목 완료 이벤트 발신
        emitPlaylistItemComplete(queueId, index, totalItems, file.id, file);
        
        files.push(file);
        completedItems++;
        
      } catch (itemError) {
        console.error(`항목 다운로드 오류 (${index + 1}/${totalItems}):`, itemError);
        // 항목 오류 이벤트 발신
        emitDownloadError(queueId, `항목 다운로드 오류 (${index + 1}/${totalItems}): ${itemError instanceof Error ? itemError.message : '알 수 없는 오류'}`);
        // 개별 항목 오류는 기록하되 계속 진행
      }
    }
    
    // 작업 완료 상태 업데이트
    await prisma.downloadQueue.update({
      where: { id: queueId },
      data: {
        status: DownloadStatus.COMPLETED,
        progress: 100,
        error: completedItems < totalItems
          ? `${totalItems}개 중 ${completedItems}개 항목만 성공적으로 다운로드됨`
          : null
      }
    });
    
    // 소켓 이벤트 발신
    emitDownloadStatusUpdate(queueId, DownloadStatus.COMPLETED, 100, {
      totalItems,
      completedItems,
      files: files.map(f => f.id)
    });
    
    return files;
    
  } catch (error) {
    console.error('플레이리스트 비디오 다운로드 오류:', error);
    
    // 작업 실패 상태 업데이트
    await prisma.downloadQueue.update({
      where: { id: queueId },
      data: { 
        status: DownloadStatus.FAILED, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      }
    });
    
    // 소켓 이벤트 발신
    emitDownloadError(queueId, error instanceof Error ? error.message : '알 수 없는 오류');
    
    throw error;
  }
} 