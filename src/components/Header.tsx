'use client';

import { useState, useEffect } from 'react';
import Canvas from '@/lib/canvas';
import History from '@/lib/history';
import PixelStudio from '@/lib/app';

export default function Header() {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Update button states periodically and after history changes
  useEffect(() => {
    const updateHistoryState = () => {
      setCanUndo(History.canUndo());
      setCanRedo(History.canRedo());
    };

    // Check immediately
    updateHistoryState();

    // Check periodically (every 100ms) to catch history changes from tools
    const interval = setInterval(updateHistoryState, 100);

    // Also listen to keyboard events to catch undo/redo via shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        setTimeout(updateHistoryState, 10);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleUndo = () => {
    History.undo();
    setCanUndo(History.canUndo());
    setCanRedo(History.canRedo());
  };

  const handleRedo = () => {
    History.redo();
    setCanUndo(History.canUndo());
    setCanRedo(History.canRedo());
  };

  const handleClear = () => {
    // Clear all layers (professional standard - clears entire canvas)
    Canvas.clearAll();
    Canvas.clearOverlay();
    Canvas.clearSelectionCanvas();
    const state = PixelStudio.getState();
    if (state) {
      state.imageLayer = null;
    }
    PixelStudio.clearSelection();

    // Save cleared state to history (matches pattern used by other tools)
    // Undo will restore to the state before clearing (previous history entry)
    History.save();
    setCanUndo(History.canUndo());
    setCanRedo(History.canRedo());
  };

  const handleUpload = () => {
    document.getElementById('imageUpload')?.click();
  };

  const handleExport = () => {
    const link = document.createElement('a');
    link.download = 'pixel-studio-artwork.png';
    link.href = Canvas.toDataURL();
    link.click();
  };

  return (
    <header className="header">
      <div className="logo">
        <div className="logo-icon">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
          >
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
          </svg>
        </div>
        <span>Pixel Studio</span>
      </div>
      <div className="header-actions">
        <button
          className="header-btn"
          onClick={handleUndo}
          disabled={!canUndo}
          id="undoBtn"
          title="Undo (Ctrl+Z)"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 7v6h6M21 17a9 9 0 11-2.636-6.364L21 7" />
          </svg>
          Undo
        </button>
        <button
          className="header-btn"
          onClick={handleRedo}
          disabled={!canRedo}
          id="redoBtn"
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 7v6h-6M3 17a9 9 0 112.636-6.364L3 7" />
          </svg>
          Redo
        </button>
        <button className="header-btn" onClick={handleClear} id="clearBtn">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          Clear
        </button>
        <button className="header-btn" onClick={handleUpload} id="uploadBtn">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          Upload
        </button>
        <button className="header-btn primary" onClick={handleExport} id="exportBtn">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export
        </button>
      </div>
      <input type="file" id="imageUpload" accept="image/*" style={{ display: 'none' }} />
    </header>
  );
}
