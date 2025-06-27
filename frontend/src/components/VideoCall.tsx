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
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const remoteStreams = useRef<Map<string, MediaStream>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());
  const [connectedUsers, setConnectedUsers] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<string>('接続中...');
  const [roomJoined, setRoomJoined] = useState<boolean>(false);
  const [isOffering, setIsOffering] = useState<boolean>(false);

  useEffect(() => {
    if (!socket || !roomId) return;

    // ソケットイベントリスナー設定
    socket.on('room-info', (info) => {
      setConnectedUsers(info.userCount - 1);
      setConnectionStatus(`ルームに参加中`);
      
      if (info.users && Array.isArray(info.users)) {
        const otherUsers = info.users.filter((userId: string) => userId !== socket.id);
        setRemoteUsers(otherUsers.map((userId: string) => ({
          id: userId,
          username: `ユーザー${userId.slice(-4)}`
        })));
      }
    });

    socket.on('user-joined', (userId) => {
      setRemoteUsers(prev => {
        const existing = prev.find(u => u.id === userId);
        return existing ? prev : [...prev, { id: userId, username: `ユーザー${userId.slice(-4)}` }];
      });
    });

    socket.on('user-left', (userId) => {
      // ビデオ要素とストリームのクリーンアップ
      const videoElement = remoteVideoRefs.current.get(userId);
      if (videoElement) {
        videoElement.srcObject = null;
        remoteVideoRefs.current.delete(userId);
      }
      remoteStreams.current.delete(userId);
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
          if (remoteStream) {
            // ストリームをrefに保存し、直接ビデオ要素に設定
            const availableUser = remoteUsers.find(u => !remoteStreams.current.has(u.id));
            if (availableUser) {
              remoteStreams.current.set(availableUser.id, remoteStream);
              const videoElement = remoteVideoRefs.current.get(availableUser.id);
              if (videoElement) {
                videoElement.srcObject = remoteStream;
                videoElement.play().catch(console.error);
              }
            }
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice-candidate', { roomId, candidate: event.candidate });
          }
        };

        setPeerConnections(prev => new Map(prev.set('default', pc)));

        socket.on('offer', async (offer) => {
          if (pc.signalingState === 'stable') {
            await pc.setRemoteDescription(offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('answer', { roomId, answer });
          }
        });

        socket.on('answer', async (answer) => {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(answer);
          }
        });

        socket.on('ice-candidate', async (candidate) => {
          try {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(candidate);
            } else {
              // remote descriptionが設定されるまで待つ
              setTimeout(async () => {
                if (pc.remoteDescription) {
                  await pc.addIceCandidate(candidate);
                }
              }, 100);
            }
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        });

        socket.on('user-joined', async (userId) => {
          if (pc.signalingState === 'stable') {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('offer', { roomId, offer });
          }
        });

      } catch (error) {
        console.error('Camera access error:', error);
      }
    };

    initWebRTC();
    
    // ルームに参加
    if (!roomJoined) {
      socket.emit('join-room', roomId);
      setRoomJoined(true);
      setConnectionStatus('ルームに参加しました');
    }

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
              playsInline
              width="200"
              height="150"
              style={{ border: '1px solid #ccc', backgroundColor: '#f0f0f0' }}
              ref={(el) => {
                if (el && !remoteVideoRefs.current.has(user.id)) {
                  remoteVideoRefs.current.set(user.id, el);
                  const stream = remoteStreams.current.get(user.id);
                  if (stream) {
                    el.srcObject = stream;
                    el.play().catch(console.error);
                  }
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