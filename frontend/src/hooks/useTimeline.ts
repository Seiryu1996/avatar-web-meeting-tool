// Timeline用のカスタムフック

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  TimelineEvent, 
  UseTimelineOptions, 
  UseTimelineReturn 
} from '../types/timeline';
import { SOCKET_EVENTS, DEFAULT_TIMELINE_CONFIG } from '../constants/timeline';
import { 
  parseTimelineEventFromSocket,
  sortEventsByTimestamp,
  deduplicateEvents,
  limitEvents 
} from '../utils/timelineUtils';

/**
 * Timelineの状態とソケット通信を管理するカスタムフック
 */
export const useTimeline = (options: UseTimelineOptions): UseTimelineReturn => {
  const { 
    socket, 
    roomId, 
    maxEvents = DEFAULT_TIMELINE_CONFIG.maxEvents,
    autoFetch = true 
  } = options;

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitializedRef = useRef(false);

  // イベントを追加
  const addEvent = useCallback((event: TimelineEvent) => {
    setEvents(prev => {
      const updatedEvents = [...prev, event];
      const sortedEvents = sortEventsByTimestamp(updatedEvents);
      const deduplicatedEvents = deduplicateEvents(sortedEvents);
      return maxEvents ? limitEvents(deduplicatedEvents, maxEvents) : deduplicatedEvents;
    });
  }, [maxEvents]);

  // イベントをクリア
  const clearEvents = useCallback(() => {
    setEvents([]);
    setError(null);
  }, []);

  // タイムライン履歴を再取得
  const refetch = useCallback(() => {
    if (!socket || !roomId) {
      setError('Socket または Room ID が無効です');
      return;
    }

    setIsLoading(true);
    setError(null);
    socket.emit(SOCKET_EVENTS.GET_TIMELINE, roomId);
  }, [socket, roomId]);

  // 新しいイベントを受信
  const handleTimelineEvent = useCallback((data: any) => {
    const event = parseTimelineEventFromSocket(data);
    if (event) {
      addEvent(event);
    } else {
      console.warn('Invalid timeline event received:', data);
    }
  }, [addEvent]);

  // タイムライン履歴を受信
  const handleTimelineHistory = useCallback((history: any[]) => {
    setIsLoading(false);
    
    try {
      const parsedEvents = history
        .map(parseTimelineEventFromSocket)
        .filter((event): event is TimelineEvent => event !== null);
      
      const sortedEvents = sortEventsByTimestamp(parsedEvents);
      const deduplicatedEvents = deduplicateEvents(sortedEvents);
      const limitedEvents = maxEvents ? limitEvents(deduplicatedEvents, maxEvents) : deduplicatedEvents;
      
      setEvents(limitedEvents);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`履歴の取得に失敗しました: ${errorMessage}`);
      console.error('Failed to parse timeline history:', err);
    }
  }, [maxEvents]);

  // ソケットエラーハンドリング
  const handleSocketError = useCallback((error: any) => {
    setIsLoading(false);
    const errorMessage = typeof error === 'string' ? error : 'ソケット通信エラーが発生しました';
    setError(errorMessage);
    console.error('Socket error in timeline:', error);
  }, []);

  // ソケットイベントリスナーの設定
  useEffect(() => {
    if (!socket) {
      setError('ソケット接続が無効です');
      return;
    }

    // イベントリスナーを登録
    socket.on(SOCKET_EVENTS.TIMELINE_EVENT, handleTimelineEvent);
    socket.on(SOCKET_EVENTS.TIMELINE_HISTORY, handleTimelineHistory);
    socket.on('error', handleSocketError);
    socket.on('connect_error', handleSocketError);
    socket.on('disconnect', () => {
      setError('ソケット接続が切断されました');
    });

    // クリーンアップ
    return () => {
      socket.off(SOCKET_EVENTS.TIMELINE_EVENT, handleTimelineEvent);
      socket.off(SOCKET_EVENTS.TIMELINE_HISTORY, handleTimelineHistory);
      socket.off('error', handleSocketError);
      socket.off('connect_error', handleSocketError);
      socket.off('disconnect');
    };
  }, [socket, handleTimelineEvent, handleTimelineHistory, handleSocketError]);

  // 初期データの取得
  useEffect(() => {
    if (!socket || !roomId || !autoFetch) return;
    if (isInitializedRef.current) return;

    // ソケットが接続されている場合のみ履歴を取得
    if (socket.connected) {
      refetch();
      isInitializedRef.current = true;
    } else {
      // 接続されるまで待機
      const handleConnect = () => {
        refetch();
        isInitializedRef.current = true;
        socket.off('connect', handleConnect);
      };
      socket.on('connect', handleConnect);

      return () => {
        socket.off('connect', handleConnect);
      };
    }
  }, [socket, roomId, autoFetch, refetch]);

  // roomIdが変更された場合の処理
  useEffect(() => {
    if (roomId) {
      clearEvents();
      isInitializedRef.current = false;
    }
  }, [roomId, clearEvents]);

  return {
    events,
    isLoading,
    error,
    addEvent,
    clearEvents,
    refetch,
  };
};