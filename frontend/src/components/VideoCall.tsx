import React, { useRef, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface VideoCallProps {
  socket: Socket | null;
  roomId: string;
}

const VideoCall: React.FC<VideoCallProps> = ({ socket, roomId }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (!socket) return;

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
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice-candidate', {
              roomId,
              candidate: event.candidate
            });
          }
        };

        setPeerConnection(pc);

        socket.on('offer', async (offer) => {
          await pc.setRemoteDescription(offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { roomId, answer });
        });

        socket.on('answer', async (answer) => {
          await pc.setRemoteDescription(answer);
        });

        socket.on('ice-candidate', async (candidate) => {
          await pc.addIceCandidate(candidate);
        });

        socket.on('user-joined', async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { roomId, offer });
        });

      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    initWebRTC();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }
    };
  }, [socket, roomId]);

  return (
    <div>
      <h3>Video Call</h3>
      <div style={{ display: 'flex', gap: '10px' }}>
        <div>
          <p>You</p>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            width="200"
            height="150"
          />
        </div>
        <div>
          <p>Remote</p>
          <video
            ref={remoteVideoRef}
            autoPlay
            width="200"
            height="150"
          />
        </div>
      </div>
    </div>
  );
};

export default VideoCall;