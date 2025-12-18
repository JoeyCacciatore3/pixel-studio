/**
 * Line Thickness Normalizer Tool
 * Action tool that normalizes line thickness
 */

import type { Tool, AppState, CanvasElements } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import { normalizeLineThickness, type LineNormalizerOptions } from '../cleanup/lineNormalizer';
import { logger } from '../utils/logger';

(function () {
  let toolState: { state: AppState; elements: CanvasElements } | null = null;

  const LineNormalizerTool: Tool = {
    name: 'cleanup-line-normalize',

    init(state, elements) {
      toolState = { state, elements };
    },

    async onPointerDown(_coords, _e) {
      // Action tool - execute on click
      await executeLineNormalization();
    },

    onPointerMove(_coords, _e) {
      // No-op for action tool
    },

    async onPointerUp(_e) {
      // No-op for action tool
    },

    /**
     * Execute line normalization
     */
    async execute(options?: LineNormalizerOptions): Promise<void> {
      await executeLineNormalization(options);
    },
  };

  async function executeLineNormalization(options?: LineNormalizerOptions): Promise<void> {
    if (!toolState) return;

    try {
      const imageData = Canvas.getImageData();
      const defaultOptions: LineNormalizerOptions = {
        targetWidth: 1,
        useWorker: true,
      };

      const finalOptions = options || defaultOptions;

      const result = await normalizeLineThickness(imageData, finalOptions);
      Canvas.putImageData(result, 0, 0);
      await Canvas.triggerRender();
      await History.saveImmediate();
    } catch (error) {
      logger.error('Failed to normalize line thickness:', error);
      throw error;
    }
  }

  // Register the tool
  PixelStudio.registerTool('cleanup-line-normalize', LineNormalizerTool);
})();
