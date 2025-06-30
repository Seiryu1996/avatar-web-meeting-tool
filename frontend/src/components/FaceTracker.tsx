import React, { useRef, useEffect } from 'react';

declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
  }
}

interface FaceTrackerProps {
  onTrackingUpdate: (data: { 
    leftEye: number; 
    rightEye: number; 
    mouth: number; 
    headX: number; 
    headY: number; 
    headZ: number; 
  }) => void;
}

const FaceTracker: React.FC<FaceTrackerProps> = ({ onTrackingUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const startTracking = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 320, height: 240 } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadedmetadata', () => {
            videoRef.current?.play().catch(e => console.log('Video play failed:', e));
          });
          
          // シンプルな擬似トラッキング（開発用）
          let time = 0;
          const trackingInterval = setInterval(() => {
            time += 0.1;
            
            // シンプルな擬似アニメーション
            const leftEye = 0.5 + Math.sin(time * 2) * 0.3; // まばたき
            const rightEye = 0.5 + Math.sin(time * 2.1) * 0.3;
            const mouth = 0.5 + Math.sin(time * 1.5) * 0.3; // 口の動き
            const headX = Math.sin(time * 0.5) * 0.2; // 頭の動き
            const headY = Math.cos(time * 0.3) * 0.1;
            
            onTrackingUpdate({
              leftEye: Math.max(0, Math.min(1, leftEye)),
              rightEye: Math.max(0, Math.min(1, rightEye)),
              mouth: Math.max(0, Math.min(1, mouth)),
              headX,
              headY,
              headZ: 0
            });
          }, 33); // 30fps
          
          return () => clearInterval(trackingInterval);
        }
      } catch (error) {
        console.error('Camera access failed:', error);
      }
    };

    startTracking();
  }, [onTrackingUpdate]);

  return (
    <div style={{ display: 'none' }}>
      <video ref={videoRef} width="320" height="240" />
      <canvas ref={canvasRef} width="320" height="240" />
    </div>
  );
};

export default FaceTracker;