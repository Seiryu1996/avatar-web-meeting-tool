import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface TimelineEvent {
  id: string;
  type: 'user-joined' | 'user-left' | 'video-on' | 'video-off' | 'audio-on' | 'audio-off' | 'meeting-start' | 'meeting-end';
  username: string;
  timestamp: Date;
  message: string;
}

interface TimelineProps {
  socket: Socket | null;
  roomId: string;
}

const Timeline: React.FC<TimelineProps> = ({ socket, roomId }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.on('timeline-event', (event: TimelineEvent) => {
      setEvents(prev => [...prev, { ...event, timestamp: new Date(event.timestamp) }]);
    });

    socket.on('timeline-history', (history: TimelineEvent[]) => {
      setEvents(history.map(event => ({ ...event, timestamp: new Date(event.timestamp) })));
    });

    // タイムライン履歴を要求
    socket.emit('get-timeline', roomId);

    return () => {
      socket.off('timeline-event');
      socket.off('timeline-history');
    };
  }, [socket, roomId]);

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'user-joined': return '👋';
      case 'user-left': return '👋';
      case 'video-on': return '📹';
      case 'video-off': return '📹';
      case 'audio-on': return '🔊';
      case 'audio-off': return '🔇';
      case 'meeting-start': return '🎬';
      case 'meeting-end': return '🏁';
      default: return '📝';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'user-joined': return '#4CAF50';
      case 'user-left': return '#f44336';
      case 'video-on': return '#2196F3';
      case 'video-off': return '#FF9800';
      case 'audio-on': return '#4CAF50';
      case 'audio-off': return '#f44336';
      case 'meeting-start': return '#9C27B0';
      case 'meeting-end': return '#607D8B';
      default: return '#666';
    }
  };

  return (
    <div style={{ 
      width: '300px', 
      height: '400px', 
      border: '1px solid #ccc', 
      borderRadius: '8px',
      padding: '16px',
      backgroundColor: '#f9f9f9',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#333' }}>
        タイムライン
      </h3>
      
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        paddingRight: '8px'
      }}>
        {events.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            イベントがありません
          </p>
        ) : (
          events.map((event) => (
            <div 
              key={event.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                marginBottom: '12px',
                padding: '8px',
                backgroundColor: 'white',
                borderRadius: '6px',
                borderLeft: `4px solid ${getEventColor(event.type)}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <span style={{ 
                fontSize: '16px', 
                marginRight: '8px',
                minWidth: '20px'
              }}>
                {getEventIcon(event.type)}
              </span>
              
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '14px', 
                  color: '#333',
                  marginBottom: '2px'
                }}>
                  {event.message}
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#666'
                }}>
                  {formatTime(event.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Timeline;