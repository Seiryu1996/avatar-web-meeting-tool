// 顔認識の計算ロジック

import { 
  FaceLandmark, 
  EyeCalculationResult, 
  MouthCalculationResult, 
  HeadPoseResult,
  FaceTrackingData 
} from '../types/faceTracker';
import { FACE_LANDMARKS, CALCULATION_COEFFICIENTS, VALUE_RANGES } from '../constants/faceTracker';

/**
 * 2つの点の距離を計算
 */
const calculateDistance = (point1: FaceLandmark, point2: FaceLandmark): number => {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * 値を指定された範囲に制限
 */
const clampValue = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/**
 * 目の開閉度を計算
 */
export const calculateEyeRatios = (landmarks: FaceLandmark[]): EyeCalculationResult => {
  // 左目の計算
  const leftEyeTop = landmarks[FACE_LANDMARKS.LEFT_EYE.TOP];
  const leftEyeBottom = landmarks[FACE_LANDMARKS.LEFT_EYE.BOTTOM];
  const leftEyeLeft = landmarks[FACE_LANDMARKS.LEFT_EYE.LEFT];
  const leftEyeRight = landmarks[FACE_LANDMARKS.LEFT_EYE.RIGHT];
  
  const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
  const leftEyeWidth = Math.abs(leftEyeLeft.x - leftEyeRight.x);
  const leftEyeRatio = leftEyeHeight / leftEyeWidth;
  
  // 右目の計算
  const rightEyeTop = landmarks[FACE_LANDMARKS.RIGHT_EYE.TOP];
  const rightEyeBottom = landmarks[FACE_LANDMARKS.RIGHT_EYE.BOTTOM];
  const rightEyeLeft = landmarks[FACE_LANDMARKS.RIGHT_EYE.LEFT];
  const rightEyeRight = landmarks[FACE_LANDMARKS.RIGHT_EYE.RIGHT];
  
  const rightEyeHeight = Math.abs(rightEyeTop.y - rightEyeBottom.y);
  const rightEyeWidth = Math.abs(rightEyeLeft.x - rightEyeRight.x);
  const rightEyeRatio = rightEyeHeight / rightEyeWidth;
  
  return {
    leftEyeRatio,
    rightEyeRatio,
  };
};

/**
 * 口の開き具合を計算
 */
export const calculateMouthRatio = (landmarks: FaceLandmark[]): MouthCalculationResult => {
  const mouthTop = landmarks[FACE_LANDMARKS.MOUTH.TOP];
  const mouthBottom = landmarks[FACE_LANDMARKS.MOUTH.BOTTOM];
  const mouthLeft = landmarks[FACE_LANDMARKS.MOUTH.LEFT];
  const mouthRight = landmarks[FACE_LANDMARKS.MOUTH.RIGHT];
  
  const mouthHeight = Math.abs(mouthTop.y - mouthBottom.y);
  const mouthWidth = Math.abs(mouthLeft.x - mouthRight.x);
  const mouthRatio = mouthHeight / mouthWidth;
  
  return {
    mouthRatio,
  };
};

/**
 * 頭部の位置と向きを計算
 */
export const calculateHeadPose = (landmarks: FaceLandmark[]): HeadPoseResult => {
  const noseTip = landmarks[FACE_LANDMARKS.HEAD.NOSE_TIP];
  const chin = landmarks[FACE_LANDMARKS.HEAD.CHIN];
  const forehead = landmarks[FACE_LANDMARKS.HEAD.FOREHEAD];
  
  // 正規化された座標から相対的な動きを計算
  const headX = (noseTip.x - 0.5) * CALCULATION_COEFFICIENTS.HEAD_POSITION_MULTIPLIER;
  const headY = (noseTip.y - 0.5) * CALCULATION_COEFFICIENTS.HEAD_POSITION_MULTIPLIER;
  const headZ = noseTip.z || 0;
  
  return {
    headX,
    headY,
    headZ,
  };
};

/**
 * 全ての顔認識データを計算
 */
export const calculateFaceTrackingData = (landmarks: FaceLandmark[]): FaceTrackingData => {
  const eyeRatios = calculateEyeRatios(landmarks);
  const mouthRatio = calculateMouthRatio(landmarks);
  const headPose = calculateHeadPose(landmarks);
  
  return {
    leftEye: clampValue(
      eyeRatios.leftEyeRatio * CALCULATION_COEFFICIENTS.EYE_RATIO_MULTIPLIER,
      VALUE_RANGES.EYE.MIN,
      VALUE_RANGES.EYE.MAX
    ),
    rightEye: clampValue(
      eyeRatios.rightEyeRatio * CALCULATION_COEFFICIENTS.EYE_RATIO_MULTIPLIER,
      VALUE_RANGES.EYE.MIN,
      VALUE_RANGES.EYE.MAX
    ),
    mouth: clampValue(
      mouthRatio.mouthRatio * CALCULATION_COEFFICIENTS.MOUTH_RATIO_MULTIPLIER,
      VALUE_RANGES.MOUTH.MIN,
      VALUE_RANGES.MOUTH.MAX
    ),
    headX: clampValue(
      headPose.headX,
      VALUE_RANGES.HEAD_POSITION.MIN,
      VALUE_RANGES.HEAD_POSITION.MAX
    ),
    headY: clampValue(
      headPose.headY,
      VALUE_RANGES.HEAD_POSITION.MIN,
      VALUE_RANGES.HEAD_POSITION.MAX
    ),
    headZ: clampValue(
      headPose.headZ,
      VALUE_RANGES.HEAD_POSITION.MIN,
      VALUE_RANGES.HEAD_POSITION.MAX
    ),
  };
};

/**
 * フォールバック用の擬似トラッキングデータを生成
 */
export const generateFallbackTrackingData = (time: number): FaceTrackingData => {
  return {
    leftEye: 0.8 + Math.sin(time * 3) * 0.2,
    rightEye: 0.8 + Math.sin(time * 3.1) * 0.2,
    mouth: 0.3 + Math.sin(time * 1.5) * 0.2,
    headX: Math.sin(time * 0.5) * 0.1,
    headY: Math.cos(time * 0.3) * 0.05,
    headZ: 0,
  };
};