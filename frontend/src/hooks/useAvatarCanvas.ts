// AvatarCanvas用のカスタムフック

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  UseAvatarCanvasOptions, 
  UseAvatarCanvasReturn, 
  ImageLoadState,
  AvatarData,
  FaceTrackingData 
} from '../types/avatarCanvas';
import { 
  DEFAULT_AVATAR_CONFIG, 
  DEFAULT_TRACKING_DATA, 
  ANIMATION_CONFIG,
  ERROR_MESSAGES 
} from '../constants/avatarCanvas';
import { 
  validateAvatarData, 
  getVisibleParts, 
  loadImages,
  smoothTrackingData,
  calculateAutoScale,
  calculatePosition,
  calculatePartScale,
  drawAvatarPart 
} from '../utils/avatarCanvasUtils';

/**
 * AvatarCanvasの状態とレンダリングを管理するカスタムフック
 */
export const useAvatarCanvas = (options: UseAvatarCanvasOptions): UseAvatarCanvasReturn => {
  const { avatarData, canvasRef, config = {}, onError } = options;
  
  const mergedConfig = { ...DEFAULT_AVATAR_CONFIG, ...config };
  
  const [trackingData, setTrackingData] = useState<FaceTrackingData>(DEFAULT_TRACKING_DATA);
  const [imageLoadState, setImageLoadState] = useState<ImageLoadState>({
    total: 0,
    loaded: 0,
    failed: 0,
    isComplete: false,
  });
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const imagesRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const lastTrackingUpdateRef = useRef<FaceTrackingData>(DEFAULT_TRACKING_DATA);

  // エラーハンドリング
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    onError?.(errorMessage);
    console.error('AvatarCanvas Error:', errorMessage);
  }, [onError]);

  // エラークリア
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 画像の読み込み
  const loadAvatarImages = useCallback(async (data: AvatarData) => {
    if (!validateAvatarData(data)) {
      handleError(ERROR_MESSAGES.AVATAR_DATA_INVALID);
      return;
    }

    const visibleParts = getVisibleParts(data.parts);
    
    setImageLoadState({
      total: visibleParts.length,
      loaded: 0,
      failed: 0,
      isComplete: false,
    });

    try {
      const imageMap = await loadImages(visibleParts);
      imagesRef.current = imageMap;
      
      setImageLoadState(prev => ({
        ...prev,
        loaded: imageMap.size,
        failed: prev.total - imageMap.size,
        isComplete: true,
      }));

      clearError();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.IMAGE_LOAD_FAILED;
      handleError(errorMessage);
    }
  }, [handleError, clearError]);

  // トラッキングデータの更新（スムージング付き）
  const updateTracking = useCallback((newData: FaceTrackingData) => {
    setTrackingData(prev => {
      const smoothed = smoothTrackingData(prev, newData, mergedConfig.smoothingFactor);
      lastTrackingUpdateRef.current = smoothed;
      return smoothed;
    });
  }, [mergedConfig.smoothingFactor]);

  // アバターの描画
  const drawAvatar = useCallback(() => {
    if (!canvasRef.current || !avatarData?.parts || !imageLoadState.isComplete) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      handleError(ERROR_MESSAGES.CONTEXT_NOT_AVAILABLE);
      return;
    }

    try {
      setIsRendering(true);
      
      // キャンバスをクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // パーツを描画
      avatarData.parts.forEach((part, index) => {
        if (part.imageData && part.visible !== false) {
          const image = imagesRef.current.get(index);
          if (!image) return;
          
          const baseX = part.x || 0;
          const baseY = part.y || 0;
          
          // 自動スケールを計算
          const { scaleX, scaleY } = mergedConfig.autoScale 
            ? calculateAutoScale(baseX, baseY, mergedConfig.maxScale.width, mergedConfig.maxScale.height)
            : { scaleX: 1, scaleY: 1 };
          
          // 位置を計算
          const position = calculatePosition(baseX, baseY, scaleX, scaleY, trackingData);
          
          // スケールを計算
          const baseScale = (part.scale || 1) * (part.baseScale || 1) * mergedConfig.scaleFactors.base;
          const totalScale = calculatePartScale(part, trackingData, baseScale);
          
          // パーツを描画
          drawAvatarPart(ctx, part, image, position, totalScale);
        }
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.RENDERING_ERROR;
      handleError(errorMessage);
    } finally {
      setIsRendering(false);
    }
  }, [canvasRef, avatarData, imageLoadState.isComplete, trackingData, mergedConfig, handleError]);

  // アニメーションループ
  useEffect(() => {
    const animate = () => {
      drawAvatar();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    if (imageLoadState.isComplete && !error) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawAvatar, imageLoadState.isComplete, error]);

  // アバターデータが変更された時の処理
  useEffect(() => {
    if (avatarData) {
      loadAvatarImages(avatarData);
    } else {
      imagesRef.current.clear();
      setImageLoadState({
        total: 0,
        loaded: 0,
        failed: 0,
        isComplete: false,
      });
    }
  }, [avatarData, loadAvatarImages]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      imagesRef.current.clear();
    };
  }, []);

  return {
    trackingData,
    imageLoadState,
    isRendering,
    error,
    updateTracking,
    clearError,
  };
};