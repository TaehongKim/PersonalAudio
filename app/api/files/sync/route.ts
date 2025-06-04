import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';

const MEDIA_STORAGE_PATH = process.env.MEDIA_STORAGE_PATH || './storage';

export async function GET() {
  try {
    // 1. DB에서 모든 파일 정보 가져오기
    const dbFiles = await prisma.file.findMany({
      select: {
        id: true,
        title: true,
        path: true,
        fileSize: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 2. 파일 시스템 상태 체크
    const fileStatusList = await Promise.all(
      dbFiles.map(async (file: any) => {
        try {
          const exists = fsSync.existsSync(file.path);
          let actualSize = 0;
          
          if (exists) {
            const stats = await fs.stat(file.path);
            actualSize = stats.size;
          }
          
          return {
            id: file.id,
            title: file.title,
            path: file.path,
            dbSize: file.fileSize,
            actualSize,
            exists,
            sizeMatch: exists && actualSize === file.fileSize,
            status: exists 
              ? (actualSize === file.fileSize ? 'ok' : 'size_mismatch')
              : 'missing',
            createdAt: file.createdAt
          };
        } catch (error) {
          console.error(`파일 상태 체크 오류 (${file.id}):`, error);
          return {
            id: file.id,
            title: file.title,
            path: file.path,
            dbSize: file.fileSize,
            actualSize: 0,
            exists: false,
            sizeMatch: false,
            status: 'error',
            createdAt: file.createdAt
          };
        }
      })
    );

    // 3. 상태별 통계 계산
    const stats = {
      total: fileStatusList.length,
      ok: fileStatusList.filter((f: any) => f.status === 'ok').length,
      missing: fileStatusList.filter((f: any) => f.status === 'missing').length,
      sizeMismatch: fileStatusList.filter((f: any) => f.status === 'size_mismatch').length,
      error: fileStatusList.filter((f: any) => f.status === 'error').length,
    };

    // 4. storage 폴더의 orphaned 파일들 찾기 (DB에는 없지만 파일 시스템에는 있는 파일들)
    const orphanedFiles = await findOrphanedFiles(dbFiles.map((f: any) => f.path));

    return NextResponse.json({
      success: true,
      files: fileStatusList,
      stats,
      orphanedFiles
    });
    
  } catch (error) {
    console.error('파일 동기화 체크 오류:', error);
    return NextResponse.json(
      { success: false, error: '파일 동기화 체크 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Storage 폴더에서 DB에 없는 파일들 찾기
async function findOrphanedFiles(dbFilePaths: string[]): Promise<string[]> {
  const orphanedFiles: string[] = [];
  
  try {
    if (!fsSync.existsSync(MEDIA_STORAGE_PATH)) {
      return orphanedFiles;
    }

    const scanDirectory = async (dir: string) => {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (item.isFile()) {
          // 미디어 파일인지 확인 (mp3, mp4, webm 등)
          const ext = path.extname(item.name).toLowerCase();
          if (['.mp3', '.mp4', '.webm', '.m4a', '.wav', '.flac'].includes(ext)) {
            // DB에 이 경로가 있는지 확인
            const isInDb = dbFilePaths.some(dbPath => 
              path.resolve(dbPath) === path.resolve(fullPath)
            );
            
            if (!isInDb) {
              orphanedFiles.push(fullPath);
            }
          }
        }
      }
    };

    await scanDirectory(MEDIA_STORAGE_PATH);
  } catch (error) {
    console.error('Orphaned 파일 검색 오류:', error);
  }
  
  return orphanedFiles;
}

// 누락된 파일들을 DB에서 정리하는 POST 메소드
export async function POST(request: NextRequest) {
  try {
    const { action, fileIds } = await request.json();
    
    if (action === 'cleanup_missing') {
      // 누락된 파일들을 DB에서 삭제
      const result = await prisma.file.deleteMany({
        where: {
          id: {
            in: fileIds
          }
        }
      });
      
      return NextResponse.json({
        success: true,
        deletedCount: result.count,
        message: `${result.count}개의 누락된 파일이 DB에서 정리되었습니다.`
      });
    }
    
    return NextResponse.json(
      { success: false, error: '지원하지 않는 작업입니다.' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('파일 정리 오류:', error);
    return NextResponse.json(
      { success: false, error: '파일 정리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 