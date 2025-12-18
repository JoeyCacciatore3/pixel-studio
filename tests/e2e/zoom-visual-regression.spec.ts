/**
 * Zoom Visual Regression Tests
 * Verifies zoom functionality with visual snapshots and container position checks
 */

import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers/app-readiness';
import {
  getCanvasContainerBounds,
  verifyContainerStationary,
  getZoomLevel,
  resetZoom,
} from './helpers/zoom-helpers';

test.describe('Zoom Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);
    // Reset zoom to 100% before each test
    await resetZoom(page);
  });

  test('canvas container position at 100% zoom', async ({ page }) => {
    const canvasWrapper = page.locator('.canvas-wrapper');
    const canvas = page.locator('#mainCanvas');

    // Verify zoom is at 100%
    const zoomLevel = await getZoomLevel(page);
    expect(zoomLevel).toBe(100);

    // Capture container position
    const bounds = await getCanvasContainerBounds(page);
    expect(bounds).not.toBeNull();

    // Capture visual baseline
    await expect(canvasWrapper).toHaveScreenshot('zoom-100-container.png', {
      maxDiffPixels: 100,
    });
  });

  test('canvas container position at 200% zoom (zoomed in)', async ({ page }) => {
    const canvasWrapper = page.locator('.canvas-wrapper');
    const canvas = page.locator('#mainCanvas');

    // Get initial bounds
    const initialBounds = await getCanvasContainerBounds(page);
    expect(initialBounds).not.toBeNull();

    // Zoom in to 200%
    const zoomInBtn = page.locator('#zoomInBtn');
    while ((await getZoomLevel(page)) < 200) {
      await zoomInBtn.click();
      await page.waitForTimeout(300);
    }

    await page.waitForTimeout(500); // Wait for zoom to settle

    // Verify zoom level
    const zoomLevel = await getZoomLevel(page);
    expect(zoomLevel).toBeGreaterThanOrEqual(200);

    // Verify container position unchanged
    const afterBounds = await getCanvasContainerBounds(page);
    if (initialBounds && afterBounds) {
      verifyContainerStationary(initialBounds, afterBounds);
    }

    // Capture visual snapshot
    await expect(canvasWrapper).toHaveScreenshot('zoom-200-container.png', {
      maxDiffPixels: 100,
    });

    // Verify canvas content zoomed (should be larger/different)
    await expect(canvas).toHaveScreenshot('zoom-200-canvas.png', {
      maxDiffPixels: 500, // Allow more pixels for zoom differences
    });
  });

  test('canvas container position at 50% zoom (zoomed out)', async ({ page }) => {
    const canvasWrapper = page.locator('.canvas-wrapper');
    const canvas = page.locator('#mainCanvas');

    // Get initial bounds
    const initialBounds = await getCanvasContainerBounds(page);
    expect(initialBounds).not.toBeNull();

    // Zoom out to 50%
    const zoomOutBtn = page.locator('#zoomOutBtn');
    while ((await getZoomLevel(page)) > 50) {
      await zoomOutBtn.click();
      await page.waitForTimeout(300);
    }

    await page.waitForTimeout(500); // Wait for zoom to settle

    // Verify zoom level
    const zoomLevel = await getZoomLevel(page);
    expect(zoomLevel).toBeLessThanOrEqual(50);

    // Verify container position unchanged
    const afterBounds = await getCanvasContainerBounds(page);
    if (initialBounds && afterBounds) {
      verifyContainerStationary(initialBounds, afterBounds);
    }

    // Capture visual snapshot
    await expect(canvasWrapper).toHaveScreenshot('zoom-50-container.png', {
      maxDiffPixels: 100,
    });

    // Verify canvas content zoomed (should be smaller/different)
    await expect(canvas).toHaveScreenshot('zoom-50-canvas.png', {
      maxDiffPixels: 500,
    });
  });

  test('container position consistent across zoom levels', async ({ page }) => {
    const canvasWrapper = page.locator('.canvas-wrapper');

    // Test multiple zoom levels
    const zoomLevels = [100, 125, 150, 200, 150, 125, 100];
    const bounds: Array<{ zoom: number; bounds: any }> = [];

    for (const targetZoom of zoomLevels) {
      // Adjust zoom to target level
      const currentZoom = await getZoomLevel(page);
      const zoomInBtn = page.locator('#zoomInBtn');
      const zoomOutBtn = page.locator('#zoomOutBtn');

      while (currentZoom < targetZoom) {
        await zoomInBtn.click();
        await page.waitForTimeout(200);
        const newZoom = await getZoomLevel(page);
        if (newZoom >= targetZoom) break;
      }

      while (currentZoom > targetZoom) {
        await zoomOutBtn.click();
        await page.waitForTimeout(200);
        const newZoom = await getZoomLevel(page);
        if (newZoom <= targetZoom) break;
      }

      await page.waitForTimeout(500);

      const currentBounds = await getCanvasContainerBounds(page);
      bounds.push({ zoom: targetZoom, bounds: currentBounds });
    }

    // Verify all bounds are the same (container stayed stationary)
    if (bounds.length > 1) {
      const firstBounds = bounds[0]?.bounds;
      for (let i = 1; i < bounds.length; i++) {
        if (firstBounds && bounds[i]?.bounds) {
          verifyContainerStationary(firstBounds, bounds[i]!.bounds);
        }
      }
    }
  });
});
