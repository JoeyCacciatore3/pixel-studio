/**
 * Sharpen Tool
 * Local sharpening with brush
 */

import type { Tool, DrawingToolState } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import { createStabilizer } from './stabilizer';
import {
  getPressure,
  calculateBrushSize,
  calculateSpacing,
} from './brushHelpers';

(function () {
  let toolState: DrawingToolState | null = null;

  const SharpenTool: Tool = {
    name: 'sharpen',

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
      sharpenDot(smoothed.x, smoothed.y, e);
    },

    onPointerMove(coords, e) {
      if (!toolState || !toolState.isDrawing) return;
      toolState.currentPressure = getPressure(e);
      const smoothed = toolState.stabilizer.processPoint(coords.x, coords.y);
      sharpenLine(toolState.lastX, toolState.lastY, smoothed.x, smoothed.y, e);
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

  function sharpenLine(x1: number, y1: number, x2: number, y2: number, e: PointerEvent): void {
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
      sharpenDot(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, e);
    }
  }

  function sharpenDot(x: number, y: number, _e: PointerEvent): void {
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
    const strength = (state.brushFlow ?? 50) / 100;

    const width = Canvas.getWidth();
    const height = Canvas.getHeight();
    const startX = Math.max(1, Math.floor(x - radius));
    const startY = Math.max(1, Math.floor(y - radius));
    const endX = Math.min(width - 1, Math.floor(x + radius));
    const endY = Math.min(height - 1, Math.floor(y + radius));

    const imageData = ctx.getImageData(startX - 1, startY - 1, endX - startX + 2, endY - startY + 2);
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);

    // Unsharp mask kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];

    for (let py = 1; py < endY - startY + 1; py++) {
      for (let px = 1; px < endX - startX + 1; px++) {
        const cx = startX + px - 1;
        const cy = startY + py - 1;
        const dist = Math.sqrt(Math.pow(cx - x, 2) + Math.pow(cy - y, 2));

        if (dist <= radius) {
          let r = 0, g = 0, b = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((py + ky) * (endX - startX + 2) + (px + kx)) * 4;
              const kIdx = (ky + 1) * 3 + (kx + 1);
              if (idx >= 0 && idx < tempData.length) {
                r += tempData[idx]! * kernel[kIdx]!;
                g += tempData[idx + 1]! * kernel[kIdx]!;
                b += tempData[idx + 2]! * kernel[kIdx]!;
              }
            }
          }
          const idx = (py * (endX - startX + 2) + px) * 4;
          const origR = tempData[idx]!;
          const origG = tempData[idx + 1]!;
          const origB = tempData[idx + 2]!;
          data[idx] = Math.max(0, Math.min(255, Math.round(origR + (r - origR) * strength)));
          data[idx + 1] = Math.max(0, Math.min(255, Math.round(origG + (g - origG) * strength)));
          data[idx + 2] = Math.max(0, Math.min(255, Math.round(origB + (b - origB) * strength)));
        }
      }
    }

    ctx.putImageData(imageData, startX - 1, startY - 1);
  }

  PixelStudio.registerTool('sharpen', SharpenTool);
})();
