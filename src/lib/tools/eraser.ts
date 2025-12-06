/**
 * Eraser Tool
 * Professional eraser with advanced brush features
 */

import type { Tool, DrawingToolState } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import { createStabilizer } from './stabilizer';
import {
  getPressure,
  calculateBrushSize,
  calculateBrushOpacity,
  calculateBrushFlow,
  calculateSpacing,
  applyJitter,
} from './brushHelpers';

(function () {
  let toolState: DrawingToolState | null = null;

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
    },

    onPointerDown(coords, e) {
      if (!toolState) return;

      // Get pressure
      toolState.currentPressure = getPressure(e);

      // Reset stabilizer on new stroke
      toolState.stabilizer.reset();
      const smoothed = toolState.stabilizer.processPoint(coords.x, coords.y);
      const x = smoothed.x;
      const y = smoothed.y;
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

      // Update pressure
      toolState.currentPressure = getPressure(e);

      // Apply stabilizer smoothing
      const smoothed = toolState.stabilizer.processPoint(coords.x, coords.y);
      const lastX = toolState.lastX;
      const lastY = toolState.lastY;
      eraseLineWithSpacing(lastX, lastY, smoothed.x, smoothed.y, e);
      toolState.lastX = smoothed.x;
      toolState.lastY = smoothed.y;
    },

    onPointerUp(_e) {
      if (toolState && toolState.isDrawing) {
        toolState.isDrawing = false;
        toolState.stabilizer.reset();
        toolState.distanceSinceLastStamp = 0;
        Canvas.triggerRender();
        History.save();
      }
    },
  };

  /**
   * Create brush mask with hardness support (same as pencil)
   */
  function createBrushMask(size: number, hardness: number): ImageData {
    if (!toolState) {
      throw new Error('Tool not initialized');
    }

    const cacheKey = `${size}-${hardness}`;
    if (toolState.brushCache.has(cacheKey)) {
      return toolState.brushCache.get(cacheKey)!;
    }

    const radius = size / 2;
    const diameter = Math.ceil(size);
    const center = diameter / 2;
    const mask = Canvas.getContext().createImageData(diameter, diameter);
    const data = mask.data;

    // Hardness controls the gradient: 0 = soft (full gradient), 100 = hard (sharp edge)
    const hardnessRatio = hardness / 100;
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
          data[idx + 3] = Math.round(255 * gradient * gradient); // Quadratic falloff
        } else {
          // Transparent outside radius
          data[idx + 3] = 0;
        }
      }
    }

    toolState.brushCache.set(cacheKey, mask);
    return mask;
  }

  function eraseDot(x: number, y: number, _e: PointerEvent): void {
    if (!toolState) return;

    const ctx = Canvas.getContext();
    const state = toolState.state;

    // Apply jitter
    const jittered = applyJitter(x, y, state.brushJitter ?? 0, state.brushSize);
    const finalX = jittered.x;
    const finalY = jittered.y;

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

    const baseOpacity = (state.brushOpacity ?? 100) / 100;
    const opacity = calculateBrushOpacity(
      baseOpacity,
      pressure,
      state.pressureEnabled ?? false,
      state.pressureOpacity ?? false,
      state.pressureCurve ?? 'linear'
    );

    const baseFlow = (state.brushFlow ?? 100) / 100;
    const flow = calculateBrushFlow(
      baseFlow,
      pressure,
      state.pressureEnabled ?? false,
      state.pressureFlow ?? false,
      state.pressureCurve ?? 'linear'
    );

    // Combine opacity and flow for eraser strength
    const eraseStrength = opacity * flow;

    const hardness = state.brushHardness || 100;

    // For small brushes or 100% hardness, use simple circle for performance
    if (size <= 2 || hardness >= 100) {
      ctx.beginPath();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = eraseStrength;
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.arc(finalX, finalY, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      return;
    }

    // Use brush mask for soft edges
    const mask = createBrushMask(size, hardness);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = mask.width;
    tempCanvas.height = mask.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Apply mask as eraser with opacity/flow
    const maskData = new ImageData(mask.width, mask.height);
    for (let i = 0; i < mask.data.length; i += 4) {
      const maskAlpha = mask.data[i + 3]! / 255;
      const finalAlpha = Math.round(255 * maskAlpha * eraseStrength);
      maskData.data[i] = 255; // R
      maskData.data[i + 1] = 255; // G
      maskData.data[i + 2] = 255; // B
      maskData.data[i + 3] = finalAlpha;
    }

    tempCtx.putImageData(maskData, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(tempCanvas, finalX - size / 2, finalY - size / 2);
    ctx.globalCompositeOperation = 'source-over';
  }

  function eraseLineWithSpacing(x1: number, y1: number, x2: number, y2: number, e: PointerEvent): void {
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

    // Draw stamps along the line based on spacing
    if (toolState.distanceSinceLastStamp >= spacing) {
      const steps = Math.ceil(toolState.distanceSinceLastStamp / spacing);
      const stepSize = dist / steps;

      for (let i = 1; i <= steps; i++) {
        const t = (stepSize * i) / dist;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        eraseDot(x, y, e);
      }

      toolState.distanceSinceLastStamp = 0;
      toolState.lastStampX = x2;
      toolState.lastStampY = y2;
    } else {
      // If spacing is very small or disabled, draw continuously
      if (spacing <= 0.5) {
        const steps = Math.max(1, Math.ceil(dist / Math.max(1, size / 3)));
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = x1 + (x2 - x1) * t;
          const y = y1 + (y2 - y1) * t;
          eraseDot(x, y, e);
        }
      }
    }
  }

  // Register the tool
  PixelStudio.registerTool('eraser', EraserTool);
})();
