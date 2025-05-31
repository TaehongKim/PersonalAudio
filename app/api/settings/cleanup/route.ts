import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'storage', 'cache');
const ZIP_CACHE_DIR = path.join(CACHE_DIR, 'zip');
const TEMP_DIR = path.join(process.cwd(), 'storage', 'temp');

interface CleanupStats {
  totalFiles: number;
  totalSize: number;
  deletedFiles: number;
  deletedSize: number;
  errors: string[];
}

// 디렉토리 크기 계산
async function getDirectorySize(dirPath: string): Promise<{ files: number; size: number }> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let totalSize = 0;
    let totalFiles = 0;

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const subResult = await getDirectorySize(fullPath);
        totalSize += subResult.size;
        totalFiles += subResult.files;
      } else {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
        totalFiles++;
      }
    }

    return { files: totalFiles, size: totalSize };
  } catch {
    return { files: 0, size: 0 };
  }
}

// 디렉토리 정리
async function cleanDirectory(dirPath: string, maxAge?: number): Promise<CleanupStats> {
  const stats: CleanupStats = {
    totalFiles: 0,
    totalSize: 0,
    deletedFiles: 0,
    deletedSize: 0,
    errors: []
  };

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      try {
        const fileStat = await fs.stat(fullPath);
        stats.totalFiles++;
        stats.totalSize += fileStat.size;

        // 나이 체크 (maxAge가 지정된 경우)
        if (maxAge) {
          const fileAge = now - fileStat.mtime.getTime();
          if (fileAge < maxAge) {
            continue; // 너무 최신 파일은 건너뛰기
          }
        }

        if (entry.isDirectory()) {
          // 디렉토리인 경우 재귀적으로 삭제
          await fs.rm(fullPath, { recursive: true, force: true });
        } else {
          // 파일 삭제
          await fs.unlink(fullPath);
        }

        stats.deletedFiles++;
        stats.deletedSize += fileStat.size;
        
      } catch (error) {
        const errorMessage = `${entry.name}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
        stats.errors.push(errorMessage);
        console.error(`파일 삭제 오류 (${fullPath}):`, error);
      }
    }
  } catch (error) {
    if ((error as any).code !== 'ENOENT') {
      stats.errors.push(`디렉토리 읽기 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  return stats;
}

// GET: 임시파일 현황 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await Promise.allSettled([
      getDirectorySize(ZIP_CACHE_DIR),
      getDirectorySize(TEMP_DIR),
    ]);

    const zipCache = results[0].status === 'fulfilled' ? results[0].value : { files: 0, size: 0 };
    const tempFiles = results[1].status === 'fulfilled' ? results[1].value : { files: 0, size: 0 };

    return NextResponse.json({
      zipCache: {
        files: zipCache.files,
        size: zipCache.size,
        path: ZIP_CACHE_DIR
      },
      tempFiles: {
        files: tempFiles.files,
        size: tempFiles.size,
        path: TEMP_DIR
      },
      total: {
        files: zipCache.files + tempFiles.files,
        size: zipCache.size + tempFiles.size
      }
    });

  } catch (error) {
    console.error('임시파일 현황 조회 오류:', error);
    return NextResponse.json(
      { error: '임시파일 현황을 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 임시파일 정리
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type'); // 'cache', 'temp', 'all'
    const maxAgeHours = url.searchParams.get('maxAge'); // 시간 단위
    
    const maxAge = maxAgeHours ? parseInt(maxAgeHours) * 60 * 60 * 1000 : undefined; // 밀리초로 변환

    const totalStats: CleanupStats = {
      totalFiles: 0,
      totalSize: 0,
      deletedFiles: 0,
      deletedSize: 0,
      errors: []
    };

    const operations = [];

    if (type === 'cache' || type === 'all') {
      operations.push(
        cleanDirectory(ZIP_CACHE_DIR, maxAge).then(stats => {
          totalStats.totalFiles += stats.totalFiles;
          totalStats.totalSize += stats.totalSize;
          totalStats.deletedFiles += stats.deletedFiles;
          totalStats.deletedSize += stats.deletedSize;
          totalStats.errors.push(...stats.errors.map(e => `ZIP 캐시: ${e}`));
        })
      );
    }

    if (type === 'temp' || type === 'all') {
      operations.push(
        cleanDirectory(TEMP_DIR, maxAge).then(stats => {
          totalStats.totalFiles += stats.totalFiles;
          totalStats.totalSize += stats.totalSize;
          totalStats.deletedFiles += stats.deletedFiles;
          totalStats.deletedSize += stats.deletedSize;
          totalStats.errors.push(...stats.errors.map(e => `임시파일: ${e}`));
        })
      );
    }

    await Promise.all(operations);

    return NextResponse.json({
      success: true,
      message: `정리 완료: ${totalStats.deletedFiles}개 파일 삭제 (${(totalStats.deletedSize / 1024 / 1024).toFixed(2)}MB)`,
      stats: totalStats,
      cleanupType: type,
      maxAgeHours: maxAgeHours ? parseInt(maxAgeHours) : null
    });

  } catch (error) {
    console.error('임시파일 정리 오류:', error);
    return NextResponse.json(
      { error: '임시파일 정리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 