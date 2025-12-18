/**
 * Window interface extensions for global objects
 */

import type PixelStudio from '@/lib/app';

/**
 * Playwright test environment extension
 */
interface PlaywrightWindow {
  hasTouch?: boolean;
}

/**
 * Extended Window interface with PixelStudio and Playwright
 */
interface WindowWithPixelStudio {
  PixelStudio?: typeof PixelStudio;
  playwright?: PlaywrightWindow;
}

declare global {
  interface Window extends WindowWithPixelStudio {}
}

export {};
