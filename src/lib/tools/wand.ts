/**
 * Magic Wand Tool
 * Selects contiguous pixels of similar color
 */

import type { Tool, BaseToolState } from '../types';
import { logger } from '../utils/logger';
import Canvas from '../canvas';
import PixelStudio from '../app';
import UI from '../ui';
import StateManager from '../stateManager';
import EventEmitter from '../utils/eventEmitter';

(function () {
  let toolState: BaseToolState | null = null;

  const WandTool: Tool = {
    name: 'wand',

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
      magicSelect(x, y);
    },

    onPointerMove(_coords, _e) {
      // No action during move
    },

    onPointerUp(_e) {
      // No action on up
    },
  };

  /**
   * Calculate color distance using Euclidean distance in RGB space
   * More accurate than simple per-channel tolerance
   */
  function colorDistance(
    r1: number,
    g1: number,
    b1: number,
    a1: number,
    r2: number,
    g2: number,
    b2: number,
    a2: number
  ): number {
    // Weight alpha less than RGB for better tolerance behavior
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    const da = (a1 - a2) * 0.5; // Weight alpha less
    return Math.sqrt(dr * dr + dg * dg + db * db + da * da);
  }

  function magicSelect(startX: number, startY: number): void {
    if (!toolState) return;

    const width = Canvas.getWidth();
    const height = Canvas.getHeight();

    if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
      return;
    }

    let imageData: ImageData;
    try {
      imageData = Canvas.getImageData();
    } catch (error) {
      logger.error('Failed to get image data for wand tool:', error);
      EventEmitter.emit('tool:error', {
        tool: 'wand',
        operation: 'getImageData',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return;
    }
    const data = imageData.data;

    const startIdx = (startY * width + startX) * 4;
    const startR = data[startIdx]!;
    const startG = data[startIdx + 1]!;
    const startB = data[startIdx + 2]!;
    const startA = data[startIdx + 3]!;
    const state = toolState.state;

    // Convert tolerance to color distance (approximate)
    // Tolerance is 0-255, scale it appropriately for distance calculation
    const toleranceDistance = state.tolerance * 1.5; // Scale factor for better matching

    // Create pixel selection mask
    const selected = new Uint8Array(width * height);
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();
    let minX = startX,
      maxX = startX,
      minY = startY,
      maxY = startY;
    let hasSelection = false;

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const idx = (y * width + x) * 4;
      const r = data[idx]!;
      const g = data[idx + 1]!;
      const b = data[idx + 2]!;
      const a = data[idx + 3]!;

      // Use color distance instead of per-channel comparison
      const distance = colorDistance(r, g, b, a, startR, startG, startB, startA);
      if (distance > toleranceDistance) {
        continue;
      }

      visited.add(key);
      const pixelIdx = y * width + x;
      selected[pixelIdx] = 1;
      hasSelection = true;

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    if (hasSelection) {
      // Store selection mask and bounding box
      StateManager.setSelection({
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      });
      StateManager.setColorRangeSelection(selected);

      // Display actual selected region on selection canvas (precise pixel selection)
      // Don't show rectangular bounding box - only show the actual selected pixels
      UI.showColorRangeOverlay(selected);
    } else {
      // Clear selection if nothing was selected
      PixelStudio.clearSelection();
    }
  }

  // Register the tool
  PixelStudio.registerTool('wand', WandTool);
})();
