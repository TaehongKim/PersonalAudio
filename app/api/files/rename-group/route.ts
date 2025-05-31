import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupKey, newName } = await request.json();
    
    if (!groupKey || !newName) {
      return NextResponse.json(
        { error: '그룹 키와 새 이름이 필요합니다.' },
        { status: 400 }
      );
    }

    const [groupType, oldName] = groupKey.split('_');

    // 해당 그룹의 모든 파일 업데이트
    const updateResult = await prisma.file.updateMany({
      where: {
        groupType,
        groupName: oldName
      },
      data: {
        groupName: newName
      }
    });

    return NextResponse.json({
      success: true,
      updatedCount: updateResult.count,
      message: '그룹 이름이 성공적으로 변경되었습니다.'
    });

  } catch (error) {
    console.error('그룹 이름 변경 오류:', error);
    return NextResponse.json(
      { error: '그룹 이름 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}