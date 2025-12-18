'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import type { CanvasElements } from '@/lib/types';
import Canvas from '@/lib/canvas';
import PixelStudio from '@/lib/app';
import UI from '@/lib/ui';
import ColorLoupe from '@/components/ColorLoupe';
import LoadingState from '@/components/LoadingState';
import ZoomControls from '@/components/ZoomControls';
import BrushControlsPanel from '@/components/BrushControlsPanel';
import ColorPalettePanel from '@/components/ColorPalettePanel';
import LayersControlsPanel from '@/components/LayersControlsPanel';
import HistoryControls from '@/components/HistoryControls';
import { useAppState } from '@/hooks/useAppState';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import StateManager from '@/lib/stateManager';
import { initializeApp } from '@/lib/init';
import { logger } from '@/lib/utils/logger';
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '@/lib/constants';
// Import tools to register them
// Note: Tools are relatively small, so static import is acceptable
// Tools must be registered synchronously before use, so dynamic import is not suitable here
import '@/lib/tools';

// Canvas Tools Component
interface ToolConfig {
  name: string;
  key: string;
  icon: string;
  strokeDasharray?: string;
  category?: string;
}

// All 30 tools organized by category with unique skeuomorphic icons
const allTools = [
  // Drawing Tools (11 total - split into left/right)
  {
    name: 'pencil',
    key: 'B',
    icon: 'M18 2L4 16l2 2 2 2L22 4l-2-2z M16 4l-2 2M6 18l2 2',
    category: 'drawing',
  },
  {
    name: 'eraser',
    key: 'E',
    icon: 'M19 7h-4l-2-2H7L5 7H3v2h2l2 2h8l2-2h2V7z M9 9l6 6M15 9l-6 6',
    category: 'drawing',
  },
  {
    name: 'clone',
    key: 'C',
    icon: 'M8 3h8v3H8V3z M5 8h14v10H5V8z M8 18h8v3H8v-3z M11 11h2v2h-2z M11 14h2v2h-2z',
    category: 'drawing',
  },
  {
    name: 'smudge',
    key: 'S',
    icon: 'M12 2C8 2 5 5 5 9c0 2 1 4 3 5M19 9c0-4-3-7-7-7M12 15c4 0 7 3 7 7 0 2-1 4-3 5M5 15c0 4 3 7 7 7',
    category: 'drawing',
  },
  {
    name: 'blur',
    key: '',
    icon: 'M12 2C6 2 2 6 2 12s4 10 10 10 10-4 10-10S18 2 12 2z M8 8h8v8H8z M10 10h4v4h-4z',
    category: 'drawing',
  },
  {
    name: 'sharpen',
    key: '',
    icon: 'M12 2l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1 2-4z M8 16l2 2M16 16l-2 2',
    category: 'drawing',
  },
  // Selection Tools
  {
    name: 'selection',
    key: 'M',
    icon: 'M3 3h18v18H3V3z M5 5v14h14V5H5z',
    strokeDasharray: '2 2',
    category: 'selection',
  },
  {
    name: 'lasso',
    key: 'L',
    icon: 'M12 2C8 2 5 5 5 9c0 2 1 3 2 4M19 9c0-4-3-7-7-7M12 15c4 0 7 3 7 7 0 1-1 2-2 3M5 15c0 4 3 7 7 7',
    category: 'selection',
  },
  {
    name: 'polygon',
    key: 'P',
    icon: 'M12 2l3 5 5 1-3 4 1 5-6-3-6 3 1-5-3-4 5-1 3-5z',
    category: 'selection',
  },
  {
    name: 'magnetic',
    key: 'U',
    icon: 'M12 2C8 2 5 5 5 9c0 1 0 2 1 3M19 9c0-4-3-7-7-7M12 15c4 0 7 3 7 7 0 1-1 2-1 3M5 15c0 4 3 7 7 7 M8 8h8M8 12h8M8 16h8',
    category: 'selection',
  },
  {
    name: 'wand',
    key: 'W',
    icon: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 11.8L11 13M12.2 6.2L11 5M3 21l9-9',
    category: 'selection',
  },
  {
    name: 'colorRange',
    key: 'R',
    icon: 'M12 2C6 2 2 6 2 12s4 10 10 10 10-4 10-10S18 2 12 2z M8 8h8v8H8z M10 10h4v4h-4z',
    category: 'selection',
  },
  // Fill Tools
  {
    name: 'bucket',
    key: 'G',
    icon: 'M19 11l-8-8-2 2 6 6-6 6 2 2 6-6 2-2z M5 2l5 5M21 16c0 2-2 4-2 4s-2-2-2-4 2-4 2-4 2 2 2 4z',
    category: 'fill',
  },
  {
    name: 'gradient',
    key: '',
    icon: 'M3 3h18v18H3V3z M5 5v14h14V5H5z M7 7h10M7 12h10M7 17h10',
    category: 'fill',
  },
  // Transform Tools
  {
    name: 'move',
    key: 'V',
    icon: 'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
    category: 'transform',
  },
  {
    name: 'rotate',
    key: '',
    icon: 'M12 2C6 2 2 6 2 12s4 10 10 10 10-4 10-10S18 2 12 2z M8 8l4-4 4 4M16 16l-4 4-4-4',
    category: 'transform',
  },
  {
    name: 'scale',
    key: '',
    icon: 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5M2 12l10 5 10-5 M7 7l10 10M17 7L7 17',
    category: 'transform',
  },
  {
    name: 'crop',
    key: '',
    icon: 'M17 15h2V7c0-1-1-2-2-2H9v2h8v8z M7 17V1H5v4H1v2h4v10c0 1 1 2 2 2h10v4h2v-4h4v-2H7z',
    category: 'transform',
  },
  // Special Tools
  {
    name: 'picker',
    key: 'I',
    icon: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h2v2H7z',
    category: 'special',
  },
  {
    name: 'intelligent-scissors',
    key: '',
    icon: 'M9.5 2C8 2 7 3 7 4.5S8 7 9.5 7 12 6 12 4.5 11 2 9.5 2z M19 2c-1.5 0-2.5 1-2.5 2.5S17.5 7 19 7s2.5-1 2.5-2.5S20.5 2 19 2z M9.5 17c-1.5 0-2.5 1-2.5 2.5s1 2.5 2.5 2.5 2.5-1 2.5-2.5-1-2.5-2.5-2.5z M19 17c-1.5 0-2.5 1-2.5 2.5s1 2.5 2.5 2.5 2.5-1 2.5-2.5-1-2.5-2.5-2.5z M12 10C9 10 7 12 7 14h10c0-2-2-4-5-4z M5 20h14v-2H5v2z',
    category: 'special',
  },
  {
    name: 'heal',
    key: '',
    icon: 'M12 2C6 2 2 6 2 12s4 10 10 10 10-4 10-10S18 2 12 2z M10 15l-5-5 1.5-1.5L10 12l7.5-7.5L19 6l-9 9z',
    category: 'special',
  },
  {
    name: 'paths',
    key: '',
    icon: 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5 M6 6l12 12M18 6L6 18',
    category: 'special',
  },
  // Cleanup Tools
  {
    name: 'cleanup-color-reduce',
    key: '',
    icon: 'M12 2C6 2 2 6 2 12s4 10 10 10 10-4 10-10S18 2 12 2z M6 6h4v4H6z M14 6h4v4h-4z M6 14h4v4H6z M14 14h4v4h-4z',
    category: 'cleanup',
  },
  {
    name: 'cleanup-edge-crisp',
    key: '',
    icon: 'M3 3h18v18H3V3z M5 5v14h14V5H5z M7 7h10v10H7z M9 9h6v6H9z',
    category: 'cleanup',
  },
  {
    name: 'cleanup-edge-smooth',
    key: '',
    icon: 'M12 2C6 2 2 6 2 12s4 10 10 10 10-4 10-10S18 2 12 2z M8 8c2 0 4 2 4 4s-2 4-4 4-4-2-4-4 2-4 4-4z M16 8c2 0 4 2 4 4s-2 4-4 4-4-2-4-4 2-4 4-4z',
    category: 'cleanup',
  },
  {
    name: 'cleanup-line-normalize',
    key: '',
    icon: 'M3 12h18M12 3v18M5 5l14 14M5 19l14-14 M8 8h8M8 12h8M8 16h8',
    category: 'cleanup',
  },
  {
    name: 'cleanup-outline',
    key: '',
    icon: 'M12 2l3 5 5 1-3 4 1 5-6-3-6 3 1-5-3-4 5-1 3-5z M8 8h8v8H8z',
    category: 'cleanup',
  },
  {
    name: 'cleanup-logo',
    key: '',
    icon: 'M12 2C8 2 5 5 5 9c0 2 1 3 2 4M19 9c0-4-3-7-7-7M12 15c4 0 7 3 7 7 0 1-1 2-2 3M5 15c0 4 3 7 7 7 M10 10h4v4h-4z',
    category: 'cleanup',
  },
  {
    name: 'cleanup-inspector',
    key: '',
    icon: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 11.8L11 13M12.2 6.2L11 5M3 21l9-9 M12 12h2v2h-2z',
    category: 'cleanup',
  },
  {
    name: 'cleanup-stray-pixels',
    key: '',
    icon: 'M12 2C6 2 2 6 2 12s4 10 10 10 10-4 10-10S18 2 12 2z M8 8h8v8H8z M10 10h4v4h-4z M7 7h2v2H7z M15 15h2v2h-2z',
    category: 'cleanup',
  },
] as const satisfies readonly ToolConfig[];

