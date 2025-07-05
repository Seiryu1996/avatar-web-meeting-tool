// VideoCall用のメインカスタムフック

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import {
  VideoCallState,
  UseVideoCallOptions,
  UseVideoCallReturn,
  RemoteUser,
  RoomInfo,
} from '../types/videoCall';
import {
  DEFAULT_MEDIA_CONSTRAINTS,
  SOCKET_EVENTS,
  CONNECTION_STATUS,
  ERROR_MESSAGES,
} from '../constants/videoCall';
import {
  debugLog,
  normalizeUsers,
  normalizeUserJoinData,
  toggleMediaTrack,
  stopMediaStream,
  setVideoStream,
  categorizeMediaError,
} from '../utils/videoCallUtils';
import { useWebRTC } from './useWebRTC';

/**
 * VideoCallの状態とロジックを管理するメインカスタムフック
 */
export const useVideoCall = (options: UseVideoCallOptions): UseVideoCallReturn => {
  const {
    socket,
    roomId,
    username,
    autoJoin = true,
    mediaConstraints = DEFAULT_MEDIA_CONSTRAINTS,
  } = options;

  const [state, setState] = useState<VideoCallState>({
    localStream: null,
    remoteUsers: [],
    connectedUsers: 0,
    connectionStatus: CONNECTION_STATUS.CONNECTING,
    roomJoined: false,
    isLocalVideoEnabled: true,
    isLocalAudioEnabled: true,
    error: null,
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const remoteStreams = useRef<Map<string, MediaStream>>(new Map());
  const isInitializedRef = useRef(false);

  // エラーハンドリング
  const handleError = useCallback((error: string) => {
    debugLog('Error occurred:', error);
    setState(prev => ({ ...prev, error }));
  }, []);

  // エラークリア
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // リモートストリーム受信ハンドラー
  const handleRemoteStream = useCallback((userId: string, stream: MediaStream) => {
    debugLog(`Received remote stream from: ${userId}`);
    remoteStreams.current.set(userId, stream);

    // ユーザーリストを更新
    setState(prev => ({
      ...prev,
      remoteUsers: prev.remoteUsers.map(user =>
        user.id === userId ? { ...user, stream } : user
      ),
    }));

    // ビデオ要素にストリームを設定
    setTimeout(() => {
      const videoElement = remoteVideoRefs.current.get(userId);
      if (videoElement) {
        setVideoStream(videoElement, stream).catch(error => {
          debugLog(`Failed to set video stream for ${userId}`, error);
        });
      }
    }, 100);
  }, []);

  // ユーザー切断ハンドラー
  const handleUserDisconnected = useCallback((userId: string) => {
    debugLog(`User disconnected: ${userId}`);

    // ビデオ要素とストリームのクリーンアップ
    const videoElement = remoteVideoRefs.current.get(userId);
    if (videoElement) {
      videoElement.srcObject = null;
      remoteVideoRefs.current.delete(userId);
    }
    remoteStreams.current.delete(userId);

    setState(prev => ({
      ...prev,
      remoteUsers: prev.remoteUsers.filter(u => u.id !== userId),
    }));
  }, []);

  // WebRTCフック
  const webrtc = useWebRTC({
    socket,
    roomId,
    localStream: state.localStream,
    onRemoteStream: handleRemoteStream,
    onUserDisconnected: handleUserDisconnected,
    onError: handleError,
  });

  // メディアストリームを取得
  const initializeMedia = useCallback(async () => {
    try {
      debugLog('Initializing media...');
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);

      setState(prev => ({ ...prev, localStream: stream }));

      if (localVideoRef.current) {
        await setVideoStream(localVideoRef.current, stream);
      }

      debugLog('Media initialized successfully');
      return stream;
    } catch (error) {
      const { type, message } = categorizeMediaError(error);
      handleError(message);
      throw error;
    }
  }, [mediaConstraints, handleError]);

  // ルームに参加
  const joinRoom = useCallback(async () => {
    if (!socket || !roomId || state.roomJoined) return;

    try {
      debugLog(`Joining room: ${roomId} as ${username}`);

      setState(prev => ({
        ...prev,
        connectionStatus: CONNECTION_STATUS.CONNECTING,
        error: null,
      }));

      // メディアを初期化
      if (!state.localStream) {
        await initializeMedia();
      }

      // ルームに参加
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, username });

      setState(prev => ({
        ...prev,
        roomJoined: true,
        connectionStatus: CONNECTION_STATUS.JOINED,
      }));

      isInitializedRef.current = true;
    } catch (error) {
      handleError(ERROR_MESSAGES.ROOM_JOIN_FAILED);
    }
  }, [socket, roomId, username, state.roomJoined, state.localStream, initializeMedia, handleError]);

  // ルームを退出
  const leaveRoom = useCallback(() => {
    debugLog('Leaving room...');

    if (socket && state.roomJoined) {
      socket.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomId });
    }

    // メディアストリームを停止
    stopMediaStream(state.localStream);

    // WebRTC接続を閉じる
    webrtc.closeAllConnections();

    // 状態をリセット
    setState({
      localStream: null,
      remoteUsers: [],
      connectedUsers: 0,
      connectionStatus: CONNECTION_STATUS.DISCONNECTED,
      roomJoined: false,
      isLocalVideoEnabled: true,
      isLocalAudioEnabled: true,
      error: null,
    });

    remoteStreams.current.clear();
    remoteVideoRefs.current.clear();
    isInitializedRef.current = false;
  }, [socket, roomId, state.roomJoined, state.localStream, webrtc]);

  // ビデオのON/OFF切り替え
  const toggleVideo = useCallback(() => {
    const newState = !state.isLocalVideoEnabled;
    toggleMediaTrack(state.localStream, 'video', newState);
    setState(prev => ({ ...prev, isLocalVideoEnabled: newState }));
  }, [state.localStream, state.isLocalVideoEnabled]);

  // オーディオのON/OFF切り替え
  const toggleAudio = useCallback(() => {
    const newState = !state.isLocalAudioEnabled;
    toggleMediaTrack(state.localStream, 'audio', newState);
    setState(prev => ({ ...prev, isLocalAudioEnabled: newState }));
  }, [state.localStream, state.isLocalAudioEnabled]);

  // ソケットイベントリスナー
  useEffect(() => {
    if (!socket || !roomId) return;

    // ルーム情報受信
    const handleRoomInfo = (info: RoomInfo) => {
      debugLog('Room info received:', info);
      setState(prev => ({
        ...prev,
        connectedUsers: info.userCount - 1,
        connectionStatus: CONNECTION_STATUS.CONNECTED,
      }));

      if (info.users && Array.isArray(info.users) && socket.id) {
        const normalizedUsers = normalizeUsers(info.users, socket.id);
        setState(prev => ({ ...prev, remoteUsers: normalizedUsers }));
      }
    };

    // ユーザー参加
    const handleUserJoined = (data: string | { userId: string; username: string }) => {
      const { userId, username: joinedUsername } = normalizeUserJoinData(data);
      debugLog(`User joined: ${userId} (${joinedUsername})`);

      setState(prev => {
        const existing = prev.remoteUsers.find(u => u.id === userId);
        if (!existing) {
          const newUser: RemoteUser = { id: userId, username: joinedUsername };
          webrtc.createOffer(userId);
          return { ...prev, remoteUsers: [...prev.remoteUsers, newUser] };
        }
        return prev;
      });
    };

    // ユーザー退出
    const handleUserLeft = (userId: string) => {
      debugLog(`User left: ${userId}`);
      handleUserDisconnected(userId);
      webrtc.closePeerConnection(userId);
    };

    // イベントリスナー登録
    socket.on(SOCKET_EVENTS.ROOM_INFO, handleRoomInfo);
    socket.on(SOCKET_EVENTS.USER_JOINED, handleUserJoined);
    socket.on(SOCKET_EVENTS.USER_LEFT, handleUserLeft);
    socket.on(SOCKET_EVENTS.OFFER, webrtc.handleOffer);
    socket.on(SOCKET_EVENTS.ANSWER, webrtc.handleAnswer);
    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, webrtc.handleIceCandidate);

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_INFO, handleRoomInfo);
      socket.off(SOCKET_EVENTS.USER_JOINED, handleUserJoined);
      socket.off(SOCKET_EVENTS.USER_LEFT, handleUserLeft);
      socket.off(SOCKET_EVENTS.OFFER, webrtc.handleOffer);
      socket.off(SOCKET_EVENTS.ANSWER, webrtc.handleAnswer);
      socket.off(SOCKET_EVENTS.ICE_CANDIDATE, webrtc.handleIceCandidate);
    };
  }, [socket, roomId, webrtc, handleUserDisconnected]);

  // ローカルストリーム変更時の処理
  useEffect(() => {
    if (state.localStream) {
      webrtc.processPendingOffers();
    }
  }, [state.localStream, webrtc]);

  // 自動参加
  useEffect(() => {
    if (autoJoin && socket && roomId && !isInitializedRef.current) {
      joinRoom();
    }
  }, [autoJoin, socket, roomId, joinRoom]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

  return {
    state,
    localVideoRef,
    remoteVideoRefs,
    actions: {
      joinRoom,
      leaveRoom,
      toggleVideo,
      toggleAudio,
      clearError,
    },
  };
};