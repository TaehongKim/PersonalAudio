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

    const stats = fs.statSync(file.path);
    const range = request.headers.get('range');

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
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
    }

    // Range 요청 처리 (스트리밍을 위해)
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;

      if (start >= stats.size || end >= stats.size) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${stats.size}`
          }
        });
      }

      const fileStream = fs.createReadStream(file.path, { start, end });
      
      return new NextResponse(fileStream as unknown as ReadableStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${stats.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        }
      });
    } else {
      // 전체 파일 스트리밍
      const fileStream = fs.createReadStream(file.path);
      
      return new NextResponse(fileStream as unknown as ReadableStream, {
        status: 200,
        headers: {
          'Content-Length': stats.size.toString(),
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        }
      });
    }

  } catch (error) {
    console.error('파일 스트리밍 오류:', error);
    return NextResponse.json(
      { error: '파일 스트리밍 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}