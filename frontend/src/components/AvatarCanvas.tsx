import React, { useRef, useEffect, useState } from 'react';
import FaceTracker from './FaceTracker';

interface AvatarCanvasProps {
  avatarData: any;
}

const AvatarCanvas: React.FC<AvatarCanvasProps> = ({ avatarData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trackingData, setTrackingData] = useState({ 
    leftEye: 1, 
    rightEye: 1, 
    mouth: 0, 
    headX: 0, 
    headY: 0, 
    headZ: 0 
  });

  useEffect(() => {
    console.log('AvatarCanvas: avatarData received:', avatarData);
    if (!avatarData || !canvasRef.current) {
      console.log('AvatarCanvas: No avatarData or canvas ref');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawAvatar = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      console.log('AvatarCanvas: Drawing avatar, parts:', avatarData.parts);
      
      if (avatarData.parts) {
        avatarData.parts.forEach((part: any, index: number) => {
          console.log(`AvatarCanvas: Processing part ${index}:`, part);
          console.log(`AvatarCanvas: Part keys:`, Object.keys(part));
          if (part.imageData && part.visible !== false) {
            const img = new Image();
            img.onload = () => {
              console.log(`AvatarCanvas: Image loaded for part ${index}`);
              // JSONの元の座標を使用し、トラッキングデータを適用
              const baseX = part.x || 0;
              const baseY = part.y || 0;
              // 座標が範囲外の場合はスケールダウンして画面内に収める
              const scaleX = baseX > 400 ? 400 / baseX * 0.8 : 1;
              const scaleY = baseY > 300 ? 300 / baseY * 0.8 : 1;
              const x = baseX * scaleX + trackingData.headX * 50;
              const y = baseY * scaleY + trackingData.headY * 50;
              const scale = part.scale || 1;
              const baseScale = part.baseScale || 1;
              let totalScale = scale * baseScale * 0.3;
              const pivotX = part.pivotX || 0;
              const pivotY = part.pivotY || 0;
              
              // パーツタイプに応じてトラッキングデータを適用
              if (part.type === 'left_eye') {
                totalScale *= trackingData.leftEye;
              } else if (part.type === 'right_eye') {
                totalScale *= trackingData.rightEye;
              } else if (part.type === 'mouth') {
                totalScale *= (1 + trackingData.mouth * 0.3);
              }
              
              ctx.save();
              ctx.translate(x, y);
              if (part.rotation) {
                ctx.rotate(part.rotation * Math.PI / 180);
              }
              ctx.scale(totalScale, totalScale);
              ctx.drawImage(img, -pivotX, -pivotY);
              ctx.restore();
            };
            img.onerror = () => {
              console.error(`AvatarCanvas: Failed to load image for part ${index}:`, part.imageData);
            };
            img.src = part.imageData;
          } else {
            console.log(`AvatarCanvas: Skipping part ${index} - no image or not visible`);
          }
        });
      } else {
        console.log('AvatarCanvas: No parts found in avatarData');
      }
    };

    drawAvatar();
  }, [avatarData, trackingData]);

  const handleTrackingUpdate = (data: { 
    leftEye: number; 
    rightEye: number; 
    mouth: number; 
    headX: number; 
    headY: number; 
    headZ: number; 
  }) => {
    setTrackingData(data);
  };

  return (
    <div>
      <h3>Your Avatar</h3>
      <FaceTracker onTrackingUpdate={handleTrackingUpdate} />
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        style={{ border: '1px solid #ccc' }}
      />
    </div>
  );
};

export default AvatarCanvas;