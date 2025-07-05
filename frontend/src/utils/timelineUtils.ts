// Timeline関連のユーティリティ関数

import { TimelineEventType, TimelineEvent, TimelineEventDisplay } from '../types/timeline';
import { EVENT_DISPLAY_CONFIG, DATE_FORMAT_OPTIONS, DEFAULT_LOCALE } from '../constants/timeline';

/**
 * イベントタイプに応じたアイコンを取得
 */
export const getEventIcon = (type: TimelineEventType): string => {
  return EVENT_DISPLAY_CONFIG[type]?.icon || '📝';
};

/**
 * イベントタイプに応じた色を取得
 */
export const getEventColor = (type: TimelineEventType): string => {
  return EVENT_DISPLAY_CONFIG[type]?.color || '#666';
};

/**
 * イベントタイプに応じた背景色を取得
 */
export const getEventBackgroundColor = (type: TimelineEventType): string => {
  return EVENT_DISPLAY_CONFIG[type]?.bgColor || '#f5f5f5';
};

/**
 * イベントタイプに応じた表示設定を取得
 */
export const getEventDisplayConfig = (type: TimelineEventType): TimelineEventDisplay => {
  return EVENT_DISPLAY_CONFIG[type] || {
    icon: '📝',
    color: '#666',
    bgColor: '#f5f5f5',
  };
};

/**
 * タイムスタンプを日本語形式でフォーマット
 */
export const formatTimestamp = (
  timestamp: Date, 
  locale: string = DEFAULT_LOCALE,
  options: Intl.DateTimeFormatOptions = DATE_FORMAT_OPTIONS
): string => {
  return timestamp.toLocaleTimeString(locale, options);
};

/**
 * タイムスタンプを相対時間でフォーマット（例：2分前）
 */
export const formatRelativeTime = (timestamp: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'たった今';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分前`;
  } else if (diffHours < 24) {
    return `${diffHours}時間前`;
  } else {
    return `${diffDays}日前`;
  }
};

/**
 * イベントリストを時系列でソート
 */
export const sortEventsByTimestamp = (events: TimelineEvent[]): TimelineEvent[] => {
  return [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

/**
 * イベントリストの重複を除去
 */
export const deduplicateEvents = (events: TimelineEvent[]): TimelineEvent[] => {
  const seen = new Set<string>();
  return events.filter(event => {
    if (seen.has(event.id)) {
      return false;
    }
    seen.add(event.id);
    return true;
  });
};

/**
 * イベントリストを最大件数で制限
 */
export const limitEvents = (events: TimelineEvent[], maxEvents: number): TimelineEvent[] => {
  if (events.length <= maxEvents) {
    return events;
  }
  return events.slice(-maxEvents);
};

/**
 * イベントをフィルタリング
 */
export const filterEventsByType = (
  events: TimelineEvent[], 
  allowedTypes: TimelineEventType[]
): TimelineEvent[] => {
  return events.filter(event => allowedTypes.includes(event.type));
};

/**
 * イベントタイプが有効かチェック
 */
export const isValidEventType = (type: string): type is TimelineEventType => {
  return Object.keys(EVENT_DISPLAY_CONFIG).includes(type as TimelineEventType);
};

/**
 * イベントデータのバリデーション
 */
export const validateTimelineEvent = (event: any): event is TimelineEvent => {
  return (
    typeof event.id === 'string' &&
    isValidEventType(event.type) &&
    typeof event.username === 'string' &&
    event.timestamp instanceof Date &&
    typeof event.message === 'string'
  );
};

/**
 * Socket.ioから受信した生データをTimelineEventに変換
 */
export const parseTimelineEventFromSocket = (data: any): TimelineEvent | null => {
  try {
    const event = {
      ...data,
      timestamp: new Date(data.timestamp),
    };

    return validateTimelineEvent(event) ? event : null;
  } catch (error) {
    console.error('Failed to parse timeline event:', error);
    return null;
  }
};

/**
 * イベントメッセージのローカライゼーション
 */
export const localizeEventMessage = (event: TimelineEvent): string => {
  // 将来的に多言語対応する場合に使用
  return event.message;
};