// リファクタリングされたFaceTrackerコンポーネント

import React, { useRef } from 'react';
import { FaceTrackerProps } from '../types/faceTracker';
import { CAMERA_CONFIG } from '../constants/faceTracker';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { useFallbackTracking } from '../hooks/useFallbackTracking';

/**
 * 顔認識を行うコンポーネント
 * MediaPipeを使用して顔のランドマークを検出し、
 * 目の開閉、口の動き、頭の位置を追跡します。
 */
const FaceTracker: React.FC<FaceTrackerProps> = ({ onTrackingUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // MediaPipeを使用した顔認識処理
  const { libraryState } = useMediaPipe(videoRef, onTrackingUpdate);

  // MediaPipeでエラーが発生した場合のフォールバック処理
  const shouldUseFallback = libraryState.error !== null;
  useFallbackTracking(shouldUseFallback, onTrackingUpdate);

  return (
    <div 
      style={{ display: 'none' }}
      aria-label="Face tracking camera feed"
    >
      <video
        ref={videoRef}
        width={CAMERA_CONFIG.width}
        height={CAMERA_CONFIG.height}
        playsInline
        muted
        autoPlay
        aria-label="Face tracking video input"
      />
      <canvas
        ref={canvasRef}
        width={CAMERA_CONFIG.width}
        height={CAMERA_CONFIG.height}
        aria-label="Face tracking canvas overlay"
      />
      
      {/* 開発環境での状態表示 */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          position: 'fixed', 
          top: 10, 
          right: 10, 
          backgroundColor: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          zIndex: 9999
        }}>
          <div>MediaPipe Status:</div>
          <div>Loading: {libraryState.isLoading ? 'Yes' : 'No'}</div>
          <div>Loaded: {libraryState.isLoaded ? 'Yes' : 'No'}</div>
          <div>Error: {libraryState.error || 'None'}</div>
          <div>Fallback: {shouldUseFallback ? 'Active' : 'Inactive'}</div>
        </div>
      )}
    </div>
  );
};

export default FaceTracker;