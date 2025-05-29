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

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files found for this group' }, { status: 404 });
    }

    // 파일 시스템에서 폴더 이름 변경 (첫 번째 파일의 경로를 기반으로 계산)
    const firstFile = files[0];
    const oldFolderPath = path.dirname(firstFile.path);
    
    // 새 폴더 경로 생성
    const basePath = process.env.MEDIA_STORAGE_PATH || './storage';
    let newFolderPath: string;
    
    switch (groupType) {
      case 'youtube_single':
        // 날짜는 유지하고 그룹명만 변경 (실제로는 단일 파일이라 폴더명 변경이 의미가 없을 수 있음)
        const datePart = oldGroupName;
        newFolderPath = path.join(basePath, 'youtube', datePart);
        break;
      case 'youtube_playlist':
        newFolderPath = path.join(basePath, 'playlists', newGroupName);
        break;
      case 'melon_chart':
        // 날짜_차트크기 형태에서 차트크기 부분만 변경
        const melonParts = oldGroupName.split('_');
        if (melonParts.length === 2) {
          newFolderPath = path.join(basePath, 'melon', `${melonParts[0]}_${newGroupName}`);
        } else {
          newFolderPath = path.join(basePath, 'melon', newGroupName);
        }
        break;
      default:
        newFolderPath = path.join(basePath, 'others', newGroupName);
    }

    // 폴더가 실제로 존재하고 이름이 다른 경우에만 이름 변경
    try {
      const oldExists = await fs.access(oldFolderPath).then(() => true).catch(() => false);
      const newExists = await fs.access(newFolderPath).then(() => true).catch(() => false);
      
      if (oldExists && !newExists && oldFolderPath !== newFolderPath) {
        await fs.rename(oldFolderPath, newFolderPath);
        
        // 파일 경로들을 새 폴더 경로로 업데이트
        for (const file of files) {
          const fileName = path.basename(file.path);
          const newFilePath = path.join(newFolderPath, fileName);
          
          await prisma.file.update({
            where: { id: file.id },
            data: { 
              path: newFilePath,
              groupName: groupType === 'melon_chart' ? 
                (oldGroupName.includes('_') ? `${oldGroupName.split('_')[0]}_${newGroupName}` : newGroupName) :
                newGroupName
            }
          });
        }
      } else {
        // 폴더 이름 변경 없이 DB만 업데이트
        await prisma.file.updateMany({
          where: {
            groupType: groupType,
            groupName: oldGroupName
          },
          data: {
            groupName: groupType === 'melon_chart' ? 
              (oldGroupName.includes('_') ? `${oldGroupName.split('_')[0]}_${newGroupName}` : newGroupName) :
              newGroupName
          }
        });
      }
    } catch (fsError) {
      console.error('File system operation failed:', fsError);
      // 파일 시스템 오류가 있어도 DB는 업데이트
      await prisma.file.updateMany({
        where: {
          groupType: groupType,
          groupName: oldGroupName
        },
        data: {
          groupName: groupType === 'melon_chart' ? 
            (oldGroupName.includes('_') ? `${oldGroupName.split('_')[0]}_${newGroupName}` : newGroupName) :
            newGroupName
        }
      });
    }

    return NextResponse.json({ 
      message: 'Group name updated successfully',
      updatedFiles: files.length 
    });

  } catch (error) {
    console.error('Group rename error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}