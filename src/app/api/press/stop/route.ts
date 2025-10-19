import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pressId, pressName, stoppedAt, reason, operator } = body;

    // 필수 필드 검증
    if (!pressId || !pressName || !stoppedAt) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다. (pressId, pressName, stoppedAt)' },
        { status: 400 }
      );
    }

    // 프레스 ID 형식 검증
    if (!pressId.match(/^press-\d+$/)) {
      return NextResponse.json(
        { error: '올바르지 않은 프레스 ID 형식입니다.' },
        { status: 400 }
      );
    }

    // 정지 시간 파싱 및 검증
    const stopTime = new Date(stoppedAt);
    if (isNaN(stopTime.getTime())) {
      return NextResponse.json(
        { error: '올바르지 않은 정지 시간 형식입니다.' },
        { status: 400 }
      );
    }

    // 프레스 정지 기록 저장
    const pressStopRecord = await prisma.pressStopRecord.create({
      data: {
        pressId,
        pressName,
        stoppedAt: stopTime,
        reason: reason || null,
        operator: operator || null,
      },
    });

    // 성공 응답
    return NextResponse.json({
      success: true,
      message: '프레스 정지 기록이 성공적으로 저장되었습니다.',
      data: {
        id: pressStopRecord.id,
        pressId: pressStopRecord.pressId,
        pressName: pressStopRecord.pressName,
        stoppedAt: pressStopRecord.stoppedAt,
        reason: pressStopRecord.reason,
        operator: pressStopRecord.operator,
        createdAt: pressStopRecord.createdAt,
      },
    });

  } catch (error) {
    console.error('프레스 정지 기록 저장 오류:', error);
    
    return NextResponse.json(
      { 
        error: '프레스 정지 기록 저장 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 프레스 정지 기록 조회 (GET)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pressId = searchParams.get('pressId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 쿼리 조건 구성
    const where = pressId ? { pressId } : {};

    // 프레스 정지 기록 조회
    const records = await prisma.pressStopRecord.findMany({
      where,
      orderBy: {
        stoppedAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // 전체 개수 조회
    const totalCount = await prisma.pressStopRecord.count({ where });

    return NextResponse.json({
      success: true,
      data: {
        records,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      },
    });

  } catch (error) {
    console.error('프레스 정지 기록 조회 오류:', error);
    
    return NextResponse.json(
      { 
        error: '프레스 정지 기록 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
