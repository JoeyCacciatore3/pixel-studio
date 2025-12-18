/**
 * Magnetic Tool
 * Auto-snap selection to edges using edge detection
 */

import type { Tool, MagneticToolState } from '../types';
import { logger } from '../utils/logger';
import PixelStudio from '../app';
import UI from '../ui';
import Canvas from '../canvas';
import StateManager from '../stateManager';
import { featherSelection } from './selectionHelpers';
import EventEmitter from '../utils/eventEmitter';

(function () {
  let toolState: MagneticToolState | null = null;

  const MagneticTool: Tool = {
    name: 'magnetic',

    init(state, elements) {
      toolState = {
        state,
        elements,
        isSelecting: false,
        points: [],
        edgeMap: null,
        width: 0,
        height: 0,
      };
    },

    onPointerDown(coords, _e) {
      if (!toolState) return;

      // Build edge map on first click
      if (!toolState.edgeMap) {
        buildEdgeMap();
      }

      toolState.isSelecting = true;
      toolState.points = [{ x: coords.x, y: coords.y }];
    },

    onPointerMove(coords, _e) {
      if (!toolState || !toolState.isSelecting) return;

      // Find edge point near current position
      const edgePoint = findNearestEdge(coords.x, coords.y);

      if (edgePoint) {
        // Add point if it's far enough from last point
        const lastPoint = toolState.points[toolState.points.length - 1];
        if (lastPoint) {
          const dist = Math.sqrt(
            Math.pow(edgePoint.x - lastPoint.x, 2) + Math.pow(edgePoint.y - lastPoint.y, 2)
          );
          if (dist > 5) {
            // Only add if moved significantly
            toolState.points.push(edgePoint);
          }
        } else {
          toolState.points.push(edgePoint);
        }

        // Update visual feedback
        drawMagneticPath(toolState.points);
      }
    },

    onPointerUp(_e) {
      if (!toolState || !toolState.isSelecting) return;

      toolState.isSelecting = false;

      // Close the path if it has enough points
      if (toolState.points.length >= 3) {
        finalizeSelection(toolState.points);
      } else {
        PixelStudio.clearSelection();
      }

      toolState.points = [];
    },
  };

  /**
   * Build edge map using Sobel operator
   */
  function buildEdgeMap(): void {
    if (!toolState) return;
    let imageData: ImageData;
    try {
      imageData = Canvas.getImageData();
    } catch (error) {
      logger.error('Failed to get image data for magnetic tool:', error);
      EventEmitter.emit('tool:error', {
        tool: 'magnetic',
        operation: 'getImageData',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return;
    }
    const width = Canvas.getWidth();
    const height = Canvas.getHeight();
    const data = imageData.data;

    toolState.width = width;
    toolState.height = height;
    toolState.edgeMap = new Float32Array(width * height);

    // Sobel kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        // Apply Sobel operator
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const gray = (data[idx]! + data[idx + 1]! + data[idx + 2]!) / 3;
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            gx += gray * sobelX[kernelIdx]!;
            gy += gray * sobelY[kernelIdx]!;
          }
        }

        // Calculate edge magnitude
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        toolState.edgeMap![y * width + x] = magnitude;
      }
    }
  }

  /**
   * Find nearest edge point to given coordinates
   */
  function findNearestEdge(x: number, y: number): { x: number; y: number } | null {
    if (!toolState || !toolState.edgeMap) return null;
    const edgeMap = toolState.edgeMap;
    const width = toolState.width;
    const height = toolState.height;

    if (!edgeMap) return null;

    const searchRadius = 20; // Pixels to search around
    const threshold = 50; // Minimum edge strength

    let bestX = Math.floor(x);
    let bestY = Math.floor(y);
    let bestStrength = 0;

    const startX = Math.max(0, Math.floor(x) - searchRadius);
    const endX = Math.min(width - 1, Math.floor(x) + searchRadius);
    const startY = Math.max(0, Math.floor(y) - searchRadius);
    const endY = Math.min(height - 1, Math.floor(y) + searchRadius);

    for (let py = startY; py <= endY; py++) {
      for (let px = startX; px <= endX; px++) {
        const idx = py * width + px;
        const strength = edgeMap[idx]!;

        if (strength > threshold && strength > bestStrength) {
          const dist = Math.sqrt(Math.pow(px - x, 2) + Math.pow(py - y, 2));
          if (dist <= searchRadius) {
            bestX = px;
            bestY = py;
            bestStrength = strength;
          }
        }
      }
    }

    if (bestStrength > threshold) {
      return { x: bestX, y: bestY };
    }

    return { x: Math.floor(x), y: Math.floor(y) };
  }

  /**
   * Draw magnetic path for visual feedback
   */
  function drawMagneticPath(points: { x: number; y: number }[]): void {
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
   * Finalize selection from magnetic path
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
      finalSelection = featherSelection(finalSelection, state.selectionFeather, width, height);
    }

    // Store selection
    StateManager.setSelection({
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      mode: state.selectionMode || 'replace',
      feather: state.selectionFeather,
      antiAlias: state.selectionAntiAlias,
    });
    StateManager.setColorRangeSelection(finalSelection);

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

  // Register the tool
  PixelStudio.registerTool('magnetic', MagneticTool);
})();
