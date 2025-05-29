import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { prisma } from './prisma';
import { 
  emitDownloadStatusUpdate, 
  emitDownloadComplete, 
  emitDownloadError,
  emitPlaylistItemProgress,
  emitPlaylistItemComplete
} from './socket-server';
import { getBinaryPaths } from './utils/binary-installer';
import https from 'https';
import http from 'http';
import url from 'url';

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

// 파일 그룹 타입
export enum FileGroupType {
  YOUTUBE_SINGLE = 'youtube_single',
  YOUTUBE_PLAYLIST = 'youtube_playlist',
  MELON_CHART = 'melon_chart',
}

// 그룹 정보 인터페이스
interface FileGroup {
  id: string;
  type: FileGroupType;
  name: string;
  folderPath: string;
  createdAt: Date;
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

// 유튜브 플레이리스트 정보 타입 정의
interface YoutubePlaylistInfo {
  id: string;
  title: string;
  uploader?: string;
  entries: Array<YoutubeInfo & { url?: string }>;
  count: number;
}

/**
 * 파일명에서 안전하지 않은 문자 제거
 */
function sanitizeFileName(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '') // 윈도우 금지 문자
    .replace(/[^\x00-\x7F]/g, (char) => char) // 유니코드 유지
    .trim()
    .substring(0, 200); // 길이 제한
}

/**
 * 이미지 URL에서 파일 다운로드
 */
async function downloadImage(imageUrl: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(imageUrl);
    const httpModule = parsedUrl.protocol === 'https:' ? https : http;
    
    httpModule.get(imageUrl, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fsSync.createWriteStream(outputPath);
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
        
        fileStream.on('error', (err: Error) => {
          fsSync.unlink(outputPath, () => {}); // 실패 시 파일 삭제
          reject(err);
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // 리디렉션 처리
        if (response.headers.location) {
          downloadImage(response.headers.location, outputPath)
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error('Redirect without location'));
        }
      } else {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
      }
    }).on('error', (err: Error) => {
      reject(err);
    });
  });
}

/**
 * ffmpeg를 사용하여 MP3에 앨범아트 추가
 */
