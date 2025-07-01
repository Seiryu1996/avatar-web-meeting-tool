import React, { useRef, useEffect, useCallback } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

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
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  const onResults = useCallback((results: any) => {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      
      // 目の開閉度を計算 (ランドマーク点を使用)
      const leftEyeTop = landmarks[159];
      const leftEyeBottom = landmarks[145];
      const leftEyeLeft = landmarks[33];
      const leftEyeRight = landmarks[133];
      
      const rightEyeTop = landmarks[386];
      const rightEyeBottom = landmarks[374];
      const rightEyeLeft = landmarks[362];
      const rightEyeRight = landmarks[263];
      
      // 目の縦横比を計算してまばたきを検出
      const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
      const leftEyeWidth = Math.abs(leftEyeLeft.x - leftEyeRight.x);
      const leftEyeRatio = leftEyeHeight / leftEyeWidth;
      
      const rightEyeHeight = Math.abs(rightEyeTop.y - rightEyeBottom.y);
      const rightEyeWidth = Math.abs(rightEyeLeft.x - rightEyeRight.x);
      const rightEyeRatio = rightEyeHeight / rightEyeWidth;
      
      // 口の開き具合を計算
      const mouthTop = landmarks[13];
      const mouthBottom = landmarks[14];
      const mouthLeft = landmarks[61];
      const mouthRight = landmarks[291];
      
      const mouthHeight = Math.abs(mouthTop.y - mouthBottom.y);
      const mouthWidth = Math.abs(mouthLeft.x - mouthRight.x);
      const mouthRatio = mouthHeight / mouthWidth;
      
      // 頭の位置と回転を計算
      const noseTip = landmarks[1];
      const chin = landmarks[175];
      const forehead = landmarks[10];
      
      // 正規化された座標から相対的な動きを計算
      const headX = (noseTip.x - 0.5) * 2; // -1 to 1の範囲
      const headY = (noseTip.y - 0.5) * 2; // -1 to 1の範囲
      const headZ = noseTip.z || 0;
      
      onTrackingUpdate({
        leftEye: Math.max(0, Math.min(1, leftEyeRatio * 3)), // 係数調整
        rightEye: Math.max(0, Math.min(1, rightEyeRatio * 3)),
        mouth: Math.max(0, Math.min(1, mouthRatio * 2)),
        headX: Math.max(-1, Math.min(1, headX)),
        headY: Math.max(-1, Math.min(1, headY)),
        headZ: Math.max(-1, Math.min(1, headZ))
      });
    }
  }, [onTrackingUpdate]);

  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        // MediaPipe FaceMeshを初期化
        const faceMesh = new FaceMesh({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
          }
        });
        
        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        
        faceMesh.onResults(onResults);
        faceMeshRef.current = faceMesh;
        
        // カメラを初期化
        if (videoRef.current) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (faceMeshRef.current && videoRef.current) {
                await faceMeshRef.current.send({ image: videoRef.current });
              }
            },
            width: 320,
            height: 240
          });
          
          cameraRef.current = camera;
          camera.start();
        }
      } catch (error) {
        // フォールバック: 簡単な擬似トラッキング
        let time = 0;
        const fallbackInterval = setInterval(() => {
          time += 0.05;
          onTrackingUpdate({
            leftEye: 0.8 + Math.sin(time * 3) * 0.2,
            rightEye: 0.8 + Math.sin(time * 3.1) * 0.2,
            mouth: 0.3 + Math.sin(time * 1.5) * 0.2,
            headX: Math.sin(time * 0.5) * 0.1,
            headY: Math.cos(time * 0.3) * 0.05,
            headZ: 0
          });
        }, 33);
        
        return () => clearInterval(fallbackInterval);
      }
    };

    initMediaPipe();
    
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
      }
    };
  }, [onResults]);

  return (
    <div style={{ display: 'none' }}>
      <video ref={videoRef} width="320" height="240" />
      <canvas ref={canvasRef} width="320" height="240" />
    </div>
  );
};

export default FaceTracker;