import React, { useState, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import AvatarCanvas from './components/AvatarCanvas';
import VideoCall from './components/VideoCall';
import './App.css';

interface AvatarData {
  version: string;
  timestamp: number;
  parts: any[];
  parameters: any;
}

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [avatarData, setAvatarData] = useState<AvatarData | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [joined, setJoined] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
    console.log('Connecting to backend:', backendUrl);
    
    const newSocket = io(backendUrl);
    
    newSocket.on('connect', () => {
      console.log('App: Socket connected with ID:', newSocket.id);
    });
    
    newSocket.on('disconnect', () => {
      console.log('App: Socket disconnected');
    });
    
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          setAvatarData(data);
        } catch (error) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  const joinRoom = () => {
    if (socket && roomId && avatarData && username.trim()) {
      setJoined(true);
    }
  };

  return (
    <div className="app">
      <h1>Avatar Web Meeting</h1>
      
      {!joined ? (
        <div className="join-form">
          <input
            type="text"
            placeholder="ユーザー名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="text"
            placeholder="Room ID (半角文字で入力)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.trim())}
          />
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            ref={fileInputRef}
          />
          <button onClick={joinRoom} disabled={!roomId || !avatarData || !username.trim()}>
            Join Meeting
          </button>
        </div>
      ) : (
        <div className="meeting-room">
          <div className="avatar-section">
            <AvatarCanvas avatarData={avatarData} />
          </div>
          <div className="video-section">
            <VideoCall socket={socket} roomId={roomId} username={username} />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;