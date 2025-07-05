// AvatarCanvas関連のユーティリティ関数

import { AvatarPart, AvatarData, RenderContext, FaceTrackingData } from '../types/avatarCanvas';
import { PART_TYPE_CONFIG, DEFAULT_AVATAR_CONFIG } from '../constants/avatarCanvas';

/**
 * アバターデータの妥当性をチェック
 */
export const validateAvatarData = (data: any): data is AvatarData => {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.version === 'string' &&
    typeof data.timestamp === 'number' &&
    Array.isArray(data.parts) &&
    typeof data.parameters === 'object'
  );
};

/**
 * 表示可能なパーツをフィルタリング
 */
export const getVisibleParts = (parts: AvatarPart[]): AvatarPart[] => {
  return parts.filter(part => part.imageData && part.visible !== false);
};

/**
 * 自動スケールを計算
 */
export const calculateAutoScale = (
  baseX: number, 
  baseY: number, 
  maxWidth: number, 
  maxHeight: number
): { scaleX: number; scaleY: number } => {
  const scaleX = baseX > maxWidth ? maxWidth / baseX * 0.8 : 1;
  const scaleY = baseY > maxHeight ? maxHeight / baseY * 0.8 : 1;
  return { scaleX, scaleY };
};

/**
 * パーツタイプに応じたスケールを計算
 */
export const calculatePartScale = (
  part: AvatarPart, 
  trackingData: FaceTrackingData,
  baseScale: number
): number => {
  const partConfig = PART_TYPE_CONFIG[part.type as keyof typeof PART_TYPE_CONFIG];
  
  if (!partConfig || !('trackingProperty' in partConfig)) {
    return baseScale;
  }

  const trackingValue = trackingData[partConfig.trackingProperty];
  let scale = baseScale;

  // パーツタイプ別のスケール調整
  switch (part.type) {
    case 'left_eye':
    case 'right_eye':
      scale *= Math.max(partConfig.minScale, Math.min(partConfig.maxScale, trackingValue));
      break;
    case 'mouth':
      scale *= (1 + trackingValue * DEFAULT_AVATAR_CONFIG.scaleFactors.mouthMultiplier);
      break;
  }

  return scale;
};

/**
 * 頭の動きに応じた位置を計算
 */
export const calculatePosition = (
  baseX: number,
  baseY: number,
  scaleX: number,
  scaleY: number,
  trackingData: FaceTrackingData
): { x: number; y: number } => {
  const headMovementMultiplier = DEFAULT_AVATAR_CONFIG.scaleFactors.headMovementMultiplier;
  
  return {
    x: baseX * scaleX + trackingData.headX * headMovementMultiplier,
    y: baseY * scaleY + trackingData.headY * headMovementMultiplier,
  };
};

/**
 * トラッキングデータをスムージング
 */
export const smoothTrackingData = (
  current: FaceTrackingData,
  target: FaceTrackingData,
  smoothingFactor: typeof DEFAULT_AVATAR_CONFIG.smoothingFactor
): FaceTrackingData => {
  return {
    leftEye: current.leftEye * (1 - smoothingFactor.eye) + target.leftEye * smoothingFactor.eye,
    rightEye: current.rightEye * (1 - smoothingFactor.eye) + target.rightEye * smoothingFactor.eye,
    mouth: current.mouth * (1 - smoothingFactor.mouth) + target.mouth * smoothingFactor.mouth,
    headX: current.headX * (1 - smoothingFactor.head) + target.headX * smoothingFactor.head,
    headY: current.headY * (1 - smoothingFactor.head) + target.headY * smoothingFactor.head,
    headZ: current.headZ * (1 - smoothingFactor.head) + target.headZ * smoothingFactor.head,
  };
};

/**
 * パーツを描画
 */
export const drawAvatarPart = (
  ctx: CanvasRenderingContext2D,
  part: AvatarPart,
  image: HTMLImageElement,
  position: { x: number; y: number },
  scale: number
): void => {
  const pivotX = part.pivotX || 0;
  const pivotY = part.pivotY || 0;

  ctx.save();
  ctx.translate(position.x, position.y);
  
  if (part.rotation) {
    ctx.rotate((part.rotation * Math.PI) / 180);
  }
  
  ctx.scale(scale, scale);
  ctx.drawImage(image, -pivotX, -pivotY);
  ctx.restore();
};

/**
 * 画像を非同期で読み込み
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

/**
 * 複数の画像を並行で読み込み
 */
export const loadImages = async (
  parts: AvatarPart[]
): Promise<Map<number, HTMLImageElement>> => {
  const visibleParts = getVisibleParts(parts);
  const imageMap = new Map<number, HTMLImageElement>();
  
  const loadPromises = visibleParts.map(async (part, index) => {
    if (part.imageData) {
      try {
        const image = await loadImage(part.imageData);
        imageMap.set(index, image);
      } catch (error) {
        console.warn(`Failed to load image for part ${index}:`, error);
      }
    }
  });

  await Promise.allSettled(loadPromises);
  return imageMap;
};

/**
 * FPSを計算
 */
export const calculateFPS = (() => {
  let lastTime = performance.now();
  let frameCount = 0;
  let fps = 0;

  return (): number => {
    const currentTime = performance.now();
    frameCount++;

    if (currentTime - lastTime >= 1000) {
      fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      frameCount = 0;
      lastTime = currentTime;
    }

    return fps;
  };
})();

/**
 * デバウンス関数
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};