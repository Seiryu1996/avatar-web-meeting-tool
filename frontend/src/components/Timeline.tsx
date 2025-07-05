// リファクタリングされたTimelineコンポーネント

import React, { useRef, useEffect } from 'react';
import { TimelineProps, TimelineEvent } from '../types/timeline';
import { DEFAULT_TIMELINE_CONFIG, TIMELINE_STYLES } from '../constants/timeline';
import { useTimeline } from '../hooks/useTimeline';
import { 
  getEventIcon, 
  getEventColor, 
  formatTimestamp,
  formatRelativeTime 
} from '../utils/timelineUtils';

/**
 * タイムラインイベントを表示するコンポーネント
 * ソケット通信を通じてリアルタイムでイベントを受信し、表示します。
 */
const Timeline: React.FC<TimelineProps> = ({ 
  socket, 
  roomId, 
  className,
  style 
}) => {
  const eventsContainerRef = useRef<HTMLDivElement>(null);
  
  // タイムラインの状態管理
  const { events, isLoading, error, refetch } = useTimeline({
    socket,
    roomId,
    maxEvents: DEFAULT_TIMELINE_CONFIG.maxEvents,
    autoFetch: true,
  });

  // 新しいイベントが追加された時に自動スクロール
  useEffect(() => {
    if (DEFAULT_TIMELINE_CONFIG.autoScroll && eventsContainerRef.current) {
      const container = eventsContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [events]);

  // エラー状態の表示
  const renderError = () => (
    <div style={TIMELINE_STYLES.errorState}>
      <div>⚠️ {error}</div>
      <button 
        onClick={refetch}
        style={{
          marginTop: '8px',
          padding: '4px 8px',
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
        再試行
      </button>
    </div>
  );

  // ローディング状態の表示
  const renderLoading = () => (
    <div style={TIMELINE_STYLES.loadingState}>
      📡 読み込み中...
    </div>
  );

  // 空の状態の表示
  const renderEmptyState = () => (
    <div style={TIMELINE_STYLES.emptyState}>
      📝 イベントがありません
    </div>
  );

  // イベントアイテムの表示
  const renderEventItem = (event: TimelineEvent) => {
    const displayConfig = {
      icon: getEventIcon(event.type),
      color: getEventColor(event.type),
    };

    return (
      <div
        key={event.id}
        style={{
          ...TIMELINE_STYLES.eventItem,
          borderLeft: `4px solid ${displayConfig.color}`,
        }}
      >
        <span style={TIMELINE_STYLES.eventIcon}>
          {displayConfig.icon}
        </span>
        
        <div style={TIMELINE_STYLES.eventContent}>
          <div style={TIMELINE_STYLES.eventMessage}>
            {event.message}
          </div>
          {DEFAULT_TIMELINE_CONFIG.showTimestamp && (
            <div style={TIMELINE_STYLES.eventTimestamp}>
              {formatTimestamp(event.timestamp)}
            </div>
          )}
        </div>
      </div>
    );
  };

  // イベントリストの表示
  const renderEvents = () => {
    if (isLoading && events.length === 0) {
      return renderLoading();
    }

    if (error) {
      return renderError();
    }

    if (events.length === 0) {
      return renderEmptyState();
    }

    return events.map(renderEventItem);
  };

  return (
    <div 
      className={className}
      style={{
        ...TIMELINE_STYLES.container,
        width: DEFAULT_TIMELINE_CONFIG.width,
        height: DEFAULT_TIMELINE_CONFIG.height,
        ...style,
      }}
      role="log"
      aria-label="ミーティングタイムライン"
    >
      <h3 style={TIMELINE_STYLES.header}>
        タイムライン
        {isLoading && events.length > 0 && (
          <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
            📡 更新中...
          </span>
        )}
      </h3>
      
      <div 
        ref={eventsContainerRef}
        style={TIMELINE_STYLES.eventsContainer}
        role="feed"
        aria-live="polite"
        aria-label={`${events.length}件のイベント`}
      >
        {renderEvents()}
      </div>

      {/* 開発環境での状態表示 */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          zIndex: 1000,
        }}>
          <div>Events: {events.length}</div>
          <div>Socket: {socket?.connected ? 'Connected' : 'Disconnected'}</div>
          <div>Room: {roomId || 'None'}</div>
        </div>
      )}
    </div>
  );
};

export default Timeline;