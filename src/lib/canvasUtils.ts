/**
 * Canvas Utilities
 * Shared utilities for canvas dimensions and device pixel ratio
 * Separated from Canvas module to break circular dependencies
 */

const CanvasUtils = (function () {
  let canvas: HTMLCanvasElement | null = null;
  let logicalWidth = 0;
  let logicalHeight = 0;
  let devicePixelRatio = 1;

  /**
   * Initialize canvas utilities with canvas dimensions
   * Called by Canvas module during initialization
   */
  function init(
    canvasElement: HTMLCanvasElement,
    width: number,
    height: number,
    dpr: number
  ): void {
    canvas = canvasElement;
    logicalWidth = width;
    logicalHeight = height;
    devicePixelRatio = dpr;
  }

  /**
   * Update canvas dimensions (called when canvas is resized)
   */
  function updateDimensions(width: number, height: number, dpr: number): void {
    logicalWidth = width;
    logicalHeight = height;
    devicePixelRatio = dpr;
    // Canvas reference is maintained, no need to reassign
  }

  /**
   * Get canvas width (logical width, not physical pixels)
   * Returns the CSS width, accounting for device pixel ratio
   */
  function getWidth(): number {
    if (!canvas) {
      throw new Error('Canvas utils not initialized');
    }
    return logicalWidth > 0 ? logicalWidth : canvas.width / devicePixelRatio;
  }

  /**
   * Get canvas height (logical height, not physical pixels)
   * Returns the CSS height, accounting for device pixel ratio
   */
  function getHeight(): number {
    if (!canvas) {
      throw new Error('Canvas utils not initialized');
    }
    return logicalHeight > 0 ? logicalHeight : canvas.height / devicePixelRatio;
  }

  /**
   * Get device pixel ratio
   * Useful for tools that need to know the display scaling
   */
  function getDevicePixelRatio(): number {
    return devicePixelRatio;
  }

  return {
    init,
    updateDimensions,
    getWidth,
    getHeight,
    getDevicePixelRatio,
  };
})();

export default CanvasUtils;
