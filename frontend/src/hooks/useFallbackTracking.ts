// フォールバック用の擬似トラッキングを管理するカスタムフック

import { useEffect, useRef } from 'react';
import { FaceTrackingData } from '../types/faceTracker';
import { FALLBACK_UPDATE_INTERVAL } from '../constants/faceTracker';
import { generateFallbackTrackingData } from '../utils/faceTrackingCalculations';

/**
 * MediaPipeが利用できない場合のフォールバック処理を管理するカスタムフック
 */
export const useFallbackTracking = (
  isEnabled: boolean,
  onTrackingUpdate: (data: FaceTrackingData) => void
) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    if (isEnabled) {
      // フォールバック処理を開始
      timeRef.current = 0;
      intervalRef.current = setInterval(() => {
        timeRef.current += 0.05;
        const trackingData = generateFallbackTrackingData(timeRef.current);
        onTrackingUpdate(trackingData);
      }, FALLBACK_UPDATE_INTERVAL);
    } else {
      // フォールバック処理を停止
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isEnabled, onTrackingUpdate]);

  return {
    isRunning: intervalRef.current !== null,
  };
};