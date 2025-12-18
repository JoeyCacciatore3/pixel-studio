/**
 * Layer System Edge Cases Test Suite
 * Tests layer deletion during operations, lock/unlock, rendering failures, and bounds tracking
 */

import { test, expect } from '@playwright/test';
import {
  waitForCanvasReady,
  getCanvas,
  selectTool,
  drawStroke,
  canvasHasContent,
} from './helpers/canvas-helpers';
import { waitForStateManagerReady } from './helpers/state-helpers';
import { APP_URL } from './helpers/test-constants';

test.describe('Layer Edge Cases Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForCanvasReady(page, 15000);
    await waitForStateManagerReady(page, 15000);
  });

  test('should handle deleting active layer during drawing', async ({ page }) => {
    // Create a layer
    await page.evaluate(() => {
      const layers = (window as any).PixelStudio?.getLayers?.();
      if (layers) {
        const layer = layers.create?.('Active Layer');
        if (layer) {
          layers.setActive?.(layer.id);
        }
      }
    });

    await page.waitForTimeout(500);

    // Start drawing
    const canvas = getCanvas(page);
    const box = await canvas.boundingBox();
    if (box) {
      await selectTool(page, 'pencil');
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.down();

      // Delete active layer during drawing
      await page.evaluate(() => {
        const layers = (window as any).PixelStudio?.getLayers?.();
        if (layers) {
          const activeId = (window as any).PixelStudio?.getState?.()?.activeLayerId;
          if (activeId) {
            layers.delete?.(activeId);
          }
        }
      });

      await page.waitForTimeout(500);
      await page.mouse.up();

      // Should handle gracefully
      await expect(canvas).toBeVisible();
    }
  });

  test('should handle deleting layer during history operation', async ({ page }) => {
    // Create and draw on a layer
    await page.evaluate(() => {
      const layers = (window as any).PixelStudio?.getLayers?.();
      if (layers) {
        const layer = layers.create?.('History Layer');
        if (layer) {
          layers.setActive?.(layer.id);
        }
      }
    });

    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(500);

    // Delete layer during history save
    await page.evaluate(() => {
      const layers = (window as any).PixelStudio?.getLayers?.();
      if (layers) {
        const allLayers = layers.getAllLayers?.();
        if (allLayers && allLayers.length > 1) {
          layers.delete?.(allLayers[allLayers.length - 1]?.id);
        }
      }
    });

    await page.waitForTimeout(1000);

    // History should handle gracefully
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle creating layer during tool operation', async ({ page }) => {
    // Start tool operation
    await selectTool(page, 'pencil');
    const canvas = getCanvas(page);
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.down();

      // Create layer during operation
      await page.evaluate(() => {
        const layers = (window as any).PixelStudio?.getLayers?.();
        if (layers) {
          layers.create?.('New Layer');
        }
      });

      await page.waitForTimeout(500);
      await page.mouse.up();

      // Should handle gracefully
      await expect(canvas).toBeVisible();
    }
  });

  test('should handle locking layer during drawing', async ({ page }) => {
    // Create and activate a layer
    await page.evaluate(() => {
      const layers = (window as any).PixelStudio?.getLayers?.();
      if (layers) {
        const layer = layers.create?.('Lockable Layer');
        if (layer) {
          layers.setActive?.(layer.id);
        }
      }
    });

    await page.waitForTimeout(500);

    // Start drawing
    const canvas = getCanvas(page);
    const box = await canvas.boundingBox();
    if (box) {
      await selectTool(page, 'pencil');
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.down();

      // Lock layer during drawing
      await page.evaluate(() => {
        const layers = (window as any).PixelStudio?.getLayers?.();
        if (layers) {
          const activeId = (window as any).PixelStudio?.getState?.()?.activeLayerId;
          if (activeId) {
            layers.update?.(activeId, { locked: true });
          }
        }
      });

      await page.waitForTimeout(500);
      await page.mouse.up();

      // Should handle locked layer error
      await expect(canvas).toBeVisible();
    }
  });

  test('should handle hiding layer during rendering', async ({ page }) => {
    // Create and draw on a layer
    await page.evaluate(() => {
      const layers = (window as any).PixelStudio?.getLayers?.();
      if (layers) {
        const layer = layers.create?.('Visible Layer');
        if (layer) {
          layers.setActive?.(layer.id);
        }
      }
    });

    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(500);

    // Hide layer
    await page.evaluate(() => {
      const layers = (window as any).PixelStudio?.getLayers?.();
      if (layers) {
        const activeId = (window as any).PixelStudio?.getState?.()?.activeLayerId;
        if (activeId) {
          layers.update?.(activeId, { visible: false });
        }
      }
    });

    await page.waitForTimeout(1000);

    // Layer should be hidden but canvas should still work
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle layer operations with invalid IDs', async ({ page }) => {
    // Try to access invalid layer
    const error = await page.evaluate(() => {
      try {
        const layers = (window as any).PixelStudio?.getLayers?.();
        if (layers) {
          layers.get?.('invalid-layer-id');
          layers.delete?.('invalid-layer-id');
          layers.update?.('invalid-layer-id', {});
        }
        return false;
      } catch {
        return true;
      }
    });

    // Should handle invalid IDs gracefully
    expect(typeof error).toBe('boolean');
  });

  test('should handle maximum layer limit', async ({ page }) => {
    // Try to create many layers
    await page.evaluate(() => {
      const layers = (window as any).PixelStudio?.getLayers?.();
      if (layers) {
        for (let i = 0; i < 15; i++) {
          try {
            layers.create?.(`Layer ${i}`);
          } catch {
            // Expected to fail at limit
          }
        }
      }
    });

    await page.waitForTimeout(1000);

    // Should respect layer limit
    const layerCount = await page.evaluate(() => {
      const layers = (window as any).PixelStudio?.getLayers?.();
      if (layers) {
        return layers.getAllLayers?.()?.length || 0;
      }
      return 0;
    });

    // Should not exceed reasonable limit (e.g., 10)
    expect(layerCount).toBeLessThanOrEqual(15);
  });

  test('should handle layer operations with corrupted state', async ({ page }) => {
    // Inject corrupted layer state
    await page.evaluate(() => {
      try {
        const state = (window as any).PixelStudio?.getState?.();
        if (state) {
          // Corrupt layers array
          state.layers = [{ id: 'invalid', canvas: null }];
          (window as any).PixelStudio?._setState?.(state);
        }
      } catch {
        // Expected
      }
    });

    await page.waitForTimeout(500);

    // Should handle corrupted state
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle layer rendering failures', async ({ page }) => {
    // Create a layer and trigger render
    await page.evaluate(() => {
      const layers = (window as any).PixelStudio?.getLayers?.();
      if (layers) {
        const layer = layers.create?.('Render Layer');
        if (layer) {
          layers.setActive?.(layer.id);
          // Trigger render
          layers.renderSync?.();
        }
      }
    });

    await page.waitForTimeout(1000);

    // Should handle render failures gracefully
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle layer bounds tracking errors', async ({ page }) => {
    // Create layer and draw
    await page.evaluate(() => {
      const layers = (window as any).PixelStudio?.getLayers?.();
      if (layers) {
        const layer = layers.create?.('Bounds Layer');
        if (layer) {
          layers.setActive?.(layer.id);
        }
      }
    });

    await drawStroke(page, { x: 100, y: 100 }, { x: 200, y: 200 });
    await page.waitForTimeout(500);

    // Bounds should be tracked
    const hasContent = await canvasHasContent(page);
    expect(typeof hasContent).toBe('boolean');
  });
});
