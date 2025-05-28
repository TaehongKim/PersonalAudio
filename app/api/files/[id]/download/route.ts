import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // 파일 정보 조회
    const file = await prisma.file.findUnique({
      where: { id }
    });

    if (!file) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 파일 존재 여부 확인
    if (!fs.existsSync(file.path)) {
      return NextResponse.json(
        { error: '파일이 서버에서 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 다운로드 카운트 증가
    await prisma.file.update({
      where: { id },
      data: {
        downloads: { increment: 1 }
      }
    });

    // 파일 스트림 생성
    const fileBuffer = fs.readFileSync(file.path);
    const fileName = `${file.title} - ${file.artist || 'Unknown Artist'}.${file.fileType.toLowerCase()}`;
    
    // 안전한 파일명 생성 (특수문자 제거)
    const safeFileName = fileName.replace(/[<>:"/\\|?*]/g, '_');

    // Content-Type 설정
    let contentType = 'application/octet-stream';
    const extension = path.extname(file.path).toLowerCase();
    
    switch (extension) {
      case '.mp3':
        contentType = 'audio/mpeg';
        break;
      case '.mp4':
        contentType = 'video/mp4';
        break;
      case '.webm':
        contentType = 'video/webm';
        break;
      case '.wav':
        contentType = 'audio/wav';
        break;
      case '.m4a':
        contentType = 'audio/mp4';
        break;
    }

    // 응답 헤더 설정
    const headers = {
      'Content-Type': contentType,
      'Content-Length': fileBuffer.length.toString(),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
      'Cache-Control': 'public, max-age=3600',
      'Accept-Ranges': 'bytes',
    };

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('파일 다운로드 오류:', error);
    return NextResponse.json(
      { error: '파일 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function HEAD(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // 파일 정보 조회
    const file = await prisma.file.findUnique({
      where: { id }
    });

    if (!file) {
      return new NextResponse(null, { status: 404 });
    }

    // 파일 존재 여부 확인
    if (!fs.existsSync(file.path)) {
      return new NextResponse(null, { status: 404 });
    }

    const stats = fs.statSync(file.path);
    const fileName = `${file.title} - ${file.artist || 'Unknown Artist'}.${file.fileType.toLowerCase()}`;
    const safeFileName = fileName.replace(/[<>:"/\\|?*]/g, '_');

    let contentType = 'application/octet-stream';
    const extension = path.extname(file.path).toLowerCase();
    
    switch (extension) {
      case '.mp3':
        contentType = 'audio/mpeg';
        break;
      case '.mp4':
        contentType = 'video/mp4';
        break;
      case '.webm':
        contentType = 'video/webm';
        break;
      case '.wav':
        contentType = 'audio/wav';
        break;
      case '.m4a':
        contentType = 'audio/mp4';
        break;
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
        'Accept-Ranges': 'bytes',
      }
    });

  } catch (error) {
    console.error('파일 정보 조회 오류:', error);
    return new NextResponse(null, { status: 500 });
  }
}