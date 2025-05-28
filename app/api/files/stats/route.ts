import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 파일 통계 정보 조회
    const [totalFiles, totalStorageUsed, fileTypeStats, recentFiles] = await Promise.all([
      // 총 파일 수
      prisma.file.count(),
      
      // 총 저장 공간 사용량
      prisma.file.aggregate({
        _sum: {
          fileSize: true
        }
      }),
      
      // 파일 타입별 통계
      prisma.file.groupBy({
        by: ['fileType'],
        _count: {
          id: true
        },
        _sum: {
          fileSize: true
        }
      }),
      
      // 최근 추가된 파일들 (5개)
      prisma.file.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          title: true,
          artist: true,
          fileType: true,
          createdAt: true
        }
      })
    ]);

    // 가장 많이 다운로드된 파일들 (5개)
    const popularFiles = await prisma.file.findMany({
      take: 5,
      orderBy: {
        downloads: 'desc'
      },
      where: {
        downloads: {
          gt: 0
        }
      },
      select: {
        id: true,
        title: true,
        artist: true,
        fileType: true,
        downloads: true
      }
    });

    // 설정에서 저장소 제한 가져오기
    const settings = await prisma.settings.findFirst();
    const storageLimit = settings?.storageLimit || 1000; // 기본값: 1GB (MB 단위)

    return NextResponse.json({
      totalFiles,
      totalStorageUsed: totalStorageUsed._sum.fileSize || 0,
      storageLimit: storageLimit * 1024 * 1024, // MB를 Bytes로 변환
      storageUsagePercentage: totalStorageUsed._sum.fileSize 
        ? (totalStorageUsed._sum.fileSize / (storageLimit * 1024 * 1024)) * 100 
        : 0,
      fileTypeStats: fileTypeStats.map((stat: any) => ({
        fileType: stat.fileType,
        count: stat._count.id,
        totalSize: stat._sum.fileSize || 0
      })),
      recentFiles,
      popularFiles
    });

  } catch (error) {
    console.error('파일 통계 조회 오류:', error);
    return NextResponse.json(
      { error: '파일 통계를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}