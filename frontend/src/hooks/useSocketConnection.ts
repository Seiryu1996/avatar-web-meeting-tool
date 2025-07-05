// ソケット接続専用のカスタムフック

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketConnectionState } from '../types/app';
import { CONNECTION_CONFIG, ERROR_MESSAGES } from '../constants/app';

interface UseSocketConnectionOptions {
  url: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

interface UseSocketConnectionReturn {
  socket: Socket | null;
  connectionState: SocketConnectionState;
  connect: () => void;
  disconnect: () => void;
  clearError: () => void;
}

/**
 * Socket.IO接続を管理するカスタムフック
 */
export const useSocketConnection = (
  options: UseSocketConnectionOptions
): UseSocketConnectionReturn => {
  const {
    url,
    autoConnect = true,
    reconnectAttempts = CONNECTION_CONFIG.reconnectAttempts,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<SocketConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnectRef = useRef(false);

  // エラーハンドリング
  const handleError = useCallback((errorMessage: string) => {
    setConnectionState(prev => ({
      ...prev,
      isConnecting: false,
      error: errorMessage,
    }));
    onError?.(errorMessage);
  }, [onError]);

  // 接続処理
  const connect = useCallback(() => {
    if (socket?.connected) {
      return;
    }

    setConnectionState(prev => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    try {
      const newSocket = io(url, {
        timeout: CONNECTION_CONFIG.timeout,
        reconnection: false, // 手動で再接続を管理
      });

      // 接続成功
      newSocket.on('connect', () => {
        setConnectionState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectAttempts: 0,
        }));
        isManualDisconnectRef.current = false;
        onConnect?.();
      });

      // 切断
      newSocket.on('disconnect', (reason) => {
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));

        // 手動切断でない場合は再接続を試行
        if (!isManualDisconnectRef.current && reason !== 'io client disconnect') {
          attemptReconnect();
        }

        onDisconnect?.();
      });

      // 接続エラー
      newSocket.on('connect_error', (error) => {
        handleError(ERROR_MESSAGES.connection.failed);
        
        // 再接続を試行
        if (!isManualDisconnectRef.current) {
          attemptReconnect();
        }
      });

      setSocket(newSocket);

    } catch (error) {
      handleError(ERROR_MESSAGES.connection.failed);
    }
  }, [url, socket, handleError, onConnect, onDisconnect]);

  // 再接続処理
  const attemptReconnect = useCallback(() => {
    setConnectionState(prev => {
      if (prev.reconnectAttempts >= reconnectAttempts) {
        return {
          ...prev,
          isConnecting: false,
          error: ERROR_MESSAGES.connection.timeout,
        };
      }

      // 遅延後に再接続
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isManualDisconnectRef.current) {
          connect();
        }
      }, CONNECTION_CONFIG.reconnectDelay * (prev.reconnectAttempts + 1));

      return {
        ...prev,
        isConnecting: true,
        reconnectAttempts: prev.reconnectAttempts + 1,
      };
    });
  }, [reconnectAttempts, connect]);

  // 切断処理
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socket) {
      socket.disconnect();
      setSocket(null);
    }

    setConnectionState({
      isConnected: false,
      isConnecting: false,
      error: null,
      reconnectAttempts: 0,
    });
  }, [socket]);

  // エラークリア
  const clearError = useCallback(() => {
    setConnectionState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  // 自動接続
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    socket,
    connectionState,
    connect,
    disconnect,
    clearError,
  };
};