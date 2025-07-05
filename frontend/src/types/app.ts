// App.tsx関連の型定義

import { Socket } from 'socket.io-client';
import { AvatarData } from './avatarCanvas';

export interface AppState {
  socket: Socket | null;
  avatarData: AvatarData | null;
  roomId: string;
  username: string;
  joined: boolean;
  isConnecting: boolean;
  connectionError: string | null;
}

export interface JoinFormData {
  username: string;
  roomId: string;
  avatarData: AvatarData | null;
}

export interface JoinFormValidation {
  username: {
    isValid: boolean;
    error?: string;
  };
  roomId: {
    isValid: boolean;
    error?: string;
  };
  avatarData: {
    isValid: boolean;
    error?: string;
  };
  isFormValid: boolean;
}

export interface UseAppStateOptions {
  backendUrl?: string;
  autoConnect?: boolean;
}

export interface UseAppStateReturn {
  state: AppState;
  joinFormValidation: JoinFormValidation;
  actions: {
    setUsername: (username: string) => void;
    setRoomId: (roomId: string) => void;
    setAvatarData: (data: AvatarData | null) => void;
    joinRoom: () => Promise<void>;
    leaveRoom: () => void;
    clearConnectionError: () => void;
  };
}

export interface SocketConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}