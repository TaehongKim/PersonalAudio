import { spawn, execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createWriteStream } from 'fs';
// import { pipeline } from 'stream/promises';
import https from 'https';
import http from 'http';

// 바이너리 저장 경로
const BIN_PATH = path.join(process.cwd(), 'bin');
const YTDLP_PATH = path.join(BIN_PATH, os.platform() === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const FFMPEG_PATH = path.join(BIN_PATH, os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
const FFPROBE_PATH = path.join(BIN_PATH, os.platform() === 'win32' ? 'ffprobe.exe' : 'ffprobe');

/**
 * 운영체제 플랫폼 확인
 */
function getPlatform(): 'win32' | 'linux' | 'unsupported' {
  const platform = os.platform();
  if (platform === 'win32') return 'win32';
  if (platform === 'linux') return 'linux';
  
  console.warn(`지원되지 않는 플랫폼: ${platform}`);
  return 'unsupported';
}

/**
 * yt-dlp 다운로드 URL 가져오기
 */
function getYtdlpUrl(): string {
  const platform = getPlatform();
  if (platform === 'win32') {
    return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
  } else if (platform === 'linux') {
    return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  }
  throw new Error('지원되지 않는 플랫폼입니다.');
}

/**
 * 파일 다운로드 함수
 */
async function downloadFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const fileStream = createWriteStream(outputPath);
    const protocol = url.startsWith('https:') ? https : http;
    
    const request = protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`다운로드 실패: HTTP 상태 코드 ${response.statusCode}`));
        return;
      }
      
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    });
    
    request.on('error', (err) => {
      fs.unlink(outputPath).catch(() => {}); // 실패 시 파일 삭제 시도
      reject(err);
    });
    
    fileStream.on('error', (err) => {
      fs.unlink(outputPath).catch(() => {}); // 실패 시 파일 삭제 시도
      reject(err);
    });
  });
}

/**
 * 바이너리 실행 권한 설정 (Linux)
 */
async function makeExecutable(filePath: string): Promise<void> {
  if (os.platform() !== 'win32') {
    await fs.chmod(filePath, 0o755); // 실행 권한 추가
  }
}

/**
 * yt-dlp 설치
 */
async function installYtdlp(): Promise<void> {
  try {
    // bin 디렉토리 생성
    await fs.mkdir(BIN_PATH, { recursive: true });
    
    // yt-dlp 다운로드
    const url = getYtdlpUrl();
    console.log(`yt-dlp 다운로드 중: ${url}`);
    await downloadFile(url, YTDLP_PATH);
    
    // 실행 권한 설정
    await makeExecutable(YTDLP_PATH);
    
    console.log('yt-dlp 설치 완료');
  } catch (error) {
    console.error('yt-dlp 설치 오류:', error);
    throw error;
  }
}

/**
 * ffmpeg 및 ffprobe 설치 (OS별 분기)
 */
async function installFfmpeg(): Promise<void> {
  try {
    // bin 디렉토리 생성
    await fs.mkdir(BIN_PATH, { recursive: true });
    
    const platform = getPlatform();
    console.log(`OS 플랫폼: ${platform}`);
    
    if (platform === 'win32') {
      console.log('Windows용 ffmpeg 설치 시작...');
      await installFfmpegWindows();
    } else if (platform === 'linux') {
      console.log('Linux용 ffmpeg 설치 시작...');
      await installFfmpegLinux();
    } else {
      throw new Error('지원되지 않는 플랫폼입니다.');
    }
  } catch (error) {
    console.error('ffmpeg 설치 오류:', error);
    throw error;
  }
}

/**
 * Windows용 ffmpeg 설치
 */
async function installFfmpegWindows(): Promise<void> {
  try {
    // Windows용 ffmpeg 정적 빌드 다운로드
    const ffmpegUrl = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
    const zipPath = path.join(BIN_PATH, 'ffmpeg.zip');
    
    console.log('ffmpeg Windows 버전 다운로드 중...');
    await downloadFile(ffmpegUrl, zipPath);
    
    // 압축 해제 (PowerShell 사용)
    console.log('ffmpeg 압축 해제 중...');
    const extractCmd = `powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${BIN_PATH}' -Force"`;
    execSync(extractCmd);
    
    // 파일 이동
    const extractedDir = path.join(BIN_PATH, 'ffmpeg-master-latest-win64-gpl', 'bin');
    await fs.copyFile(path.join(extractedDir, 'ffmpeg.exe'), FFMPEG_PATH);
    await fs.copyFile(path.join(extractedDir, 'ffprobe.exe'), FFPROBE_PATH);
    
    // 임시 파일 정리
    await fs.rm(zipPath, { force: true });
    await fs.rm(path.join(BIN_PATH, 'ffmpeg-master-latest-win64-gpl'), { recursive: true, force: true });
    
    console.log('ffmpeg Windows 버전 설치 완료');
  } catch (error) {
    console.error('ffmpeg Windows 설치 오류:', error);
    throw error;
  }
}

