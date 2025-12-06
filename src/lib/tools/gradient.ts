/**
 * Gradient Tool
 * Linear, radial, and angular gradients
 */

import type { Tool, BaseToolState } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import { hexToRgbaArray } from '../colorUtils';

(function () {
  let toolState: BaseToolState | null = null;
  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;

  const GradientTool: Tool = {
    name: 'gradient',

    init(state, elements) {
      toolState = {
        state,
        elements,
      };
      isDrawing = false;
      startX = 0;
      startY = 0;
    },

    onPointerDown(coords, _e) {
      isDrawing = true;
      startX = coords.x;
      startY = coords.y;
    },

    onPointerMove(coords, _e) {
      if (!isDrawing) return;
      endX = coords.x;
      endY = coords.y;
      // Preview gradient
    },

    onPointerUp(_e) {
      if (!isDrawing) return;
      isDrawing = false;
      drawGradient(startX, startY, endX, endY);
      Canvas.triggerRender();
      History.save();
    },
  };

  function drawGradient(x1: number, y1: number, x2: number, y2: number): void {
    if (!toolState) return;
    const ctx = Canvas.getContext();
    const state = toolState.state;

    const width = Canvas.getWidth();
    const height = Canvas.getHeight();

    // Create gradient
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    const startColor = hexToRgbaArray(state.currentColor, state.currentAlpha);

    gradient.addColorStop(
      0,
      `rgba(${startColor[0]}, ${startColor[1]}, ${startColor[2]}, ${startColor[3]})`
    );
    gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  PixelStudio.registerTool('gradient', GradientTool);
})();