// Memoized tool button component
const ToolButton = memo(function ToolButton({
  tool,
  isActive,
  onSelect,
}: {
  tool: (typeof allTools)[number];
  isActive: boolean;
  onSelect: (toolName: string) => void;
}) {
  const handleClick = useCallback(() => {
    onSelect(tool.name);
  }, [tool.name, onSelect]);

  const tooltipText = tool.key
    ? `${tool.name.charAt(0).toUpperCase() + tool.name.slice(1).replace(/-/g, ' ')} (${tool.key})`
    : tool.name.charAt(0).toUpperCase() + tool.name.slice(1).replace(/-/g, ' ');

  return (
    <button
      key={tool.name}
      className={`tool-btn ${isActive ? 'active' : ''}`}
      data-tool={tool.name}
      data-testid={`testid-canvas-tool-${tool.name}`}
      data-tooltip={tooltipText}
      onClick={handleClick}
      aria-label={`${tool.name} tool`}
      aria-pressed={isActive}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...('strokeDasharray' in tool &&
          tool.strokeDasharray && { strokeDasharray: tool.strokeDasharray })}
        aria-hidden="true"
      >
        <path d={tool.icon} />
      </svg>
    </button>
  );
});

// Canvas Tools Component
const CanvasTools = memo(function CanvasTools({ activeTool }: { activeTool: string }) {
  const handleToolSelect = useCallback((toolName: string) => {
    PixelStudio.selectTool(toolName);
  }, []);

  // Split all 30 tools evenly: 15 left, 15 right
  const leftTools = allTools.slice(0, 15);
  const rightTools = allTools.slice(15, 30);

  // Split each side into 2 columns side by side
  // Left: 8 buttons in first column, 7 in second column
  // Right: 7 buttons in first column, 8 in second column
  const leftCol1 = leftTools.slice(0, 8);
  const leftCol2 = leftTools.slice(8, 15);
  const rightCol1 = rightTools.slice(0, 7);
  const rightCol2 = rightTools.slice(7, 15);

  return (
    <>
      {/* Left side tools - 2 columns side by side (8 + 7 = 15 buttons) */}
      <div className="canvas-tools-left">
        {/* First column: 8 buttons */}
        <div className="canvas-tools-column">
          {leftCol1.map((tool) => (
            <ToolButton
              key={tool.name}
              tool={tool}
              isActive={activeTool === tool.name}
              onSelect={handleToolSelect}
            />
          ))}
        </div>
        {/* Second column: 7 buttons */}
        <div className="canvas-tools-column">
          {leftCol2.map((tool) => (
            <ToolButton
              key={tool.name}
              tool={tool}
              isActive={activeTool === tool.name}
              onSelect={handleToolSelect}
            />
          ))}
        </div>
      </div>

      {/* Right side tools - 2 columns side by side (7 + 8 = 15 buttons) */}
      <div className="canvas-tools-right">
        {/* First column: 7 buttons */}
        <div className="canvas-tools-column">
          {rightCol1.map((tool) => (
            <ToolButton
              key={tool.name}
              tool={tool}
              isActive={activeTool === tool.name}
              onSelect={handleToolSelect}
            />
          ))}
        </div>
        {/* Second column: 8 buttons */}
        <div className="canvas-tools-column">
          {rightCol2.map((tool) => (
            <ToolButton
              key={tool.name}
              tool={tool}
              isActive={activeTool === tool.name}
              onSelect={handleToolSelect}
            />
          ))}
        </div>
      </div>
    </>
  );
});

