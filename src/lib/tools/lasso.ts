/**
 * Lasso Tool
 * Freehand selection tool
 */

import type { Tool, SelectionToolState } from '../types';
import PixelStudio from '../app';
import UI from '../ui';
import Canvas from '../canvas';

(function () {
  let toolState: SelectionToolState | null = null;

  const LassoTool: Tool = {
    name: 'lasso',

    init(state, elements) {
      toolState = {
        state,
        elements,
        isSelecting: false,
        points: [],
      };
    },

    onPointerDown(coords, _e) {
      if (!toolState) return;
      toolState.isSelecting = true;
      toolState.points = [{ x: coords.x, y: coords.y }];
    },

    onPointerMove(coords, _e) {
      if (!toolState || !toolState.isSelecting) return;

      // Add point to path
      toolState.points.push({ x: coords.x, y: coords.y });

      // Update visual feedback
      drawLassoPath(toolState.points);
    },

    onPointerUp(_e) {
      if (!toolState || !toolState.isSelecting) return;

      toolState.isSelecting = false;

      // Close the path if it has enough points
      if (toolState.points.length >= 3) {
        finalizeSelection(toolState.points);
      } else {
        // Clear if not enough points
        PixelStudio.clearSelection();
      }

      toolState.points = [];
    },
  };

  /**
   * Draw lasso path for visual feedback
   */
  function drawLassoPath(points: { x: number; y: number }[]): void {
    const ctx = Canvas.getSelectionContext();
    if (!ctx || points.length < 2) return;

    const width = Canvas.getWidth();
    const height = Canvas.getHeight();

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();

    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i]!.x, points[i]!.y);
    }

    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * Finalize selection from lasso path
   */
  function finalizeSelection(points: { x: number; y: number }[]): void {
    if (!toolState || points.length < 3) return;

    const state = toolState.state;
    const width = Canvas.getWidth();
    const height = Canvas.getHeight();

    // Close the path
    const closedPoints = [...points, points[0]!];

    // Create selection mask using point-in-polygon algorithm
    const selected = new Uint8Array(width * height);
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    // Find bounding box
    for (const point of points) {
      minX = Math.min(minX, Math.floor(point.x));
      maxX = Math.max(maxX, Math.ceil(point.x));
      minY = Math.min(minY, Math.floor(point.y));
      maxY = Math.max(maxY, Math.ceil(point.y));
    }

    // Clamp to canvas bounds
    minX = Math.max(0, minX);
    maxX = Math.min(width - 1, maxX);
    minY = Math.max(0, minY);
    maxY = Math.min(height - 1, maxY);

    // Point-in-polygon test for each pixel in bounding box
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (pointInPolygon(x, y, closedPoints)) {
          selected[y * width + x] = 1;
        }
      }
    }

    // Apply feathering if enabled
    let finalSelection: Uint8Array = selected;
    if (state.selectionFeather && state.selectionFeather > 0) {
      finalSelection = new Uint8Array(featherSelection(selected, state.selectionFeather, width, height));
    }

    // Store selection
    state.selection = {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      mode: state.selectionMode || 'replace',
      feather: state.selectionFeather,
      antiAlias: state.selectionAntiAlias,
    };
    state.colorRangeSelection = finalSelection;

    // Show selection
    UI.showColorRangeOverlay(finalSelection);
  }

  /**
   * Point-in-polygon test using ray casting algorithm
   */
  function pointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i]!.x;
      const yi = polygon[i]!.y;
      const xj = polygon[j]!.x;
      const yj = polygon[j]!.y;

      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Apply feathering to selection mask
   */
  function featherSelection(
    mask: Uint8Array,
    radius: number,
    width: number,
    height: number
  ): Uint8Array {
    // Simple Gaussian blur approximation for feathering
    const feathered = new Uint8Array(mask.length);
    const sigma = radius / 3; // Approximate Gaussian sigma
    const kernelSize = Math.ceil(radius * 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let weightSum = 0;

        for (let ky = -kernelSize; ky <= kernelSize; ky++) {
          for (let kx = -kernelSize; kx <= kernelSize; kx++) {
            const px = x + kx;
            const py = y + ky;

            if (px >= 0 && px < width && py >= 0 && py < height) {
              const dist = Math.sqrt(kx * kx + ky * ky);
              if (dist <= radius) {
                const weight = Math.exp(-(dist * dist) / (2 * sigma * sigma));
                const idx = py * width + px;
                sum += mask[idx]! * weight;
                weightSum += weight;
              }
            }
          }
        }

        const idx = y * width + x;
        // Store as 0-255 value in Uint8Array (not 0-1 fractional)
        feathered[idx] = weightSum > 0 ? Math.round((sum / weightSum) * 255) : 0;
      }
    }

    return feathered;
  }

  // Register the tool
  PixelStudio.registerTool('lasso', LassoTool);
})();
