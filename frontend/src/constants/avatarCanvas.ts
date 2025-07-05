// AvatarCanvas関連の定数

import { AvatarCanvasConfig } from '../types/avatarCanvas';

// デフォルト設定
export const DEFAULT_AVATAR_CONFIG: AvatarCanvasConfig = {
  width: 400,
  height: 300,
  smoothingFactor: {
    eye: 0.3,     // 目の変化のスムージング（0.0-1.0）
    mouth: 0.3,   // 口の変化のスムージング
    head: 0.2,    // 頭の動きのスムージング
  },
  scaleFactors: {
    base: 0.3,                    // 基本スケール
    eyeMultiplier: 1.0,           // 目のスケール倍率
    mouthMultiplier: 0.5,         // 口のスケール倍率
    headMovementMultiplier: 30,   // 頭の動きの移動量
  },
  autoScale: true,
  maxScale: {
    width: 400,
    height: 300,
  },
};

// パーツタイプ別の設定
export const PART_TYPE_CONFIG = {
  left_eye: {
    minScale: 0.1,
    maxScale: 1.5,
    trackingProperty: 'leftEye' as const,
  },
  right_eye: {
    minScale: 0.1,
    maxScale: 1.5,
    trackingProperty: 'rightEye' as const,
  },
  mouth: {
    minScale: 0.5,
    maxScale: 2.0,
    trackingProperty: 'mouth' as const,
  },
  head: {
    trackingProperties: ['headX', 'headY'] as const,
  },
  body: {
    // ボディパーツは固定
  },
  background: {
    // 背景は固定
  },
} as const;

// アニメーション設定
export const ANIMATION_CONFIG = {
  targetFPS: 60,
  frameTime: 1000 / 60,  // 約16.67ms
};

// エラーメッセージ
export const ERROR_MESSAGES = {
  CANVAS_NOT_FOUND: 'Canvas要素が見つかりません',
  CONTEXT_NOT_AVAILABLE: 'Canvas 2Dコンテキストが取得できません',
  AVATAR_DATA_INVALID: 'アバターデータが無効です',
  IMAGE_LOAD_FAILED: '画像の読み込みに失敗しました',
  RENDERING_ERROR: 'レンダリングエラーが発生しました',
} as const;

// デフォルトのトラッキングデータ
export const DEFAULT_TRACKING_DATA = {
  leftEye: 1,
  rightEye: 1,
  mouth: 0,
  headX: 0,
  headY: 0,
  headZ: 0,
} as const;