export default function CanvasComponent() {
  const state = useAppState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const selectionOverlayRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);
  const { isTouchDevice } = useDeviceDetection();
  const [loupePosition, setLoupePosition] = useState<{
    x: number;
    y: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Multi-touch state
  const touchStateRef = useRef<{
    touches: Map<number, React.Touch>;
    lastDistance: number;
    lastZoom: number;
  }>({
    touches: new Map(),
    lastDistance: 0,
    lastZoom: 1,
  });

  // ResizeObserver for canvas container optimization
  useEffect(() => {
    if (!canvasWrapperRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // Only handle if canvas is initialized
      if (!isInitialized || !canvasRef.current) return;

      // Use ResizeObserver for container size changes
      // This is more efficient than window resize events
      // Canvas resize is handled separately via input controls
    });

    resizeObserver.observe(canvasWrapperRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isInitialized]);

  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;

    const initialState = state;

    if (!canvasRef.current) {
      logger.error('[Canvas] Canvas ref is null');
      return;
    }

    // Set up canvas elements
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
      stabilizerStrength: document.getElementById('stabilizerStrength') as HTMLInputElement | null,
      tolerance: document.getElementById('tolerance') as HTMLInputElement | null,
      canvasWidth: document.getElementById('canvasWidth') as HTMLInputElement | null,
      canvasHeight: document.getElementById('canvasHeight') as HTMLInputElement | null,
      zoomLevel: document.getElementById('zoomLevel'),
      cursorPos: document.getElementById('cursorPos'),
      canvasSize: document.getElementById('canvasSize'),
      toolInfo: document.getElementById('toolInfo'),
    };

    // Initialize immediately - no delay needed
    try {
      initializeApp(initialState, elements, { enableLayers: true });

      // Expose PixelStudio globally for testing purposes
      if (typeof window !== 'undefined') {
        window.PixelStudio = PixelStudio;
      }

      setIsInitialized(true);
      setInitError(null);
    } catch (error) {
      logger.error('[Canvas] Failed to initialize:', error);
      setIsInitialized(false);
      setInitError(error instanceof Error ? error : new Error(String(error)));
    }
    // Note: Intentionally excluding 'state' from dependencies to prevent infinite re-initialization loops.
    // The effect should only run once when isInitialized changes from false to true.
    // Including 'state' would cause re-initialization on every state change, which is not desired.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  // Handle multi-touch for zoom/pan
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isTouchDevice || !canvasRef.current) return;

      const touches = Array.from(e.touches);
      touchStateRef.current.touches.clear();

      touches.forEach((touch) => {
        touchStateRef.current.touches.set(touch.identifier, touch);
      });

      // Two-finger pinch
      if (touches.length === 2) {
        e.preventDefault();
        const [t1, t2] = touches;
        const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        touchStateRef.current.lastDistance = distance;
        touchStateRef.current.lastZoom = state.zoom;
      }
    },
    [isTouchDevice, state.zoom]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isTouchDevice || !canvasRef.current) return;

      const touches = Array.from(e.touches);

      // Update touch positions
      touches.forEach((touch) => {
        touchStateRef.current.touches.set(touch.identifier, touch);
      });

      // Two-finger pinch to zoom
      if (touches.length === 2) {
        e.preventDefault();
        const [t1, t2] = touches;
        const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

        if (touchStateRef.current.lastDistance > 0) {
          const scale = distance / touchStateRef.current.lastDistance;
          const newZoom = Math.max(0.25, Math.min(4, touchStateRef.current.lastZoom * scale));

          StateManager.setZoom(newZoom);
          UI.applyZoom(newZoom);
        }

        touchStateRef.current.lastDistance = distance;
      }
    },
    [isTouchDevice]
  );

  const handlePointerDown = useCallback(
    async (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!canvasRef.current || !isInitialized) return;

      try {
        // Check if Canvas is initialized
        if (!Canvas.isInitialized()) {
          logger.warn('Canvas not initialized yet');
          return;
        }

        // Prevent default touch behaviors on mobile
        if (isTouchDevice && e.pointerType === 'touch') {
          e.preventDefault();
        }

        const preciseCoords = Canvas.getCanvasCoordsPrecise(e.nativeEvent);
        const coords = { x: Math.round(preciseCoords.x), y: Math.round(preciseCoords.y) };
        const tool = PixelStudio.getCurrentTool();
        if (tool) {
          await tool.onPointerDown(coords, e.nativeEvent);
        }
        canvasRef.current.setPointerCapture(e.pointerId);
      } catch (error) {
        logger.error('Error in handlePointerDown:', error);
      }
    },
    [isInitialized, isTouchDevice]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !isInitialized) return;

      try {
        const preciseCoords = Canvas.getCanvasCoordsPrecise(e.nativeEvent);
        const coords = { x: Math.round(preciseCoords.x), y: Math.round(preciseCoords.y) };
        UI.updateCursorPos(coords.x, coords.y);

        // Show brush preview for drawing tools
        const toolName = state.currentTool;
        if (toolName === 'pencil') {
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
        logger.error('Error in handlePointerMove:', error);
      }
    },
    [isInitialized, state.currentTool, state.brushSize]
  );

  const handlePointerUp = useCallback(
    async (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !isInitialized) return;

      try {
        const tool = PixelStudio.getCurrentTool();
        if (tool) {
          await tool.onPointerUp(e.nativeEvent);
        }
        canvasRef.current.releasePointerCapture(e.pointerId);
      } catch (error) {
        logger.error('Error in handlePointerUp:', error);
      }
    },
    [isInitialized]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      handlePointerUp(e);
      UI.hideBrushPreview();
      setLoupePosition(null);
    },
    [handlePointerUp]
  );

  const canvasWidth = DEFAULT_CANVAS_WIDTH;
  const canvasHeight = DEFAULT_CANVAS_HEIGHT;

  // Calculate content size based on zoom to maintain fixed visual size
  // When zoom < 1 (zoomed out), content needs to be larger so scaling down fills container
  // When zoom > 1 (zoomed in), content needs to be smaller so scaling up fills container
  const contentWidth = canvasWidth / state.zoom;
  const contentHeight = canvasHeight / state.zoom;

  const handleRetry = useCallback(() => {
    logger.log('[Canvas] Retrying initialization...');
    setInitError(null);
    setIsInitialized(false);
    // Force re-initialization by clearing the ref temporarily
    // The useEffect will run again when isInitialized becomes false
  }, []);

  return (
    <>
      <LoadingState isInitialized={isInitialized} error={initError} onRetry={handleRetry} />
      <div className="canvas-area">
        <div className="canvas-wrapper" ref={canvasWrapperRef}>
          <div className="canvas-content">
            <div className="top-controls-group">
              <BrushControlsPanel />
              <ColorPalettePanel />
            </div>
            <LayersControlsPanel />
            <HistoryControls />
            <CanvasTools activeTool={state.currentTool || 'pencil'} />
            <div
              className="canvas-zoom-container"
              style={{
                width: `${canvasWidth}px`,
                height: `${canvasHeight}px`,
              }}
            >
              <div
                className="canvas-zoom-content"
                style={{
                  transform: `scale(${state.zoom})`,
                  transformOrigin: 'center',
                  width: `${contentWidth}px`,
                  height: `${contentHeight}px`,
                }}
              >
                <div
                  className="checkerboard"
                  style={{ width: contentWidth, height: contentHeight }}
                ></div>
                <canvas
                  ref={canvasRef}
                  id="mainCanvas"
                  width={canvasWidth}
                  height={canvasHeight}
                  className={`cursor-${state.currentTool}`}
                  style={{
                    width: `${contentWidth}px`,
                    height: `${contentHeight}px`,
                    touchAction: isTouchDevice ? 'none' : 'auto',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerLeave}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-label="Pixel art drawing canvas"
                  role="img"
                />
                <canvas
                  ref={selectionCanvasRef}
                  id="selectionCanvas"
                  width={canvasWidth}
                  height={canvasHeight}
                  style={{
                    width: `${contentWidth}px`,
                    height: `${contentHeight}px`,
                  }}
                />
                <div
                  className="selection-overlay"
                  ref={selectionOverlayRef}
                  id="selectionOverlay"
                ></div>
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
            <ZoomControls />
          </div>
        </div>
      </div>
    </>
  );
}
