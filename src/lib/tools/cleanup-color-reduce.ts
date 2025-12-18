/**
 * Color Noise Reducer Tool
 * Action tool that reduces color variations
 */

import type { Tool, AppState, CanvasElements } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import { reduceColorNoise, type ColorReducerOptions } from '../cleanup/colorReducer';
import { logger } from '../utils/logger';

(function () {
  let toolState: { state: AppState; elements: CanvasElements } | null = null;

  const ColorReducerTool: Tool = {
    name: 'cleanup-color-reduce',

    init(state, elements) {
      toolState = { state, elements };
    },

    async onPointerDown(_coords, _e) {
      // Action tool - execute on click
      await executeColorReduction();
    },

    onPointerMove(_coords, _e) {
      // No-op for action tool
    },

    async onPointerUp(_e) {
      // No-op for action tool
    },

    /**
     * Execute color reduction
     */
    async execute(options?: ColorReducerOptions): Promise<void> {
      await executeColorReduction(options);
    },
  };

  async function executeColorReduction(options?: ColorReducerOptions): Promise<void> {
    if (!toolState) return;

    try {
      const imageData = Canvas.getImageData();
      const defaultOptions: ColorReducerOptions = {
        mode: 'auto-clean',
        threshold: 15,
        useWorker: true,
        useLab: true,
      };

      const finalOptions = options || defaultOptions;

      const result = await reduceColorNoise(imageData, finalOptions);
      Canvas.putImageData(result, 0, 0);
      await Canvas.triggerRender();
      await History.saveImmediate();
    } catch (error) {
      logger.error('Failed to reduce color noise:', error);
      throw error;
    }
  }

  // Register the tool
  PixelStudio.registerTool('cleanup-color-reduce', ColorReducerTool);
})();
