const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('데이터베이스 시드 데이터를 삽입합니다...');

    // 샘플 작업자 데이터 삽입
    const sampleWorkers = [
      {
        name: '김철수',
        birthDate: new Date('2020-03-18'),
        equipmentId: 'A0001',
        workField: '용접',
        affiliation: 'Axis Building',
        healthPrecautions: '-'
      },
      {
        name: '김철수',
        birthDate: new Date('2020-03-18'),
        equipmentId: 'A0002',
        workField: '용접',
        affiliation: 'Axis Building',
        healthPrecautions: '-'
      },
      {
        name: '김철수',
        birthDate: new Date('2020-03-18'),
        equipmentId: 'A0003',
        workField: '용접',
        affiliation: 'Axis Building',
        healthPrecautions: '-'
      },
      {
        name: '김철수',
        birthDate: new Date('2020-03-18'),
        equipmentId: 'A0004',
        workField: '용접',
        affiliation: 'Axis Building',
        healthPrecautions: '-'
      },
      {
        name: '김철수',
        birthDate: new Date('2020-03-18'),
        equipmentId: 'A0005',
        workField: '용접',
        affiliation: 'Axis Building',
        healthPrecautions: '-'
      },
      {
        name: '김철수',
        birthDate: new Date('2020-03-18'),
        equipmentId: 'A0006',
        workField: '용접',
        affiliation: 'Axis Building',
        healthPrecautions: '-'
      },
      {
        name: '김철수',
        birthDate: new Date('2020-03-18'),
        equipmentId: 'A0007',
        workField: '용접',
        affiliation: 'Axis Building',
        healthPrecautions: '-'
      },
      {
        name: '김철수',
        birthDate: new Date('2020-03-18'),
        equipmentId: 'A0008',
        workField: '용접',
        affiliation: 'Axis Building',
        healthPrecautions: '-'
      }
    ];

    for (const workerData of sampleWorkers) {
      await prisma.worker.upsert({
        where: { equipmentId: workerData.equipmentId },
        update: {},
        create: workerData,
      });
    }

    // 샘플 CCTV 스트림 데이터 삽입
    const sampleCCTVStreams = [
      {
        name: 'A동 출입구',
        description: 'A동 메인 출입구 CCTV',
        streamUrl: 'http://192.168.1.100:8080/stream',
        location: 'A동 1층',
        isActive: true,
        order: 1
      },
      {
        name: 'B동 작업장',
        description: 'B동 작업장 CCTV',
        streamUrl: 'http://192.168.1.101:8080/stream',
        location: 'B동 2층',
        isActive: true,
        order: 2
      },
      {
        name: '주차장',
        description: '주차장 감시 CCTV',
        streamUrl: 'http://192.168.1.102:8080/stream',
        location: '지하 주차장',
        isActive: true,
        order: 3
      }
    ];

    for (const cctvData of sampleCCTVStreams) {
      // 기존 데이터가 있는지 확인
      const existing = await prisma.cctvStream.findFirst({
        where: { name: cctvData.name }
      });
      
      if (!existing) {
        await prisma.cctvStream.create({
          data: cctvData,
        });
      }
    }

    // 관리자 계정 생성
    await prisma.administrator.upsert({
      where: { username: 'admin001' },
      update: {},
      create: {
        username: 'admin001',
        passwordHash: 'password123', // 실제로는 bcrypt로 해시해야 함
        name: '관리자 001',
        role: 'admin'
      },
    });

    console.log('시드 데이터 삽입이 완료되었습니다!');
    process.exit(0);
  } catch (error) {
    console.error('시드 데이터 삽입 중 오류가 발생했습니다:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
