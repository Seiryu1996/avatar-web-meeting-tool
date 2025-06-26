import React, { useRef, useEffect } from 'react';

interface AvatarCanvasProps {
  avatarData: any;
}

const AvatarCanvas: React.FC<AvatarCanvasProps> = ({ avatarData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!avatarData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawAvatar = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (avatarData.parts) {
        avatarData.parts.forEach((part: any) => {
          if (part.image && part.visible !== false) {
            const img = new Image();
            img.onload = () => {
              const x = part.x || 0;
              const y = part.y || 0;
              const width = part.width || img.width;
              const height = part.height || img.height;
              
              ctx.save();
              ctx.translate(x + width/2, y + height/2);
              if (part.rotation) {
                ctx.rotate(part.rotation * Math.PI / 180);
              }
              if (part.scaleX || part.scaleY) {
                ctx.scale(part.scaleX || 1, part.scaleY || 1);
              }
              ctx.drawImage(img, -width/2, -height/2, width, height);
              ctx.restore();
            };
            img.src = part.image;
          }
        });
      }
    };

    drawAvatar();
  }, [avatarData]);

  return (
    <div>
      <h3>Your Avatar</h3>
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        style={{ border: '1px solid #ccc' }}
      />
    </div>
  );
};

export default AvatarCanvas;