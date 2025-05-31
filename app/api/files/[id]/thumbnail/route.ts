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

    if (!file || !file.thumbnailPath) {
      // 이미지가 없을 때 투명한 1x1 픽셀 GIF 반환
      const transparentPixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      return new NextResponse(transparentPixel, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Content-Length': transparentPixel.length.toString(),
          'Cache-Control': 'public, max-age=86400', // 24시간 캐시
        }
      });
    }

    // 썸네일 파일 존재 여부 확인
    if (!fs.existsSync(file.thumbnailPath)) {
      // 이미지가 없을 때 투명한 1x1 픽셀 GIF 반환
      const transparentPixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      return new NextResponse(transparentPixel, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Content-Length': transparentPixel.length.toString(),
          'Cache-Control': 'public, max-age=86400', // 24시간 캐시
        }
      });
    }

    const stats = fs.statSync(file.thumbnailPath);
    const extension = path.extname(file.thumbnailPath).toLowerCase();

    // Content-Type 설정
    let contentType = 'image/jpeg'; // 기본값
    switch (extension) {
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

    // 이미지 파일 스트리밍
    const fileStream = fs.createReadStream(file.thumbnailPath);
    
    return new NextResponse(fileStream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Length': stats.size.toString(),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 24시간 캐시
      }
    });

  } catch (error) {
    console.error('썸네일 스트리밍 오류:', error);
    // 오류 발생 시에도 투명한 1x1 픽셀 GIF 반환
    const transparentPixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    return new NextResponse(transparentPixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': transparentPixel.length.toString(),
        'Cache-Control': 'public, max-age=86400', // 24시간 캐시
      }
    });
  }
}