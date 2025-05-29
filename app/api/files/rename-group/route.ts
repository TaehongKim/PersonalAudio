import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupType, oldGroupName, newGroupName } = await request.json();
    
    console.log('그룹명 변경 요청:', { groupType, oldGroupName, newGroupName });

    if (!groupType || !oldGroupName || !newGroupName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 데이터베이스에서 해당 그룹의 파일들을 찾기
    const files = await prisma.file.findMany({
      where: {
        groupType: groupType,
        groupName: oldGroupName
      }
    });

    console.log(`찾은 파일 수: ${files.length}`);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files found for this group' }, { status: 404 });
    }

    // 새 그룹명 계산
    let newGroupNameForDb: string;
    
    switch (groupType) {
      case 'youtube_playlist':
        newGroupNameForDb = newGroupName;
        break;
      case 'melon_chart':
        // 멜론차트의 경우 날짜_차트크기 형태 유지
        const melonParts = oldGroupName.split('_');
        if (melonParts.length >= 2) {
          // 날짜 부분은 유지하고 차트크기/이름 부분만 변경
          newGroupNameForDb = `${melonParts[0]}_${newGroupName}`;
        } else {
          newGroupNameForDb = newGroupName;
        }
        break;
      case 'youtube_single':
        // 유튜브 단일 파일은 날짜 기반이므로 그룹명 변경 제한
        newGroupNameForDb = oldGroupName; // 변경하지 않음
        break;
      default:
        newGroupNameForDb = newGroupName;
    }
    
    console.log(`새 그룹명: ${oldGroupName} → ${newGroupNameForDb}`);

    // 데이터베이스에서 그룹명 업데이트
    const updateResult = await prisma.file.updateMany({
      where: {
        groupType: groupType,
        groupName: oldGroupName
      },
      data: {
        groupName: newGroupNameForDb
      }
    });
    
    console.log(`업데이트된 파일 수: ${updateResult.count}`);

    return NextResponse.json({ 
      message: 'Group name updated successfully',
      updatedFiles: updateResult.count,
      oldGroupName,
      newGroupName: newGroupNameForDb
    });

  } catch (error) {
    console.error('Group rename error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}