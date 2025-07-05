// VideoCall関連の型定義

import { Socket } from 'socket.io-client';

export interface VideoCallProps {
  socket: Socket | null;
  roomId: string;
  username: string;
}

export interface RemoteUser {
  id: string;
  username: string;
  stream?: MediaStream;
}

export interface RoomInfo {
  userCount: number;
  users: (string | { id: string; username: string })[];
}

export interface WebRTCOfferData {
  offer: RTCSessionDescriptionInit;
  fromUserId: string;
}

export interface WebRTCAnswerData {
  answer: RTCSessionDescriptionInit;
  fromUserId: string;
}

export interface ICECandidateData {
  candidate: RTCIceCandidate;
  fromUserId: string;
}

export interface PeerConnectionState {
  connection: RTCPeerConnection;
  isOffering: boolean;
  isAnswering: boolean;
  lastActivity: number;
}

export interface VideoCallState {
  localStream: MediaStream | null;
  remoteUsers: RemoteUser[];
  connectedUsers: number;
  connectionStatus: string;
  roomJoined: boolean;
  isLocalVideoEnabled: boolean;
  isLocalAudioEnabled: boolean;
  error: string | null;
}

export interface UseVideoCallOptions {
  socket: Socket | null;
  roomId: string;
  username: string;
  autoJoin?: boolean;
  mediaConstraints?: MediaStreamConstraints;
}

export interface UseVideoCallReturn {
  state: VideoCallState;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRefs: React.RefObject<Map<string, HTMLVideoElement>>;
  actions: {
    joinRoom: () => void;
    leaveRoom: () => void;
    toggleVideo: () => void;
    toggleAudio: () => void;
    clearError: () => void;
  };
}

export interface RTCConfiguration {
  iceServers: RTCIceServer[];
  iceCandidatePoolSize?: number;
}

export interface PendingOffer {
  offer: RTCSessionDescriptionInit;
  fromUserId: string;
  timestamp: number;
}

export interface WebRTCEvents {
  'room-info': (info: RoomInfo) => void;
  'user-joined': (data: string | { userId: string; username: string }) => void;
  'user-left': (userId: string) => void;
  'offer': (data: WebRTCOfferData) => void;
  'answer': (data: WebRTCAnswerData) => void;
  'ice-candidate': (data: ICECandidateData) => void;
}

export interface MediaDevices {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
}