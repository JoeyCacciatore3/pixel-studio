/**
 * Selection Tool
 * Rectangular selection tool with selection modes
 */

import type { Tool, BaseToolState } from '../types';
import PixelStudio from '../app';
import UI from '../ui';
import Canvas from '../canvas';
import StateManager from '../stateManager';
import { createRectangularMask, combineSelections } from './selectionHelpers';
import { logger } from '../utils/logger';

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
    const appState = toolState.state;
    let currentState;
    try {
      currentState = StateManager.getState();
    } catch (error) {
      logger.error('StateManager not initialized in startSelection:', error);
      return; // Can't proceed without state
    }

    // If shift is held, use add mode; if alt/ctrl is held, use subtract
    // This will be handled by keyboard state, for now use appState.selectionMode
    const mode = appState.selectionMode || 'replace';

    // If mode is not replace, keep existing selection
    if (mode === 'replace' || !currentState.colorRangeSelection) {
      StateManager.setSelection({
        x,
        y,
        width: 0,
        height: 0,
        startX: x,
        startY: y,
        mode,
      });
      StateManager.setColorRangeSelection(null);
    } else {
      // Start new selection but will combine later
      StateManager.setSelection({
        x,
        y,
        width: 0,
        height: 0,
        startX: x,
        startY: y,
        mode,
      });
      // Keep existing colorRangeSelection for combining
      if (currentState.colorRangeSelection) {
        StateManager.setColorRangeSelection(currentState.colorRangeSelection);
      }
    }

    try {
      const updatedState = StateManager.getState();
      if (updatedState.selection) {
        UI.showSelection(updatedState.selection);
      }
    } catch (error) {
      logger.error('StateManager not initialized when getting updated state:', error);
    }
  }

  function updateSelection(x: number, y: number): void {
    if (!toolState) return;
    let currentState;
    try {
      currentState = StateManager.getState();
    } catch (error) {
      logger.error('StateManager not initialized in updateSelection:', error);
      return; // Can't proceed without state
    }
    if (
      !currentState.selection ||
      currentState.selection.startX === undefined ||
      currentState.selection.startY === undefined
    ) {
      return;
    }

    // Create updated selection object immutably
    const updatedSelection = {
      ...currentState.selection,
      x: Math.min(currentState.selection.startX, x),
      y: Math.min(currentState.selection.startY, y),
      width: Math.abs(x - currentState.selection.startX),
      height: Math.abs(y - currentState.selection.startY),
    };

    StateManager.setSelection(updatedSelection);
    UI.showSelection(updatedSelection);
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
      let currentState;
      try {
        currentState = StateManager.getState();
      } catch (error) {
        logger.error('StateManager not initialized in finalizeSelection:', error);
        return; // Can't proceed without state
      }
      StateManager.setSelection({
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        mode,
        feather: currentState.selectionFeather,
        antiAlias: currentState.selectionAntiAlias,
      });
      StateManager.setColorRangeSelection(finalMask);
      UI.showColorRangeOverlay(finalMask);
    } else {
      PixelStudio.clearSelection();
    }
  }

  // Register the tool
  PixelStudio.registerTool('selection', SelectionTool);
})();
