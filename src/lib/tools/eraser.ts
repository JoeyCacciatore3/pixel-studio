/**
 * Eraser Tool
 * Professional eraser with advanced features: opacity/strength, hardness, pressure sensitivity, anti-erase mode
 * Based on GIMP and Photoshop best practices
 */

import type { Tool, DrawingToolState } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import StateManager from '../stateManager';
import { createStabilizer } from './stabilizer';
import { logger } from '../utils/logger';
import {
  getPressure,
  calculateBrushSize,
  calculateBrushOpacity,
  calculateBrushFlow,
  calculateSpacing,
  applyJitter,
} from './brushHelpers';
import { rafThrottle } from '../utils/debounce';

(function () {
  let toolState: DrawingToolState | null = null;
  let antiEraseMode = false; // Toggle for anti-erase mode (Alt key)
  let hardEdgeMode = false; // Toggle for hard edge mode

  // Throttled render for real-time feedback during erasing
  const throttledRender = rafThrottle(() => Canvas.triggerRender());

  const EraserTool: Tool = {
    name: 'eraser',

    init(state, elements) {
      const stabilizer = createStabilizer();
      const stabilizerStrength = state.stabilizerStrength ?? 30;
      stabilizer.setStrength(stabilizerStrength);

      toolState = {
        state,
        elements,
        isDrawing: false,
        lastX: 0,
        lastY: 0,
        brushCache: new Map<string, ImageData>(),
        stabilizer,
        distanceSinceLastStamp: 0,
        lastStampX: 0,
        lastStampY: 0,
        currentPressure: 0.5,
      };

      // Reset modes on init
      antiEraseMode = false;
      hardEdgeMode = false;
    },

    onPointerDown(coords, e) {
      if (!toolState) return;

      // Detect Alt key for anti-erase mode (GIMP standard)
      // Alt key is trapped by some window managers, so also check altKey property
      antiEraseMode = e.altKey || false;

      // Get pressure
      toolState.currentPressure = getPressure(e);

      // Use precise coordinates for sub-pixel accuracy (unless hard edge mode)
      const preciseCoords = Canvas.getCanvasCoordsPrecise?.(e) || coords;

      // For hard edge mode, round to integers to prevent partial erasure at edges
      let x: number;
      let y: number;
      if (hardEdgeMode) {
        x = Math.round(preciseCoords.x);
        y = Math.round(preciseCoords.y);
      } else {
        // Reset stabilizer on new stroke
        toolState.stabilizer.reset();
        const smoothed = toolState.stabilizer.processPoint(preciseCoords.x, preciseCoords.y);
        x = smoothed.x;
        y = smoothed.y;
      }

      toolState.lastX = x;
      toolState.lastY = y;
      toolState.lastStampX = x;
      toolState.lastStampY = y;
      toolState.distanceSinceLastStamp = 0;
      toolState.isDrawing = true;
      eraseDot(x, y, e);
    },

    onPointerMove(coords, e) {
      if (!toolState || !toolState.isDrawing) return;

      // Update anti-erase mode from Alt key
      antiEraseMode = e.altKey || false;

      // Update pressure
      toolState.currentPressure = getPressure(e);

      // Use precise coordinates (unless hard edge mode)
      const preciseCoords = Canvas.getCanvasCoordsPrecise?.(e) || coords;

      let smoothedX: number;
      let smoothedY: number;
      if (hardEdgeMode) {
        smoothedX = Math.round(preciseCoords.x);
        smoothedY = Math.round(preciseCoords.y);
      } else {
        // Apply stabilizer smoothing
        const smoothed = toolState.stabilizer.processPoint(preciseCoords.x, preciseCoords.y);
        smoothedX = smoothed.x;
        smoothedY = smoothed.y;
      }

      const lastX = toolState.lastX;
      const lastY = toolState.lastY;
      eraseLineWithSpacing(lastX, lastY, smoothedX, smoothedY, e);
      toolState.lastX = smoothedX;
      toolState.lastY = smoothedY;
    },

    async onPointerUp(_e) {
      if (toolState && toolState.isDrawing) {
        toolState.isDrawing = false;
        toolState.stabilizer.reset();
        toolState.distanceSinceLastStamp = 0;
        antiEraseMode = false; // Reset anti-erase mode
        await Canvas.triggerRender();
        await History.saveImmediate();
      }
    },
  };

  /**
   * Create brush mask with hardness support
   * Reuses the same logic as pencil tool for consistency
   */
  const MAX_BRUSH_CACHE_SIZE = 50; // Limit brush cache to prevent memory leaks

  function createBrushMask(
    size: number,
    hardness: number,
    forHardEdge: boolean = false
  ): ImageData {
    if (!toolState) {
      throw new Error('Tool not initialized');
    }

    // For hard edge mode, use 100% hardness to avoid partial erasure
    const effectiveHardness = forHardEdge ? 100 : hardness;
    const cacheKey = `${size}-${effectiveHardness}-eraser`;
    const cached = toolState.brushCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Limit cache size - remove oldest entries if cache is too large
    if (toolState.brushCache.size >= MAX_BRUSH_CACHE_SIZE) {
      const firstKey = toolState.brushCache.keys().next().value;
      if (firstKey) {
        toolState.brushCache.delete(firstKey);
      }
    }

    let ctx: CanvasRenderingContext2D;
    try {
      ctx = Canvas.getContext();
    } catch (error) {
      logger.error('Failed to get canvas context for brush mask:', error);
      throw new Error('Canvas not initialized');
    }

    const radius = size / 2;
    const diameter = Math.ceil(size);
    const center = diameter / 2;
    const mask = ctx.createImageData(diameter, diameter);
    const data = mask.data;

    // Hardness controls the gradient: 0 = soft (full gradient), 100 = hard (sharp edge)
    const hardnessRatio = effectiveHardness / 100;
    const innerRadius = radius * hardnessRatio;

    for (let y = 0; y < diameter; y++) {
      for (let x = 0; x < diameter; x++) {
        const dx = x - center;
        const dy = y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * diameter + x) * 4;

        if (dist <= innerRadius) {
          // Fully opaque inside inner radius
          data[idx + 3] = 255;
        } else if (dist <= radius) {
          // Gradient between inner and outer radius
          const gradient = 1 - (dist - innerRadius) / (radius - innerRadius);
          data[idx + 3] = Math.round(255 * gradient * gradient); // Quadratic falloff for smoother edge
        } else {
          // Transparent outside radius
          data[idx + 3] = 0;
        }
      }
    }

    toolState.brushCache.set(cacheKey, mask);
    return mask;
  }

  /**
   * Erase a single dot at the specified coordinates
   * Supports normal erase and anti-erase modes
   */
  function eraseDot(x: number, y: number, _e: PointerEvent): void {
    if (!toolState) return;

    let ctx: CanvasRenderingContext2D;
    try {
      // Canvas.getContext() automatically returns the active layer context when layers are enabled
      // This ensures erasing goes to the correct layer (professional tool behavior)
      // Also respects locked layers (throws error if layer is locked)
      ctx = Canvas.getContext();
    } catch (error) {
      // Handle locked layer error gracefully
      if (error instanceof Error && error.message.includes('locked')) {
        logger.warn('Cannot erase on locked layer');
        return;
      }
      logger.error('Failed to get canvas context for erasing:', error);
      return;
    }

    // Validate StateManager is available (for error handling)
    try {
      StateManager.getState();
    } catch (error) {
      logger.error('Failed to get state in eraser tool:', error);
      return;
    }

    // Use cached state for brush properties (size, hardness, etc.) for performance
    const state = toolState.state;

    // Apply jitter (if enabled)
    const jittered = applyJitter(x, y, state.brushJitter ?? 0, state.brushSize);
    // OPTIMIZATION (Item 4): Round to integers to avoid sub-pixel rendering (MDN best practice)
    const finalX = Math.floor(jittered.x);
    const finalY = Math.floor(jittered.y);

    // Calculate brush properties with pressure
    const pressure = toolState.currentPressure;
    const baseSize = state.brushSize;
    const size = calculateBrushSize(
      baseSize,
      pressure,
      state.pressureEnabled ?? false,
      state.pressureSize ?? false,
      state.pressureCurve ?? 'linear'
    );

    // Opacity/strength for eraser (GIMP: higher opacity = more transparency)
    const baseOpacity = (state.brushOpacity ?? 100) / 100;
    const opacity = calculateBrushOpacity(
      baseOpacity,
      pressure,
      state.pressureEnabled ?? false,
      state.pressureOpacity ?? false,
      state.pressureCurve ?? 'linear'
    );

    // Flow affects build-up rate (for gradual erasing)
    const baseFlow = (state.brushFlow ?? 100) / 100;
    const flow = calculateBrushFlow(
      baseFlow,
      pressure,
      state.pressureEnabled ?? false,
      state.pressureFlow ?? false,
      state.pressureCurve ?? 'linear'
    );

    // Combine opacity and flow for erasing strength
    const erasingStrength = opacity * flow;

    const hardness = state.brushHardness || 100;

    // Determine composite operation based on mode
    const compositeOp = antiEraseMode ? 'destination-over' : 'destination-out';

    // For small brushes or 100% hardness, use simple circle for performance
    if (size <= 2 || hardness >= 100) {
      ctx.beginPath();
      ctx.globalCompositeOperation = compositeOp;
      ctx.globalAlpha = erasingStrength;

      if (antiEraseMode) {
        // Anti-erase: restore alpha by drawing white/transparent pixels
        // This restores the alpha channel (GIMP anti-erase behavior)
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
      } else {
        // Normal erase: use any color, destination-out will remove pixels
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      }

      ctx.arc(finalX, finalY, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over'; // Reset to default
      return;
    }

    // Use brush mask for soft edges
    const mask = createBrushMask(size, hardness, hardEdgeMode);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = mask.width;
    tempCanvas.height = mask.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Create erase mask with opacity and flow
    const eraseMask = new ImageData(mask.width, mask.height);

    for (let i = 0; i < mask.data.length; i += 4) {
      const maskAlpha = mask.data[i + 3]! / 255;
      const finalMaskAlpha = maskAlpha * erasingStrength;

      if (antiEraseMode) {
        // Anti-erase: white pixels to restore alpha
        eraseMask.data[i] = 255;
        eraseMask.data[i + 1] = 255;
        eraseMask.data[i + 2] = 255;
        eraseMask.data[i + 3] = Math.round(255 * finalMaskAlpha);
      } else {
        // Normal erase: any color works with destination-out
        eraseMask.data[i] = 0;
        eraseMask.data[i + 1] = 0;
        eraseMask.data[i + 2] = 0;
        eraseMask.data[i + 3] = Math.round(255 * finalMaskAlpha);
      }
    }

    tempCtx.putImageData(eraseMask, 0, 0);
    ctx.globalCompositeOperation = compositeOp;
    // OPTIMIZATION (Item 4): Round drawImage coordinates to integers
    const drawX = Math.floor(finalX - size / 2);
    const drawY = Math.floor(finalY - size / 2);
    ctx.drawImage(tempCanvas, drawX, drawY);
    ctx.globalCompositeOperation = 'source-over'; // Reset to default
  }

  /**
   * Erase along a line with spacing support
   * Similar to pencil tool's drawLineWithSpacing
   */
  function eraseLineWithSpacing(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    e: PointerEvent
  ): void {
    if (!toolState) return;

    const state = toolState.state;
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const baseSize = state.brushSize;
    const pressure = toolState.currentPressure;
    const size = calculateBrushSize(
      baseSize,
      pressure,
      state.pressureEnabled ?? false,
      state.pressureSize ?? false,
      state.pressureCurve ?? 'linear'
    );
    const spacing = calculateSpacing(size, state.brushSpacing ?? 25);

    // Update distance since last stamp
    toolState.distanceSinceLastStamp += dist;

    // Erase stamps along the line based on spacing
    if (toolState.distanceSinceLastStamp >= spacing) {
      const steps = Math.ceil(toolState.distanceSinceLastStamp / spacing);
      const stepSize = dist / steps;

      for (let i = 1; i <= steps; i++) {
        const t = (stepSize * i) / dist;
        // OPTIMIZATION (Item 4): Round coordinates to integers before drawing
        const x = Math.floor(x1 + (x2 - x1) * t);
        const y = Math.floor(y1 + (y2 - y1) * t);
        eraseDot(x, y, e);
      }

      toolState.distanceSinceLastStamp = 0;
      toolState.lastStampX = x2;
      toolState.lastStampY = y2;

      // Trigger throttled render for real-time feedback
      throttledRender();
    } else {
      // If spacing is very small or disabled, erase continuously
      if (spacing <= 0.5) {
        const steps = Math.max(1, Math.ceil(dist / Math.max(1, size / 3)));
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          // OPTIMIZATION (Item 4): Round coordinates to integers before drawing
          const x = Math.floor(x1 + (x2 - x1) * t);
          const y = Math.floor(y1 + (y2 - y1) * t);
          eraseDot(x, y, e);
        }

        // Trigger throttled render for real-time feedback
        throttledRender();
      }
    }
  }

  // Register the tool
  PixelStudio.registerTool('eraser', EraserTool);
})();
