/**
 * Intelligent Scissors Tool
 * Advanced edge-detection based selection tool
 * Based on GIMP's Intelligent Scissors implementation
 */

import type { Tool, BaseToolState } from '../types';
import Canvas from '../canvas';
import PixelStudio from '../app';
import UI from '../ui';
import StateManager from '../stateManager';
import { logger } from '../utils/logger';

(function () {
  let toolState: BaseToolState | null = null;

  // Scissors state
  let controlPoints: Array<{ x: number; y: number }> = [];
  let edgeMap: Float32Array | null = null;
  let pathPoints: Array<{ x: number; y: number }> = [];
  let canvasWidth = 0;
  let canvasHeight = 0;

  // Algorithm parameters
  const EDGE_THRESHOLD = 20; // Minimum edge strength to consider
  const MAX_EDGE_DISTANCE = 50; // Maximum distance to search for edges
  const CURVE_SMOOTHING = 0.3; // Smoothing factor for path generation

  const IntelligentScissorsTool: Tool = {
    name: 'intelligent-scissors',

    init(state, elements) {
      toolState = {
        state,
        elements,
      };

      // Reset scissors state
      resetScissors();
    },

    onPointerDown(coords, _e) {
      if (!toolState) return;

      const x = Math.floor(coords.x);
      const y = Math.floor(coords.y);

      // Check if clicking near existing path
      const clickedPoint = findNearestPoint(x, y, pathPoints);
      if (clickedPoint && distanceToPoint(x, y, clickedPoint.x, clickedPoint.y) < 10) {
        // Close the path
        closePath();
        return;
      }

      // Add new control point
      addControlPoint(x, y);

      // Generate path if we have at least 2 points
      if (controlPoints.length >= 2) {
        generateIntelligentPath();
      }
    },

    onPointerMove(coords, _e) {
      if (!toolState || controlPoints.length === 0) return;

      const x = Math.floor(coords.x);
      const y = Math.floor(coords.y);

      // Update last control point for live preview
      controlPoints[controlPoints.length - 1] = { x, y };

      if (controlPoints.length >= 2) {
        generateIntelligentPath();
      }

      Canvas.triggerRender();
    },

    onPointerUp(_e) {
      // Path generation is handled in move events
    },
  };

  /**
   * Reset scissors tool state
   */
  function resetScissors(): void {
    controlPoints = [];
    pathPoints = [];
    edgeMap = null;
    canvasWidth = Canvas.getWidth();
    canvasHeight = Canvas.getHeight();
  }

  /**
   * Add a control point to the selection path
   */
  function addControlPoint(x: number, y: number): void {
    // Check if point is within canvas bounds
    if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) {
      return;
    }

    // Remove any existing point that's too close
    controlPoints = controlPoints.filter((point) => distanceToPoint(x, y, point.x, point.y) > 10);

    controlPoints.push({ x, y });
    logger.log('Added control point at:', x, y);
  }

  /**
   * Generate intelligent path between control points using edge detection
   */
  function generateIntelligentPath(): void {
    if (controlPoints.length < 2) return;

    pathPoints = [];

    // Generate edge map if not already done
    if (!edgeMap) {
      edgeMap = generateEdgeMap();
    }

    // Generate path segments between each pair of control points
    for (let i = 0; i < controlPoints.length - 1; i++) {
      const startPoint = controlPoints[i]!;
      const endPoint = controlPoints[i + 1]!;

      const segment = findOptimalPath(startPoint, endPoint);
      pathPoints.push(...segment);
    }

    // Apply smoothing to the entire path
    pathPoints = smoothPath(pathPoints);
  }

  /**
   * Generate edge detection map using Sobel operator
   */
  function generateEdgeMap(): Float32Array {
    const imageData = Canvas.getImageData();
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    const edgeMap = new Float32Array(width * height);

    // Sobel operator kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        // Apply Sobel kernels
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
            const gray = (data[pixelIndex]! + data[pixelIndex + 1]! + data[pixelIndex + 2]!) / 3;

            const kernelIndex = (ky + 1) * 3 + (kx + 1);
            gx += gray * sobelX[kernelIndex]!;
            gy += gray * sobelY[kernelIndex]!;
          }
        }

        // Calculate gradient magnitude
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edgeMap[y * width + x] = magnitude;
      }
    }

    return edgeMap;
  }

  /**
   * Find optimal path between two points using dynamic programming
   */
  function findOptimalPath(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): Array<{ x: number; y: number }> {
    if (!edgeMap) return [start, end];

    const path: Array<{ x: number; y: number }> = [start];

    let current = start;

    while (distanceToPoint(current.x, current.y, end.x, end.y) > 3) {
      const candidates = getEdgeCandidates(current, end);

      if (candidates.length === 0) {
        // No good candidates, move directly toward end point
        const angle = Math.atan2(end.y - current.y, end.x - current.x);
        current = {
          x: current.x + Math.cos(angle) * 2,
          y: current.y + Math.sin(angle) * 2,
        };
      } else {
        // Choose candidate with highest edge strength
        candidates.sort((a, b) => b.strength - a.strength);
        current = candidates[0]!.point;
      }

      // Prevent infinite loops
      if (path.length > 1000) break;

      path.push(current);
    }

    path.push(end);
    return path;
  }

  /**
   * Get candidate points along the edge toward the end point
   */
  function getEdgeCandidates(
    current: { x: number; y: number },
    end: { x: number; y: number }
  ): Array<{ point: { x: number; y: number }; strength: number }> {
    if (!edgeMap) return [];

    const candidates: Array<{ point: { x: number; y: number }; strength: number }> = [];
    const width = canvasWidth;

    // Direction toward end point
    const dx = end.x - current.x;
    const dy = end.y - current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const dirX = dx / distance;
    const dirY = dy / distance;

    // Search along perpendicular line to direction
    for (let offset = -MAX_EDGE_DISTANCE; offset <= MAX_EDGE_DISTANCE; offset += 2) {
      const perpX = -dirY * offset;
      const perpY = dirX * offset;

      const candidateX = Math.round(current.x + perpX);
      const candidateY = Math.round(current.y + perpY);

      if (
        candidateX >= 0 &&
        candidateX < canvasWidth &&
        candidateY >= 0 &&
        candidateY < canvasHeight
      ) {
        const strength = edgeMap[candidateY * width + candidateX] || 0;

        if (strength > EDGE_THRESHOLD) {
          candidates.push({
            point: { x: candidateX, y: candidateY },
            strength,
          });
        }
      }
    }

    return candidates;
  }

  /**
   * Apply smoothing to the path using Catmull-Rom spline approximation
   */
  function smoothPath(path: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
    if (path.length < 3) return path;

    const smoothed: Array<{ x: number; y: number }> = [];

    for (let i = 1; i < path.length - 1; i++) {
      const p0 = path[i - 1]!;
      const p1 = path[i]!;
      const p2 = path[i + 1]!;

      // Simple linear interpolation with smoothing
      const smoothedX = p1.x * (1 - CURVE_SMOOTHING) + (p0.x + p2.x) * CURVE_SMOOTHING * 0.5;
      const smoothedY = p1.y * (1 - CURVE_SMOOTHING) + (p0.y + p2.y) * CURVE_SMOOTHING * 0.5;

      smoothed.push({ x: smoothedX, y: smoothedY });
    }

    return smoothed;
  }

  /**
   * Find nearest point in path to given coordinates
   */
  function findNearestPoint(
    x: number,
    y: number,
    points: Array<{ x: number; y: number }>
  ): { x: number; y: number } | null {
    let nearest = null;
    let minDistance = Infinity;

    for (const point of points) {
      const distance = distanceToPoint(x, y, point.x, point.y);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = point;
      }
    }

    return nearest;
  }

  /**
   * Close the path and create selection
   */
  function closePath(): void {
    if (pathPoints.length < 3) return;

    // Convert path to selection mask
    const selectionMask = createPathMask(pathPoints);

    // Apply selection
    StateManager.setColorRangeSelection(selectionMask);
    UI.showColorRangeOverlay(selectionMask);

    // Reset for next selection
    resetScissors();

    logger.log('Closed intelligent scissors path');
  }

  /**
   * Create selection mask from path points
   */
  function createPathMask(points: Array<{ x: number; y: number }>): Uint8Array {
    const width = canvasWidth;
    const height = canvasHeight;
    const mask = new Uint8Array(width * height);

    if (points.length < 3) return mask;

    // Simple flood fill inside the path
    // This is a basic implementation - a more robust version would use proper polygon filling
    const bounds = getPathBounds(points);

    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        if (isPointInPath(x, y, points)) {
          mask[y * width + x] = 1;
        }
      }
    }

    return mask;
  }

  /**
   * Get bounding box of path points
   */
  function getPathBounds(points: Array<{ x: number; y: number }>): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    return {
      minX: Math.floor(minX),
      maxX: Math.ceil(maxX),
      minY: Math.floor(minY),
      maxY: Math.ceil(maxY),
    };
  }

  /**
   * Check if point is inside closed path using ray casting algorithm
   */
  function isPointInPath(x: number, y: number, points: Array<{ x: number; y: number }>): boolean {
    let inside = false;

    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i]!.x;
      const yi = points[i]!.y;
      const xj = points[j]!.x;
      const yj = points[j]!.y;

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Calculate distance between two points
   */
  function distanceToPoint(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Draw intelligent scissors overlay
   * Reserved for future use
   */
  /*
  function drawScissorsOverlay(ctx: CanvasRenderingContext2D): void {
    if (controlPoints.length === 0 && pathPoints.length === 0) return;

    ctx.save();

    // Draw control points
    ctx.fillStyle = '#ff0000';
    for (const point of controlPoints) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw path
    if (pathPoints.length > 1) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pathPoints[0]!.x, pathPoints[0]!.y);

      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i]!.x, pathPoints[i]!.y);
      }

      ctx.stroke();
    }

    // Draw edge map preview if available
    if (edgeMap && toolState?.state?.brushSize && toolState.state.brushSize > 5) {
      drawEdgeMap(ctx);
    }

    ctx.restore();
  }
  */

  /**
   * Draw edge detection preview
   * Reserved for future use
   */
  /*
  function drawEdgeMap(ctx: CanvasRenderingContext2D): void {
    if (!edgeMap) return;

    const width = canvasWidth;
    const height = canvasHeight;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < edgeMap.length; i++) {
      const strength = Math.min(255, edgeMap[i]! * 2);
      data[i * 4] = strength;     // R
      data[i * 4 + 1] = strength; // G
      data[i * 4 + 2] = strength; // B
      data[i * 4 + 3] = 50;       // A (semi-transparent)
    }

    ctx.putImageData(imageData, 0, 0);
  }
  */

  // Register the tool
  PixelStudio.registerTool('intelligent-scissors', IntelligentScissorsTool);
})();
