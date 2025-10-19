'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PressDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pressId = params.id as string;
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [stopSuccess, setStopSuccess] = useState(false);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);

  // 프레스 정보 매핑
  const getPressInfo = (id: string) => {
    const pressMap: { [key: string]: { name: string; number: string } } = {
      'press-1': { name: '프레스 #1', number: '1' },
      'press-2': { name: '프레스 #2', number: '2' },
      'press-3': { name: '프레스 #3', number: '3' },
      'press-4': { name: '프레스 #4', number: '4' },
      'press-5': { name: '프레스 #5', number: '5' },
      'press-6': { name: '프레스 #6', number: '6' },
    };
    return pressMap[id] || { name: '알 수 없는 프레스', number: '0' };
  };

  const pressInfo = getPressInfo(pressId);

  // 최근 정지 기록 불러오기
  const fetchRecentRecords = async () => {
    try {
      const response = await fetch(`/api/press/stop?pressId=${pressId}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setRecentRecords(data.data.records || []);
      }
    } catch (error) {
      console.error('Error fetching recent records:', error);
    }
  };

  // 현재 시간을 1초마다 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 컴포넌트 마운트 시 최근 기록 불러오기
  useEffect(() => {
    fetchRecentRecords();
  }, [pressId]);

  // PRESS STOP 버튼 클릭 핸들러
  const handlePressStop = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setStopSuccess(false);

    try {
      const response = await fetch('/api/press/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pressId: pressId,
          pressName: pressInfo.name,
          stoppedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setStopSuccess(true);
        // 최근 기록 다시 불러오기
        await fetchRecentRecords();
        // 3초 후 성공 메시지 숨기기
        setTimeout(() => {
          setStopSuccess(false);
        }, 3000);
      } else {
        throw new Error('프레스 정지 기록 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error stopping press:', error);
      alert('프레스 정지 기록 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-2 sm:space-x-4 mb-3 sm:mb-4">
            <Link
              href="/press"
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              프레스 목록으로 돌아가기
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{pressInfo.name}</h1>
          <p className="text-sm sm:text-base text-gray-600">프레스 기기 상태 모니터링 및 제어</p>
        </div>

        {/* 현재 시간 표시 */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">현재 시간</h2>
            <div className="text-lg sm:text-2xl font-mono text-blue-600">
              {currentTime.toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              })}
            </div>
          </div>
        </div>

        {/* 프레스 상태 정보 */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">기기 상태</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full"></div>
                <span className="text-xs sm:text-sm font-medium text-green-600">정상 운영</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm sm:text-base text-gray-600">프레스 번호:</span>
                <span className="text-sm sm:text-base font-medium">{pressInfo.number}번</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm sm:text-base text-gray-600">운영 상태:</span>
                <span className="text-sm sm:text-base font-medium text-green-600">정상</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm sm:text-base text-gray-600">마지막 점검:</span>
                <span className="text-sm sm:text-base font-medium">2024-01-15</span>
              </div>
            </div>
          </div>
        </div>

        {/* PRESS STOP 버튼 */}
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
          <div className="mb-4 sm:mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">프레스 정지</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              {pressInfo.name}을(를) 정지하고 기록을 저장합니다.
            </p>
          </div>

          <button
            onClick={handlePressStop}
            disabled={isLoading}
            className={`
              w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-all duration-200
              ${isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-red-600 hover:bg-red-700 active:bg-red-800'
              }
              text-white shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95
            `}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <svg className="animate-spin w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>처리 중...</span>
              </div>
            ) : (
              'PRESS STOP'
            )}
          </button>

          {/* 성공 메시지 */}
          {stopSuccess && (
            <div className="mt-4 p-3 sm:p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm sm:text-base font-medium">프레스 정지 기록이 성공적으로 저장되었습니다.</span>
              </div>
            </div>
          )}
        </div>

        {/* 최근 정지 기록 */}
        <div className="mt-6 sm:mt-8 bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">최근 정지 기록</h3>
          {recentRecords.length > 0 ? (
            <div className="space-y-3">
              {recentRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-medium text-gray-900">{record.pressName}</p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {new Date(record.stoppedAt).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      정지됨
                    </span>
                    {record.reason && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">{record.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm sm:text-base">아직 정지 기록이 없습니다.</p>
              <p className="text-xs sm:text-sm">PRESS STOP 버튼을 눌러 첫 번째 기록을 생성하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
