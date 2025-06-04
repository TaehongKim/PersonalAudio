import { prisma } from './prisma';
import fs from 'fs/promises';
import path from 'path';

// 파일명 정규화 함수 (비교용)
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, '') // 특수문자 제거
    .replace(/\s+/g, ' ') // 연속 공백을 하나로
    .trim();
}

// 중복 파일 검색
export async function findDuplicateFile(
  title: string,
  artist: string | null,
  fileType: string
): Promise<{ id: string; path: string; thumbnailPath?: string | null } | null> {
  const normalizedTitle = normalizeText(title);
  const normalizedArtist = artist ? normalizeText(artist) : null;

  try {
    const cachedFile = await prisma.fileCache.findFirst({
      where: {
        normalizedTitle,
        normalizedArtist,
        fileType: fileType.toUpperCase(),
      },
      orderBy: {
        lastUsedAt: 'desc'
      }
    });

    if (cachedFile) {
      // 파일이 실제로 존재하는지 확인
      try {
        await fs.access(cachedFile.path);
        
        // 사용 시간 업데이트
        await prisma.fileCache.update({
          where: { id: cachedFile.id },
          data: { lastUsedAt: new Date() }
        });

        // 캐시 HIT 통계 업데이트
        await updateCacheStats(true);

        console.log(`중복 파일 발견 (캐시 HIT): ${title} - ${artist} (${cachedFile.path})`);
        return {
          id: cachedFile.id,
          path: cachedFile.path,
          thumbnailPath: cachedFile.thumbnailPath
        };
      } catch (error) {
        // 파일이 존재하지 않으면 캐시에서 제거
        console.log(`캐시된 파일이 존재하지 않아 제거: ${cachedFile.path}`);
        await prisma.fileCache.delete({
          where: { id: cachedFile.id }
        });
      }
    }

    // 캐시 MISS 통계 업데이트
    await updateCacheStats(false);
    console.log(`중복 파일 없음 (캐시 MISS): ${title} - ${artist}`);
    
    return null;
  } catch (error) {
    console.error('중복 파일 검색 오류:', error);
    return null;
  }
}

// 파일을 캐시에 추가
export async function addToFileCache(
  title: string,
  artist: string | null,
  fileType: string,
  fileSize: number,
  duration: number | null,
  filePath: string,
  thumbnailPath: string | null = null,
  sourceUrl: string | null = null,
  groupType: string | null = null,
  groupName: string | null = null,
  rank: number | null = null,
  isTemporary = false
): Promise<void> {
  const normalizedTitle = normalizeText(title);
  const normalizedArtist = artist ? normalizeText(artist) : null;

  try {
    await prisma.fileCache.create({
      data: {
        title,
        artist,
        normalizedTitle,
        normalizedArtist,
        fileType: fileType.toUpperCase(),
        fileSize,
        duration,
        path: filePath,
        thumbnailPath,
        sourceUrl,
        groupType,
        groupName,
        rank,
        isTemporary,
        lastUsedAt: new Date()
      }
    });

    console.log(`파일 캐시에 추가: ${title} - ${artist} (임시: ${isTemporary})`);
  } catch (error) {
    console.error('파일 캐시 추가 오류:', error);
  }
}

