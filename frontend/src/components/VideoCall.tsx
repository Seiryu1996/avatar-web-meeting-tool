// リファクタリングされたVideoCallコンポーネント

import React from 'react';
import Timeline from './Timeline';
import { VideoCallProps } from '../types/videoCall';
import { VIDEO_PREVIEW_CONFIG, UI_CONFIG } from '../constants/videoCall';
import { useVideoCall } from '../hooks/useVideoCall';
import { formatDisplayName } from '../utils/videoCallUtils';

/**
 * ビデオ通話機能を提供するコンポーネント
 * WebRTCを使用してリアルタイム映像・音声通信を実現します。
 */
const VideoCall: React.FC<VideoCallProps> = ({ socket, roomId, username }) => {
  // ビデオ通話の状態とロジックを管理
  const { state, localVideoRef, remoteVideoRefs, actions } = useVideoCall({
    socket,
    roomId,
    username,
    autoJoin: true,
  });

  // エラー表示コンポーネント
  const renderError = () => (
    <div style={{
      padding: '12px',
      backgroundColor: '#ffebee',
      border: '1px solid #f44336',
      borderRadius: '4px',
      color: '#d32f2f',
      marginBottom: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span>⚠️ {state.error}</span>
      <button
        onClick={actions.clearError}
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          color: '#d32f2f',
          cursor: 'pointer',
          padding: '4px',
        }}
      >
        ×
      </button>
    </div>
  );

  // 接続状態表示コンポーネント
  const renderConnectionStatus = () => (
    <div style={{
      padding: '8px 12px',
      backgroundColor: '#f5f5f5',
      border: '1px solid #ddd',
      borderRadius: '4px',
      marginBottom: '16px',
      fontSize: '14px',
      color: '#333',
    }}>
      <div>📊 状態: {state.connectionStatus}</div>
      <div>👥 接続中のユーザー: {state.connectedUsers + 1}人</div>
      <div>🏠 ルームID: {roomId}</div>
    </div>
  );

  // メディアコントロールボタン
  const renderMediaControls = () => (
    <div style={{
      display: 'flex',
      gap: UI_CONFIG.CONTROLS.spacing,
      justifyContent: 'center',
      marginBottom: '16px',
      padding: '8px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
    }}>
      <button
        onClick={actions.toggleVideo}
        style={{
          padding: '8px 16px',
          backgroundColor: state.isLocalVideoEnabled ? '#4caf50' : '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        {state.isLocalVideoEnabled ? '📹 ビデオON' : '📹 ビデオOFF'}
      </button>
      
      <button
        onClick={actions.toggleAudio}
        style={{
          padding: '8px 16px',
          backgroundColor: state.isLocalAudioEnabled ? '#4caf50' : '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        {state.isLocalAudioEnabled ? '🔊 オーディオON' : '🔇 オーディオOFF'}
      </button>
      
      <button
        onClick={actions.leaveRoom}
        style={{
          padding: '8px 16px',
          backgroundColor: '#ff5722',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        🚪 退出
      </button>
    </div>
  );

  // ローカルビデオコンポーネント
  const renderLocalVideo = () => (
    <div style={{ textAlign: 'center' }}>
      <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500' }}>
        {formatDisplayName(username, 'local')}（あなた）
      </p>
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        width={VIDEO_PREVIEW_CONFIG.width}
        height={VIDEO_PREVIEW_CONFIG.height}
        style={{
          ...VIDEO_PREVIEW_CONFIG.style,
          opacity: state.isLocalVideoEnabled ? 1 : 0.5,
        }}
        aria-label="ローカルビデオ"
      />
      {!state.isLocalVideoEnabled && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
        }}>
          ビデオ停止中
        </div>
      )}
    </div>
  );

  // リモートビデオコンポーネント
  const renderRemoteVideos = () => (
    <>
      {state.remoteUsers.map((user) => (
        <div key={user.id} style={{ textAlign: 'center', position: 'relative' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500' }}>
            {formatDisplayName(user.username, user.id)}
          </p>
          <video
            autoPlay
            playsInline
            muted={false}
            controls={false}
            width={VIDEO_PREVIEW_CONFIG.width}
            height={VIDEO_PREVIEW_CONFIG.height}
            style={{
              ...VIDEO_PREVIEW_CONFIG.style,
              backgroundColor: '#f0f0f0',
            }}
            ref={(el) => {
              if (el) {
                remoteVideoRefs.current.set(user.id, el);
                const stream = user.stream;
                if (stream) {
                  el.srcObject = stream;
                  el.load();
                  el.play().catch(e => {
                    setTimeout(() => {
                      el.play().catch(() => {});
                    }, 100);
                  });
                }
              }
            }}
            aria-label={`${user.username}のビデオ`}
          />
          {!user.stream && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'white',
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
            }}>
              接続中...
            </div>
          )}
        </div>
      ))}
    </>
  );

  // ビデオグリッドコンポーネント
  const renderVideoGrid = () => (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: UI_CONFIG.VIDEO_GRID.gap,
      justifyContent: 'center',
      alignItems: 'flex-start',
    }}>
      {renderLocalVideo()}
      {renderRemoteVideos()}
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>
          📹 Video Call
        </h3>
        
        {/* エラー表示 */}
        {state.error && renderError()}
        
        {/* 接続状態表示 */}
        {renderConnectionStatus()}
        
        {/* メディアコントロール */}
        {state.roomJoined && renderMediaControls()}
        
        {/* ビデオグリッド */}
        {renderVideoGrid()}
        
        {/* 空の状態 */}
        {state.remoteUsers.length === 0 && state.roomJoined && (
          <div style={{
            textAlign: 'center',
            padding: '32px',
            color: '#666',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            marginTop: '16px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
            <div>他のユーザーの参加を待っています...</div>
            <div style={{ fontSize: '14px', marginTop: '8px' }}>
              ルームID「{roomId}」を共有して招待してください
            </div>
          </div>
        )}
      </div>
      
      {/* タイムライン */}
      <Timeline socket={socket} roomId={roomId} />
      
      {/* 開発環境での状態表示 */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '11px',
          zIndex: 9999,
        }}>
          <div>Room Joined: {state.roomJoined ? 'Yes' : 'No'}</div>
          <div>Local Stream: {state.localStream ? 'Yes' : 'No'}</div>
          <div>Remote Users: {state.remoteUsers.length}</div>
          <div>Video: {state.isLocalVideoEnabled ? 'ON' : 'OFF'}</div>
          <div>Audio: {state.isLocalAudioEnabled ? 'ON' : 'OFF'}</div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;