/**
 * Linux용 ffmpeg 설치
 */
async function installFfmpegLinux(): Promise<void> {
  try {
    // Ubuntu에서는 apt를 통해 설치
    console.log('ffmpeg Linux 버전 설치 중...');
    execSync('apt-get update && apt-get install -y ffmpeg');
    
    // 시스템에 설치된 ffmpeg 및 ffprobe 연결 생성
    const ffmpegSystemPath = execSync('which ffmpeg').toString().trim();
    const ffprobeSystemPath = execSync('which ffprobe').toString().trim();
    
    // 파일 복사 또는 심볼릭 링크 생성
    await fs.symlink(ffmpegSystemPath, FFMPEG_PATH);
    await fs.symlink(ffprobeSystemPath, FFPROBE_PATH);
    
    console.log('ffmpeg Linux 버전 설치 완료');
  } catch (error) {
    console.error('ffmpeg Linux 설치 오류:', error);
    console.log('대안 방법으로 정적 빌드를 다운로드합니다...');
    
    try {
      // 정적 빌드 다운로드 시도
      const ffmpegUrl = 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz';
      const tarPath = path.join(BIN_PATH, 'ffmpeg.tar.xz');
      
      await downloadFile(ffmpegUrl, tarPath);
      
      // 압축 해제
      execSync(`tar -xf "${tarPath}" -C "${BIN_PATH}"`);
      const extractedDir = execSync(`find "${BIN_PATH}" -type d -name "ffmpeg-*-static" | head -1`).toString().trim();
      
      await fs.copyFile(path.join(extractedDir, 'ffmpeg'), FFMPEG_PATH);
      await fs.copyFile(path.join(extractedDir, 'ffprobe'), FFPROBE_PATH);
      
      // 파일 권한 설정
      await makeExecutable(FFMPEG_PATH);
      await makeExecutable(FFPROBE_PATH);
      
      // 임시 파일 정리
      await fs.rm(tarPath, { force: true });
      await fs.rm(extractedDir, { recursive: true, force: true });
      
      console.log('ffmpeg 정적 빌드 설치 완료');
    } catch (fallbackError) {
      console.error('ffmpeg 대체 설치 오류:', fallbackError);
      throw fallbackError;
    }
  }
}

/**
 * yt-dlp 버전 확인
 */
export async function checkYtdlpVersion(): Promise<string | null> {
  try {
    const ytdlp = spawn(YTDLP_PATH, ['--version']);
    let version = '';
    
    return new Promise((resolve) => {
      ytdlp.stdout.on('data', (data) => {
        version += data.toString().trim();
      });
      
      ytdlp.on('close', (code) => {
        if (code === 0 && version) {
          resolve(version);
        } else {
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('yt-dlp 버전 확인 오류:', error);
    return null;
  }
}

/**
 * ffmpeg 버전 확인
 */
export async function checkFfmpegVersion(): Promise<string | null> {
  try {
    const ffmpeg = spawn(FFMPEG_PATH, ['-version']);
    let version = '';
    
    return new Promise((resolve) => {
      ffmpeg.stdout.on('data', (data) => {
        const output = data.toString();
        const versionMatch = output.match(/version\s+([\d.]+)/i);
        if (versionMatch) {
          version = versionMatch[1];
        }
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0 && version) {
          resolve(version);
        } else {
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('ffmpeg 버전 확인 오류:', error);
    return null;
  }
}

/**
 * 필요한 모든 바이너리 설치 확인
 */
export async function ensureBinaries(): Promise<void> {
  try {
    // bin 디렉토리 확인 및 생성
    await fs.mkdir(BIN_PATH, { recursive: true });
    
    // yt-dlp 확인
    const ytdlpVersion = await checkYtdlpVersion();
    if (!ytdlpVersion) {
      console.log('yt-dlp를 설치합니다...');
      await installYtdlp();
    } else {
      console.log(`yt-dlp 버전: ${ytdlpVersion}`);
    }
    
    // ffmpeg 확인
    const ffmpegVersion = await checkFfmpegVersion();
    if (!ffmpegVersion) {
      console.log('ffmpeg를 설치합니다...');
      await installFfmpeg();
    } else {
      console.log(`ffmpeg 버전: ${ffmpegVersion}`);
    }
    
    console.log('모든 필요 바이너리가 설치되었습니다.');
  } catch (error) {
    console.error('바이너리 설치 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 바이너리 경로 가져오기
 */
export function getBinaryPaths() {
  return {
    ytdlp: YTDLP_PATH,
    ffmpeg: FFMPEG_PATH,
    ffprobe: FFPROBE_PATH
  };
} 