// 파일을 실제 파일과 File 테이블에 복사
export async function copyFileFromCache(
  cacheId: string,
  newGroupType: string,
  newGroupName: string,
  newRank?: number | null
): Promise<{ id: string; path: string } | null> {
  try {
    const cachedFile = await prisma.fileCache.findUnique({
      where: { id: cacheId }
    });

    if (!cachedFile) {
      return null;
    }

    // 새로운 파일 경로 생성
    const originalExtension = path.extname(cachedFile.path);
    const newFileName = `${Date.now()}_${path.basename(cachedFile.path)}`;
    const newPath = path.join(path.dirname(cachedFile.path), newFileName);

    // 파일 복사
    await fs.copyFile(cachedFile.path, newPath);

    // 썸네일도 복사 (있는 경우)
    let newThumbnailPath = null;
    if (cachedFile.thumbnailPath) {
      try {
        const thumbnailExtension = path.extname(cachedFile.thumbnailPath);
        const newThumbnailName = `${Date.now()}_${path.basename(cachedFile.thumbnailPath)}`;
        newThumbnailPath = path.join(path.dirname(cachedFile.thumbnailPath), newThumbnailName);
        await fs.copyFile(cachedFile.thumbnailPath, newThumbnailPath);
      } catch (thumbnailError) {
        console.warn('썸네일 복사 실패:', thumbnailError);
      }
    }

    // File 테이블에 새 레코드 생성
    const newFile = await prisma.file.create({
      data: {
        title: cachedFile.title,
        artist: cachedFile.artist,
        fileType: cachedFile.fileType,
        fileSize: cachedFile.fileSize,
        duration: cachedFile.duration,
        path: newPath,
        thumbnailPath: newThumbnailPath,
        sourceUrl: cachedFile.sourceUrl,
        groupType: newGroupType,
        groupName: newGroupName,
        rank: newRank || cachedFile.rank,
      }
    });

    console.log(`캐시에서 파일 복사 완료: ${cachedFile.title} -> ${newFile.id}`);
    return { id: newFile.id, path: newPath };
  } catch (error) {
    console.error('캐시에서 파일 복사 오류:', error);
    return null;
  }
}

// 임시 파일 정리 (최대 200개 유지, 오래된 것부터 삭제)
export async function cleanupTemporaryFiles(): Promise<{ deletedCount: number; freedSpace: number }> {
  const MAX_TEMP_FILES = 200;
  let deletedCount = 0;
  let freedSpace = 0;

  try {
    // 임시 파일 수 확인
    const tempFileCount = await prisma.fileCache.count({
      where: { isTemporary: true }
    });

    if (tempFileCount <= MAX_TEMP_FILES) {
      return { deletedCount: 0, freedSpace: 0 };
    }

    // 삭제할 파일 수 계산
    const filesToDelete = tempFileCount - MAX_TEMP_FILES;

    // 가장 오래된 임시 파일들 가져오기
    const oldFiles = await prisma.fileCache.findMany({
      where: { isTemporary: true },
      orderBy: { lastUsedAt: 'asc' },
      take: filesToDelete
    });

    // 파일들 삭제
    for (const file of oldFiles) {
      try {
        // 실제 파일 삭제
        await fs.unlink(file.path);
        freedSpace += file.fileSize;

        // 썸네일 파일도 삭제 (있는 경우)
        if (file.thumbnailPath) {
          try {
            await fs.unlink(file.thumbnailPath);
          } catch (thumbnailError) {
            console.warn('썸네일 삭제 실패:', thumbnailError);
          }
        }

        // 캐시에서 제거
        await prisma.fileCache.delete({
          where: { id: file.id }
        });

        deletedCount++;
        console.log(`임시 파일 삭제: ${file.title} (${file.path})`);
      } catch (error) {
        console.error(`파일 삭제 실패: ${file.path}`, error);
      }
    }

    console.log(`임시 파일 정리 완료: ${deletedCount}개 삭제, ${(freedSpace / 1024 / 1024).toFixed(2)}MB 확보`);
    return { deletedCount, freedSpace };
  } catch (error) {
    console.error('임시 파일 정리 오류:', error);
    return { deletedCount, freedSpace };
  }
}

