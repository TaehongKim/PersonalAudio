import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 그룹별로 파일 수와 파일 목록 조회
    const groupData = await prisma.file.groupBy({
      by: ['groupType', 'groupName'],
      _count: {
        id: true,
      },
      orderBy: [
        {
          groupType: 'asc',
        },
        {
          groupName: 'asc',
        }
      ]
    });

    // 각 그룹의 파일 목록 조회
    const groups = await Promise.all(
      groupData.map(async (group: { groupType: string | null, groupName: string | null, _count: { id: number } }) => {
        const files = await prisma.file.findMany({
          where: {
            groupType: group.groupType,
            groupName: group.groupName,
          },
          select: {
            id: true,
            title: true,
            artist: true,
            fileType: true,
            fileSize: true,
            duration: true,
            thumbnailPath: true,
            createdAt: true,
          },
          orderBy: { rank: 'asc' }
        });

        return {
          groupType: group.groupType || 'unknown',
          groupName: group.groupName || 'unknown',
          fileCount: group._count.id,
          files: files
        };
      })
    );

    return NextResponse.json({
      groups: groups.filter((group: { fileCount: number }) => group.fileCount > 0)
    });

  } catch (error) {
    console.error('그룹 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '그룹 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 