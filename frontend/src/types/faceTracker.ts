// FaceTracker関連の型定義

export interface FaceTrackingData {
  leftEye: number;
  rightEye: number;
  mouth: number;
  headX: number;
  headY: number;
  headZ: number;
}

export interface FaceTrackerProps {
  onTrackingUpdate: (data: FaceTrackingData) => void;
}

export interface FaceLandmark {
  x: number;
  y: number;
  z?: number;
}

export interface MediaPipeResults {
  multiFaceLandmarks?: FaceLandmark[][];
}

export interface MediaPipeConfig {
  maxNumFaces: number;
  refineLandmarks: boolean;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
}

export interface CameraConfig {
  width: number;
  height: number;
}

export interface EyeCalculationResult {
  leftEyeRatio: number;
  rightEyeRatio: number;
}

export interface MouthCalculationResult {
  mouthRatio: number;
}

export interface HeadPoseResult {
  headX: number;
  headY: number;
  headZ: number;
}

// MediaPipeライブラリのグローバル型定義
declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
  }
}

// MediaPipeのライブラリ読み込み状態
export interface MediaPipeLibraryState {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}