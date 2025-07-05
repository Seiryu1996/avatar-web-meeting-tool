// AvatarCanvas関連の型定義

import { FaceTrackingData } from './faceTracker';

// 再エクスポート
export { FaceTrackingData } from './faceTracker';

export interface AvatarPart {
  imageData?: string;
  visible?: boolean;
  x?: number;
  y?: number;
  scale?: number;
  baseScale?: number;
  pivotX?: number;
  pivotY?: number;
  rotation?: number;
  type?: 'left_eye' | 'right_eye' | 'mouth' | 'head' | 'body' | 'background';
}

export interface AvatarData {
  version: string;
  timestamp: number;
  parts: AvatarPart[];
  parameters: Record<string, any>;
}

export interface AvatarCanvasProps {
  avatarData: AvatarData | null;
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  onError?: (error: string) => void;
}

export interface AvatarCanvasConfig {
  width: number;
  height: number;
  smoothingFactor: {
    eye: number;
    mouth: number;
    head: number;
  };
  scaleFactors: {
    base: number;
    eyeMultiplier: number;
    mouthMultiplier: number;
    headMovementMultiplier: number;
  };
  autoScale: boolean;
  maxScale: {
    width: number;
    height: number;
  };
}

export interface ImageLoadState {
  total: number;
  loaded: number;
  failed: number;
  isComplete: boolean;
}

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  trackingData: FaceTrackingData;
  config: AvatarCanvasConfig;
}

export interface UseAvatarCanvasOptions {
  avatarData: AvatarData | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  config?: Partial<AvatarCanvasConfig>;
  onError?: (error: string) => void;
}

export interface UseAvatarCanvasReturn {
  trackingData: FaceTrackingData;
  imageLoadState: ImageLoadState;
  isRendering: boolean;
  error: string | null;
  updateTracking: (data: FaceTrackingData) => void;
  clearError: () => void;
}