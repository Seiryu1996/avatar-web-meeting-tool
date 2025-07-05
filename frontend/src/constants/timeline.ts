// Timeline関連の定数とスタイル

import { TimelineEventType, TimelineConfig, TimelineEventDisplay } from '../types/timeline';

// タイムラインの基本設定
export const DEFAULT_TIMELINE_CONFIG: TimelineConfig = {
  width: 300,
  height: 400,
  maxEvents: 100,
  autoScroll: true,
  showTimestamp: true,
  showIcons: true,
};

// イベントタイプ別の表示設定
export const EVENT_DISPLAY_CONFIG: Record<TimelineEventType, TimelineEventDisplay> = {
  'user-joined': {
    icon: '👋',
    color: '#4CAF50',
    bgColor: '#E8F5E8',
  },
  'user-left': {
    icon: '👋',
    color: '#f44336',
    bgColor: '#FFEBEE',
  },
  'video-on': {
    icon: '📹',
    color: '#2196F3',
    bgColor: '#E3F2FD',
  },
  'video-off': {
    icon: '📹',
    color: '#FF9800',
    bgColor: '#FFF3E0',
  },
  'audio-on': {
    icon: '🔊',
    color: '#4CAF50',
    bgColor: '#E8F5E8',
  },
  'audio-off': {
    icon: '🔇',
    color: '#f44336',
    bgColor: '#FFEBEE',
  },
  'meeting-start': {
    icon: '🎬',
    color: '#9C27B0',
    bgColor: '#F3E5F5',
  },
  'meeting-end': {
    icon: '🏁',
    color: '#607D8B',
    bgColor: '#ECEFF1',
  },
};

// スタイル定数
export const TIMELINE_STYLES = {
  container: {
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: '#f9f9f9',
    overflow: 'hidden' as const,
    display: 'flex' as const,
    flexDirection: 'column' as const,
  },
  header: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    color: '#333',
    fontWeight: '600' as const,
  },
  eventsContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    paddingRight: '8px',
  },
  eventItem: {
    display: 'flex' as const,
    alignItems: 'flex-start' as const,
    marginBottom: '12px',
    padding: '8px',
    backgroundColor: 'white',
    borderRadius: '6px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  eventIcon: {
    fontSize: '16px',
    marginRight: '8px',
    minWidth: '20px',
  },
  eventContent: {
    flex: 1,
  },
  eventMessage: {
    fontSize: '14px',
    color: '#333',
    marginBottom: '2px',
  },
  eventTimestamp: {
    fontSize: '11px',
    color: '#666',
  },
  emptyState: {
    color: '#666',
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    padding: '20px',
  },
  loadingState: {
    color: '#666',
    textAlign: 'center' as const,
    padding: '20px',
  },
  errorState: {
    color: '#f44336',
    textAlign: 'center' as const,
    padding: '20px',
    backgroundColor: '#FFEBEE',
    borderRadius: '4px',
    margin: '8px 0',
  },
} as const;

// アニメーション設定
export const ANIMATION_CONFIG = {
  newEventDuration: 300,
  scrollDuration: 200,
  fadeInDuration: 200,
};

// ソケットイベント名
export const SOCKET_EVENTS = {
  TIMELINE_EVENT: 'timeline-event',
  TIMELINE_HISTORY: 'timeline-history',
  GET_TIMELINE: 'get-timeline',
} as const;

// 日付フォーマット設定
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

// デフォルトのロケール
export const DEFAULT_LOCALE = 'ja-JP';