import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { DownloadQueue } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 진행중이거나 대기중인 다운로드 큐 조회
    const queues = await prisma.downloadQueue.findMany({
      where: {
        status: {
          in: ['pending', 'processing']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      queues: queues.map((queue: DownloadQueue) => {
        // error 필드에 저장된 JSON options을 파싱
        let options: Record<string, unknown> = {};
        try {
          if (queue.error && queue.error.startsWith('{')) {
            options = JSON.parse(queue.error) as Record<string, unknown>;
          }
        } catch {
          // JSON 파싱 실패 시 빈 객체 사용
        }
        
        return {
          id: queue.id,
          status: queue.status,
          progress: queue.progress,
          type: queue.type,
          url: queue.url,
          createdAt: queue.createdAt,
          updatedAt: queue.updatedAt,
          options
        };
      })
    });
  } catch (error) {
    console.error('다운로드 상태 조회 오류:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 