async function addAlbumArtToMp3(
  audioPath: string, 
  imagePath: string, 
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegProcess = spawn(FFMPEG_PATH, [
      '-i', audioPath,        // 입력 오디오 파일
      '-i', imagePath,        // 입력 이미지 파일
      '-map', '0:0',          // 첫 번째 파일의 오디오 스트림
      '-map', '1:0',          // 두 번째 파일의 이미지 스트림
      '-c', 'copy',           // 오디오 코덱 복사 (재인코딩 없음)
      '-id3v2_version', '3',  // ID3v2.3 사용
      '-metadata:s:v', 'title="Album cover"',
      '-metadata:s:v', 'comment="Cover (front)"',
      '-y',                   // 덮어쓰기 허용
      outputPath
    ]);
    
    ffmpegProcess.stderr.on('data', (data) => {
      console.log(`[ffmpeg album art] ${data.toString()}`);
    });
    
    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg failed with code ${code}`));
      }
    });
    
    ffmpegProcess.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 날짜 기반 폴더명 생성 (YYYYMMDD)
 */
function getDateFolderName(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * 그룹별 폴더 경로 생성
 */
function createGroupFolder(type: FileGroupType, groupName: string): string {
  const sanitizedName = sanitizeFileName(groupName);
  const basePath = MEDIA_STORAGE_PATH;
  
  switch (type) {
    case FileGroupType.YOUTUBE_SINGLE:
      return path.join(basePath, 'youtube', getDateFolderName());
    case FileGroupType.YOUTUBE_PLAYLIST:
      return path.join(basePath, 'playlists', sanitizedName);
    case FileGroupType.MELON_CHART:
      return path.join(basePath, 'melon', `${getDateFolderName()}_${sanitizedName}`);
    default:
      return path.join(basePath, 'others');
  }
}

/**
 * 파일명 생성 (그룹 타입에 따라)
 */
function generateFileName(
  type: FileGroupType, 
  originalTitle: string, 
  extension: string, 
  rank?: number
): string {
  const sanitizedTitle = sanitizeFileName(originalTitle);
  
  switch (type) {
    case FileGroupType.YOUTUBE_SINGLE:
    case FileGroupType.YOUTUBE_PLAYLIST:
      return `${sanitizedTitle}.${extension}`;
    case FileGroupType.MELON_CHART:
      return rank ? `${rank}_${sanitizedTitle}.${extension}` : `${sanitizedTitle}.${extension}`;
    default:
      return `${sanitizedTitle}.${extension}`;
  }
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
export async function getPlaylistInfo(url: string): Promise<YoutubePlaylistInfo> {
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
            const playlistInfo: YoutubePlaylistInfo = {
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
export async function downloadYoutubeMp3(queueId: string, url: string, options: any = {}) {
  try {
    // 작업 상태 업데이트
    await prisma.downloadQueue.update({
      where: { id: queueId },
      data: { status: DownloadStatus.PROCESSING, progress: 0 }
    });
    
    // 소켓 이벤트 발신
    emitDownloadStatusUpdate(queueId, DownloadStatus.PROCESSING, 0);

    // 동영상 정보 먼저 가져오기
    const info: YoutubeInfo = await getYoutubeInfo(url);
    
    // 멜론차트 여부에 따라 그룹 타입 결정
    const isMelonChart = options.isMelonChart || false;
    const groupType = isMelonChart ? FileGroupType.MELON_CHART : FileGroupType.YOUTUBE_SINGLE;
    const groupName = isMelonChart ? `TOP${options.chartSize || 30}` : 'single';
    
    // 그룹 폴더 생성
    const groupFolder = createGroupFolder(groupType, groupName);
    await fs.mkdir(groupFolder, { recursive: true });
    
    // 파일명 생성 (멜론차트는 순위 포함)
    const fileName = generateFileName(groupType, info.title, 'mp3', options.rank);
    const outputPath = path.join(groupFolder, fileName);
    
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
              let coverImagePath: string | null = null;
              
              // 멜론차트에서 커버 이미지 처리
              if (isMelonChart && options.coverUrl) {
                try {
                  // 커버 이미지 다운로드
                  const imageExtension = options.coverUrl.includes('.jpg') ? 'jpg' : 'png';
                  coverImagePath = path.join(groupFolder, `cover_${Date.now()}.${imageExtension}`);
                  
                  await downloadImage(options.coverUrl, coverImagePath);
                  
                  // 앨범아트가 포함된 새 파일 생성
                  const tempOutputPath = path.join(groupFolder, `temp_${fileName}`);
                  await addAlbumArtToMp3(outputPath, coverImagePath, tempOutputPath);
                  
                  // 원본 파일 삭제하고 새 파일로 교체
                  await fs.unlink(outputPath);
                  await fs.rename(tempOutputPath, outputPath);
                  
                  console.log(`[Melon Chart] 앨범아트가 포함된 MP3 생성 완료: ${fileName}`);
                } catch (imageError) {
                  console.error('앨범아트 처리 오류:', imageError);
                  // 이미지 처리 실패해도 원본 MP3는 유지
                }
              }
              
              // 파일 정보 DB에 저장
              const fileInfo = await prisma.file.create({
                data: {
                  title: info.title || '제목 없음',
                  artist: info.uploader || '알 수 없는 아티스트',
                  fileType: 'mp3',
                  fileSize: (await fs.stat(outputPath)).size,
                  duration: info.duration || 0,
                  path: outputPath,
                  thumbnailPath: coverImagePath || info.thumbnail || null,
                  groupType: groupType,
                  groupName: groupName,
                  rank: options.rank || null,
                }
              });
              
              // 커버 이미지 파일은 썸네일로 사용하기 위해 유지
              // (삭제하지 않음)
              
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
export async function downloadYoutubeVideo(queueId: string, url: string, options: any = {}) {
  try {
    // 작업 상태 업데이트
    await prisma.downloadQueue.update({
      where: { id: queueId },
      data: { status: DownloadStatus.PROCESSING, progress: 0 }
    });
    
    // 소켓 이벤트 발신
    emitDownloadStatusUpdate(queueId, DownloadStatus.PROCESSING, 0);

    // 동영상 정보 먼저 가져오기
    const info: YoutubeInfo = await getYoutubeInfo(url);
    
    // 멜론차트 여부에 따라 그룹 타입 결정  
    const isMelonChart = options.isMelonChart || false;
    const groupType = isMelonChart ? FileGroupType.MELON_CHART : FileGroupType.YOUTUBE_SINGLE;
    const groupName = isMelonChart ? `TOP${options.chartSize || 30}` : 'single';
    
    // 그룹 폴더 생성
    const groupFolder = createGroupFolder(groupType, groupName);
    await fs.mkdir(groupFolder, { recursive: true });
    
    // 파일명 생성 (멜론차트는 순위 포함)
    const fileName = generateFileName(groupType, info.title, 'mp4', options.rank);
    const outputPath = path.join(groupFolder, fileName);
    
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
                groupType: groupType,
                groupName: groupName,
                rank: options.rank || null,
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
            const info: YoutubeInfo = await getYoutubeInfo(url);
            
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
    const playlistInfo: YoutubePlaylistInfo = await getPlaylistInfo(url);
    const { entries } = playlistInfo;
    
    if (!entries || entries.length === 0) {
      throw new Error('플레이리스트가 비어있거나 항목을 가져올 수 없습니다.');
    }
    
    // 플레이리스트 그룹 폴더 생성
    const playlistFolder = createGroupFolder(FileGroupType.YOUTUBE_PLAYLIST, playlistInfo.title);
    await fs.mkdir(playlistFolder, { recursive: true });
    
    const totalItems = entries.length;
    let completedItems = 0;
    const files = [];
    
    // 유틸리티 확인
    const { ytdlp, ffmpeg } = await checkUtilities();
    
    // 각 항목 개별 다운로드
    for (const [index, entry] of entries.entries()) {
      const itemUrl = entry.url || `https://youtube.com/watch?v=${entry.id}`;
      const fileName = generateFileName(FileGroupType.YOUTUBE_PLAYLIST, entry.title, 'mp3');
      const itemOutputPath = path.join(playlistFolder, fileName);
      
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
            groupType: FileGroupType.YOUTUBE_PLAYLIST,
            groupName: playlistInfo.title,
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
    const playlistInfo: YoutubePlaylistInfo = await getPlaylistInfo(url);
    const { entries } = playlistInfo;
    
    if (!entries || entries.length === 0) {
      throw new Error('플레이리스트가 비어있거나 항목을 가져올 수 없습니다.');
    }
    
    // 플레이리스트 그룹 폴더 생성
    const playlistFolder = createGroupFolder(FileGroupType.YOUTUBE_PLAYLIST, playlistInfo.title);
    await fs.mkdir(playlistFolder, { recursive: true });
    
    const totalItems = entries.length;
    let completedItems = 0;
    const files = [];
    
    // 유틸리티 확인
    const { ytdlp } = await checkUtilities();
    
    // 각 항목 개별 다운로드
    for (const [index, entry] of entries.entries()) {
      const itemUrl = entry.url || `https://youtube.com/watch?v=${entry.id}`;
      const fileName = generateFileName(FileGroupType.YOUTUBE_PLAYLIST, entry.title, 'mp4');
      const itemOutputPath = path.join(playlistFolder, fileName);
      
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