// 모든 임시 파일 강제 삭제
export async function deleteAllTemporaryFiles(): Promise<{ deletedCount: number; freedSpace: number }> {
  let deletedCount = 0;
  let freedSpace = 0;

  try {
    const tempFiles = await prisma.fileCache.findMany({
      where: { isTemporary: true }
    });

    for (const file of tempFiles) {
      try {
        // 실제 파일 삭제
        await fs.unlink(file.path);
        freedSpace += file.fileSize;

        // 썸네일 파일도 삭제 (있는 경우)
        if (file.thumbnailPath) {
          try {
            await fs.unlink(file.thumbnailPath);
          } catch (thumbnailError) {
            console.warn('썸네일 삭제 실패:', thumbnailError);
          }
        }

        deletedCount++;
        console.log(`임시 파일 삭제: ${file.title} (${file.path})`);
      } catch (error) {
        console.error(`파일 삭제 실패: ${file.path}`, error);
      }
    }

    // 캐시에서 모든 임시 파일 제거
    await prisma.fileCache.deleteMany({
      where: { isTemporary: true }
    });

    console.log(`모든 임시 파일 삭제 완료: ${deletedCount}개 삭제, ${(freedSpace / 1024 / 1024).toFixed(2)}MB 확보`);
    return { deletedCount, freedSpace };
  } catch (error) {
    console.error('임시 파일 삭제 오류:', error);
    return { deletedCount, freedSpace };
  }
}

// 캐시 통계
export async function getCacheStats(): Promise<{
  totalFiles: number;
  temporaryFiles: number;
  permanentFiles: number;
  totalSize: number;
  temporarySize: number;
}> {
  try {
    const [totalStats, tempStats] = await Promise.all([
      prisma.fileCache.aggregate({
        _count: { id: true },
        _sum: { fileSize: true }
      }),
      prisma.fileCache.aggregate({
        where: { isTemporary: true },
        _count: { id: true },
        _sum: { fileSize: true }
      })
    ]);

    return {
      totalFiles: totalStats._count.id || 0,
      temporaryFiles: tempStats._count.id || 0,
      permanentFiles: (totalStats._count.id || 0) - (tempStats._count.id || 0),
      totalSize: totalStats._sum.fileSize || 0,
      temporarySize: tempStats._sum.fileSize || 0
    };
  } catch (error) {
    console.error('캐시 통계 조회 오류:', error);
    return {
      totalFiles: 0,
      temporaryFiles: 0,
      permanentFiles: 0,
      totalSize: 0,
      temporarySize: 0
    };
  }
}

// 캐시 통계 업데이트 (오늘 날짜 기준)
export async function updateCacheStats(isHit: boolean): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 오늘 자정으로 설정

    await prisma.cacheStats.upsert({
      where: { date: today },
      update: {
        totalHits: isHit ? { increment: 1 } : undefined,
        totalMisses: !isHit ? { increment: 1 } : undefined,
      },
      create: {
        date: today,
        totalHits: isHit ? 1 : 0,
        totalMisses: !isHit ? 1 : 0,
      }
    });
  } catch (error) {
    console.error('캐시 통계 업데이트 오류:', error);
  }
}

// 캐시 통계 조회 (최근 30일)
export async function getCacheHitRatio(): Promise<{
  totalHits: number;
  totalMisses: number;
  totalRequests: number;
  hitRatio: number;
  recentStats: Array<{ date: string; hits: number; misses: number; ratio: number }>;
}> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await prisma.cacheStats.findMany({
      where: {
        date: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: { date: 'desc' },
      take: 30
    });

    const totalHits = stats.reduce((sum: any, stat: any) => sum + stat.totalHits, 0);
    const totalMisses = stats.reduce((sum: any, stat: any) => sum + stat.totalMisses, 0);
    const totalRequests = totalHits + totalMisses;
    const hitRatio = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

    const recentStats = stats.map((stat: any) => ({
      date: stat.date.toISOString().split('T')[0],
      hits: stat.totalHits,
      misses: stat.totalMisses,
      ratio: (stat.totalHits + stat.totalMisses) > 0 
        ? (stat.totalHits / (stat.totalHits + stat.totalMisses)) * 100 
        : 0
    }));

    return {
      totalHits,
      totalMisses,
      totalRequests,
      hitRatio,
      recentStats
    };
  } catch (error) {
    console.error('캐시 통계 조회 오류:', error);
    return {
      totalHits: 0,
      totalMisses: 0,
      totalRequests: 0,
      hitRatio: 0,
      recentStats: []
    };
  }
}