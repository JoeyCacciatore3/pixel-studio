'use client';

import { useAppState } from '@/hooks/useAppState';
import SelectionActions from '@/lib/selectionActions';
import PixelStudio from '@/lib/app';

export default function SelectionToolbar() {
  const state = useAppState();
  const hasSelection = !!(state.colorRangeSelection || state.selection);

  const handleDelete = () => {
    SelectionActions.deleteSelection();
    // State will be updated via event listener
  };

  const handleExtract = () => {
    SelectionActions.extractSelectionToLayer();
    // State will be updated via event listener
  };

  const handleCancel = () => {
    PixelStudio.clearSelection();
    // State will be updated via event listener
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
        aria-label="Delete selection"
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
        Delete
      </button>
      <button
        className="selection-toolbar-btn"
        onClick={handleExtract}
        title="Extract to Layer (Ctrl+Shift+X)"
        aria-label="Extract selection to new layer"
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
          <path d="M12 2v20M2 12h20M6 6l6 6-6 6M18 6l-6 6 6 6" />
        </svg>
        Extract to Layer
      </button>
      <button
        className="selection-toolbar-btn"
        onClick={handleCancel}
        title="Cancel Selection (Esc)"
        aria-label="Cancel selection"
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
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
        Cancel
      </button>
    </div>
  );
}
