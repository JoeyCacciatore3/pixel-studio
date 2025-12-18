'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Canvas from '@/lib/canvas';
import History from '@/lib/history';
import PixelStudio from '@/lib/app';
import { logger } from '@/lib/utils/logger';

/**
 * Detect if running on Mac
 */
function isMac(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
    navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
  );
}

export default function HistoryControls() {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [undoFeedback, setUndoFeedback] = useState(false);
  const [redoFeedback, setRedoFeedback] = useState(false);
  const undoFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redoFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMacOS = useMemo(() => isMac(), []);

  // Platform-specific keyboard shortcuts - memoized since isMacOS doesn't change
  const undoShortcut = useMemo(() => (isMacOS ? 'Cmd+Z' : 'Ctrl+Z'), [isMacOS]);
  const redoShortcut = useMemo(() => (isMacOS ? 'Cmd+Shift+Z' : 'Ctrl+Shift+Z'), [isMacOS]);
  const redoAltShortcut = useMemo(() => (isMacOS ? 'Cmd+Y' : 'Ctrl+Y'), [isMacOS]);

  // Update button states using event-driven architecture
  useEffect(() => {
    let initCheckTimer: ReturnType<typeof setTimeout> | null = null;

    const updateHistoryState = () => {
      // Only update if History is initialized
      if (History.isInitialized && History.isInitialized()) {
        setCanUndo(History.canUndo());
        setCanRedo(History.canRedo());
      } else {
        // Safe defaults when not initialized
        setCanUndo(false);
        setCanRedo(false);
      }
    };

    // Wait for History to be initialized before checking state
    const checkInitialization = () => {
      if (History.isInitialized && History.isInitialized()) {
        updateHistoryState();
      } else {
        // Retry after a short delay if not initialized yet
        initCheckTimer = setTimeout(checkInitialization, 50);
      }
    };

    // Start checking for initialization
    checkInitialization();

    // Subscribe to history events instead of polling
    const handleHistoryChange = () => {
      updateHistoryState();
    };

    const handleHistoryError = (event: { message?: string; index?: number }) => {
      logger.warn('History operation error:', event.message || 'Unknown error');
      if (event.message) {
        logger.warn(`⚠️ ${event.message}`);
      }
    };

    History.on('history:save', handleHistoryChange);
    History.on('history:undo', handleHistoryChange);
    History.on('history:redo', handleHistoryChange);
    History.on('history:clear', handleHistoryChange);
    History.on('history:error', handleHistoryError);

    return () => {
      History.off('history:save', handleHistoryChange);
      History.off('history:undo', handleHistoryChange);
      History.off('history:redo', handleHistoryChange);
      History.off('history:clear', handleHistoryChange);
      History.off('history:error', handleHistoryError);
      // Cleanup timers
      if (undoFeedbackTimerRef.current) {
        clearTimeout(undoFeedbackTimerRef.current);
      }
      if (redoFeedbackTimerRef.current) {
        clearTimeout(redoFeedbackTimerRef.current);
      }
      // Cleanup initialization check timer
      if (initCheckTimer) {
        clearTimeout(initCheckTimer);
      }
    };
  }, []);

  const handleUndo = useCallback(async () => {
    // Clear existing timer if any
    if (undoFeedbackTimerRef.current) {
      clearTimeout(undoFeedbackTimerRef.current);
    }

    // Visual feedback
    setUndoFeedback(true);
    undoFeedbackTimerRef.current = setTimeout(() => {
      setUndoFeedback(false);
      undoFeedbackTimerRef.current = null;
    }, 200);

    // Handle async undo operation
    try {
      await History.undo();
    } catch (error) {
      logger.error('Error during undo:', error);
    }
  }, []);

  const handleRedo = useCallback(async () => {
    // Clear existing timer if any
    if (redoFeedbackTimerRef.current) {
      clearTimeout(redoFeedbackTimerRef.current);
    }

    // Visual feedback
    setRedoFeedback(true);
    redoFeedbackTimerRef.current = setTimeout(() => {
      setRedoFeedback(false);
      redoFeedbackTimerRef.current = null;
    }, 200);

    // Handle async redo operation
    try {
      await History.redo();
    } catch (error) {
      logger.error('Error during redo:', error);
    }
  }, []);

  const handleClear = useCallback(async () => {
    // Save state BEFORE clearing so undo restores the previous content
    if (History.saveImmediate) {
      await History.saveImmediate();
    } else {
      History.save();
    }

    // Clear all layers (professional standard - clears entire canvas)
    await Canvas.clearAll();
    Canvas.clearOverlay();
    Canvas.clearSelectionCanvas();
    PixelStudio.clearSelection();

    // Mark entire canvas as dirty for proper rendering
    const width = Canvas.getWidth();
    const height = Canvas.getHeight();
    Canvas.markDirtyRegion(0, 0, width, height);

    // Ensure canvas is redrawn after clearing
    Canvas.redraw().catch((error) => {
      logger.error('Failed to redraw canvas:', error);
    });
  }, []);

  return (
    <div className="history-controls">
      <button
        className={`history-btn ${undoFeedback ? 'history-btn-feedback' : ''}`}
        onClick={handleUndo}
        disabled={!canUndo}
        id="undoBtn"
        data-testid="testid-history-undo"
        title={`Undo (${undoShortcut})`}
        aria-label="Undo last action"
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
        className={`history-btn ${redoFeedback ? 'history-btn-feedback' : ''}`}
        onClick={handleRedo}
        disabled={!canRedo}
        id="redoBtn"
        data-testid="testid-history-redo"
        title={`Redo (${redoShortcut} or ${redoAltShortcut})`}
        aria-label="Redo last undone action"
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
      <button
        className="history-btn"
        onClick={handleClear}
        id="clearBtn"
        data-testid="testid-clear-btn"
        aria-label="Clear canvas"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
        Clear
      </button>
    </div>
  );
}
