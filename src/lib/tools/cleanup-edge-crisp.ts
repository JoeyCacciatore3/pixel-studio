/**
 * Edge Crispener Tool
 * Action tool that removes fuzzy edge pixels
 */

import type { Tool, AppState, CanvasElements } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import { crispEdges, type EdgeCrispenerOptions } from '../cleanup/edgeCrispener';
import { logger } from '../utils/logger';

(function () {
  let toolState: { state: AppState; elements: CanvasElements } | null = null;

  const EdgeCrispenerTool: Tool = {
    name: 'cleanup-edge-crisp',

    init(state, elements) {
      toolState = { state, elements };
    },

    async onPointerDown(_coords, _e) {
      // Action tool - execute on click
      await executeEdgeCrispening();
    },

    onPointerMove(_coords, _e) {
      // No-op for action tool
    },

    async onPointerUp(_e) {
      // No-op for action tool
    },

    /**
     * Execute edge crispening
     */
    async execute(options?: EdgeCrispenerOptions): Promise<void> {
      await executeEdgeCrispening(options);
    },
  };

  async function executeEdgeCrispening(options?: EdgeCrispenerOptions): Promise<void> {
    if (!toolState) return;

    try {
      const imageData = Canvas.getImageData();
      const defaultOptions: EdgeCrispenerOptions = {
        method: 'threshold',
        threshold: 200,
        useWorker: true,
      };

      const finalOptions = options || defaultOptions;

      const result = await crispEdges(imageData, finalOptions);
      Canvas.putImageData(result, 0, 0);
      await Canvas.triggerRender();
      await History.saveImmediate();
    } catch (error) {
      logger.error('Failed to crisp edges:', error);
      throw error;
    }
  }

  // Register the tool
  PixelStudio.registerTool('cleanup-edge-crisp', EdgeCrispenerTool);
})();
