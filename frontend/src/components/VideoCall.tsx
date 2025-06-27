import React, { useRef, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface VideoCallProps {
  socket: Socket | null;
  roomId: string;
  username: string;
}

interface RemoteUser {
  id: string;
  username: string;
  stream?: MediaStream;
}

const VideoCall: React.FC<VideoCallProps> = ({ socket, roomId, username }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());
  const [connectedUsers, setConnectedUsers] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<string>('接続中...');
  const [roomJoined, setRoomJoined] = useState<boolean>(false);
  const [isOffering, setIsOffering] = useState<boolean>(false);

  useEffect(() => {
    if (!socket) {
      console.log('Socket is null');
      return;
    }

    console.log('VideoCall useEffect - socket connected:', socket.connected);
    console.log('VideoCall useEffect - roomId:', roomId);

    // ソケットイベントリスナーを先に設定（カメラエラーに関係なく）
    socket.on('room-info', (info) => {
      console.log('Room info received:', info, 'userCount:', info.userCount);
      console.log('My socket ID:', socket.id);
      console.log('All users in room:', info.users);
      
      setConnectedUsers(info.userCount - 1);
      setConnectionStatus(`ルームに参加中`);
      console.log('Setting connectedUsers to:', info.userCount - 1);
      
      // 他のユーザーをリモートユーザーとして追加
      if (info.users && Array.isArray(info.users)) {
        const otherUsers = info.users.filter((userId: string) => userId !== socket.id);
        console.log('Other users:', otherUsers);
        setRemoteUsers(prev => {
          const newUsers = otherUsers.map((userId: string) => ({
            id: userId,
            username: `ユーザー${userId.slice(-4)}`
          }));
          console.log('Setting remote users:', newUsers);
          return newUsers;
        });
      }
    });

    socket.on('user-joined', async (userId) => {
      console.log('User joined:', userId);
      setConnectionStatus('他のユーザーが参加しました');
      
      // 新しいリモートユーザーを追加
      setRemoteUsers(prev => {
        const existing = prev.find(u => u.id === userId);
        if (!existing) {
          return [...prev, { id: userId, username: `ユーザー${userId.slice(-4)}` }];
        }
        return prev;
      });
    });

    socket.on('user-left', (userId) => {
      console.log('User left:', userId);
      setConnectionStatus('ユーザーが退出しました');
      
      // リモートユーザーを削除
      setRemoteUsers(prev => prev.filter(u => u.id !== userId));
    });

    const initWebRTC = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        pc.ontrack = (event) => {
          const remoteStream = event.streams[0];
          // リモートユーザーのストリームを追加
          setRemoteUsers(prev => {
            const existing = prev.find(u => u.id === 'temp-remote');
            if (existing) {
              return prev.map(u => u.id === 'temp-remote' ? {...u, stream: remoteStream} : u);
            } else {
              return [...prev, { id: 'temp-remote', username: '相手', stream: remoteStream }];
            }
          });
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice-candidate', {
              roomId,
              candidate: event.candidate
            });
          }
        };

        setPeerConnections(prev => new Map(prev.set('default', pc)));

        socket.on('offer', async (offer) => {
          try {
            if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(offer);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.emit('answer', { roomId, answer });
              console.log('Answer sent');
            }
          } catch (error) {
            console.error('Error handling offer:', error);
          }
        });

        socket.on('answer', async (answer) => {
          try {
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(answer);
              console.log('Answer received');
            }
          } catch (error) {
            console.error('Error handling answer:', error);
          }
        });

        socket.on('ice-candidate', async (candidate) => {
          await pc.addIceCandidate(candidate);
        });

        // user-joinedでのOffer送信
        socket.on('user-joined', async (userId) => {
          console.log('WebRTC: User joined for offer:', userId);
          
          // 重複offer防止
          if (!isOffering && pc.signalingState === 'stable') {
            try {
              setIsOffering(true);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('offer', { roomId, offer });
              console.log('Offer sent');
            } catch (error) {
              console.error('Error creating offer:', error);
            } finally {
              setIsOffering(false);
            }
          }
        });

      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    initWebRTC();
    
    // ルームに参加（重複防止）
    if (!roomJoined) {
      console.log('Emitting join-room event with roomId:', roomId);
      socket.emit('join-room', roomId);
      setRoomJoined(true);
      setConnectionStatus('ルームに参加しました');
      
      // 3秒後にルーム情報を再要求（フォールバック）
      setTimeout(() => {
        console.log('Requesting room info as fallback');
        socket.emit('get-room-info', roomId);
        
        // フォールバック用にルーム情報を要求後、正確な人数を設定
        setTimeout(() => {
          console.log('Fallback: requesting accurate user count');
          socket.emit('get-room-info', roomId);
        }, 2000);
      }, 3000);
    }
    
    // 接続確認用のイベントリスナー
    socket.on('connect', () => {
      console.log('Socket connected');
    });
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      peerConnections.forEach(pc => pc.close());
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('room-info');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, [socket, roomId]);

  return (
    <div>
      <h3>Video Call</h3>
      <div style={{ marginBottom: '10px' }}>
        <p>状態: {connectionStatus}</p>
        <p>接続中のユーザー: {connectedUsers + 1}人</p>
        <p>ルームID: {roomId}</p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <p>{username}（あなた）</p>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            width="200"
            height="150"
            style={{ border: '1px solid #ccc' }}
          />
        </div>
        {remoteUsers.map((user) => (
          <div key={user.id}>
            <p>{user.username || `ユーザー${user.id.slice(-4)}`}</p>
            <video
              autoPlay
              width="200"
              height="150"
              style={{ border: '1px solid #ccc', backgroundColor: '#f0f0f0' }}
              ref={(el) => {
                if (el && user.stream) {
                  el.srcObject = user.stream;
                } else if (el) {
                  el.srcObject = null;
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoCall;