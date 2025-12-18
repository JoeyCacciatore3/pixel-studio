/**
 * One-Click Logo Cleaner Tool
 * Action tool that applies complete cleanup pipeline
 */

import type { Tool, AppState, CanvasElements } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import { cleanLogo, type LogoCleanerOptions } from '../cleanup/logoCleaner';
import { logger } from '../utils/logger';

(function () {
  let toolState: { state: AppState; elements: CanvasElements } | null = null;

  const LogoCleanerTool: Tool = {
    name: 'cleanup-logo',

    init(state, elements) {
      toolState = { state, elements };
    },

    async onPointerDown(_coords, _e) {
      // Action tool - execute on click
      await executeLogoCleaning();
    },

    onPointerMove(_coords, _e) {
      // No-op for action tool
    },

    async onPointerUp(_e) {
      // No-op for action tool
    },

    /**
     * Execute logo cleaning
     */
    async execute(options?: LogoCleanerOptions): Promise<void> {
      await executeLogoCleaning(options);
    },
  };

  async function executeLogoCleaning(options?: LogoCleanerOptions): Promise<void> {
    if (!toolState) return;

    try {
      const imageData = Canvas.getImageData();
      const defaultOptions: LogoCleanerOptions = {
        preset: 'logo-standard',
      };

      const finalOptions = { ...defaultOptions, ...options };

      const result = await cleanLogo(imageData, finalOptions);
      Canvas.putImageData(result, 0, 0);
      await Canvas.triggerRender();
      await History.saveImmediate();
    } catch (error) {
      logger.error('Failed to clean logo:', error);
      throw error;
    }
  }

  // Register the tool
  PixelStudio.registerTool('cleanup-logo', LogoCleanerTool);
})();
