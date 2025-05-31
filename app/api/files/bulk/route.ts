import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import archiver from 'archiver';
import path from 'path';
import crypto from 'crypto';

// 캐시 디렉토리
const CACHE_DIR = path.join(process.cwd(), 'storage', 'cache');
const ZIP_CACHE_DIR = path.join(CACHE_DIR, 'zip');

// 캐시 디렉토리 초기화
async function ensureCacheDir() {
  try {
    await fs.mkdir(ZIP_CACHE_DIR, { recursive: true });
  } catch (error) {
    console.error('캐시 디렉토리 생성 실패:', error);
  }
}

// 파일 ID 배열로부터 캐시 키 생성
function generateCacheKey(fileIds: string[]): string {
  const sortedIds = [...fileIds].sort();
  return crypto.createHash('md5').update(sortedIds.join(',')).digest('hex');
}

// 캐시된 ZIP 파일 경로 생성
function getCachedZipPath(cacheKey: string): string {
  return path.join(ZIP_CACHE_DIR, `${cacheKey}.zip`);
}

// 캐시된 ZIP 파일이 존재하고 유효한지 확인
async function getCachedZip(fileIds: string[]): Promise<string | null> {
  try {
    await ensureCacheDir();
    
    const cacheKey = generateCacheKey(fileIds);
    const zipPath = getCachedZipPath(cacheKey);
    
    // 캐시 파일 존재 확인
    try {
      await fs.access(zipPath);
    } catch {
      return null;
    }
    
    // 원본 파일들이 모두 존재하는지 확인
    const files = await prisma.file.findMany({
      where: { id: { in: fileIds } },
      select: { path: true, updatedAt: true }
    });
    
    if (files.length !== fileIds.length) {
      // 일부 파일이 삭제된 경우 캐시 무효화
      await fs.unlink(zipPath).catch(() => {});
      return null;
    }
    
    // 캐시 파일 생성 시간 확인
    const zipStat = await fs.stat(zipPath);
    const latestFileTime = Math.max(...files.map(f => new Date(f.updatedAt).getTime()));
    
    if (zipStat.mtime.getTime() < latestFileTime) {
      // 원본 파일이 더 최신인 경우 캐시 무효화
      await fs.unlink(zipPath).catch(() => {});
      return null;
    }
    
    return zipPath;
  } catch (error) {
    console.error('캐시 확인 오류:', error);
    return null;
  }
}

