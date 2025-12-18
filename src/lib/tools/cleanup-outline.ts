/**
 * Outline Perfecter Tool
 * Action tool that perfects outlines
 */

import type { Tool, AppState, CanvasElements } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import { perfectOutline, type OutlinePerfecterOptions } from '../cleanup/outlinePerfecter';
import { logger } from '../utils/logger';

(function () {
  let toolState: { state: AppState; elements: CanvasElements } | null = null;

  const OutlinePerfecterTool: Tool = {
    name: 'cleanup-outline',

    init(state, elements) {
      toolState = { state, elements };
    },

    async onPointerDown(_coords, _e) {
      // Action tool - execute on click
      await executeOutlinePerfecting();
    },

    onPointerMove(_coords, _e) {
      // No-op for action tool
    },

    async onPointerUp(_e) {
      // No-op for action tool
    },

    /**
     * Execute outline perfecting
     */
    async execute(options?: OutlinePerfecterOptions): Promise<void> {
      await executeOutlinePerfecting(options);
    },
  };

  async function executeOutlinePerfecting(options?: OutlinePerfecterOptions): Promise<void> {
    if (!toolState) return;

    try {
      const imageData = Canvas.getImageData();
      const defaultOptions: OutlinePerfecterOptions = {
        closeGaps: true,
        maxGapSize: 3,
        straightenLines: false,
        smoothCurves: false,
        sharpenCorners: false,
      };

      const finalOptions = options || defaultOptions;

      const result = await perfectOutline(imageData, finalOptions);
      Canvas.putImageData(result, 0, 0);
      await Canvas.triggerRender();
      await History.saveImmediate();
    } catch (error) {
      logger.error('Failed to perfect outline:', error);
      throw error;
    }
  }

  // Register the tool
  PixelStudio.registerTool('cleanup-outline', OutlinePerfecterTool);
})();
