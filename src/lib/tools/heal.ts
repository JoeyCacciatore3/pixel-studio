/**
 * Heal Tool
 * Advanced healing brush that samples from surrounding areas
 * Based on GIMP's Heal tool implementation
 */

import type { Tool, CloneToolState } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import { createStabilizer } from './stabilizer';
import { logger } from '../utils/logger';
import {
  getPressure,
  calculateBrushSize,
  calculateBrushOpacity,
  calculateBrushFlow,
  calculateSpacing,
} from './brushHelpers';
import { rafThrottle } from '../utils/debounce';

(function () {
  let toolState: CloneToolState | null = null;

  const HealTool: Tool = {
    name: 'heal',

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
        sourceX: 0,
        sourceY: 0,
        offsetX: 0,
        offsetY: 0,
        isSourceSet: false,
      };
    },

    onPointerDown(coords, e) {
      if (!toolState) return;

      // If Alt/Ctrl is held, set source point
      if (e.altKey || e.ctrlKey || e.metaKey) {
        toolState.sourceX = coords.x;
        toolState.sourceY = coords.y;
        toolState.isSourceSet = true;
        toolState.offsetX = 0;
        toolState.offsetY = 0;
        return;
      }

      if (!toolState.isSourceSet) {
        // Default source to current position
        toolState.sourceX = coords.x;
        toolState.sourceY = coords.y;
        toolState.isSourceSet = true;
      }

      toolState.currentPressure = getPressure(e);
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

      // Calculate initial offset
      toolState.offsetX = x - toolState.sourceX;
      toolState.offsetY = y - toolState.sourceY;

      healDot(x, y, e);
    },

    onPointerMove(coords, e) {
      if (!toolState || !toolState.isDrawing) return;

      toolState.currentPressure = getPressure(e);
      const smoothed = toolState.stabilizer.processPoint(coords.x, coords.y);
      const lastX = toolState.lastX;
      const lastY = toolState.lastY;
      healLineWithSpacing(lastX, lastY, smoothed.x, smoothed.y, e);
      toolState.lastX = smoothed.x;
      toolState.lastY = smoothed.y;
    },

    async onPointerUp(_e) {
      if (toolState && toolState.isDrawing) {
        toolState.isDrawing = false;
        toolState.stabilizer.reset();
        toolState.distanceSinceLastStamp = 0;
        await Canvas.triggerRender();
        await History.saveImmediate();
      }
    },
  };

  /**
   * Apply healing algorithm at a single point
   */
  function healDot(x: number, y: number, _e: PointerEvent): void {
    if (!toolState) return;

    const state = toolState.state;
    const pressure = toolState.currentPressure;

    // Calculate brush properties
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

    const finalOpacity = opacity * flow;
    const radius = Math.ceil(size / 2);

    // Calculate source and destination regions
    const sourceX = Math.floor(toolState.sourceX + toolState.offsetX);
    const sourceY = Math.floor(toolState.sourceY + toolState.offsetY);
    const destX = Math.floor(x);
    const destY = Math.floor(y);

    const sourceStartX = Math.max(0, sourceX - radius);
    const sourceStartY = Math.max(0, sourceY - radius);
    const sourceEndX = Math.min(Canvas.getWidth(), sourceX + radius);
    const sourceEndY = Math.min(Canvas.getHeight(), sourceY + radius);

    const destStartX = Math.max(0, destX - radius);
    const destStartY = Math.max(0, destY - radius);
    const destEndX = Math.min(Canvas.getWidth(), destX + radius);
    const destEndY = Math.min(Canvas.getHeight(), destY + radius);

    if (
      sourceEndX - sourceStartX <= 0 ||
      sourceEndY - sourceStartY <= 0 ||
      destEndX - destStartX <= 0 ||
      destEndY - destStartY <= 0
    ) {
      return;
    }

    // Get source and destination image data
    let sourceImageData: ImageData;
    let destImageData: ImageData;

    try {
      sourceImageData = Canvas.getImageDataRegion(
        sourceStartX,
        sourceStartY,
        sourceEndX - sourceStartX,
        sourceEndY - sourceStartY
      );
      destImageData = Canvas.getImageDataRegion(
        destStartX,
        destStartY,
        destEndX - destStartX,
        destEndY - destStartY
      );
    } catch (error) {
      logger.error('Failed to get image data region for heal tool:', error);
      return;
    }

    // Apply healing algorithm
    const healedData = applyHealingAlgorithm(sourceImageData, destImageData, finalOpacity);

    // Put healed data back to canvas
    Canvas.putImageData(healedData, destStartX, destStartY);

    // Update offset for next stamp
    toolState.offsetX = x - toolState.sourceX;
    toolState.offsetY = y - toolState.sourceY;
  }

  /**
   * Apply healing algorithm combining source and destination
   * Uses Poisson image editing for seamless blending
   */
  function applyHealingAlgorithm(
    sourceData: ImageData,
    destData: ImageData,
    opacity: number
  ): ImageData {
    const width = Math.min(sourceData.width, destData.width);
    const height = Math.min(sourceData.height, destData.height);
    const result = new ImageData(width, height);

    // Simple healing algorithm - blend source and destination based on texture
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Get source and destination colors
        const srcR = sourceData.data[idx]!;
        const srcG = sourceData.data[idx + 1]!;
        const srcB = sourceData.data[idx + 2]!;
        const srcA = sourceData.data[idx + 3]!;

        const destR = destData.data[idx]!;
        const destG = destData.data[idx + 1]!;
        const destB = destData.data[idx + 2]!;
        const destA = destData.data[idx + 3]!;

        // Calculate color difference
        const diffR = destR - srcR;
        const diffG = destG - srcG;
        const diffB = destB - srcB;

        // Apply texture matching (simplified Poisson blending)
        // In a real implementation, this would solve the Poisson equation
        const textureStrength = 0.7; // How much texture to preserve

        // Blend colors based on healing strength
        const finalR = srcR + diffR * textureStrength;
        const finalG = srcG + diffG * textureStrength;
        const finalB = srcB + diffB * textureStrength;
        const finalA = Math.max(srcA, destA); // Preserve alpha

        // Apply opacity
        result.data[idx] = Math.round(destR * (1 - opacity) + finalR * opacity);
        result.data[idx + 1] = Math.round(destG * (1 - opacity) + finalG * opacity);
        result.data[idx + 2] = Math.round(destB * (1 - opacity) + finalB * opacity);
        result.data[idx + 3] = Math.round(destA * (1 - opacity) + finalA * opacity);
      }
    }

    return result;
  }

  /**
   * Heal along a line with spacing support
   */
  function healLineWithSpacing(
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

    toolState.distanceSinceLastStamp += dist;

    if (toolState.distanceSinceLastStamp >= spacing) {
      const steps = Math.ceil(toolState.distanceSinceLastStamp / spacing);
      const stepSize = dist / steps;

      for (let i = 1; i <= steps; i++) {
        const t = (stepSize * i) / dist;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        healDot(x, y, e);
      }

      toolState.distanceSinceLastStamp = 0;
      toolState.lastStampX = x2;
      toolState.lastStampY = y2;

      // Trigger throttled render
      throttledRender();
    } else if (spacing <= 0.5) {
      const steps = Math.max(1, Math.ceil(dist / Math.max(1, size / 3)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        healDot(x, y, e);
      }

      throttledRender();
    }
  }

  // Throttled render for performance
  const throttledRender = rafThrottle(() => Canvas.triggerRender());

  // Register the tool
  PixelStudio.registerTool('heal', HealTool);
})();
