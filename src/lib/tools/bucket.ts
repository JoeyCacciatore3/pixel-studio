/**
 * Paint Bucket Tool
 * Professional flood fill with tolerance and gap closing
 */

import type { Tool, BucketToolState } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import { hexToRgbaArray } from '../colorUtils';
import { createGapCloser } from './gapCloser';

(function () {
  let toolState: BucketToolState | null = null;

  const BucketTool: Tool = {
    name: 'bucket',

    init(state, elements) {
      const gapCloser = createGapCloser();
      gapCloser.setThreshold(2);

      toolState = {
        state,
        elements,
        gapCloser,
      };
    },

    onPointerDown(coords, _e) {
      if (!toolState) return;
      const x = Math.floor(coords.x);
      const y = Math.floor(coords.y);
      floodFill(x, y);
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

  function floodFill(startX: number, startY: number): void {
    if (!toolState) return;

    const width = Canvas.getWidth();
    const height = Canvas.getHeight();

    if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
      return;
    }

    const imageData = Canvas.getImageData();
    const data = imageData.data;

    const startIdx = (startY * width + startX) * 4;
    const startR = data[startIdx]!;
    const startG = data[startIdx + 1]!;
    const startB = data[startIdx + 2]!;
    const startA = data[startIdx + 3]!;

    const state = toolState.state;
    const fillColor = hexToRgbaArray(state.currentColor, state.currentAlpha);

    // Don't fill if clicking on same color (using color distance)
    const initialDistance = colorDistance(
      startR,
      startG,
      startB,
      startA,
      fillColor[0],
      fillColor[1],
      fillColor[2],
      fillColor[3]
    );
    if (initialDistance <= state.tolerance) {
      return;
    }

    // Convert tolerance to color distance (approximate)
    // Tolerance is 0-255, scale it appropriately for distance calculation
    const toleranceDistance = state.tolerance * 1.5; // Scale factor for better matching

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

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
      data[idx] = fillColor[0];
      data[idx + 1] = fillColor[1];
      data[idx + 2] = fillColor[2];
      data[idx + 3] = fillColor[3];

      // Add neighbors (4-directional)
      const neighbors: [number, number][] = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];

      // Process neighbors
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          continue; // Skip out of bounds
        }

        const nIdx = (ny * width + nx) * 4;
        const nr = data[nIdx]!;
        const ng = data[nIdx + 1]!;
        const nb = data[nIdx + 2]!;
        const na = data[nIdx + 3]!;
        const nDistance = colorDistance(nr, ng, nb, na, startR, startG, startB, startA);

        // If neighbor color is within tolerance, add to stack
        if (nDistance <= toleranceDistance) {
          stack.push([nx, ny]);
        } else {
          // Check gap closer: if gap is small and colors are similar, bridge the gap
          const gapDistance = colorDistance(r, g, b, a, nr, ng, nb, na);
          if (
            toolState.gapCloser.shouldCloseGap(x, y, nx, ny) &&
            gapDistance <= toleranceDistance * 0.5
          ) {
            stack.push([nx, ny]);
          }
        }
      }
    }

    Canvas.putImageData(imageData);
    History.save();
  }

  // Register the tool
  PixelStudio.registerTool('bucket', BucketTool);
})();
