'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, Bell, TrendingUp, TrendingDown, Clock, Wrench, Mountain, AlertTriangle, History, Eye, Vibrate } from 'lucide-react';
import EmergencyPopup from './EmergencyPopup';
import { useRouter } from 'next/navigation';

interface DetectionEvent {
  time: string;
  message: string;
}

interface AttendanceWorker {
  id: number;
  name: string;
  workField: string;
  checkInTime: string;
  equipmentId: string;
  createdAt: string;
}

interface AlertMessage {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  isActive: boolean;
}

interface EmergencyRecord {
  id: number;
  type: string;
  title: string;
  description: string;
  location: string;
  severity: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  sop: {
    name: string;
    type: string;
  };
  executions: Array<{
    id: number;
    stepNumber: number;
    status: string;
    executedAt?: string;
    notes?: string;
    step: {
      title: string;
      stepNumber: number;
    };
  }>;
}

interface CctvStream {
  id: number;
  name: string;
  description?: string;
  streamUrl: string;
  location?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState('');
  const [attendanceWorkers, setAttendanceWorkers] = useState<AttendanceWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertMessages, setAlertMessages] = useState<AlertMessage[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true); // 오디오 활성화 상태
  
  const [surveillanceRecords, setSurveillanceRecords] = useState<any[]>([]);


  // 비상 상황 관련 상태
  const [activeEmergency, setActiveEmergency] = useState<any>(null);
  const [showEmergencyPopup, setShowEmergencyPopup] = useState(false);
  
  // 비상상황 기록 상태
  const [emergencyRecords, setEmergencyRecords] = useState<EmergencyRecord[]>([]);
  
  // CCTV 스트림 상태 (동적으로 가져온 URL 사용)
  const [cctvStreams, setCctvStreams] = useState<CctvStream[]>([]);
  
  // 날씨 정보 상태
  const [weatherInfo, setWeatherInfo] = useState<{
    temperature: number;
    description: string;
    emoji: string;
    humidity: number;
    windSpeed: number;
    location: string;
  } | null>(null);
  
  // 테스트 도구 토글 상태
  const [isTestToolsExpanded, setIsTestToolsExpanded] = useState(false);
  
  // 센서 카드 편집 모드 상태
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedSensor, setDraggedSensor] = useState<string | null>(null);
  
  // 센서 카드 위치 상태
  const [sensorPositions, setSensorPositions] = useState<{[key: string]: {top: number, left: number, status: string}}>({
    'press-1': { top: 20, left: 43, status: 'safe' },
    'press-2': { top: 20, left: 48, status: 'safe' },
    'press-3': { top: 20, left: 52, status: 'safe' },
    'press-4': { top: 20, left: 56, status: 'safe' },
    'crane-a-1': { top: 20, left: 31, status: 'safe' },
    'crane-a-2': { top: 20, left: 61, status: 'safe' },
    'press-5': { top: 57, left: 41, status: 'danger' },
    'press-6': { top: 57, left: 45, status: 'danger' },
    'crane-b-1': { top: 66, left: 28, status: 'safe' },
    'crane-b-2': { top: 66, left: 49, status: 'safe' },
    'cctv-1': { top: 20, left: 71, status: 'normal' },
    'cctv-2': { top: 66, left: 85, status: 'normal' }
  });

  // 비디오 스트림 관련 상태
  const [streamError, setStreamError] = useState<{[key: string]: string | null}>({
    cctv001: null,
    cctv002: null,
    cctv003: null
  });
  const [isStreamLoading, setIsStreamLoading] = useState<{[key: string]: boolean}>({
    cctv001: true,
    cctv002: true,
    cctv003: true
  });
  const [isStreamPaused, setIsStreamPaused] = useState<{[key: string]: boolean}>({
    cctv001: false,
    cctv002: false,
    cctv003: false
  });
  const [streamStats, setStreamStats] = useState<{[key: string]: {memoryUsage: number, frameCount: number}}>({
    cctv001: {memoryUsage: 0, frameCount: 0},
    cctv002: {memoryUsage: 0, frameCount: 0},
    cctv003: {memoryUsage: 0, frameCount: 0}
  });
  const videoRefs = useRef<{[key: string]: HTMLVideoElement | null}>({
    cctv001: null,
    cctv002: null,
    cctv003: null
  });
  const imageRefs = useRef<{[key: string]: HTMLImageElement | null}>({
    cctv001: null,
    cctv002: null,
    cctv003: null
  });

  // 알림 메시지 추가 함수
  const addAlertMessage = (alert: Omit<AlertMessage, 'id' | 'timestamp'>) => {
    const newAlert: AlertMessage = {
      ...alert,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setAlertMessages(prev => [newAlert, ...prev]);
    
    // 활성 알림인 경우에만 소리 재생
    if (alert.isActive) {
      playAlertSound(alert.type);
    }
  };

  // 알림 메시지 제거 함수
  const removeAlertMessage = (id: string) => {
    setAlertMessages(prev => prev.filter(alert => alert.id !== id));
  };

  // 비상 상황 처리 함수들
  const handleEmergencyProtocol = async (type: string) => {
    try {
      // 먼저 해당 상황에 맞는 알림 생성
      const alertType = getAlertTypeForEmergency(type);
      addAlertMessage({
        type: alertType,
        title: getEmergencyTitle(type),
        message: getEmergencyDescription(type),
        isActive: true
      });

      // 해당 유형의 SOP 조회
      const sopResponse = await fetch(`/api/emergency/sops?type=${type}`);
      const sopData = await sopResponse.json();
      
      if (sopData.success && sopData.data.length > 0) {
        const sop = sopData.data[0]; // 첫 번째 활성 SOP 사용
        
        // 비상 상황 기록 생성
        const incidentResponse = await fetch('/api/emergency/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sopId: sop.id,
            type: type,
            title: getEmergencyTitle(type),
            description: getEmergencyDescription(type),
            location: '작업장',
            severity: getSeverityForEmergency(type)
          })
        });

        if (incidentResponse.ok) {
          const incidentData = await incidentResponse.json();
          setActiveEmergency(incidentData.data.incident);
          setShowEmergencyPopup(true);
        }
      }
    } catch (error) {
      console.error('비상 상황 처리 실패:', error);
    }
  };

  const getAlertTypeForEmergency = (type: string): 'danger' | 'warning' | 'info' => {
    const alertTypes: {[key: string]: 'danger' | 'warning' | 'info'} = {
      safety_equipment: 'warning',
      crane_worker: 'warning',
      fire_explosion: 'danger'
    };
    return alertTypes[type] || 'danger';
  };

  const getSeverityForEmergency = (type: string) => {
    const severities = {
      safety_equipment: 'medium',
      crane_worker: 'medium',
      fire_explosion: 'critical'
    };
    return severities[type as keyof typeof severities] || 'high';
  };

  const getEmergencyTitle = (type: string) => {
    const titles = {
      safety_equipment: '안전장구 미착용 감지',
      crane_worker: '크레인 작업 반경 침입',
      fire_explosion: '화재/폭발 위험 감지'
    };
    return titles[type as keyof typeof titles] || '비상 상황 발생';
  };

  const getEmergencyDescription = (type: string) => {
    const descriptions = {
      safety_equipment: '작업자가 안전장구를 착용하지 않은 상태로 감지되었습니다.',
      crane_worker: '크레인 작업 반경 내에 작업자가 진입했습니다.',
      fire_explosion: 'CCTV에서 화재/폭발 위험이 감지되었습니다.'
    };
    return descriptions[type as keyof typeof descriptions] || '비상 상황이 발생했습니다.';
  };

  const handleEmergencyComplete = async (incidentId?: number) => {
    if (incidentId) {
      // 비상 상황 완료 시
      setActiveEmergency(null);
      setShowEmergencyPopup(false);
      // 완료된 비상 상황에 대한 알림 추가
      addAlertMessage({
        type: 'info',
        title: '비상 상황 완료',
        message: '비상 상황이 성공적으로 처리되었습니다.',
        isActive: true
      });
      // 비상상황 기록 새로고침
      fetchEmergencyRecords();
    } else {
      // 단계 완료 시 - 현재 비상 상황 데이터 새로고침
      if (activeEmergency) {
        try {
          const response = await fetch(`/api/emergency/incidents/${activeEmergency.id}`);
          if (response.ok) {
            const data = await response.json();
            setActiveEmergency(data.data);
          }
        } catch (error) {
          console.error('비상 상황 데이터 새로고침 실패:', error);
        }
      }
      // 비상상황 기록도 새로고침
      fetchEmergencyRecords();
    }
  };

  // 진행중인 비상상황 클릭 시 EmergencyPopup 열기
  const handleContinueEmergency = async (record: EmergencyRecord) => {
    try {
      // 해당 비상상황의 최신 데이터를 가져와서 EmergencyPopup에 표시
      const response = await fetch(`/api/emergency/incidents/${record.id}`);
      if (response.ok) {
        const data = await response.json();
        setActiveEmergency(data.data);
        setShowEmergencyPopup(true);
      }
    } catch (error) {
      console.error('비상상황 데이터 조회 실패:', error);
    }
  };

  // 알림 메시지 비활성화 함수
  const deactivateAlert = (id: string) => {
    setAlertMessages(prev => 
      prev.map(alert => 
        alert.id === id ? { ...alert, isActive: false } : alert
      )
    );
  };

  // 출근 작업자 데이터 가져오기
  const fetchAttendanceWorkers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/workers/attendance');
      const result = await response.json();
      
      if (result.success) {
        setAttendanceWorkers(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('출근 작업자 데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 감시 기록 데이터 가져오기
  const fetchSurveillanceRecords = async () => {
    try {
      const response = await fetch('/api/surveillance-records?limit=5');
      const result = await response.json();
      
      if (result.success) {
        setSurveillanceRecords(result.data);
      }
    } catch (err) {
      console.error('감시 기록 데이터를 가져오는 중 오류가 발생했습니다:', err);
    }
  };



  const fetchEmergencyRecords = async () => {
    try {
      const response = await fetch('/api/emergency/incidents?limit=5');
      const result = await response.json();
      
      if (result.success) {
        setEmergencyRecords(result.data);
        
        // 활성화된 비상상황이 있고 현재 팝업이 열려있지 않으면 자동으로 팝업 표시
        const activeEmergency = result.data.find((record: any) => 
          record.status === 'active' && !showEmergencyPopup
        );
        
        if (activeEmergency) {
          setActiveEmergency(activeEmergency);
          setShowEmergencyPopup(true);
        }
      }
    } catch (err) {
      console.error('비상상황 기록 데이터를 가져오는 중 오류가 발생했습니다:', err);
    }
  };

  const fetchWeatherInfo = async () => {
    try {
      const response = await fetch('/api/weather');
      const result = await response.json();
      
      if (result.success) {
        setWeatherInfo(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('날씨 정보를 가져오는 중 오류가 발생했습니다:', err);
      // 에러 시 기본값 설정
      setWeatherInfo({
        temperature: 25,
        description: '맑음',
        emoji: '☀️',
        humidity: 60,
        windSpeed: 3,
        location: '경남 창원시 마산합포구 진북면'
      });
    }
  };

  // CCTV 스트림 데이터 가져오기
  const fetchCctvStreams = async () => {
    try {
      const response = await fetch('/api/cctv');
      const result = await response.json();
      
      if (result.success) {
        setCctvStreams(result.streams);
      }
    } catch (error) {
      console.error('CCTV 스트림 데이터 가져오기 실패:', error);
    }
  };

  // 진동 신호 보내기
  const handleVibrate = async (equipmentId: string, workerName: string) => {
    try {
      const response = await fetch('/api/beacon-vibrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ equipmentId }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`${workerName}님의 장비(${equipmentId})에 진동 신호를 보냈습니다.`);
      } else {
        alert(`진동 신호 전송 실패: ${result.message || result.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('진동 신호 전송 오류:', error);
      alert('진동 신호 전송 중 오류가 발생했습니다.');
    }
  };

  // 스트림 일시정지/재개 (이미지 스트림용)
  const toggleStreamPause = (cameraId: string) => {
    const img = imageRefs.current[cameraId];
    if (!img) return;

    const isPaused = isStreamPaused[cameraId];
    
    if (isPaused) {
      // 재개 - 이미지 새로고침 재시작
      const stream = cctvStreams.find(s => s.isActive && s.order === parseInt(cameraId.replace('cctv', '')));
      if (stream) {
        const refreshInterval = setInterval(() => {
          if (img.parentNode) {
            img.src = stream.streamUrl + '?t=' + Date.now();
          } else {
            clearInterval(refreshInterval);
          }
        }, 1000);
        (img as any).refreshInterval = refreshInterval;
      }
      setIsStreamPaused(prev => ({ ...prev, [cameraId]: false }));
      console.log(`스트림 재개: ${cameraId}`);
    } else {
      // 일시정지 - 이미지 새로고침 중지
      if ((img as any).refreshInterval) {
        clearInterval((img as any).refreshInterval);
        (img as any).refreshInterval = null;
      }
      setIsStreamPaused(prev => ({ ...prev, [cameraId]: true }));
      console.log(`스트림 일시정지: ${cameraId}`);
    }
  };

  // 스트림 정리 (메모리 절약)
  const cleanupStream = (cameraId: string) => {
    const img = imageRefs.current[cameraId];
    
    if (img) {
      try {
        // 새로고침 인터벌 정리
        if ((img as any).refreshInterval) {
          clearInterval((img as any).refreshInterval);
        }
        
        // 이미지 소스 제거
        img.src = '';
        
        // ref에서 제거
        imageRefs.current[cameraId] = null;
        
        console.log(`이미지 스트림 정리 완료: ${cameraId}`);
      } catch (error) {
        console.error(`스트림 정리 오류 (${cameraId}):`, error);
      }
    }
  };


  // 이미지 스트림 초기화 (실시간 이미지)
  const initializeImageStream = (cameraId: string) => {
    // 데이터베이스에서 가져온 CCTV 스트림 사용
    const stream = cctvStreams.find(s => s.isActive && s.order === parseInt(cameraId.replace('cctv', '')));
    if (!stream) {
      console.warn(`CCTV 스트림을 찾을 수 없습니다: ${cameraId}`);
      setStreamError(prev => ({ ...prev, [cameraId]: '스트림을 찾을 수 없습니다' }));
      setIsStreamLoading(prev => ({ ...prev, [cameraId]: false }));
      return;
    }

    const streamUrl = stream.streamUrl;

    // 이미지 요소 생성
    const img = document.createElement('img');
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.display = 'block';
    img.style.margin = 'auto';
    img.style.backgroundColor = 'hsl(0, 0%, 25%)';
    img.alt = `CCTV ${cameraId}`;
    
    // ref에 저장
    imageRefs.current[cameraId] = img;

    // 이미지 로드 이벤트
    img.onload = () => {
      console.log(`이미지 스트림 로드 완료: ${cameraId}`);
      setIsStreamLoading(prev => ({ ...prev, [cameraId]: false }));
      setStreamError(prev => ({ ...prev, [cameraId]: null }));
      setIsStreamPaused(prev => ({ ...prev, [cameraId]: false }));
    };

    img.onerror = () => {
      console.error(`이미지 스트림 오류 (${cameraId}):`, streamUrl);
      setStreamError(prev => ({ ...prev, [cameraId]: `스트림 서버에 연결할 수 없습니다 (${streamUrl})` }));
      setIsStreamLoading(prev => ({ ...prev, [cameraId]: false }));
    };

    // 이미지 소스 설정
    img.src = streamUrl;
    
    // 실시간 업데이트를 위한 주기적 새로고침 (1초마다)
    const refreshInterval = setInterval(() => {
      if (img.parentNode) {
        img.src = streamUrl + '?t=' + Date.now();
      } else {
        clearInterval(refreshInterval);
      }
    }, 1000);

    // 정리 함수 저장
    (img as any).refreshInterval = refreshInterval;
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formattedTime = now.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) + ' ' + now.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      setCurrentTime(formattedTime);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    // 출근 작업자 데이터 가져오기
    fetchAttendanceWorkers();
    // 감시 기록 데이터 가져오기
    fetchSurveillanceRecords();
    // 비상상황 기록 데이터 가져오기
    fetchEmergencyRecords();
    // 날씨 정보 가져오기
    fetchWeatherInfo();
    // CCTV 스트림 데이터 가져오기
    fetchCctvStreams();

    // 비상상황 체크 (5초마다)
    const emergencyInterval = setInterval(() => {
      fetchEmergencyRecords();
    }, 5000);

    // 날씨 정보 업데이트 (10분마다)
    const weatherInterval = setInterval(() => {
      fetchWeatherInfo();
    }, 600000); // 10분 = 600,000ms

    // 이미지 스트림 초기화 (CCTV 스트림 데이터 로드 후)
    const streamInitTimeout = setTimeout(() => {
      // 활성화된 CCTV 스트림들을 순서대로 초기화
      cctvStreams
        .filter(stream => stream.isActive)
        .sort((a, b) => a.order - b.order)
        .forEach((stream, index) => {
          const cameraId = `cctv${String(index + 1).padStart(3, '0')}`;
          initializeImageStream(cameraId);
        });
    }, 2000); // 2초 후 스트림 초기화 (CCTV 데이터 로드 대기)

     // 시뮬레이션: 안전 관련 알림 추가 (테스트 도구가 펼쳐져 있을 때만)
     const alertInterval = setInterval(() => {
       if (isTestToolsExpanded) {
         const random = Math.random();
         if (random < 0.05) { // 5% 확률로 위험 알림 생성
           const buildings = ['A동', 'B동', 'C동', 'D동'];
           const building = buildings[Math.floor(Math.random() * buildings.length)];
           
           addAlertMessage({
             type: 'danger',
             title: '안전 위험 감지',
             message: `${building}에서 안전 위험이 감지되었습니다`,
             isActive: true,
           });
         } else if (random < 0.15) { // 10% 확률로 주의 알림 생성
           const buildings = ['A동', 'B동', 'C동', 'D동'];
           const building = buildings[Math.floor(Math.random() * buildings.length)];
           
           addAlertMessage({
             type: 'warning',
             title: '안전 주의',
             message: `${building}에서 안전 주의가 필요합니다`,
             isActive: true,
           });
         }
       }
     }, 30000); // 30초마다 체크

     // 시뮬레이션: 정상화 알림 (테스트 도구가 펼쳐져 있을 때만)
     const normalInterval = setInterval(() => {
       if (isTestToolsExpanded) {
         const random = Math.random();
         if (random < 0.1) { // 10% 확률로 정상화 알림 생성
           const buildings = ['A동', 'B동', 'C동', 'D동'];
           const building = buildings[Math.floor(Math.random() * buildings.length)];
           
           addAlertMessage({
             type: 'info',
             title: '상황 정상화',
             message: `${building} 상황이 정상화되었습니다`,
             isActive: false,
           });
         }
       }
     }, 45000); // 45초마다 체크

    return () => {
      clearInterval(interval);
      clearInterval(alertInterval);
      clearInterval(normalInterval);
      clearInterval(emergencyInterval);
      clearInterval(weatherInterval);
      clearTimeout(streamInitTimeout);
      
      // 이미지 스트림 정리
      Object.keys(imageRefs.current).forEach(cameraId => {
        if (imageRefs.current[cameraId]) {
          cleanupStream(cameraId);
        }
      });
     };
   }, [isTestToolsExpanded]);


  // CCTV 스트림 데이터 가져오기
  useEffect(() => {
    fetchCctvStreams();
  }, []);

  // CCTV 스트림 변경 시 스트림 재초기화
  useEffect(() => {
    if (cctvStreams.length > 0) {
      setTimeout(() => {
        cctvStreams
          .filter(stream => stream.isActive)
          .sort((a, b) => a.order - b.order)
          .forEach((stream, index) => {
            const cameraId = `cctv${String(index + 1).padStart(3, '0')}`;
            initializeImageStream(cameraId);
          });
      }, 1000);
    }
  }, [cctvStreams]); // cctvStreams가 변경될 때마다 실행


  // 현재 활성화된 알림 메시지
  const activeAlert = alertMessages.find(alert => alert.isActive);

  // 테스트용 알림 생성 함수
  const createTestAlert = (type: 'danger' | 'warning' | 'info') => {
    const buildings = ['A동', 'B동', 'C동', 'D동'];
    const building = buildings[Math.floor(Math.random() * buildings.length)];
    
    const alertData = {
      type,
      title: type === 'danger' ? '안전 위험 감지' : type === 'warning' ? '안전 주의' : '상황 정상화',
      message: type === 'info' 
        ? `${building} 상황이 정상화되었습니다`
        : `${building}에서 안전 ${type === 'danger' ? '위험이 감지' : '주의가 필요'}되었습니다`,
      isActive: type !== 'info',
    };
    
    addAlertMessage(alertData);
  };

  // 오디오 알림 재생 함수
  const playAlertSound = (type: 'danger' | 'warning' | 'info') => {
    if (!audioEnabled) return;
    
    try {
      // Web Audio API를 사용하여 알림음 생성
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 알림 타입별 다른 주파수와 지속시간
      const frequency = type === 'danger' ? 800 : type === 'warning' ? 600 : 400;
      const duration = type === 'danger' ? 0.3 : type === 'warning' ? 0.2 : 0.1;
      const beepCount = type === 'danger' ? 3 : type === 'warning' ? 2 : 1;
      
      for (let i = 0; i < beepCount; i++) {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + duration);
        }, i * (duration * 1000 + 100));
      }
    } catch (error) {
      console.log('오디오 재생 실패:', error);
    }
  };

  // 센서 카드 드래그 시작
  const handleDragStart = (e: React.DragEvent, sensorId: string) => {
    if (!isEditMode) return;
    setDraggedSensor(sensorId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // 센서 카드 드롭
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isEditMode || !draggedSensor) return;

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 퍼센트로 변환
    const leftPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const topPercent = Math.max(0, Math.min(100, (y / rect.height) * 100));

    setSensorPositions(prev => ({
      ...prev,
      [draggedSensor]: {
        ...prev[draggedSensor],
        top: topPercent,
        left: leftPercent
      }
    }));

    setDraggedSensor(null);
  };

  // 드래그 오버 이벤트
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // 센서 위치 저장
  const saveSensorPositions = async () => {
    try {
      const response = await fetch('/api/sensor-positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions: sensorPositions })
      });

      if (response.ok) {
        alert('센서 위치가 저장되었습니다.');
        setIsEditMode(false);
      } else {
        alert('저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('센서 위치 저장 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  // 센서 위치 초기화
  const resetSensorPositions = () => {
    if (confirm('센서 위치를 초기값으로 되돌리시겠습니까?')) {
      setSensorPositions({
        'press-1': { top: 20, left: 44, status: 'safe' },
        'press-2': { top: 20, left: 48.3, status: 'safe' },
        'press-3': { top: 20, left: 52.6, status: 'safe' },
        'press-4': { top: 20, left: 56.9, status: 'safe' },
        'crane-a-1': { top: 20, left: 32, status: 'safe' },
        'crane-a-2': { top: 20, left: 62, status: 'safe' },
        'press-5': { top: 57, left: 41, status: 'danger' },
        'press-6': { top: 57, left: 45, status: 'danger' },
        'crane-b-1': { top: 66, left: 28, status: 'safe' },
        'crane-b-2': { top: 66, left: 50, status: 'safe' },
        'cctv-1': { top: 20, left: 71, status: 'normal' },
        'cctv-2': { top: 66, left: 59, status: 'normal' }
      });
    }
  };

  // 센서 위치 불러오기
  const fetchSensorPositions = async () => {
    try {
      const response = await fetch('/api/sensor-positions');
      const result = await response.json();
      
      if (result.success && result.data.positions) {
        setSensorPositions(result.data.positions);
      }
    } catch (error) {
      console.error('센서 위치 불러오기 실패:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* 테스트 버튼 (개발용) */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-blue-800">🧪 비상 상황 테스트 도구</h3>
          <button
            onClick={() => setIsTestToolsExpanded(!isTestToolsExpanded)}
            className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            <span>{isTestToolsExpanded ? '접기' : '펼치기'}</span>
            <span className={`transform transition-transform ${isTestToolsExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
        </div>

        
        {isTestToolsExpanded && (
          <>
            {/* 비상 상황별 테스트 버튼 */}
            <div className="mb-4">
              <h4 className="text-md font-medium text-blue-700 mb-2">비상 상황 SOP 테스트</h4>
              <p className="text-xs text-gray-600 mb-3">각 버튼을 클릭하면 해당 비상 상황의 SOP 팝업이 실행됩니다.</p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleEmergencyProtocol('safety_equipment')}
                  className="bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 transition-colors text-sm flex flex-col items-center group relative"
                  title="작업자가 안전장구를 착용하지 않은 상태로 감지되었을 때의 대응 절차를 테스트합니다."
                >
                  <span className="font-semibold">⚠️ 안전장구 미착용</span>
                  <span className="text-xs opacity-90">4단계 SOP</span>
                  <span className="text-xs opacity-75 mt-1">작업 중단 → 안전장구 착용 → 교육 → 작업 재개</span>
                </button>
                <button 
                  onClick={() => handleEmergencyProtocol('crane_worker')}
                  className="bg-yellow-600 text-white px-4 py-3 rounded-lg hover:bg-yellow-700 transition-colors text-sm flex flex-col items-center group relative"
                  title="크레인 작업 반경 내에 작업자가 진입했을 때의 대응 절차를 테스트합니다."
                >
                  <span className="font-semibold">🏗️ 크레인 반경 침입</span>
                  <span className="text-xs opacity-90">4단계 SOP</span>
                  <span className="text-xs opacity-75 mt-1">크레인 중단 → 작업자 대피 → 안전 확인 → 작업 재개</span>
                </button>
              </div>
            </div>

            {/* 기존 알림 테스트 버튼 */}
            <div className="mb-3">
              <h4 className="text-md font-medium text-blue-700 mb-2">일반 알림 테스트</h4>
              <div className="flex space-x-2">
                <button 
                  onClick={() => createTestAlert('danger')}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  위험 알림 생성
                </button>
                <button 
                  onClick={() => createTestAlert('warning')}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                >
                  주의 알림 생성
                </button>
                <button 
                  onClick={() => createTestAlert('info')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  정상화 알림 생성
                </button>
                <button 
                  onClick={() => setAlertMessages([])}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  모든 알림 제거
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">🔊 오디오 알림:</span>
                  <button 
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      audioEnabled 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-gray-400 text-white hover:bg-gray-500'
                    }`}
                  >
                    {audioEnabled ? '켜짐' : '꺼짐'}
                  </button>
                </div>
                <button 
                  onClick={() => playAlertSound('danger')}
                  className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition-colors"
                >
                  🔊 소리 테스트
                </button>
              </div>
              
              {/* 비상 상황 기록 상태 */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">📊 비상 상황 기록:</span>
                <button 
                  onClick={() => window.open('/emergency', '_blank')}
                  className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition-colors"
                >
                  관리 페이지 열기
                </button>
                <button 
                  onClick={() => {
                    // 모든 비상 상황 기록 삭제 (테스트용)
                    if (confirm('모든 비상 상황 기록을 삭제하시겠습니까? (테스트용)')) {
                      fetch('/api/emergency/incidents', { method: 'DELETE' })
                        .then(() => {
                          alert('비상 상황 기록이 삭제되었습니다.');
                        })
                        .catch(() => {
                          alert('삭제에 실패했습니다.');
                        });
                    }
                  }}
                  className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
                >
                  기록 초기화
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 알림 메시지 영역 */}
      {activeAlert && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">{activeAlert.title}</h3>
                <p className="text-red-700">{activeAlert.message}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => handleEmergencyProtocol('fire_explosion')}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                비상 프로토콜 실행
              </button>
              <button 
                onClick={() => deactivateAlert(activeAlert.id)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                경고 방송
              </button>
              <button 
                onClick={() => removeAlertMessage(activeAlert.id)}
                className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                알람 해제
              </button>
            </div>
          </div>
        </div>
      )}


      <div className="grid grid-cols-5 gap-6">
        {/* 왼쪽 20% - 실시간 CCTV와 비상상황 기록 */}
        <div className="col-span-1 space-y-6">
          {/* 실시간 CCTV */}
          <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">실시간 CCTV</h3>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="space-y-4">
              {/* A동 출입구 - RTSP 스트림 */}
              <div className="relative">
                  <div className="bg-gray-900 rounded-lg h-[200px] flex items-center justify-center relative overflow-hidden">
                  {isStreamLoading.cctv001 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                      <div className="text-white text-sm">스트림 로딩 중...</div>
                    </div>
                  )}
                  
                  {streamError.cctv001 ? (
                    <div className="text-red-400 text-sm text-center">
                      <div className="mb-2">스트림 연결 실패</div>
                      <div className="text-xs text-gray-400">{streamError.cctv001}</div>
                      <div className="text-xs text-gray-500 mt-1">스트림 서버가 실행 중인지 확인해주세요</div>
                      <button 
                        onClick={() => {
                          // 기존 스트림 완전 정리
                          cleanupStream('cctv001');
                          // 상태 초기화
                          setStreamError(prev => ({ ...prev, cctv001: null }));
                          setIsStreamLoading(prev => ({ ...prev, cctv001: true }));
                          setIsStreamPaused(prev => ({ ...prev, cctv001: false }));
                          // 1초 후 재연결
                          setTimeout(() => {
                            initializeImageStream('cctv001');
                          }, 1000);
                        }}
                        className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        재연결
                      </button>
                    </div>
                  ) : (
                    <div
                      ref={(el) => { 
                        if (el && imageRefs.current.cctv001) {
                          el.appendChild(imageRefs.current.cctv001);
                        }
                      }}
                      className="w-full h-full"
                    />
                  )}
                </div>
                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                  UNSAFETY
                </div>
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                  SAFETY
                </div>
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  A동 출입구
                </div>
                <div className="absolute top-2 left-2 flex space-x-1">
                  <button
                    onClick={() => toggleStreamPause('cctv001')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                    title={isStreamPaused.cctv001 ? '재개' : '일시정지'}
                  >
                    {isStreamPaused.cctv001 ? '▶️' : '⏸️'}
                  </button>
                  <button
                    onClick={() => {
                      // 기존 스트림 완전 정리
                      cleanupStream('cctv001');
                      // 상태 초기화
                      setStreamError(prev => ({ ...prev, cctv001: null }));
                      setIsStreamLoading(prev => ({ ...prev, cctv001: true }));
                      setIsStreamPaused(prev => ({ ...prev, cctv001: false }));
                      // 1초 후 재연결
                      setTimeout(() => {
                        initializeImageStream('cctv001');
                      }, 1000);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                    title="재연결"
                  >
                    🔄
                  </button>
                  <button
                    onClick={() => cleanupStream('cctv001')}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                    title="정리"
                  >
                    🗑️
                  </button>
                </div>
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {streamStats.cctv001.memoryUsage}MB | {streamStats.cctv001.frameCount}프레임
                </div>
              </div>
              
              {/* B동 출입구 - RTSP 스트림 */}
              <div className="relative">
                  <div className="bg-gray-900 rounded-lg h-[200px] flex items-center justify-center relative overflow-hidden">
                  {isStreamLoading.cctv002 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                      <div className="text-white text-sm">스트림 로딩 중...</div>
                    </div>
                  )}
                  
                  {streamError.cctv002 ? (
                    <div className="text-red-400 text-sm text-center">
                      <div className="mb-2">스트림 연결 실패</div>
                      <div className="text-xs text-gray-400">{streamError.cctv002}</div>
                      <div className="text-xs text-gray-500 mt-1">스트림 서버가 실행 중인지 확인해주세요</div>
                      <button 
                        onClick={() => {
                          // 기존 스트림 완전 정리
                          cleanupStream('cctv002');
                          // 상태 초기화
                          setStreamError(prev => ({ ...prev, cctv002: null }));
                          setIsStreamLoading(prev => ({ ...prev, cctv002: true }));
                          setIsStreamPaused(prev => ({ ...prev, cctv002: false }));
                          // 1초 후 재연결
                          setTimeout(() => {
                            initializeImageStream('cctv002');
                          }, 1000);
                        }}
                        className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        재연결
                      </button>
                    </div>
                  ) : (
                    <div
                      ref={(el) => { 
                        if (el && imageRefs.current.cctv002) {
                          el.appendChild(imageRefs.current.cctv002);
                        }
                      }}
                      className="w-full h-full"
                    />
                  )}
                </div>
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  B동 출입구
                </div>
                <div className="absolute top-2 left-2 flex space-x-1">
                  <button
                    onClick={() => toggleStreamPause('cctv002')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                    title={isStreamPaused.cctv002 ? '재개' : '일시정지'}
                  >
                    {isStreamPaused.cctv002 ? '▶️' : '⏸️'}
                  </button>
                  <button
                    onClick={() => {
                      // 기존 스트림 완전 정리
                      cleanupStream('cctv002');
                      // 상태 초기화
                      setStreamError(prev => ({ ...prev, cctv002: null }));
                      setIsStreamLoading(prev => ({ ...prev, cctv002: true }));
                      setIsStreamPaused(prev => ({ ...prev, cctv002: false }));
                      // 1초 후 재연결
                      setTimeout(() => {
                        initializeImageStream('cctv002');
                      }, 1000);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                    title="재연결"
                  >
                    🔄
                  </button>
                  <button
                    onClick={() => cleanupStream('cctv002')}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                    title="정리"
                  >
                    🗑️
                  </button>
                </div>
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {streamStats.cctv002.memoryUsage}MB | {streamStats.cctv002.frameCount}프레임
                </div>
              </div>
                    </div>
            </div>
          </div>

          {/* 비상상황 기록 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">비상상황 기록</h3>
              <div className="flex items-center gap-2">
                      <button 
                  onClick={fetchEmergencyRecords}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  새로고침
                      </button>
                <button 
                  onClick={() => router.push('/emergency/records')}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <History className="w-4 h-4" />
                  전체보기
                </button>
                </div>
                </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="max-h-48 overflow-y-auto space-y-3 pr-2">
                {emergencyRecords.length > 0 ? (
                  emergencyRecords.map((record, index) => {
                    const isActive = record.status === 'active' || record.status === 'in_progress';
                    const completedSteps = record.executions.filter(exec => exec.status === 'completed').length;
                    const totalSteps = record.executions.length;
                    
                    return (
                      <div 
                        key={record.id || index} 
                        className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-gray-50 hover:bg-gray-100 cursor-pointer border-l-4 border-red-500' 
                            : 'bg-gray-50'
                        }`}
                        onClick={isActive ? () => handleContinueEmergency(record) : undefined}
                      >
                        <div className="flex-shrink-0">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            record.severity === 'critical' ? 'bg-purple-500' :
                            record.severity === 'high' ? 'bg-red-500' :
                            record.severity === 'medium' ? 'bg-yellow-500' :
                            'bg-blue-500'
                          }`}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm font-medium truncate ${
                              isActive ? 'text-red-900' : 'text-gray-900'
                            }`}>
                              {record.title}
                              {isActive && (
                                <span className="ml-2 text-xs text-red-600 font-normal">
                                  (클릭하여 계속 진행)
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(record.startedAt).toLocaleString('ko-KR')}
                            </p>
                            <span className="text-xs text-gray-500">
                              완료: {completedSteps}/{totalSteps}단계
                            </span>
                            {!isActive && (
                  <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/emergency/records/${record.id}`);
                                }}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              >
                                <Eye className="w-3 h-3" />
                                상세보기
                  </button>
                            )}
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              record.status === 'active' ? 'bg-red-100 text-red-800' :
                              record.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              record.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {record.status === 'active' ? '진행중' :
                              record.status === 'in_progress' ? '처리중' :
                              record.status === 'completed' ? '완료' : '취소'}
                            </span>
                </div>

                          <div className="flex items-center justify-between mt-2">
                            
                </div>
              </div>
            </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>비상상황 기록이 없습니다.</p>
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>

        {/* 오른쪽 80% - 공장 내 관리 구역 */}
        <div className="col-span-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">공장 내 관리 구역</h3>
              <div className="flex items-center gap-2">
                {!isEditMode ? (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                  >
                    <Wrench className="w-4 h-4" />
                    센서 위치 편집
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveSensorPositions}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      저장
                    </button>
                    <button
                      onClick={resetSensorPositions}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                    >
                      초기화
                    </button>
                    <button
                      onClick={() => setIsEditMode(false)}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div 
              className="bg-white rounded-lg p-6 shadow-sm relative min-h-[500px]"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {/* 공장 지도 이미지 */}
              <div className="flex items-center justify-center">
                <img src="/images/drawing/factory-map.png" alt="공장 내 관리 구역" className="w-[75%] h-auto" />
              </div>
              
              {/* 편집 모드 안내 */}
              {isEditMode && (
                <div className="absolute top-2 left-2 bg-blue-100 border border-blue-300 rounded-lg p-2 text-sm text-blue-800">
                  📝 편집 모드: 센서 카드를 드래그하여 위치를 변경하세요
                </div>
              )}
              
              {/* 센서 카드들 - 동적으로 렌더링 */}
              {Object.entries(sensorPositions).map(([sensorId, position]) => {
                const getSensorInfo = (id: string) => {
                  if (id.startsWith('press')) {
                    const num = id.split('-')[1];
                    return { name: `프레스 #${num}`, status: position.status === 'danger' ? '위험' : '안전' };
                  } else if (id.startsWith('crane')) {
                    const parts = id.split('-');
                    return { name: `크레인 ${parts[1].toUpperCase()}-${parts[2]}`, status: '안전' };
                  } else if (id === 'cctv-1') {
                    return { name: 'CCTV-A동', status: '정상' };
                  } else if (id === 'cctv-2') {
                    return { name: 'CCTV-B동', status: '정상' };
                  }
                  return { name: id, status: '알 수 없음' };
                };

                const sensorInfo = getSensorInfo(sensorId);
                const isDanger = position.status === 'danger';
                const isNormal = position.status === 'normal';
                
                return (
                  <div
                    key={sensorId}
                    className={`absolute rounded-lg p-2 shadow-lg cursor-move transition-all ${
                      isEditMode ? 'hover:shadow-xl hover:scale-105' : ''
                    } ${
                      isDanger ? 'bg-red-100 border-2 border-red-300' :
                      isNormal ? 'bg-blue-100 border-2 border-blue-300' :
                      'bg-green-100 border-2 border-green-300'
                    }`}
                    style={{
                      top: `${position.top}%`,
                      left: `${position.left}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    draggable={isEditMode}
                    onDragStart={(e) => handleDragStart(e, sensorId)}
                  >
                    <div className={`text-xs font-semibold ${
                      isDanger ? 'text-red-800' :
                      isNormal ? 'text-blue-800' :
                      'text-green-800'
                    }`}>
                      {sensorInfo.name}
                    </div>
                    <div className={`text-xs ${
                      isDanger ? 'text-red-600' :
                      isNormal ? 'text-blue-600' :
                      'text-green-600'
                    }`}>
                      {sensorInfo.status}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>


      {/* 출근 작업자 목록 - 좌우 스크롤 */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">출근 작업자 목록</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">출근 작업자 정보를 불러오는 중...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-red-500">{error}</div>
          </div>
        ) : (
          <div className="flex max-w-full">
            <div className="flex overflow-x-auto gap-6">
              {attendanceWorkers.map((worker) => (
                <div key={worker.id} className="border border-gray-200 rounded-lg p-4 flex-shrink-0 bg-white shadow-sm">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <Mountain className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{worker.name}</p>
                      <p className="text-sm text-gray-600">{worker.workField}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>출근 시간: {worker.checkInTime}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Wrench className="w-4 h-4" />
                      <span>장비 번호: {worker.equipmentId?.replace('BEACON_', '') || worker.equipmentId}</span>
                    </div>
                    <div className="flex items-center justify-center pt-2">
                      <button
                        onClick={() => handleVibrate(worker.equipmentId, worker.name)}
                        className="flex items-center space-x-1 bg-orange-500 text-white px-3 py-1 rounded-md hover:bg-orange-600 transition-colors text-sm"
                        title={`${worker.name}님의 장비에 진동 신호 보내기`}
                      >
                        <Vibrate className="w-4 h-4" />
                        <span>진동</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 비상 상황 팝업 */}
      {showEmergencyPopup && (
        <EmergencyPopup
          incident={activeEmergency}
          onClose={() => setShowEmergencyPopup(false)}
          onComplete={handleEmergencyComplete}
        />
      )}
    </div>
  );
}
