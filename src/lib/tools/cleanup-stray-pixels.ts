/**
 * Stray Pixel Eliminator Tool
 * Action tool that removes isolated pixels
 */

import type { Tool, AppState, CanvasElements } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import { removeStrayPixels, previewStrayPixels, type StrayPixelOptions } from '../cleanup/strayPixels';
import { logger } from '../utils/logger';

(function () {
  let toolState: { state: AppState; elements: CanvasElements } | null = null;
  let previewMode = false;
  let originalImageData: ImageData | null = null;

  const StrayPixelTool: Tool = {
    name: 'cleanup-stray-pixels',

    init(state, elements) {
      toolState = { state, elements };
      previewMode = false;
    },

    async onPointerDown(_coords, _e) {
      // Action tool - execute on click
      await executeStrayPixelRemoval();
    },

    onPointerMove(_coords, _e) {
      // No-op for action tool
    },

    async onPointerUp(_e) {
      // No-op for action tool
    },

    /**
     * Execute stray pixel removal
     */
    async execute(options?: StrayPixelOptions): Promise<void> {
      await executeStrayPixelRemoval(options);
    },

    /**
     * Preview mode
     */
    async preview(options?: StrayPixelOptions): Promise<void> {
      if (!toolState) return;

      try {
        const imageData = Canvas.getImageData();
        const previewOptions: StrayPixelOptions = options || {
          minSize: 3,
          merge: false,
          useWorker: true,
        };

        const preview = await previewStrayPixels(imageData, previewOptions.minSize);
        Canvas.putImageData(preview, 0, 0);
        await Canvas.triggerRender();

        previewMode = true;
        originalImageData = imageData;
      } catch (error) {
        logger.error('Failed to preview stray pixels:', error);
      }
    },

    /**
     * Cancel preview
     */
    async cancelPreview(): Promise<void> {
      if (previewMode && originalImageData) {
        Canvas.putImageData(originalImageData, 0, 0);
        await Canvas.triggerRender();
        previewMode = false;
        originalImageData = null;
      }
    },
  };

  async function executeStrayPixelRemoval(options?: StrayPixelOptions): Promise<void> {
    if (!toolState) return;

    try {
      const imageData = Canvas.getImageData();
      const defaultOptions: StrayPixelOptions = {
        minSize: 3,
        merge: false,
        useWorker: true,
      };

      const finalOptions = options || defaultOptions;

      // Show loading indicator if using worker
      if (finalOptions.useWorker) {
        // Could emit event for UI feedback
      }

      const result = await removeStrayPixels(imageData, finalOptions);
      Canvas.putImageData(result, 0, 0);
      await Canvas.triggerRender();
      await History.saveImmediate();

      previewMode = false;
      originalImageData = null;
    } catch (error) {
      logger.error('Failed to remove stray pixels:', error);
      throw error;
    }
  }

  // Register the tool
  PixelStudio.registerTool('cleanup-stray-pixels', StrayPixelTool);
})();
