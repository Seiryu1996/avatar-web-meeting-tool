import React, { useRef, useEffect, useState, useCallback } from 'react';
import FaceTracker from './FaceTracker';

interface AvatarCanvasProps {
  avatarData: any;
}

const AvatarCanvas: React.FC<AvatarCanvasProps> = ({ avatarData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const imagesRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const [trackingData, setTrackingData] = useState({ 
    leftEye: 1, 
    rightEye: 1, 
    mouth: 0, 
    headX: 0, 
    headY: 0, 
    headZ: 0 
  });
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // 画像を事前に読み込んでキャッシュし、ちらつきを防ぐ
  useEffect(() => {
    if (!avatarData?.parts) return;
    
    let loadedCount = 0;
    const totalImages = avatarData.parts.filter((part: any) => part.imageData && part.visible !== false).length;
    
    if (totalImages === 0) {
      setImagesLoaded(true);
      return;
    }
    
    avatarData.parts.forEach((part: any, index: number) => {
      if (part.imageData && part.visible !== false) {
        if (!imagesRef.current.has(index)) {
          const img = new Image();
          img.onload = () => {
            imagesRef.current.set(index, img);
            loadedCount++;
            if (loadedCount === totalImages) {
              setImagesLoaded(true);
            }
          };
          img.onerror = () => {
            loadedCount++;
            if (loadedCount === totalImages) {
              setImagesLoaded(true);
            }
          };
          img.src = part.imageData;
        }
      }
    });
  }, [avatarData]);
  
  const drawAvatar = useCallback(() => {
    if (!canvasRef.current || !avatarData?.parts || !imagesLoaded) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // パーツを描画
    avatarData.parts.forEach((part: any, index: number) => {
      if (part.imageData && part.visible !== false) {
        const img = imagesRef.current.get(index);
        if (!img) return;
        
        const baseX = part.x || 0;
        const baseY = part.y || 0;
        const scaleX = baseX > 400 ? 400 / baseX * 0.8 : 1;
        const scaleY = baseY > 300 ? 300 / baseY * 0.8 : 1;
        const x = baseX * scaleX + trackingData.headX * 30;
        const y = baseY * scaleY + trackingData.headY * 30;
        const scale = part.scale || 1;
        const baseScale = part.baseScale || 1;
        let totalScale = scale * baseScale * 0.3;
        const pivotX = part.pivotX || 0;
        const pivotY = part.pivotY || 0;
        
        // パーツタイプに応じてトラッキングデータを適用
        if (part.type === 'left_eye') {
          totalScale *= Math.max(0.1, trackingData.leftEye);
        } else if (part.type === 'right_eye') {
          totalScale *= Math.max(0.1, trackingData.rightEye);
        } else if (part.type === 'mouth') {
          totalScale *= (1 + trackingData.mouth * 0.5);
        }
        
        ctx.save();
        ctx.translate(x, y);
        if (part.rotation) {
          ctx.rotate(part.rotation * Math.PI / 180);
        }
        ctx.scale(totalScale, totalScale);
        ctx.drawImage(img, -pivotX, -pivotY);
        ctx.restore();
      }
    });
  }, [avatarData, trackingData, imagesLoaded]);
  
  // アニメーションフレームで描画を更新し、スムーズなアニメーションを実現
  useEffect(() => {
    const animate = () => {
      drawAvatar();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    if (imagesLoaded) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawAvatar, imagesLoaded]);

  const handleTrackingUpdate = useCallback((data: { 
    leftEye: number; 
    rightEye: number; 
    mouth: number; 
    headX: number; 
    headY: number; 
    headZ: number; 
  }) => {
    // トラッキングデータをスムージングして急激な変化を抑制
    setTrackingData(prevData => ({
      leftEye: prevData.leftEye * 0.7 + data.leftEye * 0.3,
      rightEye: prevData.rightEye * 0.7 + data.rightEye * 0.3,
      mouth: prevData.mouth * 0.7 + data.mouth * 0.3,
      headX: prevData.headX * 0.8 + data.headX * 0.2,
      headY: prevData.headY * 0.8 + data.headY * 0.2,
      headZ: prevData.headZ * 0.8 + data.headZ * 0.2
    }));
  }, []);

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