// Timeline関連の型定義

import { Socket } from 'socket.io-client';

export type TimelineEventType = 
  | 'user-joined' 
  | 'user-left' 
  | 'video-on' 
  | 'video-off' 
  | 'audio-on' 
  | 'audio-off' 
  | 'meeting-start' 
  | 'meeting-end';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  username: string;
  timestamp: Date;
  message: string;
}

export interface TimelineProps {
  socket: Socket | null;
  roomId: string;
  className?: string;
  style?: React.CSSProperties;
}

export interface TimelineConfig {
  width: number;
  height: number;
  maxEvents?: number;
  autoScroll?: boolean;
  showTimestamp?: boolean;
  showIcons?: boolean;
}

export interface TimelineEventDisplay {
  icon: string;
  color: string;
  bgColor?: string;
}

export interface TimelineState {
  events: TimelineEvent[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
}

export interface UseTimelineOptions {
  socket: Socket | null;
  roomId: string;
  maxEvents?: number;
  autoFetch?: boolean;
}

export interface UseTimelineReturn {
  events: TimelineEvent[];
  isLoading: boolean;
  error: string | null;
  addEvent: (event: TimelineEvent) => void;
  clearEvents: () => void;
  refetch: () => void;
}