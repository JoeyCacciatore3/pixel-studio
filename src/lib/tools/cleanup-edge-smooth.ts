/**
 * Edge Smoother Tool
 * Interactive tool that smooths jagged edges
 */

import type { Tool, AppState, CanvasElements } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import { smoothEdges, type EdgeSmootherOptions } from '../cleanup/edgeSmoother';
import { logger } from '../utils/logger';

(function () {
  let toolState: { state: AppState; elements: CanvasElements } | null = null;
  let isApplying = false;

  const EdgeSmootherTool: Tool = {
    name: 'cleanup-edge-smooth',

    init(state, elements) {
      toolState = { state, elements };
      isApplying = false;
    },

    async onPointerDown(_coords, _e) {
      // Action tool - execute on click
      if (!isApplying) {
        await executeEdgeSmoothing();
      }
    },

    onPointerMove(_coords, _e) {
      // No-op for action tool
    },

    async onPointerUp(_e) {
      // No-op for action tool
    },

    /**
     * Execute edge smoothing
     */
    async execute(options?: EdgeSmootherOptions): Promise<void> {
      await executeEdgeSmoothing(options);
    },
  };

  async function executeEdgeSmoothing(options?: EdgeSmootherOptions): Promise<void> {
    if (!toolState || isApplying) return;

    isApplying = true;

    try {
      const imageData = Canvas.getImageData();
      const defaultOptions: EdgeSmootherOptions = {
        mode: 'standard',
        strength: 50,
        preserveCorners: true,
        useWorker: true,
      };

      const finalOptions = options || defaultOptions;

      const result = await smoothEdges(imageData, finalOptions);
      Canvas.putImageData(result, 0, 0);
      await Canvas.triggerRender();
      await History.saveImmediate();
    } catch (error) {
      logger.error('Failed to smooth edges:', error);
      throw error;
    } finally {
      isApplying = false;
    }
  }

  // Register the tool
  PixelStudio.registerTool('cleanup-edge-smooth', EdgeSmootherTool);
})();
