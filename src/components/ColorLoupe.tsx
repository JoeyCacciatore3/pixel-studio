'use client';

import { useEffect, useRef } from 'react';
import Canvas from '@/lib/canvas';

interface ColorLoupeProps {
  visible: boolean;
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  gridSize?: number;
  pixelSize?: number;
}

export default function ColorLoupe({
  visible,
  x,
  y,
  screenX,
  screenY,
  gridSize = 5,
  pixelSize = 8,
}: ColorLoupeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!visible || !canvasRef.current) return;
    // Ensure we're in the browser
    if (typeof window === 'undefined') return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    try {
      // Check if canvas is initialized
      if (!Canvas.isInitialized()) return;

      const halfSize = Math.floor(gridSize / 2);
      const canvasX = Math.floor(x) - halfSize;
      const canvasY = Math.floor(y) - halfSize;

      // Get canvas context and sample pixels
      let mainCtx: CanvasRenderingContext2D;
      let width: number;
      let height: number;
      try {
        mainCtx = Canvas.getContext();
        width = Canvas.getWidth();
        height = Canvas.getHeight();
      } catch (error) {
        // Canvas not ready
        return;
      }

      // Clamp coordinates to canvas bounds
      const startX = Math.max(0, canvasX);
      const startY = Math.max(0, canvasY);
      const endX = Math.min(width, canvasX + gridSize);
      const endY = Math.min(height, canvasY + gridSize);

      const sampleWidth = endX - startX;
      const sampleHeight = endY - startY;

      if (sampleWidth <= 0 || sampleHeight <= 0) return;

      const imageData = mainCtx.getImageData(startX, startY, sampleWidth, sampleHeight);

      // Clear and draw loupe
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      // Draw checkerboard background
      for (let py = 0; py < gridSize; py++) {
        for (let px = 0; px < gridSize; px++) {
          const checkX = px * pixelSize;
          const checkY = py * pixelSize;
          const isEven = (px + py) % 2 === 0;
          ctx.fillStyle = isEven ? '#333' : '#222';
          ctx.fillRect(checkX, checkY, pixelSize, pixelSize);
        }
      }

      // Draw pixels
      let dataIndex = 0;
      for (let py = 0; py < sampleHeight; py++) {
        for (let px = 0; px < sampleWidth; px++) {
          const pixelX = (px + (canvasX < 0 ? -canvasX : 0)) * pixelSize;
          const pixelY = (py + (canvasY < 0 ? -canvasY : 0)) * pixelSize;

          if (
            pixelX >= 0 &&
            pixelY >= 0 &&
            pixelX < gridSize * pixelSize &&
            pixelY < gridSize * pixelSize
          ) {
            const r = imageData.data[dataIndex]!;
            const g = imageData.data[dataIndex + 1]!;
            const b = imageData.data[dataIndex + 2]!;
            const a = imageData.data[dataIndex + 3]! / 255;

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
            ctx.fillRect(pixelX, pixelY, pixelSize, pixelSize);
          }
          dataIndex += 4;
        }
      }

      // Draw grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= gridSize; i++) {
        const pos = i * pixelSize;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, gridSize * pixelSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(gridSize * pixelSize, pos);
        ctx.stroke();
      }

      // Highlight center pixel
      const centerX = Math.floor(gridSize / 2) * pixelSize;
      const centerY = Math.floor(gridSize / 2) * pixelSize;
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.strokeRect(centerX, centerY, pixelSize, pixelSize);

      // Draw crosshair
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX + pixelSize / 2, centerY - 2);
      ctx.lineTo(centerX + pixelSize / 2, centerY + pixelSize + 2);
      ctx.moveTo(centerX - 2, centerY + pixelSize / 2);
      ctx.lineTo(centerX + pixelSize + 2, centerY + pixelSize / 2);
      ctx.stroke();
    } catch (error) {
      // Canvas not initialized yet or other error - silently fail
      console.debug('ColorLoupe: Canvas not ready', error);
    }
  }, [visible, x, y, gridSize, pixelSize]);

  if (!visible) return null;

  const loupeSize = gridSize * pixelSize;
  const offset = 20;

  return (
    <div
      className="color-loupe"
      style={{
        left: `${screenX + offset}px`,
        top: `${screenY - loupeSize - offset}px`,
      }}
    >
      <canvas ref={canvasRef} width={loupeSize} height={loupeSize} />
    </div>
  );
}
