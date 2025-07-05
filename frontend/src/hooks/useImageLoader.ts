// 画像読み込み専用のカスタムフック

import { useState, useCallback, useRef } from 'react';
import { AvatarPart, ImageLoadState } from '../types/avatarCanvas';
import { getVisibleParts, loadImages } from '../utils/avatarCanvasUtils';

interface UseImageLoaderOptions {
  onLoadComplete?: (images: Map<number, HTMLImageElement>) => void;
  onLoadError?: (error: string) => void;
}

interface UseImageLoaderReturn {
  loadState: ImageLoadState;
  isLoading: boolean;
  loadImages: (parts: AvatarPart[]) => Promise<void>;
  getImage: (index: number) => HTMLImageElement | undefined;
  clearImages: () => void;
}

/**
 * 画像の非同期読み込みを管理するカスタムフック
 */
export const useImageLoader = (options: UseImageLoaderOptions = {}): UseImageLoaderReturn => {
  const { onLoadComplete, onLoadError } = options;
  
  const [loadState, setLoadState] = useState<ImageLoadState>({
    total: 0,
    loaded: 0,
    failed: 0,
    isComplete: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const imagesRef = useRef<Map<number, HTMLImageElement>>(new Map());

  // 画像を読み込み
  const loadAvatarImages = useCallback(async (parts: AvatarPart[]) => {
    const visibleParts = getVisibleParts(parts);
    
    if (visibleParts.length === 0) {
      setLoadState({
        total: 0,
        loaded: 0,
        failed: 0,
        isComplete: true,
      });
      return;
    }

    setIsLoading(true);
    setLoadState({
      total: visibleParts.length,
      loaded: 0,
      failed: 0,
      isComplete: false,
    });

    try {
      const imageMap = await loadImages(visibleParts);
      imagesRef.current = imageMap;
      
      const finalState = {
        total: visibleParts.length,
        loaded: imageMap.size,
        failed: visibleParts.length - imageMap.size,
        isComplete: true,
      };
      
      setLoadState(finalState);
      onLoadComplete?.(imageMap);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '画像の読み込みに失敗しました';
      setLoadState(prev => ({
        ...prev,
        isComplete: true,
      }));
      onLoadError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [onLoadComplete, onLoadError]);

  // 特定のインデックスの画像を取得
  const getImage = useCallback((index: number): HTMLImageElement | undefined => {
    return imagesRef.current.get(index);
  }, []);

  // 画像をクリア
  const clearImages = useCallback(() => {
    imagesRef.current.clear();
    setLoadState({
      total: 0,
      loaded: 0,
      failed: 0,
      isComplete: false,
    });
    setIsLoading(false);
  }, []);

  return {
    loadState,
    isLoading,
    loadImages: loadAvatarImages,
    getImage,
    clearImages,
  };
};