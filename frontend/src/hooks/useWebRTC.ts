// WebRTC処理専用のカスタムフック

import { useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { 
  PeerConnectionState,
  WebRTCOfferData,
  WebRTCAnswerData,
  ICECandidateData,
  PendingOffer 
} from '../types/videoCall';
import { RTC_CONFIG, SOCKET_EVENTS, CONNECTION_TIMEOUTS } from '../constants/videoCall';
import { debugLog, setVideoStream, checkPeerConnectionState } from '../utils/videoCallUtils';

interface UseWebRTCOptions {
  socket: Socket | null;
  roomId: string;
  localStream: MediaStream | null;
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onUserDisconnected: (userId: string) => void;
  onError: (error: string) => void;
}

interface UseWebRTCReturn {
  createPeerConnection: (userId: string) => RTCPeerConnection;
  handleOffer: (data: WebRTCOfferData) => Promise<void>;
  handleAnswer: (data: WebRTCAnswerData) => Promise<void>;
  handleIceCandidate: (data: ICECandidateData) => Promise<void>;
  createOffer: (userId: string) => Promise<void>;
  closePeerConnection: (userId: string) => void;
  closeAllConnections: () => void;
  processPendingOffers: () => Promise<void>;
}

/**
 * WebRTC ピア接続を管理するカスタムフック
 */
export const useWebRTC = (options: UseWebRTCOptions): UseWebRTCReturn => {
  const {
    socket,
    roomId,
    localStream,
    onRemoteStream,
    onUserDisconnected,
    onError,
  } = options;

  const peerConnectionsRef = useRef<Map<string, PeerConnectionState>>(new Map());
  const pendingOffersRef = useRef<PendingOffer[]>([]);

  // ピア接続を作成
  const createPeerConnection = useCallback((userId: string): RTCPeerConnection => {
    debugLog(`Creating peer connection for user: ${userId}`);

    const pc = new RTCPeerConnection(RTC_CONFIG);

    // ローカルストリームのトラックを追加
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // リモートストリーム受信時
    pc.ontrack = (event) => {
      debugLog(`Received remote stream from user: ${userId}`);
      const remoteStream = event.streams[0];
      if (remoteStream) {
        onRemoteStream(userId, remoteStream);
      }
    };

    // ICE候補受信時
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit(SOCKET_EVENTS.ICE_CANDIDATE, {
          roomId,
          candidate: event.candidate,
          targetUserId: userId,
        });
      }
    };

    // 接続状態変更時
    pc.onconnectionstatechange = () => {
      const state = checkPeerConnectionState(pc);
      debugLog(`Peer connection state changed for ${userId}: ${state}`);

      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        onUserDisconnected(userId);
        closePeerConnection(userId);
      }
    };

    // ICE接続状態変更時
    pc.oniceconnectionstatechange = () => {
      debugLog(`ICE connection state for ${userId}: ${pc.iceConnectionState}`);

      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        onUserDisconnected(userId);
        closePeerConnection(userId);
      }
    };

    // ピア接続を保存
    peerConnectionsRef.current.set(userId, {
      connection: pc,
      isOffering: false,
      isAnswering: false,
      lastActivity: Date.now(),
    });

    return pc;
  }, [localStream, socket, roomId, onRemoteStream, onUserDisconnected]);

  // オファーを処理
  const handleOffer = useCallback(async (data: WebRTCOfferData) => {
    const { offer, fromUserId } = data;
    debugLog(`Handling offer from user: ${fromUserId}`);

    if (!localStream) {
      // ローカルストリームがない場合は保留
      pendingOffersRef.current.push({
        offer,
        fromUserId,
        timestamp: Date.now(),
      });
      debugLog(`Offer from ${fromUserId} added to pending queue`);
      return;
    }

    try {
      let peerState = peerConnectionsRef.current.get(fromUserId);
      
      if (!peerState) {
        const pc = createPeerConnection(fromUserId);
        peerState = peerConnectionsRef.current.get(fromUserId)!;
      }

      const pc = peerState.connection;
      peerState.isAnswering = true;

      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socket) {
        socket.emit(SOCKET_EVENTS.ANSWER, {
          roomId,
          answer,
          targetUserId: fromUserId,
        });
      }

      peerState.isAnswering = false;
      peerState.lastActivity = Date.now();
      
      debugLog(`Answer sent to user: ${fromUserId}`);
    } catch (error) {
      debugLog(`Failed to handle offer from ${fromUserId}`, error);
      onError(`オファーの処理に失敗しました: ${fromUserId}`);
    }
  }, [localStream, socket, roomId, createPeerConnection, onError]);

  // アンサーを処理
  const handleAnswer = useCallback(async (data: WebRTCAnswerData) => {
    const { answer, fromUserId } = data;
    debugLog(`Handling answer from user: ${fromUserId}`);

    const peerState = peerConnectionsRef.current.get(fromUserId);
    if (!peerState) {
      debugLog(`No peer connection found for user: ${fromUserId}`);
      return;
    }

    const pc = peerState.connection;

    if (pc.signalingState === 'have-local-offer') {
      try {
        await pc.setRemoteDescription(answer);
        peerState.isOffering = false;
        peerState.lastActivity = Date.now();
        debugLog(`Answer processed from user: ${fromUserId}`);
      } catch (error) {
        debugLog(`Failed to process answer from ${fromUserId}`, error);
        onError(`アンサーの処理に失敗しました: ${fromUserId}`);
      }
    }
  }, [onError]);

  // ICE候補を処理
  const handleIceCandidate = useCallback(async (data: ICECandidateData) => {
    const { candidate, fromUserId } = data;
    debugLog(`Handling ICE candidate from user: ${fromUserId}`);

    const peerState = peerConnectionsRef.current.get(fromUserId);
    if (!peerState) {
      debugLog(`No peer connection found for ICE candidate from: ${fromUserId}`);
      return;
    }

    const pc = peerState.connection;

    if (pc.remoteDescription) {
      try {
        await pc.addIceCandidate(candidate);
        peerState.lastActivity = Date.now();
        debugLog(`ICE candidate added for user: ${fromUserId}`);
      } catch (error) {
        debugLog(`Failed to add ICE candidate from ${fromUserId}`, error);
      }
    }
  }, []);

  // オファーを作成
  const createOffer = useCallback(async (userId: string) => {
    debugLog(`Creating offer for user: ${userId}`);

    if (!localStream) {
      debugLog('No local stream available for creating offer');
      return;
    }

    try {
      let peerState = peerConnectionsRef.current.get(userId);
      
      if (!peerState) {
        createPeerConnection(userId);
        peerState = peerConnectionsRef.current.get(userId)!;
      }

      const pc = peerState.connection;
      peerState.isOffering = true;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socket) {
        socket.emit(SOCKET_EVENTS.OFFER, {
          roomId,
          offer,
          targetUserId: userId,
        });
      }

      peerState.lastActivity = Date.now();
      debugLog(`Offer sent to user: ${userId}`);
    } catch (error) {
      debugLog(`Failed to create offer for ${userId}`, error);
      onError(`オファーの作成に失敗しました: ${userId}`);
    }
  }, [localStream, socket, roomId, createPeerConnection, onError]);

  // 特定のピア接続を閉じる
  const closePeerConnection = useCallback((userId: string) => {
    debugLog(`Closing peer connection for user: ${userId}`);

    const peerState = peerConnectionsRef.current.get(userId);
    if (peerState) {
      peerState.connection.close();
      peerConnectionsRef.current.delete(userId);
    }
  }, []);

  // 全てのピア接続を閉じる
  const closeAllConnections = useCallback(() => {
    debugLog('Closing all peer connections');

    peerConnectionsRef.current.forEach((peerState, userId) => {
      peerState.connection.close();
    });
    peerConnectionsRef.current.clear();
    pendingOffersRef.current = [];
  }, []);

  // 保留中のオファーを処理
  const processPendingOffers = useCallback(async () => {
    if (pendingOffersRef.current.length === 0 || !localStream) {
      return;
    }

    debugLog(`Processing ${pendingOffersRef.current.length} pending offers`);

    const offers = [...pendingOffersRef.current];
    pendingOffersRef.current = [];

    for (const pendingOffer of offers) {
      await handleOffer({
        offer: pendingOffer.offer,
        fromUserId: pendingOffer.fromUserId,
      });
    }
  }, [localStream, handleOffer]);

  return {
    createPeerConnection,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    createOffer,
    closePeerConnection,
    closeAllConnections,
    processPendingOffers,
  };
};