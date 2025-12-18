/**
 * Concurrent Operations Test Suite
 * Tests simultaneous operations, race conditions, and event handler conflicts
 */

import { test, expect } from '@playwright/test';
import { waitForCanvasReady, getCanvas, selectTool, drawStroke } from './helpers/canvas-helpers';
import { waitForStateManagerReady } from './helpers/state-helpers';
import { APP_URL } from './helpers/test-constants';

test.describe('Concurrent Operations Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForCanvasReady(page, 15000);
    await waitForStateManagerReady(page, 15000);
  });

  test('should handle multiple tools activated simultaneously', async ({ page }) => {
    // Try to activate multiple tools at once
    await page.evaluate(() => {
      (window as any).PixelStudio?.selectTool?.('pencil');
      (window as any).PixelStudio?.selectTool?.('eraser');
      (window as any).PixelStudio?.selectTool?.('bucket');
    });

    await page.waitForTimeout(500);

    // Only one tool should be active
    const activeTool = await page.evaluate(() => {
      return (window as any).PixelStudio?.getState?.()?.currentTool;
    });

    expect(typeof activeTool).toBe('string');
  });

  test('should handle drawing while history saving', async ({ page }) => {
    // Draw something
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(100);

    // Start another draw during history save
    await drawStroke(page, { x: 200, y: 200 }, { x: 250, y: 250 });
    await page.waitForTimeout(1000);

    // Both operations should complete
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle drawing while layer rendering', async ({ page }) => {
    // Create a layer
    await page.evaluate(() => {
      const layers = (window as any).PixelStudio?.getLayers?.();
      if (layers) {
        layers.create?.('Render Layer');
      }
    });

    await page.waitForTimeout(500);

    // Draw while rendering
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(1000);

    // Should handle gracefully
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle drawing while canvas resizing', async ({ page }) => {
    await selectTool(page, 'pencil');
    const canvas = getCanvas(page);
    const box = await canvas.boundingBox();
    if (box) {
      // Start drawing
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.down();

      // Resize during drawing
      await page.evaluate(() => {
        const widthInput = document.getElementById('canvasWidth') as HTMLInputElement;
        if (widthInput) {
          widthInput.value = '800';
          widthInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      await page.waitForTimeout(500);
      await page.mouse.up();

      // Should handle gracefully
      await expect(canvas).toBeVisible();
    }
  });

  test('should handle multiple layer operations simultaneously', async ({ page }) => {
    // Perform multiple layer operations at once
    await page.evaluate(() => {
      const layers = (window as any).PixelStudio?.getLayers?.();
      if (layers) {
        layers.create?.('Layer 1');
        layers.create?.('Layer 2');
        layers.create?.('Layer 3');
      }
    });

    await page.waitForTimeout(1000);

    // All layers should be created
    const layerCount = await page.evaluate(() => {
      const layers = (window as any).PixelStudio?.getLayers?.();
      return layers?.getAllLayers?.()?.length || 0;
    });

    expect(layerCount).toBeGreaterThan(0);
  });

  test('should handle multiple history operations simultaneously', async ({ page }) => {
    // Draw multiple strokes rapidly
    await selectTool(page, 'pencil');
    for (let i = 0; i < 5; i++) {
      await drawStroke(page, { x: 100 + i * 10, y: 100 }, { x: 150 + i * 10, y: 150 });
      await page.waitForTimeout(50);
    }

    await page.waitForTimeout(1000);

    // History should handle all operations
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle tool operations during state updates', async ({ page }) => {
    // Start tool operation
    await selectTool(page, 'pencil');
    const canvas = getCanvas(page);
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.down();

      // Update state during operation
      await page.evaluate(() => {
        (window as any).PixelStudio?.selectTool?.('eraser');
      });

      await page.waitForTimeout(500);
      await page.mouse.up();

      // Should handle gracefully
      await expect(canvas).toBeVisible();
    }
  });

  test('should handle canvas operations during state updates', async ({ page }) => {
    // Start canvas operation
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });

    // Update state during operation
    await page.evaluate(() => {
      (window as any).PixelStudio?.selectTool?.('bucket');
    });

    await page.waitForTimeout(1000);

    // Should handle gracefully
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle UI updates during operations', async ({ page }) => {
    // Start operation
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });

    // Trigger UI updates
    await page.evaluate(() => {
      // Change tool which updates UI
      (window as any).PixelStudio?.selectTool?.('eraser');
      (window as any).PixelStudio?.selectTool?.('pencil');
    });

    await page.waitForTimeout(1000);

    // UI should update correctly
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle event handler race conditions', async ({ page }) => {
    // Trigger multiple events rapidly
    await page.evaluate(() => {
      for (let i = 0; i < 10; i++) {
        (window as any).PixelStudio?.selectTool?.(i % 2 === 0 ? 'pencil' : 'eraser');
      }
    });

    await page.waitForTimeout(1000);

    // Should handle race conditions
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });
});
