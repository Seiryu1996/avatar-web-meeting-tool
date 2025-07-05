// VideoCall関連の定数

import { RTCConfiguration } from '../types/videoCall';

// WebRTC設定
export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

// メディア制約
export const DEFAULT_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 60 },
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

// ビデオプレビュー設定
export const VIDEO_PREVIEW_CONFIG = {
  width: 200,
  height: 150,
  style: {
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
} as const;

// 接続タイムアウト
export const CONNECTION_TIMEOUTS = {
  OFFER_TIMEOUT: 10000,      // 10秒
  ANSWER_TIMEOUT: 10000,     // 10秒
  ICE_TIMEOUT: 5000,         // 5秒
  MEDIA_TIMEOUT: 10000,      // 10秒
  RECONNECT_DELAY: 2000,     // 2秒
  PENDING_OFFER_CLEANUP: 30000, // 30秒
} as const;

// 接続状態メッセージ
export const CONNECTION_STATUS = {
  CONNECTING: '接続中...',
  CONNECTED: 'ルームに参加中',
  JOINED: 'ルームに参加しました',
  FAILED: '接続に失敗しました',
  DISCONNECTED: '切断されました',
  MEDIA_FAILED: 'メディアの取得に失敗しました',
} as const;

// エラーメッセージ
export const ERROR_MESSAGES = {
  SOCKET_NOT_CONNECTED: 'サーバーに接続されていません',
  MEDIA_ACCESS_DENIED: 'カメラ・マイクへのアクセスが拒否されました',
  MEDIA_NOT_FOUND: 'カメラ・マイクが見つかりません',
  MEDIA_GENERIC: 'メディアの取得に失敗しました',
  PEER_CONNECTION_FAILED: 'ピア接続に失敗しました',
  OFFER_CREATION_FAILED: 'オファーの作成に失敗しました',
  ANSWER_CREATION_FAILED: 'アンサーの作成に失敗しました',
  ICE_CANDIDATE_FAILED: 'ICE候補の追加に失敗しました',
  ROOM_JOIN_FAILED: 'ルームへの参加に失敗しました',
} as const;

// ソケットイベント名
export const SOCKET_EVENTS = {
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  ROOM_INFO: 'room-info',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATE: 'ice-candidate',
} as const;

// デバッグ設定
export const DEBUG_CONFIG = {
  ENABLE_LOGS: process.env.NODE_ENV === 'development',
  LOG_ICE_CANDIDATES: false,
  LOG_PEER_CONNECTIONS: true,
  LOG_MEDIA_EVENTS: true,
} as const;

// UI設定
export const UI_CONFIG = {
  VIDEO_GRID: {
    gap: '10px',
    maxColumns: 3,
  },
  CONTROLS: {
    height: '50px',
    spacing: '8px',
  },
  STATUS_BAR: {
    height: '40px',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
  },
} as const;