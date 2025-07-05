// App.tsx関連のユーティリティ関数

import { JoinFormValidation, JoinFormData } from '../types/app';
import { AvatarData } from '../types/avatarCanvas';
import { VALIDATION_RULES, ERROR_MESSAGES } from '../constants/app';
import { validateAvatarData } from './avatarCanvasUtils';

/**
 * ユーザー名のバリデーション
 */
export const validateUsername = (username: string): { isValid: boolean; error?: string } => {
  const trimmed = username.trim();
  
  if (!trimmed) {
    return { isValid: false, error: ERROR_MESSAGES.username.required };
  }
  
  if (trimmed.length < VALIDATION_RULES.username.minLength) {
    return { isValid: false, error: ERROR_MESSAGES.username.tooShort };
  }
  
  if (trimmed.length > VALIDATION_RULES.username.maxLength) {
    return { isValid: false, error: ERROR_MESSAGES.username.tooLong };
  }
  
  if (!VALIDATION_RULES.username.pattern.test(trimmed)) {
    return { isValid: false, error: ERROR_MESSAGES.username.invalidFormat };
  }
  
  return { isValid: true };
};

/**
 * ルームIDのバリデーション
 */
export const validateRoomId = (roomId: string): { isValid: boolean; error?: string } => {
  const trimmed = roomId.trim();
  
  if (!trimmed) {
    return { isValid: false, error: ERROR_MESSAGES.roomId.required };
  }
  
  if (trimmed.length < VALIDATION_RULES.roomId.minLength) {
    return { isValid: false, error: ERROR_MESSAGES.roomId.tooShort };
  }
  
  if (trimmed.length > VALIDATION_RULES.roomId.maxLength) {
    return { isValid: false, error: ERROR_MESSAGES.roomId.tooLong };
  }
  
  if (!VALIDATION_RULES.roomId.pattern.test(trimmed)) {
    return { isValid: false, error: ERROR_MESSAGES.roomId.invalidFormat };
  }
  
  return { isValid: true };
};

/**
 * アバターデータのバリデーション
 */
export const validateAvatarDataInput = (avatarData: AvatarData | null): { isValid: boolean; error?: string } => {
  if (!avatarData) {
    return { isValid: false, error: ERROR_MESSAGES.avatarData.required };
  }
  
  if (!validateAvatarData(avatarData)) {
    return { isValid: false, error: ERROR_MESSAGES.avatarData.invalidFormat };
  }
  
  return { isValid: true };
};

/**
 * フォーム全体のバリデーション
 */
export const validateJoinForm = (formData: JoinFormData): JoinFormValidation => {
  const usernameValidation = validateUsername(formData.username);
  const roomIdValidation = validateRoomId(formData.roomId);
  const avatarDataValidation = validateAvatarDataInput(formData.avatarData);
  
  return {
    username: usernameValidation,
    roomId: roomIdValidation,
    avatarData: avatarDataValidation,
    isFormValid: usernameValidation.isValid && roomIdValidation.isValid && avatarDataValidation.isValid,
  };
};

/**
 * JSONファイルを読み込んでパース
 */
export const parseJSONFile = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!file.type.includes('json') && !file.name.endsWith('.json')) {
      reject(new Error(ERROR_MESSAGES.file.invalidType));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') {
          throw new Error(ERROR_MESSAGES.file.readError);
        }
        
        const data = JSON.parse(result);
        resolve(data);
      } catch (error) {
        reject(new Error(ERROR_MESSAGES.file.parseError));
      }
    };
    
    reader.onerror = () => {
      reject(new Error(ERROR_MESSAGES.file.readError));
    };
    
    reader.readAsText(file);
  });
};

/**
 * バックエンドURLを取得
 */
export const getBackendUrl = (): string => {
  return process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
};

/**
 * 入力値をサニタイズ
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>"/\\&]/g, '');
};

/**
 * ルームIDをフォーマット（小文字変換、スペース除去）
 */
export const formatRoomId = (roomId: string): string => {
  return roomId
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9-_]/g, '');
};

/**
 * エラーメッセージをユーザーフレンドリーに変換
 */
export const formatErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return '予期しないエラーが発生しました';
};

/**
 * 接続状態をチェック
 */
export const checkConnectionStatus = (socket: any): {
  isConnected: boolean;
  status: string;
} => {
  if (!socket) {
    return { isConnected: false, status: '未接続' };
  }
  
  if (socket.connected) {
    return { isConnected: true, status: '接続済み' };
  }
  
  if (socket.connecting) {
    return { isConnected: false, status: '接続中' };
  }
  
  return { isConnected: false, status: '切断済み' };
};