/**
 * Polygon Tool
 * Point-by-point polygonal selection
 */

import type { Tool, SelectionToolState } from '../types';
import PixelStudio from '../app';
import UI from '../ui';
import Canvas from '../canvas';
import StateManager from '../stateManager';
import { featherSelection } from './selectionHelpers';

(function () {
  let toolState: SelectionToolState | null = null;

  const PolygonTool: Tool = {
    name: 'polygon',

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

      // Check if clicking near the first point to close
      if (toolState.points.length >= 3) {
        const firstPoint = toolState.points[0];
        const dist = Math.sqrt(
          Math.pow(coords.x - firstPoint!.x, 2) + Math.pow(coords.y - firstPoint!.y, 2)
        );
        if (dist < 10) {
          // Close the polygon
          finalizeSelection(toolState.points);
          toolState.points = [];
          toolState.isSelecting = false;
          return;
        }
      }

      toolState.isSelecting = true;
      toolState.points.push({ x: coords.x, y: coords.y });

      // Draw preview
      drawPolygonPath(toolState.points, coords);
    },

    onPointerMove(coords, _e) {
      if (!toolState || !toolState.isSelecting || toolState.points.length === 0) return;

      // Draw preview with current mouse position
      drawPolygonPath(toolState.points, coords);
    },

    onPointerUp(_e) {
      // Polygon tool doesn't finalize on pointer up, only on clicking near start point
    },
  };

  /**
   * Draw polygon path for visual feedback
   */
  function drawPolygonPath(
    points: { x: number; y: number }[],
    currentPoint?: { x: number; y: number }
  ): void {
    const ctx = Canvas.getSelectionContext();
    if (!ctx) return;

    const width = Canvas.getWidth();
    const height = Canvas.getHeight();

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();

    if (points.length > 0) {
      ctx.moveTo(points[0]!.x, points[0]!.y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i]!.x, points[i]!.y);
      }

      // Draw line to current point if provided
      if (currentPoint) {
        ctx.lineTo(currentPoint.x, currentPoint.y);
      }

      // Draw line back to start if we have enough points
      if (points.length >= 2) {
        ctx.lineTo(points[0]!.x, points[0]!.y);
      }

      ctx.stroke();

      // Draw points
      ctx.fillStyle = '#6366f1';
      ctx.setLineDash([]);
      for (const point of points) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Highlight first point if we have enough points
      if (points.length >= 3) {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(points[0]!.x, points[0]!.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /**
   * Finalize selection from polygon points
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
  PixelStudio.registerTool('polygon', PolygonTool);
})();
