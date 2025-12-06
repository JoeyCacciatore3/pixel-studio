/**
 * Blur Tool
 * Local blur with brush
 */

import type { Tool, DrawingToolState } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import { createStabilizer } from './stabilizer';
import { getPressure, calculateBrushSize, calculateSpacing } from './brushHelpers';

(function () {
  let toolState: DrawingToolState | null = null;

  const BlurTool: Tool = {
    name: 'blur',

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
      toolState.currentPressure = getPressure(e);
      toolState.stabilizer.reset();
      const smoothed = toolState.stabilizer.processPoint(coords.x, coords.y);
      toolState.lastX = smoothed.x;
      toolState.lastY = smoothed.y;
      toolState.isDrawing = true;
      blurDot(smoothed.x, smoothed.y, e);
    },

    onPointerMove(coords, e) {
      if (!toolState || !toolState.isDrawing) return;
      toolState.currentPressure = getPressure(e);
      const smoothed = toolState.stabilizer.processPoint(coords.x, coords.y);
      blurLine(toolState.lastX, toolState.lastY, smoothed.x, smoothed.y, e);
      toolState.lastX = smoothed.x;
      toolState.lastY = smoothed.y;
    },

    onPointerUp(_e) {
      if (toolState && toolState.isDrawing) {
        toolState.isDrawing = false;
        toolState.stabilizer.reset();
        Canvas.triggerRender();
        History.save();
      }
    },
  };

  function blurLine(x1: number, y1: number, x2: number, y2: number, e: PointerEvent): void {
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
    const steps = Math.max(1, Math.ceil(dist / Math.max(1, spacing)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      blurDot(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, e);
    }
  }

  function blurDot(x: number, y: number, _e: PointerEvent): void {
    if (!toolState) return;
    const ctx = Canvas.getContext();
    const state = toolState.state;

    const size = calculateBrushSize(
      state.brushSize,
      toolState.currentPressure,
      state.pressureEnabled ?? false,
      state.pressureSize ?? false,
      state.pressureCurve ?? 'linear'
    );
    const radius = Math.ceil(size / 2);
    const blurRadius = Math.max(1, Math.floor(radius * 0.5));

    const width = Canvas.getWidth();
    const height = Canvas.getHeight();
    const startX = Math.max(0, Math.floor(x - radius));
    const startY = Math.max(0, Math.floor(y - radius));
    const endX = Math.min(width, Math.floor(x + radius));
    const endY = Math.min(height, Math.floor(y + radius));

    const imageData = ctx.getImageData(startX, startY, endX - startX, endY - startY);
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);

    // Simple box blur
    for (let py = blurRadius; py < endY - startY - blurRadius; py++) {
      for (let px = blurRadius; px < endX - startX - blurRadius; px++) {
        const cx = startX + px;
        const cy = startY + py;
        const dist = Math.sqrt(Math.pow(cx - x, 2) + Math.pow(cy - y, 2));

        if (dist <= radius) {
          let r = 0,
            g = 0,
            b = 0,
            count = 0;
          for (let ky = -blurRadius; ky <= blurRadius; ky++) {
            for (let kx = -blurRadius; kx <= blurRadius; kx++) {
              const idx = ((py + ky) * (endX - startX) + (px + kx)) * 4;
              if (idx >= 0 && idx < tempData.length) {
                r += tempData[idx]!;
                g += tempData[idx + 1]!;
                b += tempData[idx + 2]!;
                count++;
              }
            }
          }
          const idx = (py * (endX - startX) + px) * 4;
          data[idx] = Math.round(r / count);
          data[idx + 1] = Math.round(g / count);
          data[idx + 2] = Math.round(b / count);
        }
      }
    }

    ctx.putImageData(imageData, startX, startY);
  }

  // Register the tool
  PixelStudio.registerTool('blur', BlurTool);
})();
