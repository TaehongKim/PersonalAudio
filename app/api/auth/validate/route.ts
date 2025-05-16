import { NextResponse } from 'next/server';
import { validatePassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json({
        success: false,
        message: '비밀번호가 입력되지 않았습니다.'
      }, { status: 400 });
    }

    // 비밀번호 검증
    const isValid = await validatePassword(password);
    
    if (isValid) {
      return NextResponse.json({
        success: true,
        message: '비밀번호가 유효합니다.'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: '비밀번호가 일치하지 않습니다.'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('비밀번호 검증 중 오류 발생:', error);
    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    }, { status: 500 });
  }
} 