import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 설정 조회
    const settings = await prisma.settings.findFirst();
    
    if (!settings) {
      // 기본 설정 생성
      const defaultSettings = await prisma.settings.create({
        data: {
          password: await bcrypt.hash('1', 10), // 기본 비밀번호
          excludeKeywords: '',
          storageLimit: 500 * 1024 * 1024, // 500MB (바이트 단위)
          darkMode: false
        }
      });
      
      return NextResponse.json({
        storageLimit: Math.floor(defaultSettings.storageLimit / (1024 * 1024)), // MB 단위로 변환
        excludeKeywords: defaultSettings.excludeKeywords || '',
        darkMode: defaultSettings.darkMode
      });
    }

    return NextResponse.json({
      storageLimit: Math.floor(settings.storageLimit / (1024 * 1024)), // MB 단위로 변환
      excludeKeywords: settings.excludeKeywords || '',
      darkMode: settings.darkMode
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { storageLimit, excludeKeywords, darkMode, currentPassword, newPassword } = body;

    // 현재 설정 조회
    let settings = await prisma.settings.findFirst();
    
    if (!settings) {
      // 설정이 없으면 생성
      settings = await prisma.settings.create({
        data: {
          password: await bcrypt.hash('1', 10),
          excludeKeywords: '',
          storageLimit: 500 * 1024 * 1024,
          darkMode: false
        }
      });
    }

    // 비밀번호 변경 요청 처리
    if (currentPassword && newPassword) {
      const isValidPassword = await bcrypt.compare(currentPassword, settings.password);
      if (!isValidPassword) {
        return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 });
      }
      
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await prisma.settings.update({
        where: { id: settings.id },
        data: { password: hashedNewPassword }
      });
      
      return NextResponse.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
    }

    // 일반 설정 업데이트
    const updateData: Record<string, unknown> = {};
    
    if (typeof storageLimit === 'number') {
      updateData.storageLimit = storageLimit * 1024 * 1024; // MB를 바이트로 변환
    }
    
    if (typeof excludeKeywords === 'string') {
      updateData.excludeKeywords = excludeKeywords;
    }
    
    if (typeof darkMode === 'boolean') {
      updateData.darkMode = darkMode;
    }

    const updatedSettings = await prisma.settings.update({
      where: { id: settings.id },
      data: updateData
    });

    return NextResponse.json({
      storageLimit: Math.floor(updatedSettings.storageLimit / (1024 * 1024)),
      excludeKeywords: updatedSettings.excludeKeywords || '',
      darkMode: updatedSettings.darkMode,
      message: '설정이 성공적으로 업데이트되었습니다.'
    });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}