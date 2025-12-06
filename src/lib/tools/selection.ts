/**
 * Selection Tool
 * Rectangular selection tool with selection modes
 */

import type { Tool, BaseToolState } from '../types';
import PixelStudio from '../app';
import UI from '../ui';
import Canvas from '../canvas';
import { createRectangularMask, combineSelections } from './selectionHelpers';

(function () {
  let toolState: BaseToolState | null = null;

  const SelectionTool: Tool = {
    name: 'selection',

    init(state, elements) {
      toolState = {
        state,
        elements,
      };
    },

    onPointerDown(coords, _e) {
      if (!toolState) return;
      const x = coords.x;
      const y = coords.y;
      startSelection(x, y);
    },

    onPointerMove(coords, _e) {
      if (!toolState) return;
      const state = toolState.state;
      if (state.selection) {
        updateSelection(coords.x, coords.y);
      }
    },

    onPointerUp(_e) {
      if (!toolState) return;
      const state = toolState.state;
      if (!state.selection) return;

      // Finalize selection
      finalizeSelection();
    },
  };

  function startSelection(x: number, y: number): void {
    if (!toolState) return;
    const state = toolState.state;

    // If shift is held, use add mode; if alt/ctrl is held, use subtract
    // This will be handled by keyboard state, for now use state.selectionMode
    const mode = state.selectionMode || 'replace';

    // If mode is not replace, keep existing selection
    if (mode === 'replace' || !state.colorRangeSelection) {
      state.selection = {
        x,
        y,
        width: 0,
        height: 0,
        startX: x,
        startY: y,
        mode,
      };
      state.colorRangeSelection = null;
    } else {
      // Start new selection but will combine later
      state.selection = {
        x,
        y,
        width: 0,
        height: 0,
        startX: x,
        startY: y,
        mode,
      };
    }

    UI.showSelection(state.selection);
  }

  function updateSelection(x: number, y: number): void {
    if (!toolState) return;
    const state = toolState.state;
    if (!state.selection || state.selection.startX === undefined || state.selection.startY === undefined) {
      return;
    }

    state.selection.x = Math.min(state.selection.startX, x);
    state.selection.y = Math.min(state.selection.startY, y);
    state.selection.width = Math.abs(x - state.selection.startX);
    state.selection.height = Math.abs(y - state.selection.startY);
    UI.showSelection(state.selection);
  }

  function finalizeSelection(): void {
    if (!toolState || !toolState.state.selection) return;
    const state = toolState.state;
    const selection = state.selection;
    if (!selection) return;

    const width = Canvas.getWidth();
    const height = Canvas.getHeight();
    const mode = state.selectionMode || 'replace';

    // Create mask for this selection
    const newMask = createRectangularMask(
      selection.x,
      selection.y,
      selection.width,
      selection.height,
      width,
      height,
      state.selectionFeather,
      state.selectionAntiAlias
    );

    // Combine with existing selection if needed
    const finalMask = combineSelections(state.colorRangeSelection, newMask, mode, width, height);

    // Update selection bounds
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let hasSelection = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (finalMask[idx]! > 0) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          hasSelection = true;
        }
      }
    }

    if (hasSelection) {
      state.selection = {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        mode,
        feather: state.selectionFeather,
        antiAlias: state.selectionAntiAlias,
      };
      state.colorRangeSelection = finalMask;
      UI.showColorRangeOverlay(finalMask);
    } else {
      PixelStudio.clearSelection();
    }
  }

  // Register the tool
  PixelStudio.registerTool('selection', SelectionTool);
})();
