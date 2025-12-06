/**
 * Clone Tool
 * Sample and paint from another area
 */

import type { Tool, CloneToolState } from '../types';
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
} from './brushHelpers';

(function () {
  let toolState: CloneToolState | null = null;

  const CloneTool: Tool = {
    name: 'clone',

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

      cloneDot(x, y, e);
    },

    onPointerMove(coords, e) {
      if (!toolState || !toolState.isDrawing) return;

      toolState.currentPressure = getPressure(e);
      const smoothed = toolState.stabilizer.processPoint(coords.x, coords.y);
      const lastX = toolState.lastX;
      const lastY = toolState.lastY;
      cloneLineWithSpacing(lastX, lastY, smoothed.x, smoothed.y, e);
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

  function cloneDot(x: number, y: number, _e: PointerEvent): void {
    if (!toolState) return;

    const ctx = Canvas.getContext();
    const state = toolState.state;

    // Calculate source coordinates
    const sourceX = toolState.sourceX + toolState.offsetX;
    const sourceY = toolState.sourceY + toolState.offsetY;

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

    const finalAlpha = opacity * flow;
    const radius = Math.ceil(size / 2);

    // Get source image data
    const width = Canvas.getWidth();
    const height = Canvas.getHeight();

    const sourceStartX = Math.max(0, Math.floor(sourceX - radius));
    const sourceStartY = Math.max(0, Math.floor(sourceY - radius));
    const sourceEndX = Math.min(width, Math.floor(sourceX + radius));
    const sourceEndY = Math.min(height, Math.floor(sourceY + radius));

    const destStartX = Math.max(0, Math.floor(x - radius));
    const destStartY = Math.max(0, Math.floor(y - radius));
    const destEndX = Math.min(width, Math.floor(x + radius));
    const destEndY = Math.min(height, Math.floor(y + radius));

    const sourceWidth = sourceEndX - sourceStartX;
    const sourceHeight = sourceEndY - sourceStartY;
    const destWidth = destEndX - destStartX;
    const destHeight = destEndY - destStartY;

    if (sourceWidth <= 0 || sourceHeight <= 0 || destWidth <= 0 || destHeight <= 0) return;

    // Get source image data
    const sourceImageData = ctx.getImageData(sourceStartX, sourceStartY, sourceWidth, sourceHeight);
    const destImageData = ctx.getImageData(destStartX, destStartY, destWidth, destHeight);

    // Blend source into destination with opacity
    for (let i = 0; i < destImageData.data.length; i += 4) {
      const srcIdx = i;
      if (srcIdx < sourceImageData.data.length) {
        destImageData.data[i] = sourceImageData.data[srcIdx]!;
        destImageData.data[i + 1] = sourceImageData.data[srcIdx + 1]!;
        destImageData.data[i + 2] = sourceImageData.data[srcIdx + 2]!;
        destImageData.data[i + 3] = Math.round(sourceImageData.data[srcIdx + 3]! * finalAlpha);
      }
    }

    ctx.putImageData(destImageData, destStartX, destStartY);

    // Update offset for next stamp
    toolState.offsetX = x - toolState.sourceX;
    toolState.offsetY = y - toolState.sourceY;
  }

  function cloneLineWithSpacing(
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
        cloneDot(x, y, e);
      }

      toolState.distanceSinceLastStamp = 0;
    } else if (spacing <= 0.5) {
      const steps = Math.max(1, Math.ceil(dist / Math.max(1, size / 3)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        cloneDot(x, y, e);
      }
    }
  }

  // Register the tool
  PixelStudio.registerTool('clone', CloneTool);
})();
