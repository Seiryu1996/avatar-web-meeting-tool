// リファクタリングされたAvatarCanvasコンポーネント

import React, { useRef, useCallback } from 'react';
import { AvatarCanvasProps, FaceTrackingData } from '../types/avatarCanvas';
import { DEFAULT_AVATAR_CONFIG } from '../constants/avatarCanvas';
import { useAvatarCanvas } from '../hooks/useAvatarCanvas';

/**
 * アバターを描画するキャンバスコンポーネント
 * 顔認識データに基づいてアバターをリアルタイムでアニメーション表示します。
 */
const AvatarCanvas: React.FC<AvatarCanvasProps> = ({
  avatarData,
  className,
  style,
  width = DEFAULT_AVATAR_CONFIG.width,
  height = DEFAULT_AVATAR_CONFIG.height,
  onError,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // AvatarCanvasの状態とレンダリングを管理
  const {
    trackingData,
    imageLoadState,
    isRendering,
    error,
    updateTracking,
    clearError,
  } = useAvatarCanvas({
    avatarData,
    canvasRef,
    config: { width, height },
    onError,
  });

  // FaceTrackerからのトラッキングデータ更新ハンドラー
  const handleTrackingUpdate = useCallback((data: FaceTrackingData) => {
    updateTracking(data);
  }, [updateTracking]);

  // ローディング状態の表示
  const renderLoadingState = () => {
    if (!avatarData) {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width, 
          height,
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '4px',
          color: '#666'
        }}>
          📂 アバターデータを読み込んでください
        </div>
      );
    }

    if (!imageLoadState.isComplete) {
      const progress = imageLoadState.total > 0 
        ? Math.round((imageLoadState.loaded / imageLoadState.total) * 100) 
        : 0;
      
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          width, 
          height,
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '4px',
          color: '#666'
        }}>
          <div>🎨 アバター画像を読み込み中...</div>
          <div style={{ marginTop: '8px', fontSize: '12px' }}>
            {progress}% ({imageLoadState.loaded}/{imageLoadState.total})
          </div>
          {imageLoadState.failed > 0 && (
            <div style={{ marginTop: '4px', fontSize: '11px', color: '#f44336' }}>
              {imageLoadState.failed}個の画像の読み込みに失敗
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // エラー状態の表示
  const renderError = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width,
      height,
      backgroundColor: '#ffebee',
      border: '1px solid #f44336',
      borderRadius: '4px',
      color: '#d32f2f',
      padding: '16px',
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: '8px' }}>⚠️ エラーが発生しました</div>
      <div style={{ fontSize: '12px', marginBottom: '8px' }}>{error}</div>
      <button
        onClick={clearError}
        style={{
          padding: '4px 8px',
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
        エラーをクリア
      </button>
    </div>
  );

  // FaceTrackerコンポーネント
  const FaceTracker = React.lazy(() => import('./FaceTracker'));

  const loadingState = renderLoadingState();
  
  return (
    <div className={className} style={style}>
      <h3>Your Avatar</h3>
      
      {/* 顔認識コンポーネント */}
      <React.Suspense fallback={<div>Face Tracker Loading...</div>}>
        <FaceTracker onTrackingUpdate={handleTrackingUpdate} />
      </React.Suspense>
      
      {/* エラー表示 */}
      {error && renderError()}
      
      {/* ローディング表示 */}
      {!error && loadingState}
      
      {/* メインキャンバス */}
      {!error && !loadingState && (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ 
            border: '1px solid #ccc',
            display: 'block',
          }}
          role="img"
          aria-label="アバター表示キャンバス"
        />
      )}
      
      {/* 開発環境での状態表示 */}
      {process.env.NODE_ENV === 'development' && imageLoadState.isComplete && (
        <div style={{
          position: 'relative',
          marginTop: '8px',
          padding: '8px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          borderRadius: '4px',
          fontSize: '11px',
        }}>
          <div>Images: {imageLoadState.loaded}/{imageLoadState.total}</div>
          <div>Failed: {imageLoadState.failed}</div>
          <div>Rendering: {isRendering ? 'Yes' : 'No'}</div>
          <div>Tracking: L:{trackingData.leftEye.toFixed(2)} R:{trackingData.rightEye.toFixed(2)} M:{trackingData.mouth.toFixed(2)}</div>
          <div>Head: X:{trackingData.headX.toFixed(2)} Y:{trackingData.headY.toFixed(2)}</div>
        </div>
      )}
    </div>
  );
};

export default AvatarCanvas;