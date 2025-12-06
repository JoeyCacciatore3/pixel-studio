'use client';

import { useEffect, useState } from 'react';
import PixelStudio from '@/lib/app';
import SelectionActions from '@/lib/selectionActions';

export default function SelectionToolbar() {
  const [hasSelection, setHasSelection] = useState(false);

  useEffect(() => {
    // Check for selection periodically
    const checkSelection = () => {
      try {
        const state = PixelStudio.getState();
        if (state) {
          const hasActiveSelection = !!(state.colorRangeSelection || state.selection);
          setHasSelection(hasActiveSelection);
        }
      } catch (error) {
        setHasSelection(false);
      }
    };

    // Check immediately
    checkSelection();

    // Check periodically
    const interval = setInterval(checkSelection, 100);

    return () => clearInterval(interval);
  }, []);

  const handleDelete = () => {
    SelectionActions.deleteSelection();
    setHasSelection(false);
  };

  const handleExtract = () => {
    SelectionActions.extractSelectionToLayer();
    setHasSelection(false);
  };

  const handleCancel = () => {
    PixelStudio.clearSelection();
    setHasSelection(false);
  };

  if (!hasSelection) {
    return null;
  }

  return (
    <div className="selection-toolbar">
      <button
        className="selection-toolbar-btn"
        onClick={handleDelete}
        title="Delete Selection (Delete)"
      >
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
        Delete
      </button>
      <button
        className="selection-toolbar-btn"
        onClick={handleExtract}
        title="Extract to Layer (Ctrl+Shift+X)"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2v20M2 12h20M6 6l6 6-6 6M18 6l-6 6 6 6" />
        </svg>
        Extract to Layer
      </button>
      <button
        className="selection-toolbar-btn"
        onClick={handleCancel}
        title="Cancel Selection (Esc)"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
        Cancel
      </button>
    </div>
  );
}
