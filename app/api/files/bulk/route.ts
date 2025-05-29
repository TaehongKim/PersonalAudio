import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import archiver from 'archiver';
import { Readable } from 'stream';

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

    // 실제 파일 시스템에서 파일 삭제
    const deletionResults = await Promise.allSettled(
      files.map(async (file: { id: string; path: string; thumbnailPath: string | null; title: string }) => {
        const results: string[] = [];
        
        try {
          await fs.unlink(file.path);
          results.push(`파일 삭제 성공: ${file.title}`);
        } catch (error) {
          console.warn(`파일 삭제 실패: ${file.path}`, error);
          results.push(`파일 삭제 실패: ${file.title}`);
        }

        if (file.thumbnailPath) {
          try {
            await fs.unlink(file.thumbnailPath);
            results.push(`썸네일 삭제 성공: ${file.title}`);
          } catch (error) {
            console.warn(`썸네일 삭제 실패: ${file.thumbnailPath}`, error);
            results.push(`썸네일 삭제 실패: ${file.title}`);
          }
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

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
      requestedCount: fileIds.length,
      deletionResults: deletionResults.map(result => 
        result.status === 'fulfilled' ? result.value : result.reason
      ).flat()
    });

  } catch (error) {
    console.error('대량 삭제 오류:', error);
    throw error;
  }
}

async function handleBulkDownload(fileIds: string[]) {
  try {
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

    // ZIP 파일 생성
    const archive = archiver('zip', {
      zlib: { level: 1 } // 압축 레벨 (1: 빠른 압축)
    });

    // 파일들을 아카이브에 추가
    for (const file of existingFiles) {
      const fileName = `${file.title} - ${file.artist || 'Unknown Artist'}.${file.fileType.toLowerCase()}`;
      const safeFileName = fileName.replace(/[<>:"/\\|?*]/g, '_');
      
      archive.file(file.path, { name: safeFileName });
    }

    // 아카이브 완료
    await archive.finalize();

    // 다운로드 카운트 증가
    await prisma.file.updateMany({
      where: {
        id: { in: fileIds }
      },
      data: {
        downloads: { increment: 1 }
      }
    });

    // ZIP 파일명 생성 (그룹명 기반)
    let zipFileName: string;
    
    // 파일들을 그룹별로 분류
    const groupedFiles = existingFiles.reduce((acc, file) => {
      const groupKey = `${file.groupType || 'unknown'}_${file.groupName || 'unknown'}`;
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(file);
      return acc;
    }, {} as Record<string, typeof existingFiles>);
    
    const groupKeys = Object.keys(groupedFiles);
    
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
      zipFileName = `PersonalAudio_${existingFiles.length}files_${new Date().toISOString().split('T')[0]}.zip`;
    }
    
    // 파일명 안전성 확보
    zipFileName = zipFileName.replace(/[<>:"/\\|?*]/g, '_');

    // 스트림을 ReadableStream으로 변환
    const stream = Readable.from(archive);

    return new NextResponse(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(zipFileName)}`,
        'Transfer-Encoding': 'chunked',
      }
    });

  } catch (error) {
    console.error('대량 다운로드 오류:', error);
    throw error;
  }
}