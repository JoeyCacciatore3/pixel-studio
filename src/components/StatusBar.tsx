'use client';

import { memo, useMemo, useState, useEffect } from 'react';
import { useAppState } from '@/hooks/useAppState';
import Canvas from '@/lib/canvas';
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '@/lib/constants';

// Memoized status item component
const StatusItem = memo(function StatusItem({
  label,
  value,
  id,
  children,
}: {
  label: string;
  value?: string | number;
  id?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="status-item" id={id} aria-label={label}>
      {children || value}
    </div>
  );
});

function StatusBar() {
  const state = useAppState();

  // Use state for canvas dimensions to avoid hydration mismatches
  // Initialize with default values that match server render
  const [canvasWidth, setCanvasWidth] = useState(DEFAULT_CANVAS_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(DEFAULT_CANVAS_HEIGHT);

  // Update canvas dimensions on client side only
  useEffect(() => {
    if (typeof window !== 'undefined' && Canvas.isInitialized()) {
      setCanvasWidth(Canvas.getWidth());
      setCanvasHeight(Canvas.getHeight());
    }
  }, []);

  // Memoize tool display name
  const toolDisplayName = useMemo(() => {
    const toolName = state.currentTool || 'pencil';
    return toolName.charAt(0).toUpperCase() + toolName.slice(1);
  }, [state.currentTool]);

  return (
    <footer className="status-bar" role="status" aria-live="polite" aria-atomic="true">
      <div className="status-left">
        <StatusItem label="Application status">
          <span className="status-dot" aria-hidden="true"></span>
          <span>Ready</span>
        </StatusItem>
        <StatusItem label="Cursor position" id="cursorPos">
          X: 0 Y: 0
        </StatusItem>
      </div>
      <div className="status-right">
        <StatusItem
          label="Canvas size"
          id="canvasSize"
          value={`${canvasWidth} × ${canvasHeight}`}
        />
        <StatusItem label="Current tool" id="toolInfo" value={toolDisplayName} />
      </div>
    </footer>
  );
}

// Memoize status bar to prevent unnecessary re-renders
export default memo(StatusBar);
