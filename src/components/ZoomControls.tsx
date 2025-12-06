'use client';

import { useState, useEffect } from 'react';
import PixelStudio from '@/lib/app';
import UI from '@/lib/ui';

export default function ZoomControls() {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    // Wait for PixelStudio to be initialized
    const initZoom = () => {
      try {
        const state = PixelStudio.getState();
        if (state && state.zoom !== undefined) {
          setZoom(state.zoom);
        }
      } catch (error) {
        // PixelStudio not initialized yet, retry
        setTimeout(initZoom, 100);
      }
    };

    const timer = setTimeout(initZoom, 200);
    return () => clearTimeout(timer);
  }, []);

  const handleZoomIn = () => {
    const newZoom = Math.min(4, zoom + 0.25);
    setZoom(newZoom);
    const state = PixelStudio.getState();
    if (state) {
      state.zoom = newZoom;
    }
    UI.applyZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(0.25, zoom - 0.25);
    setZoom(newZoom);
    const state = PixelStudio.getState();
    if (state) {
      state.zoom = newZoom;
    }
    UI.applyZoom(newZoom);
  };

  const handleResetZoom = () => {
    setZoom(1);
    const state = PixelStudio.getState();
    if (state) {
      state.zoom = 1;
    }
    UI.applyZoom(1);
  };

  return (
    <div className="zoom-controls">
      <button className="zoom-btn" onClick={handleZoomOut} id="zoomOutBtn">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35M8 11h6" />
        </svg>
      </button>
      <div className="zoom-level" id="zoomLevel">
        {Math.round(zoom * 100)}%
      </div>
      <button className="zoom-btn" onClick={handleZoomIn} id="zoomInBtn">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
        </svg>
      </button>
      <button className="zoom-btn" onClick={handleResetZoom} id="zoomResetBtn">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
    </div>
  );
}
