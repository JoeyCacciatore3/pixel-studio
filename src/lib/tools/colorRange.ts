/**
 * Color Range Tool
 * Selects ALL pixels of similar color across the entire canvas (non-contiguous)
 */

import type { Tool, BaseToolState } from '../types';
import Canvas from '../canvas';
import PixelStudio from '../app';
import UI from '../ui';

(function () {
  let toolState: BaseToolState | null = null;

  const ColorRangeTool: Tool = {
    name: 'colorRange',

    init(state, elements) {
      toolState = {
        state,
        elements,
      };
    },

    onPointerDown(coords, _e) {
      if (!toolState) return;
      const x = Math.floor(coords.x);
      const y = Math.floor(coords.y);

      if (x < 0 || x >= Canvas.getWidth() || y < 0 || y >= Canvas.getHeight()) {
        return;
      }

      colorRangeSelect(x, y);
    },

    onPointerMove(_coords, _e) {
      // No action during move
    },

    onPointerUp(_e) {
      // No action on up
    },
  };

  /**
   * Select all pixels matching the color at the given coordinates
   */
  function colorRangeSelect(startX: number, startY: number): void {
    if (!toolState) return;
    const state = toolState.state;
      const width = Canvas.getWidth();
      const height = Canvas.getHeight();

      const imageData = Canvas.getImageData();
      const data = imageData.data;

      const startIdx = (startY * width + startX) * 4;
      const targetR = data[startIdx]!;
      const targetG = data[startIdx + 1]!;
      const targetB = data[startIdx + 2]!;
      const targetA = data[startIdx + 3]!;

      const selected = new Uint8Array(width * height);
      let minX = width,
        maxX = 0,
        minY = height,
        maxY = 0;
      let hasSelection = false;

      // Scan entire canvas for matching colors
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const r = data[idx]!;
          const g = data[idx + 1]!;
          const b = data[idx + 2]!;
          const a = data[idx + 3]!;

          if (
            Math.abs(r - targetR) <= state.tolerance &&
            Math.abs(g - targetG) <= state.tolerance &&
            Math.abs(b - targetB) <= state.tolerance &&
            Math.abs(a - targetA) <= state.tolerance
          ) {
            selected[y * width + x] = 1;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            hasSelection = true;
          }
        }
      }

      if (hasSelection) {
        // Store selection
        state.selection = {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        };
        state.colorRangeSelection = selected;

        // Show selection
        UI.showSelection(state.selection);
        UI.showColorRangeOverlay(selected);
      }
  }

  // Register the tool
  PixelStudio.registerTool('colorRange', ColorRangeTool);
})();
