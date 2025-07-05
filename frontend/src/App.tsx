// リファクタリングされたApp.tsxコンポーネント

import React, { useRef, useCallback } from 'react';
import AvatarCanvas from './components/AvatarCanvas';
import VideoCall from './components/VideoCall';
import { useAppState } from './hooks/useAppState';
import { useSocketConnection } from './hooks/useSocketConnection';
import { parseJSONFile, getBackendUrl } from './utils/appUtils';
import { UI_CONFIG } from './constants/app';
import './App.css';

/**
 * メインアプリケーションコンポーネント
 * アバターウェブミーティングアプリケーションのエントリーポイント
 */
const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // アプリケーション状態管理
  const { state, joinFormValidation, actions } = useAppState({
    backendUrl: getBackendUrl(),
    autoConnect: true,
  });

  // ソケット接続管理
  const { socket, connectionState } = useSocketConnection({
    url: getBackendUrl(),
    autoConnect: true,
    onConnect: () => console.log('Socket connected'),
    onDisconnect: () => console.log('Socket disconnected'),
    onError: (error) => console.error('Socket error:', error),
  });

  // ファイルアップロードハンドラー
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseJSONFile(file);
      actions.setAvatarData(data);
    } catch (error) {
      actions.clearConnectionError();
      // エラーの詳細をユーザーに表示
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('ファイルの読み込みに失敗しました');
      }
    }
  }, [actions]);

  // ルーム参加ハンドラー
  const handleJoinRoom = useCallback(async () => {
    if (!socket || !connectionState.isConnected) {
      alert('サーバーに接続されていません。しばらく待ってから再試行してください。');
      return;
    }

    await actions.joinRoom();
  }, [socket, connectionState.isConnected, actions]);

  // エラー表示コンポーネント
  const renderError = (error: string) => (
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
      <span>{error}</span>
      <button
        onClick={actions.clearConnectionError}
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
      backgroundColor: connectionState.isConnected ? '#e8f5e8' : '#fff3e0',
      border: `1px solid ${connectionState.isConnected ? '#4caf50' : '#ff9800'}`,
      borderRadius: '4px',
      marginBottom: '16px',
      fontSize: '14px',
      color: connectionState.isConnected ? '#2e7d32' : '#f57c00',
    }}>
      🔗 サーバー接続状態: {connectionState.isConnected ? '接続済み' : '切断中'}
      {connectionState.isConnecting && ' (接続中...)'}
      {connectionState.reconnectAttempts > 0 && ` (再接続試行: ${connectionState.reconnectAttempts}回)`}
    </div>
  );

  // 参加フォームの表示
  const renderJoinForm = () => (
    <div className="join-form" style={{ maxWidth: UI_CONFIG.joinForm.maxWidth, margin: '0 auto' }}>
      <div style={{ marginBottom: UI_CONFIG.joinForm.spacing }}>
        {renderConnectionStatus()}
        
        {state.connectionError && renderError(state.connectionError)}
        {connectionState.error && renderError(connectionState.error)}
      </div>

      <div style={{ marginBottom: UI_CONFIG.joinForm.spacing }}>
        <label htmlFor="username" style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
          ユーザー名 <span style={{ color: '#f44336' }}>*</span>
        </label>
        <input
          id="username"
          type="text"
          placeholder="あなたの名前"
          value={state.username}
          onChange={(e) => actions.setUsername(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: `1px solid ${joinFormValidation.username.isValid ? '#ddd' : '#f44336'}`,
            borderRadius: '4px',
            fontSize: '14px',
          }}
          maxLength={20}
        />
        {joinFormValidation.username.error && (
          <div style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>
            {joinFormValidation.username.error}
          </div>
        )}
      </div>

      <div style={{ marginBottom: UI_CONFIG.joinForm.spacing }}>
        <label htmlFor="roomId" style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
          ルームID <span style={{ color: '#f44336' }}>*</span>
        </label>
        <input
          id="roomId"
          type="text"
          placeholder="room-123"
          value={state.roomId}
          onChange={(e) => actions.setRoomId(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: `1px solid ${joinFormValidation.roomId.isValid ? '#ddd' : '#f44336'}`,
            borderRadius: '4px',
            fontSize: '14px',
          }}
          maxLength={50}
        />
        {joinFormValidation.roomId.error && (
          <div style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>
            {joinFormValidation.roomId.error}
          </div>
        )}
        <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
          半角英数字、ハイフン、アンダースコアが使用できます
        </div>
      </div>

      <div style={{ marginBottom: UI_CONFIG.joinForm.spacing }}>
        <label htmlFor="avatarFile" style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
          アバターデータ <span style={{ color: '#f44336' }}>*</span>
        </label>
        <input
          id="avatarFile"
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          ref={fileInputRef}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: `1px solid ${joinFormValidation.avatarData.isValid ? '#ddd' : '#f44336'}`,
            borderRadius: '4px',
            fontSize: '14px',
          }}
        />
        {joinFormValidation.avatarData.error && (
          <div style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>
            {joinFormValidation.avatarData.error}
          </div>
        )}
      </div>

      {state.avatarData && (
        <div className="avatar-preview" style={{ 
          marginBottom: UI_CONFIG.joinForm.spacing,
          maxWidth: UI_CONFIG.avatarPreview.maxWidth,
          margin: `0 auto ${UI_CONFIG.joinForm.spacing} auto`,
        }}>
          <AvatarCanvas 
            avatarData={state.avatarData}
            width={300}
            height={200}
          />
        </div>
      )}

      <button 
        onClick={handleJoinRoom}
        disabled={!joinFormValidation.isFormValid || !connectionState.isConnected || state.isConnecting}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: joinFormValidation.isFormValid && connectionState.isConnected ? '#4caf50' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          fontWeight: '500',
          cursor: joinFormValidation.isFormValid && connectionState.isConnected ? 'pointer' : 'not-allowed',
          transition: 'background-color 0.2s',
        }}
      >
        {state.isConnecting ? '参加中...' : 'ミーティングに参加'}
      </button>
    </div>
  );

  // ミーティングルームの表示
  const renderMeetingRoom = () => (
    <div className="meeting-room">
      <div className="avatar-section">
        <AvatarCanvas avatarData={state.avatarData} />
      </div>
      <div className="video-section">
        <VideoCall socket={socket} roomId={state.roomId} username={state.username} />
      </div>
    </div>
  );

  return (
    <div className="app">
      <header style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ color: '#333', fontSize: '28px', marginBottom: '8px' }}>
          🎭 Avatar Web Meeting
        </h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          アバターを使ったバーチャルミーティング
        </p>
      </header>
      
      {!state.joined ? renderJoinForm() : renderMeetingRoom()}
      
      {/* 開発環境での状態表示 */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '11px',
          zIndex: 9999,
        }}>
          <div>Socket: {connectionState.isConnected ? 'Connected' : 'Disconnected'}</div>
          <div>Joined: {state.joined ? 'Yes' : 'No'}</div>
          <div>Username: {state.username || 'None'}</div>
          <div>Room: {state.roomId || 'None'}</div>
          <div>Avatar: {state.avatarData ? 'Loaded' : 'None'}</div>
        </div>
      )}
    </div>
  );
};

export default App;