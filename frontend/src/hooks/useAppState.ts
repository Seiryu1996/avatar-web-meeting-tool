// App.tsx用のカスタムフック

import { useState, useCallback, useMemo } from 'react';
import { 
  AppState, 
  UseAppStateOptions, 
  UseAppStateReturn, 
  JoinFormData 
} from '../types/app';
import { AvatarData } from '../types/avatarCanvas';
import { 
  validateJoinForm, 
  formatRoomId, 
  sanitizeInput,
  formatErrorMessage 
} from '../utils/appUtils';
import { DEFAULT_BACKEND_URL } from '../constants/app';

/**
 * アプリケーション全体の状態を管理するカスタムフック
 */
export const useAppState = (options: UseAppStateOptions = {}): UseAppStateReturn => {
  const { backendUrl = DEFAULT_BACKEND_URL, autoConnect = true } = options;
  
  const [state, setState] = useState<AppState>({
    socket: null,
    avatarData: null,
    roomId: '',
    username: '',
    joined: false,
    isConnecting: false,
    connectionError: null,
  });

  // フォームバリデーション
  const joinFormValidation = useMemo(() => {
    const formData: JoinFormData = {
      username: state.username,
      roomId: state.roomId,
      avatarData: state.avatarData,
    };
    return validateJoinForm(formData);
  }, [state.username, state.roomId, state.avatarData]);

  // ユーザー名を設定
  const setUsername = useCallback((username: string) => {
    setState(prev => ({
      ...prev,
      username: sanitizeInput(username),
      connectionError: null,
    }));
  }, []);

  // ルームIDを設定
  const setRoomId = useCallback((roomId: string) => {
    setState(prev => ({
      ...prev,
      roomId: formatRoomId(roomId),
      connectionError: null,
    }));
  }, []);

  // アバターデータを設定
  const setAvatarData = useCallback((data: AvatarData | null) => {
    setState(prev => ({
      ...prev,
      avatarData: data,
      connectionError: null,
    }));
  }, []);

  // ルームに参加
  const joinRoom = useCallback(async () => {
    if (!joinFormValidation.isFormValid) {
      const firstError = 
        joinFormValidation.username.error ||
        joinFormValidation.roomId.error ||
        joinFormValidation.avatarData.error;
      
      setState(prev => ({
        ...prev,
        connectionError: firstError || 'フォームの入力を確認してください',
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isConnecting: true,
      connectionError: null,
    }));

    try {
      // ここで実際のソケット接続とルーム参加処理を行う
      // 現在は簡単な状態更新のみ
      setState(prev => ({
        ...prev,
        joined: true,
        isConnecting: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        connectionError: formatErrorMessage(error),
      }));
    }
  }, [joinFormValidation]);

  // ルームを退出
  const leaveRoom = useCallback(() => {
    setState(prev => ({
      ...prev,
      joined: false,
      isConnecting: false,
      connectionError: null,
    }));
  }, []);

  // 接続エラーをクリア
  const clearConnectionError = useCallback(() => {
    setState(prev => ({
      ...prev,
      connectionError: null,
    }));
  }, []);

  return {
    state,
    joinFormValidation,
    actions: {
      setUsername,
      setRoomId,
      setAvatarData,
      joinRoom,
      leaveRoom,
      clearConnectionError,
    },
  };
};