// ZIP 파일을 캐시에 저장
async function cacheZip(fileIds: string[], buffer: Buffer): Promise<string> {
  try {
    await ensureCacheDir();
    
    const cacheKey = generateCacheKey(fileIds);
    const zipPath = getCachedZipPath(cacheKey);
    
    await fs.writeFile(zipPath, buffer);
    console.log(`ZIP 파일 캐시됨: ${zipPath}`);
    
    return zipPath;
  } catch (error) {
    console.error('ZIP 캐시 저장 오류:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, fileIds } = body;

    if (!action || !fileIds || !Array.isArray(fileIds)) {
      return NextResponse.json(
        { error: '잘못된 요청입니다. action과 fileIds가 필요합니다.' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'delete':
        return await handleBulkDelete(fileIds);
      case 'download':
        return await handleBulkDownload(fileIds);
      default:
        return NextResponse.json(
          { error: '지원하지 않는 액션입니다.' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('대량 작업 오류:', error);
    return NextResponse.json(
      { error: '대량 작업 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

async function handleBulkDelete(fileIds: string[]) {
  try {
    // 파일 정보 조회
    const files = await prisma.file.findMany({
      where: {
        id: { in: fileIds }
      },
      select: {
        id: true,
        path: true,
        thumbnailPath: true,
        title: true
      }
    });

    if (files.length === 0) {
      return NextResponse.json(
        { error: '삭제할 파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 파일 삭제 함수
    const deleteFile = async (filePath: string, title: string, isThumb = false) => {
      try {
        // 경로 정규화
        const normalizedPath = path.normalize(filePath);
        
        // 파일 존재 여부 확인 (stat 사용)
        try {
          await fs.stat(normalizedPath);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return [`${isThumb ? '썸네일' : '파일'} 없음: ${title}`];
          }
          throw error;
        }

        // 파일 삭제
        await fs.unlink(normalizedPath);
        return [`${isThumb ? '썸네일' : '파일'} 삭제 성공: ${title}`];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        console.error(`${isThumb ? '썸네일' : '파일'} 삭제 실패 (${filePath}):`, error);
        return [`${isThumb ? '썸네일' : '파일'} 삭제 실패: ${title} (${errorMessage})`];
      }
    };

    // 실제 파일 시스템에서 파일 삭제
    const deletionResults = await Promise.allSettled(
      files.map(async (file) => {
        const results: string[] = [];
        
        // 메인 파일 삭제
        results.push(...await deleteFile(file.path, file.title));

        // 썸네일 삭제 (있는 경우)
        if (file.thumbnailPath) {
          results.push(...await deleteFile(file.thumbnailPath, file.title, true));
        }

        return results;
      })
    );

    // 데이터베이스에서 레코드 삭제
    const deleteResult = await prisma.file.deleteMany({
      where: {
        id: { in: fileIds }
      }
    });

    // 결과 분석
    const allResults = deletionResults
      .map(result => result.status === 'fulfilled' ? result.value : [result.reason])
      .flat();
    
    const successResults = allResults.filter(r => typeof r === 'string' && r.indexOf('성공') !== -1);
    const failureResults = allResults.filter(r => typeof r === 'string' && (r.indexOf('실패') !== -1 || r.indexOf('없음') !== -1));

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
      requestedCount: fileIds.length,
      successCount: successResults.length,
      failureCount: failureResults.length,
      deletionResults: allResults
    });

  } catch (error) {
    console.error('대량 삭제 오류:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : '대량 삭제 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}

async function handleBulkDownload(fileIds: string[]) {
  try {
    console.log(`대량 다운로드 요청: ${fileIds.length}개 파일`);
    
    // 캐시된 ZIP 파일 확인
    const cachedZipPath = await getCachedZip(fileIds);
    if (cachedZipPath) {
      console.log('캐시된 ZIP 파일 사용:', cachedZipPath);
      
      // 다운로드 카운트 증가
      await prisma.file.updateMany({
        where: { id: { in: fileIds } },
        data: { downloads: { increment: 1 } }
      });
      
      // 캐시된 파일 정보로 파일명 생성
      const files = await prisma.file.findMany({
        where: { id: { in: fileIds } },
        select: { groupType: true, groupName: true }
      });
      
      const zipFileName = generateZipFileName(files, fileIds.length);
      const fileBuffer = await fs.readFile(cachedZipPath);
      
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(zipFileName)}`,
          'Content-Length': fileBuffer.length.toString(),
          'X-Cache-Status': 'HIT'
        }
      });
    }
    
    // 파일 정보 조회 (그룹 정보 포함)
    const files = await prisma.file.findMany({
      where: {
        id: { in: fileIds }
      },
      select: {
        id: true,
        title: true,
        artist: true,
        path: true,
        fileType: true,
        groupType: true,
        groupName: true,
        rank: true
      }
    });

    if (files.length === 0) {
      return NextResponse.json(
        { error: '다운로드할 파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 존재하는 파일만 필터링
    const existingFiles = [];
    for (const file of files) {
      try {
        await fs.access(file.path);
        existingFiles.push(file);
      } catch {
        console.warn(`파일을 찾을 수 없습니다: ${file.path}`);
      }
    }

    if (existingFiles.length === 0) {
      return NextResponse.json(
        { error: '다운로드 가능한 파일이 없습니다.' },
        { status: 404 }
      );
    }

    console.log('새 ZIP 파일 생성');
    
    // ZIP 파일을 메모리에 생성
    const buffers: Buffer[] = [];
    const archive = archiver('zip', {
      zlib: { level: 1 } // 압축 레벨 (1: 빠른 압축)
    });

    // 데이터를 버퍼에 수집
    archive.on('data', (chunk) => {
      buffers.push(chunk);
    });

    // 파일들을 아카이브에 추가
    for (const file of existingFiles) {
      const fileName = `${file.title} - ${file.artist || 'Unknown Artist'}.${file.fileType.toLowerCase()}`;
      const safeFileName = fileName.replace(/[<>:"/\\|?*]/g, '_');
      
      archive.file(file.path, { name: safeFileName });
    }

    // 아카이브 완료 대기
    await archive.finalize();
    
    // 버퍼 합치기
    const zipBuffer = Buffer.concat(buffers);
    
    // ZIP 파일을 캐시에 저장 (비동기적으로)
    cacheZip(fileIds, zipBuffer).catch(error => {
      console.error('ZIP 캐시 저장 실패:', error);
    });

    // 다운로드 카운트 증가
    await prisma.file.updateMany({
      where: {
        id: { in: fileIds }
      },
      data: {
        downloads: { increment: 1 }
      }
    });

    // ZIP 파일명 생성
    const zipFileName = generateZipFileName(existingFiles, existingFiles.length);

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(zipFileName)}`,
        'Content-Length': zipBuffer.length.toString(),
        'X-Cache-Status': 'MISS'
      }
    });

  } catch (error) {
    console.error('대량 다운로드 오류:', error);
    throw error;
  }
}

// 파일 타입 정의
interface FileInfo {
  id: string;
  title: string;
  artist?: string | null;
  path: string;
  fileType: string;
  groupType?: string | null;
  groupName?: string | null;
  rank?: number | null;
}

interface GroupInfo {
  groupType: string | null;
  groupName: string | null;
}

// ZIP 파일명 생성 함수 오버로드
function generateZipFileName(files: FileInfo[], fileCount: number): string;
function generateZipFileName(files: GroupInfo[], fileCount: number): string;
function generateZipFileName(files: FileInfo[] | GroupInfo[], fileCount: number): string {
  // 파일들을 그룹별로 분류
  const groupedFiles = files.reduce((acc, file) => {
    const groupKey = `${file.groupType || 'unknown'}_${file.groupName || 'unknown'}`;
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(file);
    return acc;
  }, {} as Record<string, (FileInfo | GroupInfo)[]>);
  
  const groupKeys = Object.keys(groupedFiles);
  let zipFileName: string;
  
  if (groupKeys.length === 1) {
    // 단일 그룹인 경우 그룹명 사용
    const groupKey = groupKeys[0];
    const [groupType, groupName] = groupKey.split('_');
    
    switch (groupType) {
      case 'youtube_playlist':
        zipFileName = `${groupName}.zip`;
        break;
      case 'melon_chart':
        zipFileName = `멜론차트_${groupName}.zip`;
        break;
      case 'youtube_single':
        zipFileName = `유튜브_${groupName}.zip`;
        break;
      default:
        zipFileName = `${groupName || 'Mixed'}.zip`;
    }
  } else {
    // 여러 그룹인 경우 일반적인 이름 사용
    zipFileName = `PersonalAudio_${fileCount}files_${new Date().toISOString().split('T')[0]}.zip`;
  }
  
  // 파일명 안전성 확보
  return zipFileName.replace(/[<>:"/\\|?*]/g, '_');
}