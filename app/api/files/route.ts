import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const fileType = searchParams.get('fileType') || '';

    // WHERE 조건 구성
    const where: Prisma.FileWhereInput = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { artist: { contains: search } }
      ];
    }

    if (fileType) {
      where.fileType = { contains: fileType };
    }

    // 정렬 옵션 검증
    const validSortFields = ['createdAt', 'title', 'artist', 'fileSize', 'duration', 'downloads'];
    const validSortOrders = ['asc', 'desc'];
    
    let orderBy: Prisma.FileOrderByWithRelationInput = { createdAt: 'desc' };
    if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder)) {
      switch (sortBy) {
        case 'createdAt':
          orderBy = { createdAt: sortOrder as 'asc' | 'desc' };
          break;
        case 'title':
          orderBy = { title: sortOrder as 'asc' | 'desc' };
          break;
        case 'artist':
          orderBy = { artist: sortOrder as 'asc' | 'desc' };
          break;
        case 'fileSize':
          orderBy = { fileSize: sortOrder as 'asc' | 'desc' };
          break;
        case 'duration':
          orderBy = { duration: sortOrder as 'asc' | 'desc' };
          break;
        case 'downloads':
          orderBy = { downloads: sortOrder as 'asc' | 'desc' };
          break;
      }
    }

    // 1. 모든 파일 목록 조회 (페이지네이션 제거)
    const files = await prisma.file.findMany({
      where,
      orderBy,
      select: {
        id: true,
        title: true,
        artist: true,
        fileType: true,
        fileSize: true,
        duration: true,
        thumbnailPath: true,
        sourceUrl: true,
        groupType: true,
        groupName: true,
        rank: true,
        createdAt: true,
        downloads: true,
      }
    });

    // 3. 각 그룹의 전체 파일 수 조회
    const groupCounts = await prisma.file.groupBy({
      by: ['groupType', 'groupName'],
      _count: {
        id: true,
      },
      where, 
    });
    
    const groupCountMap = new Map<string, number>();
    groupCounts.forEach(group => {
      const groupKey = `${group.groupType || 'unknown'}_${group.groupName || 'unknown'}`;
      groupCountMap.set(groupKey, group._count.id);
    });

    // 4. 파일 목록에 그룹별 전체 파일 수 추가
    const filesWithGroupCount = files.map(file => {
      const groupKey = `${file.groupType || 'unknown'}_${file.groupName || 'unknown'}`;
      return {
        ...file,
        groupTotalCount: groupCountMap.get(groupKey) || 0,
      };
    });

    // 총 저장 공간 사용량 계산
    const totalStorageUsed = await prisma.file.aggregate({
      _sum: {
        fileSize: true
      }
    });

    return NextResponse.json({
      files: filesWithGroupCount,
      totalStorageUsed: totalStorageUsed._sum.fileSize || 0
    });

  } catch (error) {
    console.error('파일 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '파일 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',') || [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: '삭제할 파일 ID가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 파일 정보 조회 (실제 파일 삭제를 위해)
    const files = await prisma.file.findMany({
      where: {
        id: { in: ids }
      },
      select: {
        id: true,
        path: true,
        thumbnailPath: true
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
      files.map(async (file: { id: string; path: string; thumbnailPath: string | null }) => {
        const deletions = [];
        
        // 메인 파일 삭제
        try {
          await fs.unlink(file.path);
          deletions.push(`파일 삭제 성공: ${file.path}`);
        } catch (error) {
          console.warn(`파일 삭제 실패: ${file.path}`, error);
          deletions.push(`파일 삭제 실패: ${file.path}`);
        }

        // 썸네일 파일 삭제 (있는 경우)
        if (file.thumbnailPath) {
          try {
            await fs.unlink(file.thumbnailPath);
            deletions.push(`썸네일 삭제 성공: ${file.thumbnailPath}`);
          } catch (error) {
            console.warn(`썸네일 삭제 실패: ${file.thumbnailPath}`, error);
            deletions.push(`썸네일 삭제 실패: ${file.thumbnailPath}`);
          }
        }

        return deletions;
      })
    );

    // 데이터베이스에서 레코드 삭제
    const deleteResult = await prisma.file.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
      deletionResults: deletionResults.map(result => 
        result.status === 'fulfilled' ? result.value : result.reason
      )
    });

  } catch (error) {
    console.error('파일 삭제 오류:', error);
    return NextResponse.json(
      { error: '파일 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}