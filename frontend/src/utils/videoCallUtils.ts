// VideoCall関連のユーティリティ関数

import { RemoteUser, RoomInfo, PendingOffer } from '../types/videoCall';
import { DEBUG_CONFIG } from '../constants/videoCall';

/**
 * デバッグログ出力
 */
export const debugLog = (message: string, data?: any): void => {
  if (DEBUG_CONFIG.ENABLE_LOGS) {
    console.log(`[VideoCall] ${message}`, data || '');
  }
};

/**
 * ユーザーリストを正規化
 */
export const normalizeUsers = (
  users: (string | { id: string; username: string })[], 
  currentSocketId: string
): RemoteUser[] => {
  return users
    .filter((user) => {
      const userId = typeof user === 'string' ? user : user.id;
      return userId !== currentSocketId;
    })
    .map((user) => {
      if (typeof user === 'string') {
        return {
          id: user,
          username: `ユーザー${user.slice(-4)}`,
        };
      } else {
        return {
          id: user.id,
          username: user.username,
        };
      }
    });
};

/**
 * ユーザー参加データを正規化
 */
export const normalizeUserJoinData = (
  data: string | { userId: string; username: string }
): { userId: string; username: string } => {
  if (typeof data === 'string') {
    return {
      userId: data,
      username: `ユーザー${data.slice(-4)}`,
    };
  }
  return {
    userId: data.userId,
    username: data.username,
  };
};

/**
 * MediaStreamのトラックを有効/無効にする
 */
export const toggleMediaTrack = (
  stream: MediaStream | null, 
  kind: 'video' | 'audio', 
  enabled: boolean
): boolean => {
  if (!stream) return false;
  
  const tracks = kind === 'video' ? stream.getVideoTracks() : stream.getAudioTracks();
  tracks.forEach(track => {
    track.enabled = enabled;
  });
  
  debugLog(`${kind} ${enabled ? 'enabled' : 'disabled'}`);
  return true;
};

/**
 * MediaStreamを停止
 */
export const stopMediaStream = (stream: MediaStream | null): void => {
  if (!stream) return;
  
  stream.getTracks().forEach(track => {
    track.stop();
  });
  
  debugLog('MediaStream stopped');
};

/**
 * ビデオ要素にストリームを設定
 */
export const setVideoStream = async (
  videoElement: HTMLVideoElement, 
  stream: MediaStream
): Promise<void> => {
  try {
    videoElement.srcObject = stream;
    videoElement.load();
    
    // Edge対応: 段階的な再生試行
    try {
      await videoElement.play();
    } catch (playError) {
      debugLog('First play attempt failed, retrying...', playError);
      
      setTimeout(async () => {
        try {
          await videoElement.play();
        } catch (secondError) {
          debugLog('Second play attempt failed', secondError);
        }
      }, 200);
    }
  } catch (error) {
    debugLog('Failed to set video stream', error);
    throw error;
  }
};

/**
 * ピア接続の状態をチェック
 */
export const checkPeerConnectionState = (pc: RTCPeerConnection): string => {
  const connectionState = pc.connectionState;
  const iceConnectionState = pc.iceConnectionState;
  const signalingState = pc.signalingState;
  
  return `Connection: ${connectionState}, ICE: ${iceConnectionState}, Signaling: ${signalingState}`;
};

/**
 * メディアエラーを分類
 */
export const categorizeMediaError = (error: any): {
  type: 'permission' | 'device' | 'network' | 'unknown';
  message: string;
} => {
  if (!error) {
    return { type: 'unknown', message: '不明なエラー' };
  }
  
  const errorName = error.name?.toLowerCase() || '';
  const errorMessage = error.message?.toLowerCase() || '';
  
  if (errorName.includes('permission') || errorName.includes('notallowed')) {
    return { type: 'permission', message: 'カメラ・マイクへのアクセスが拒否されました' };
  }
  
  if (errorName.includes('notfound') || errorName.includes('devicenotfound')) {
    return { type: 'device', message: 'カメラ・マイクが見つかりません' };
  }
  
  if (errorName.includes('network') || errorMessage.includes('network')) {
    return { type: 'network', message: 'ネットワークエラーが発生しました' };
  }
  
  return { type: 'unknown', message: error.message || 'メディアの取得に失敗しました' };
};

/**
 * 古いペンディングオファーをクリーンアップ
 */
export const cleanupPendingOffers = (
  pendingOffers: PendingOffer[], 
  maxAge: number = 30000
): PendingOffer[] => {
  const now = Date.now();
  const cleaned = pendingOffers.filter(offer => (now - offer.timestamp) < maxAge);
  
  if (cleaned.length !== pendingOffers.length) {
    debugLog(`Cleaned up ${pendingOffers.length - cleaned.length} expired pending offers`);
  }
  
  return cleaned;
};

/**
 * RTCPeerConnectionの統計情報を取得
 */
export const getPeerConnectionStats = async (pc: RTCPeerConnection): Promise<any> => {
  try {
    const stats = await pc.getStats();
    const result: any = {};
    
    stats.forEach((report, id) => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        result.candidatePair = report;
      } else if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
        result.inboundVideo = report;
      } else if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
        result.outboundVideo = report;
      }
    });
    
    return result;
  } catch (error) {
    debugLog('Failed to get peer connection stats', error);
    return null;
  }
};

/**
 * ユーザー名を表示用にフォーマット
 */
export const formatDisplayName = (username: string, userId: string, maxLength: number = 15): string => {
  if (!username || username.trim() === '') {
    return `ユーザー${userId.slice(-4)}`;
  }
  
  const trimmed = username.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  
  return `${trimmed.slice(0, maxLength - 3)}...`;
};

/**
 * デバイス情報を取得
 */
export const getMediaDevices = async (): Promise<{
  videoInputs: MediaDeviceInfo[];
  audioInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    return {
      videoInputs: devices.filter(device => device.kind === 'videoinput'),
      audioInputs: devices.filter(device => device.kind === 'audioinput'),
      audioOutputs: devices.filter(device => device.kind === 'audiooutput'),
    };
  } catch (error) {
    debugLog('Failed to enumerate media devices', error);
    return {
      videoInputs: [],
      audioInputs: [],
      audioOutputs: [],
    };
  }
};

/**
 * 接続品質を評価
 */
export const evaluateConnectionQuality = (stats: any): 'excellent' | 'good' | 'fair' | 'poor' => {
  if (!stats?.candidatePair) {
    return 'poor';
  }
  
  const { currentRoundTripTime, availableIncomingBitrate } = stats.candidatePair;
  
  if (currentRoundTripTime < 0.1 && availableIncomingBitrate > 1000000) {
    return 'excellent';
  } else if (currentRoundTripTime < 0.2 && availableIncomingBitrate > 500000) {
    return 'good';
  } else if (currentRoundTripTime < 0.5 && availableIncomingBitrate > 200000) {
    return 'fair';
  } else {
    return 'poor';
  }
};