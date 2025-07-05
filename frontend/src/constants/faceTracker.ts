// FaceTracker関連の定数

import { MediaPipeConfig, CameraConfig } from '../types/faceTracker';

// MediaPipeの設定
export const MEDIAPIPE_CONFIG: MediaPipeConfig = {
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

// カメラの設定
export const CAMERA_CONFIG: CameraConfig = {
  width: 320,
  height: 240,
};

// CDNのURL
export const CDN_URLS = {
  FACE_MESH: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js',
  CAMERA_UTILS: 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
  FACE_MESH_FILES: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/',
};

// 顔のランドマーク点のインデックス
export const FACE_LANDMARKS = {
  // 左目
  LEFT_EYE: {
    TOP: 159,
    BOTTOM: 145,
    LEFT: 33,
    RIGHT: 133,
  },
  // 右目
  RIGHT_EYE: {
    TOP: 386,
    BOTTOM: 374,
    LEFT: 362,
    RIGHT: 263,
  },
  // 口
  MOUTH: {
    TOP: 13,
    BOTTOM: 14,
    LEFT: 61,
    RIGHT: 291,
  },
  // 頭部
  HEAD: {
    NOSE_TIP: 1,
    CHIN: 175,
    FOREHEAD: 10,
  },
};

// 計算の調整係数
export const CALCULATION_COEFFICIENTS = {
  EYE_RATIO_MULTIPLIER: 3,
  MOUTH_RATIO_MULTIPLIER: 2,
  HEAD_POSITION_MULTIPLIER: 2,
};

// フォールバック用の更新間隔（ミリ秒）
export const FALLBACK_UPDATE_INTERVAL = 33;

// 範囲制限
export const VALUE_RANGES = {
  EYE: { MIN: 0, MAX: 1 },
  MOUTH: { MIN: 0, MAX: 1 },
  HEAD_POSITION: { MIN: -1, MAX: 1 },
};