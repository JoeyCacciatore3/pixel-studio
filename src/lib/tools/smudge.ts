/**
 * Smudge Tool
 * Blend colors by dragging
 */

import type { Tool, SmudgeToolState } from '../types';
import { logger } from '../utils/logger';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import { createStabilizer } from './stabilizer';
import { getPressure, calculateBrushSize, calculateSpacing } from './brushHelpers';
import EventEmitter from '../utils/eventEmitter';

(function () {
  let toolState: SmudgeToolState | null = null;

  const SmudgeTool: Tool = {
    name: 'smudge',

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
        lastColor: new Uint8Array(4),
      };
    },

    onPointerDown(coords, e) {
      if (!toolState) return;
      toolState.currentPressure = getPressure(e);
      toolState.stabilizer.reset();
      const smoothed = toolState.stabilizer.processPoint(coords.x, coords.y);
      const x = smoothed.x;
      const y = smoothed.y;
      toolState.lastX = x;
      toolState.lastY = y;
      toolState.isDrawing = true;

      // Sample initial color
      let imageData: ImageData;
      try {
        imageData = Canvas.getImageData();
      } catch (error) {
        logger.error('Failed to get image data for smudge tool:', error);
        EventEmitter.emit('tool:error', {
          tool: 'smudge',
          operation: 'getImageData',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return;
      }
      const width = Canvas.getWidth();
      const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
      if (idx >= 0 && idx < imageData.data.length) {
        toolState.lastColor[0] = imageData.data[idx]!;
        toolState.lastColor[1] = imageData.data[idx + 1]!;
        toolState.lastColor[2] = imageData.data[idx + 2]!;
        toolState.lastColor[3] = imageData.data[idx + 3]!;
      }
    },

    onPointerMove(coords, e) {
      if (!toolState || !toolState.isDrawing) return;
      toolState.currentPressure = getPressure(e);
      const smoothed = toolState.stabilizer.processPoint(coords.x, coords.y);
      smudgeLine(toolState.lastX, toolState.lastY, smoothed.x, smoothed.y, e);
      toolState.lastX = smoothed.x;
      toolState.lastY = smoothed.y;
    },

    async onPointerUp(_e) {
      if (toolState && toolState.isDrawing) {
        toolState.isDrawing = false;
        toolState.stabilizer.reset();
        await Canvas.triggerRender();
        await History.saveImmediate();
      }
    },
  };

  function smudgeLine(x1: number, y1: number, x2: number, y2: number, _e: PointerEvent): void {
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
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      smudgeDot(x, y);
    }
  }

  function smudgeDot(x: number, y: number): void {
    if (!toolState) return;
    const state = toolState.state;

    const size = calculateBrushSize(
      state.brushSize,
      toolState.currentPressure,
      state.pressureEnabled ?? false,
      state.pressureSize ?? false,
      state.pressureCurve ?? 'linear'
    );
    const radius = Math.ceil(size / 2);
    const strength = (state.brushFlow ?? 50) / 100; // Smudge strength

    const width = Canvas.getWidth();
    const height = Canvas.getHeight();

    const startX = Math.max(0, Math.floor(x - radius));
    const startY = Math.max(0, Math.floor(y - radius));
    const endX = Math.min(width, Math.floor(x + radius));
    const endY = Math.min(height, Math.floor(y + radius));

    let imageData: ImageData;
    try {
      imageData = Canvas.getImageDataRegion(startX, startY, endX - startX, endY - startY);
    } catch (error) {
      logger.error('Failed to get image data region for smudge tool:', error);
      EventEmitter.emit('tool:error', {
        tool: 'smudge',
        operation: 'getImageDataRegion',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return;
    }
    const data = imageData.data;

    // Blend colors in the brush area
    for (let py = 0; py < endY - startY; py++) {
      for (let px = 0; px < endX - startX; px++) {
        const cx = startX + px;
        const cy = startY + py;
        const dist = Math.sqrt(Math.pow(cx - x, 2) + Math.pow(cy - y, 2));

        if (dist <= radius) {
          const idx = (py * (endX - startX) + px) * 4;
          const weight = 1 - dist / radius;
          const blend = weight * strength;

          // Blend with last color
          data[idx] = Math.round(data[idx]! * (1 - blend) + toolState.lastColor[0]! * blend);
          data[idx + 1] = Math.round(
            data[idx + 1]! * (1 - blend) + toolState.lastColor[1]! * blend
          );
          data[idx + 2] = Math.round(
            data[idx + 2]! * (1 - blend) + toolState.lastColor[2]! * blend
          );

          // Update last color (weighted average)
          toolState.lastColor[0] = Math.round(toolState.lastColor[0]! * 0.7 + data[idx]! * 0.3);
          toolState.lastColor[1] = Math.round(toolState.lastColor[1]! * 0.7 + data[idx + 1]! * 0.3);
          toolState.lastColor[2] = Math.round(toolState.lastColor[2]! * 0.7 + data[idx + 2]! * 0.3);
        }
      }
    }

    Canvas.putImageData(imageData, startX, startY);
  }

  // Register the tool
  PixelStudio.registerTool('smudge', SmudgeTool);
})();
