'use client';

import { useEffect, useRef, useState } from 'react';
import type { AppState, CanvasElements } from '@/lib/types';
import Canvas from '@/lib/canvas';
import PixelStudio from '@/lib/app';
import UI from '@/lib/ui';
import History from '@/lib/history';
import ColorLoupe from '@/components/ColorLoupe';
import '@/lib/tools'; // Import tools to register them

interface CanvasProps {
  state: AppState;
  onStateChange?: (state: AppState) => void;
}

export default function CanvasComponent({ state }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const selectionOverlayRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loupePosition, setLoupePosition] = useState<{
    x: number;
    y: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;

    // Wait for all DOM elements to be available
    const initTimer = setTimeout(() => {
      if (!canvasRef.current) return;

      // Initialize canvas
      Canvas.init(canvasRef.current, selectionCanvasRef.current || undefined);

      // Set up canvas elements - use null if not found yet
      const elements: CanvasElements = {
        canvas: canvasRef.current,
        canvasWrapper: canvasWrapperRef.current,
        selectionOverlay: selectionOverlayRef.current,
        selectionCanvas: selectionCanvasRef.current,
        colorPicker: document.getElementById('colorPicker') as HTMLInputElement | null,
        hexInput: document.getElementById('hexInput') as HTMLInputElement | null,
        alphaInput: document.getElementById('alphaInput') as HTMLInputElement | null,
        brushSize: document.getElementById('brushSize') as HTMLInputElement | null,
        brushHardness: document.getElementById('brushHardness') as HTMLInputElement | null,
        brushOpacity: document.getElementById('brushOpacity') as HTMLInputElement | null,
        brushFlow: document.getElementById('brushFlow') as HTMLInputElement | null,
        brushSpacing: document.getElementById('brushSpacing') as HTMLInputElement | null,
        brushJitter: document.getElementById('brushJitter') as HTMLInputElement | null,
        stabilizerStrength: document.getElementById(
          'stabilizerStrength'
        ) as HTMLInputElement | null,
        tolerance: document.getElementById('tolerance') as HTMLInputElement | null,
        canvasWidth: document.getElementById('canvasWidth') as HTMLInputElement | null,
        canvasHeight: document.getElementById('canvasHeight') as HTMLInputElement | null,
        zoomLevel: document.getElementById('zoomLevel'),
        cursorPos: document.getElementById('cursorPos'),
        canvasSize: document.getElementById('canvasSize'),
        toolInfo: document.getElementById('toolInfo'),
      };

      // Initialize modules
      UI.init(state, elements);
      PixelStudio.init(state, elements, true); // Enable layers

      // Setup keyboard shortcuts
      UI.setupKeyboardShortcuts();

      // Select default tool
      PixelStudio.selectTool('pencil');

      // Save initial canvas state to history
      History.save();

      setIsInitialized(true);
    }, 100); // Small delay to ensure all components are mounted

    return () => clearTimeout(initTimer);
  }, [state, isInitialized]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current || !isInitialized) return;

    try {
      // Check if Canvas is initialized
      if (!Canvas.isInitialized()) {
        console.warn('Canvas not initialized yet');
        return;
      }
      const coords = Canvas.getCanvasCoords(e.nativeEvent);
      const tool = PixelStudio.getCurrentTool();
      if (tool) {
        tool.onPointerDown(coords, e.nativeEvent);
      }
      canvasRef.current.setPointerCapture(e.pointerId);
    } catch (error) {
      console.error('Error in handlePointerDown:', error);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !isInitialized) return;

    try {
      const coords = Canvas.getCanvasCoords(e.nativeEvent);
      UI.updateCursorPos(coords.x, coords.y);

      // Show brush preview for drawing tools
      const toolName = state.currentTool;
      if (toolName === 'pencil' || toolName === 'eraser') {
        UI.showBrushPreview(coords.x, coords.y, state.brushSize);
      } else {
        UI.hideBrushPreview();
      }

      // Show color loupe for picker tool
      if (toolName === 'picker' && canvasRef.current && isInitialized) {
        try {
          const canvasRect = canvasRef.current.getBoundingClientRect();
          // Calculate position relative to canvas (not scaled, since loupe is inside canvas-container)
          const screenX = e.clientX - canvasRect.left;
          const screenY = e.clientY - canvasRect.top;
          setLoupePosition({
            x: coords.x,
            y: coords.y,
            screenX,
            screenY,
          });
        } catch (error) {
          // Silently fail if canvas not ready
          setLoupePosition(null);
        }
      } else {
        setLoupePosition(null);
      }

      const tool = PixelStudio.getCurrentTool();
      if (tool) {
        tool.onPointerMove(coords, e.nativeEvent);
      }
    } catch (error) {
      console.error('Error in handlePointerMove:', error);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !isInitialized) return;

    try {
      const tool = PixelStudio.getCurrentTool();
      if (tool) {
        tool.onPointerUp(e.nativeEvent);
      }
      canvasRef.current.releasePointerCapture(e.pointerId);
    } catch (error) {
      console.error('Error in handlePointerUp:', error);
    }
  };

  const canvasWidth = 512;
  const canvasHeight = 512;

  return (
    <div className="canvas-area">
      <div
        className="canvas-wrapper"
        ref={canvasWrapperRef}
        style={{ transform: `scale(${state.zoom})` }}
      >
        <div className="canvas-container">
          <div className="checkerboard" style={{ width: canvasWidth, height: canvasHeight }}></div>
          <canvas
            ref={canvasRef}
            id="mainCanvas"
            width={canvasWidth}
            height={canvasHeight}
            className={`cursor-${state.currentTool}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={(e) => {
              handlePointerUp(e);
              UI.hideBrushPreview();
              setLoupePosition(null);
            }}
            onContextMenu={(e) => e.preventDefault()}
          />
          <canvas
            ref={selectionCanvasRef}
            id="selectionCanvas"
            width={canvasWidth}
            height={canvasHeight}
          />
          <div className="selection-overlay" ref={selectionOverlayRef} id="selectionOverlay"></div>
          <div className="brush-preview" id="brushPreview"></div>
          {loupePosition && (
            <ColorLoupe
              visible={state.currentTool === 'picker'}
              x={loupePosition.x}
              y={loupePosition.y}
              screenX={loupePosition.screenX}
              screenY={loupePosition.screenY}
              gridSize={5}
              pixelSize={8}
            />
          )}
        </div>
      </div>
    </div>
  );
}
