'use client';

import { useAppState } from '@/hooks/useAppState';
import StateManager from '@/lib/stateManager';
import UI from '@/lib/ui';

export default function ZoomControls() {
  const state = useAppState();
  const zoom = state.zoom;

  const handleZoomIn = () => {
    const newZoom = Math.min(4, zoom + 0.25);
    StateManager.setZoom(newZoom);
    UI.applyZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(0.25, zoom - 0.25);
    StateManager.setZoom(newZoom);
    UI.applyZoom(newZoom);
  };

  const handleResetZoom = () => {
    StateManager.setZoom(1);
    UI.applyZoom(1);
  };

  return (
    <div className="zoom-controls">
      <button className="zoom-btn" onClick={handleZoomOut} id="zoomOutBtn" aria-label="Zoom out">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35M8 11h6" />
        </svg>
      </button>
      <div className="zoom-level" id="zoomLevel" aria-live="polite" aria-atomic="true">
        {Math.round(zoom * 100)}%
      </div>
      <button className="zoom-btn" onClick={handleZoomIn} id="zoomInBtn" aria-label="Zoom in">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
        </svg>
      </button>
      <button
        className="zoom-btn"
        onClick={handleResetZoom}
        id="zoomResetBtn"
        aria-label="Reset zoom"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
    </div>
  );
}
