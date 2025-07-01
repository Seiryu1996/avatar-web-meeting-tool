import React, { useRef, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import Timeline from './Timeline';

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
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());
  const [connectedUsers, setConnectedUsers] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<string>('接続中...');
  const [roomJoined, setRoomJoined] = useState<boolean>(false);
  const [isOffering, setIsOffering] = useState<boolean>(false);
  const pendingOffersRef = useRef<Array<{offer: RTCSessionDescriptionInit, fromUserId: string}>>([])

  useEffect(() => {
    if (!socket || !roomId) return;

    // ソケットイベントリスナー設定
    socket.on('room-info', (info) => {
      setConnectedUsers(info.userCount - 1);
      setConnectionStatus(`ルームに参加中`);
      
      if (info.users && Array.isArray(info.users)) {
        const otherUsers = info.users.filter((user: any) => {
          const userId = typeof user === 'string' ? user : user.id;
          return userId !== socket.id;
        });
        setRemoteUsers(otherUsers.map((user: any) => {
          if (typeof user === 'string') {
            return {
              id: user,
              username: `ユーザー${user.slice(-4)}`
            };
          } else {
            return {
              id: user.id,
              username: user.username
            };
          }
        }));
      }
    });

    socket.on('offer', async (data) => {
      const { offer, fromUserId } = data;
      
      if (!localStream) {
        pendingOffersRef.current.push({ offer, fromUserId });
        return;
      }
      
      await handleOffer(offer, fromUserId, localStream);
    });

    socket.on('answer', async (data) => {
      const { answer, fromUserId } = data;
      const pc = peerConnectionsRef.current.get(fromUserId);
      
      if (pc && pc.signalingState === 'have-local-offer') {
        try {
            await pc.setRemoteDescription(answer);
        } catch (error) {
        }
      } else {
      }
    });

    socket.on('ice-candidate', async (data) => {
      const { candidate, fromUserId } = data;
      const pc = peerConnectionsRef.current.get(fromUserId);
      
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (error) {
        }
      } else {
      }
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

    const createPeerConnection = (userId: string, stream: MediaStream) => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      });

      // トラックを追加
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // リモートストリーム受信時
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (remoteStream) {
          remoteStreams.current.set(userId, remoteStream);
          
          // React stateを更新してre-renderを強制
          setRemoteUsers(prev => {
            const updated = prev.map(user => 
              user.id === userId 
                ? { ...user, stream: remoteStream } 
                : user
            );
            return updated;
          });
          
          // 少し遅れてvideo要素に設定
          setTimeout(() => {
            const videoElement = remoteVideoRefs.current.get(userId);
            if (videoElement) {
                videoElement.srcObject = remoteStream;
              videoElement.load();
              videoElement.play().catch(e => {
                  // Edge対応: 更に遅らせて再試行
                setTimeout(() => {
                  videoElement.play().catch(() => {});
                }, 200);
              });
            } else {
              }
          }, 100);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { 
            roomId, 
            candidate: event.candidate,
            targetUserId: userId 
          });
        }
      };

      pc.onconnectionstatechange = () => {
      };

      pc.oniceconnectionstatechange = () => {
      };

      return pc;
    };

    const handleOffer = async (offer: RTCSessionDescriptionInit, fromUserId: string, stream: MediaStream) => {
      let pc = peerConnectionsRef.current.get(fromUserId);
      
      if (!pc) {
        pc = createPeerConnection(fromUserId, stream);
        peerConnectionsRef.current.set(fromUserId, pc);
        setPeerConnections(new Map(peerConnectionsRef.current));
      }

      try {
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { roomId, answer, targetUserId: fromUserId });
      } catch (error) {
      }
    };

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

        // 保留されたofferを処理
        for (const pendingOffer of pendingOffersRef.current) {
          await handleOffer(pendingOffer.offer, pendingOffer.fromUserId, stream);
        }
        pendingOffersRef.current = [];

        // 既存ユーザーとの接続を開始
        const handleUserConnection = async (userId: string) => {
          let pc = peerConnectionsRef.current.get(userId);
          
          if (!pc) {
            pc = createPeerConnection(userId, stream);
            peerConnectionsRef.current.set(userId, pc);
            setPeerConnections(new Map(peerConnectionsRef.current));
            
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('offer', { roomId, offer, targetUserId: userId });
            } catch (error) {
            }
          }
        };

        // 新しいユーザーが参加した時の処理
        socket.on('user-joined', (data) => {
          const userId = typeof data === 'string' ? data : data.userId;
          const userUsername = typeof data === 'string' ? `ユーザー${data.slice(-4)}` : data.username;
          
          setRemoteUsers(prev => {
            const existing = prev.find(u => u.id === userId);
            if (!existing) {
              handleUserConnection(userId);
              return [...prev, { id: userId, username: userUsername }];
            }
            return prev;
          });
        });



      } catch (error) {
      }
    };

    initWebRTC();
    
    // ルームに参加
    if (!roomJoined) {
      socket.emit('join-room', { roomId, username });
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
    <div style={{ display: 'flex', gap: '20px' }}>
      <div style={{ flex: 1 }}>
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
                muted={false}
                controls={false}
                width="200"
                height="150"
                style={{ border: '1px solid #ccc', backgroundColor: '#f0f0f0' }}
                ref={(el) => {
                  if (el) {
                    remoteVideoRefs.current.set(user.id, el);
                    const stream = remoteStreams.current.get(user.id);
                    if (stream) {
                              el.srcObject = stream;
                      el.load();
                      el.play().catch(e => {
                        // Edge対応: 少し遅らせて再試行
                        setTimeout(() => {
                          el.play().catch(() => {});
                        }, 100);
                      });
                    }
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>
      
      <Timeline socket={socket} roomId={roomId} />
    </div>
  );
};

export default VideoCall;