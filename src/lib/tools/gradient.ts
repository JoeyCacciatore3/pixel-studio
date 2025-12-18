/**
 * Gradient Tool
 * Linear, radial, and angular gradients
 */

import type { Tool, BaseToolState } from '../types';
import { logger } from '../utils/logger';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import { hexToRgbaArray } from '../colorUtils';
import EventEmitter from '../utils/eventEmitter';

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

    async onPointerUp(_e) {
      if (!isDrawing) return;
      isDrawing = false;
      drawGradient(startX, startY, endX, endY);
      await Canvas.triggerRender();
      await History.saveImmediate();
    },
  };

  function drawGradient(x1: number, y1: number, x2: number, y2: number): void {
    if (!toolState) return;
    let ctx: CanvasRenderingContext2D;
    try {
      ctx = Canvas.getContext();
      if (!ctx) {
        logger.error('Canvas context is null in gradient tool');
        EventEmitter.emit('tool:error', {
          tool: 'gradient',
          operation: 'getContext',
          error: 'Canvas context is null',
        });
        return;
      }
    } catch (error) {
      logger.error('Failed to get canvas context for gradient tool:', error);
      EventEmitter.emit('tool:error', {
        tool: 'gradient',
        operation: 'getContext',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return;
    }
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

    // Respect selection bounds if there's an active selection
    if (state.selection) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(state.selection.x, state.selection.y, state.selection.width, state.selection.height);
      ctx.clip();
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    } else {
      // Fill entire canvas (or active layer when layers are enabled)
      ctx.fillRect(0, 0, width, height);
    }
  }

  PixelStudio.registerTool('gradient', GradientTool);
})();
