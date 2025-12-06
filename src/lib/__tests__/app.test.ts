/**
 * Basic test suite for PixelStudio module
 * Validates module structure and API availability
 */

import { describe, it, expect } from 'vitest';
import PixelStudio from '../app';

describe('PixelStudio', () => {
  it('should export a default object', () => {
    expect(PixelStudio).toBeDefined();
    expect(typeof PixelStudio).toBe('object');
  });

  it('should have required public API methods', () => {
    expect(PixelStudio).toHaveProperty('init');
    expect(PixelStudio).toHaveProperty('registerTool');
    expect(PixelStudio).toHaveProperty('getTool');
    expect(PixelStudio).toHaveProperty('selectTool');
    expect(PixelStudio).toHaveProperty('getCurrentTool');
    expect(PixelStudio).toHaveProperty('updateColorPreview');
    expect(PixelStudio).toHaveProperty('setColor');
    expect(PixelStudio).toHaveProperty('clearSelection');
    expect(PixelStudio).toHaveProperty('getState');
    expect(PixelStudio).toHaveProperty('getElements');
    expect(PixelStudio).toHaveProperty('getLayers');
    expect(PixelStudio).toHaveProperty('syncLayerState');
  });

  it('should have init as a function', () => {
    expect(typeof PixelStudio.init).toBe('function');
  });

  it('should have registerTool as a function', () => {
    expect(typeof PixelStudio.registerTool).toBe('function');
  });

  it('should have getState as a function', () => {
    expect(typeof PixelStudio.getState).toBe('function');
  });

  it('should return null state when not initialized', () => {
    const state = PixelStudio.getState();
    expect(state).toBeNull();
  });
});
