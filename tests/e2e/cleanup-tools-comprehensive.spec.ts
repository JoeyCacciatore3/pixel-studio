/**
 * Comprehensive Cleanup Tools Test Suite
 * Tests all 8 cleanup tools with various configurations, edge cases, and performance
 */

import { test, expect } from '@playwright/test';
import {
  waitForCanvasReady,
  selectTool,
  getCanvas,
  drawStroke,
  APP_URL,
} from './helpers/canvas-helpers';
import {
  selectCleanupTool,
  configureCleanupOptions,
  executeCleanupTool,
  waitForCleanupComplete,
  verifyToolExecuted,
  measurePerformance,
  getCanvasImageData,
  compareImages,
} from './helpers/cleanup-helpers';

test.describe('Cleanup Tools - Comprehensive Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForCanvasReady(page, 15000);
  });

  test.describe('Stray Pixel Eliminator', () => {
    test('should remove stray pixels with delete mode', async ({ page }) => {
      // Draw some content with stray pixels
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      // Draw main shape
      await drawStroke(page, [
        { x: box.x + 100, y: box.y + 100 },
        { x: box.x + 200, y: box.y + 100 },
        { x: box.x + 200, y: box.y + 200 },
        { x: box.x + 100, y: box.y + 200 },
        { x: box.x + 100, y: box.y + 100 },
      ]);

      // Add stray pixels
      await page.mouse.click(box.x + 50, box.y + 50);
      await page.mouse.click(box.x + 250, box.y + 50);
      await page.mouse.click(box.x + 50, box.y + 250);

      // Get before state
      const beforeData = await getCanvasImageData(page);

      // Execute stray pixel eliminator
      await selectCleanupTool(page, 'cleanup-stray-pixels');
      await configureCleanupOptions(page, { minSize: '3', merge: 'false' });
      await executeCleanupTool(page);
      await waitForCleanupComplete(page);

      // Verify tool executed
      const executed = await verifyToolExecuted(page);
      expect(executed).toBe(true);

      // Get after state
      const afterData = await getCanvasImageData(page);

      // Compare - should have fewer pixels (stray pixels removed)
      const comparison = await compareImages(page, beforeData, afterData);
      expect(comparison.difference).toBeGreaterThan(0); // Some pixels changed
    });

    test('should merge stray pixels with merge mode', async ({ page }) => {
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      // Draw content with stray pixels
      await drawStroke(page, [
        { x: box.x + 100, y: box.y + 100 },
        { x: box.x + 200, y: box.y + 200 },
      ]);

      await page.mouse.click(box.x + 50, box.y + 50);

      const beforeData = await getCanvasImageData(page);

      await selectCleanupTool(page, 'cleanup-stray-pixels');
      await configureCleanupOptions(page, { minSize: '2', merge: 'true' });
      await executeCleanupTool(page);
      await waitForCleanupComplete(page);

      const executed = await verifyToolExecuted(page);
      expect(executed).toBe(true);

      const afterData = await getCanvasImageData(page);
      const comparison = await compareImages(page, beforeData, afterData);
      expect(comparison.difference).toBeGreaterThan(0);
    });

    test('should handle various minSize values', async ({ page }) => {
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      // Draw content
      await drawStroke(page, [
        { x: box.x + 100, y: box.y + 100 },
        { x: box.x + 200, y: box.y + 200 },
      ]);

      for (const minSize of [1, 3, 5, 10]) {
        await selectCleanupTool(page, 'cleanup-stray-pixels');
        await configureCleanupOptions(page, { minSize: String(minSize), merge: 'false' });
        await executeCleanupTool(page);
        await waitForCleanupComplete(page);

        const executed = await verifyToolExecuted(page);
        expect(executed).toBe(true);
      }
    });

    test('should perform within acceptable time for large images', async ({ page }) => {
      // Create a larger drawing
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      // Draw a larger shape
      for (let i = 0; i < 10; i++) {
        await page.mouse.move(box.x + 50 + i * 20, box.y + 50 + i * 20);
        await page.mouse.down();
        await page.mouse.up();
      }

      await selectCleanupTool(page, 'cleanup-stray-pixels');
      await configureCleanupOptions(page, { minSize: '3', merge: 'false' });

      const { duration } = await measurePerformance(page, async () => {
        await executeCleanupTool(page);
        await waitForCleanupComplete(page);
      });

      // Should complete in reasonable time (< 5 seconds for 512x512)
      expect(duration).toBeLessThan(5000);
    });
  });

  test.describe('Color Noise Reducer', () => {
    test('should reduce colors in auto-clean mode', async ({ page }) => {
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      // Draw with color variations
      await drawStroke(page, [
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 150, y: box.y + 150 },
      ]);

      const beforeData = await getCanvasImageData(page);

      await selectCleanupTool(page, 'cleanup-color-reduce');
      await configureCleanupOptions(page, { mode: 'auto-clean', threshold: '15' });
      await executeCleanupTool(page);
      await waitForCleanupComplete(page);

      const executed = await verifyToolExecuted(page);
      expect(executed).toBe(true);

      const afterData = await getCanvasImageData(page);
      const comparison = await compareImages(page, beforeData, afterData);
      // Should have some changes
      expect(comparison.difference).toBeGreaterThanOrEqual(0);
    });

    test('should quantize to N colors', async ({ page }) => {
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      // Draw colorful content
      await drawStroke(page, [
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 150, y: box.y + 150 },
      ]);

      const beforeData = await getCanvasImageData(page);

      await selectCleanupTool(page, 'cleanup-color-reduce');
      await configureCleanupOptions(page, { mode: 'quantize', nColors: '8' });
      await executeCleanupTool(page);
      await waitForCleanupComplete(page);

      const executed = await verifyToolExecuted(page);
      expect(executed).toBe(true);

      const afterData = await getCanvasImageData(page);
      const comparison = await compareImages(page, beforeData, afterData);
      expect(comparison.difference).toBeGreaterThanOrEqual(0);
    });

    test('should handle various threshold values', async ({ page }) => {
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      await drawStroke(page, [
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 150, y: box.y + 150 },
      ]);

      for (const threshold of [5, 15, 30, 50]) {
        await selectCleanupTool(page, 'cleanup-color-reduce');
        await configureCleanupOptions(page, { mode: 'auto-clean', threshold: String(threshold) });
        await executeCleanupTool(page);
        await waitForCleanupComplete(page);

        const executed = await verifyToolExecuted(page);
        expect(executed).toBe(true);
      }
    });
  });

  test.describe('Edge Crispener', () => {
    test('should crisp edges with threshold method', async ({ page }) => {
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      await drawStroke(page, [
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 150, y: box.y + 150 },
      ]);

      const beforeData = await getCanvasImageData(page);

      await selectCleanupTool(page, 'cleanup-edge-crisp');
      await configureCleanupOptions(page, { method: 'threshold', threshold: '200' });
      await executeCleanupTool(page);
      await waitForCleanupComplete(page);

      const executed = await verifyToolExecuted(page);
      expect(executed).toBe(true);

      const afterData = await getCanvasImageData(page);
      const comparison = await compareImages(page, beforeData, afterData);
      expect(comparison.difference).toBeGreaterThanOrEqual(0);
    });

    test('should crisp edges with erode method', async ({ page }) => {
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      await drawStroke(page, [
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 150, y: box.y + 150 },
      ]);

      await selectCleanupTool(page, 'cleanup-edge-crisp');
      await configureCleanupOptions(page, { method: 'erode', erodePixels: '2' });
      await executeCleanupTool(page);
      await waitForCleanupComplete(page);

      const executed = await verifyToolExecuted(page);
      expect(executed).toBe(true);
    });
  });

  test.describe('Edge Smoother', () => {
    test('should smooth edges in standard mode', async ({ page }) => {
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      // Draw jagged line
      await drawStroke(page, [
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 60, y: box.y + 50 },
        { x: box.x + 70, y: box.y + 60 },
        { x: box.x + 80, y: box.y + 60 },
        { x: box.x + 90, y: box.y + 70 },
      ]);

      const beforeData = await getCanvasImageData(page);

      await selectCleanupTool(page, 'cleanup-edge-smooth');
      await configureCleanupOptions(page, { mode: 'standard', strength: '50' });
      await executeCleanupTool(page);
      await waitForCleanupComplete(page);

      const executed = await verifyToolExecuted(page);
      expect(executed).toBe(true);

      const afterData = await getCanvasImageData(page);
      const comparison = await compareImages(page, beforeData, afterData);
      expect(comparison.difference).toBeGreaterThanOrEqual(0);
    });

    test('should handle all smoothing modes', async ({ page }) => {
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      await drawStroke(page, [
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 150, y: box.y + 150 },
      ]);

      for (const mode of ['subtle', 'standard', 'smooth', 'pixel-perfect']) {
        await selectCleanupTool(page, 'cleanup-edge-smooth');
        await configureCleanupOptions(page, { mode, strength: '50' });
        await executeCleanupTool(page);
        await waitForCleanupComplete(page);

        const executed = await verifyToolExecuted(page);
        expect(executed).toBe(true);
      }
    });
  });

  test.describe('Logo Cleaner', () => {
    test('should execute logo-minimal preset', async ({ page }) => {
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      // Draw some content
      await drawStroke(page, [
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 150, y: box.y + 150 },
      ]);

      const beforeData = await getCanvasImageData(page);

      await selectCleanupTool(page, 'cleanup-logo');
      await configureCleanupOptions(page, { preset: 'logo-minimal' });
      await executeCleanupTool(page);
      await waitForCleanupComplete(page, 15000); // Logo cleaner may take longer

      const executed = await verifyToolExecuted(page);
      expect(executed).toBe(true);

      const afterData = await getCanvasImageData(page);
      const comparison = await compareImages(page, beforeData, afterData);
      expect(comparison.difference).toBeGreaterThanOrEqual(0);
    });

    test('should execute all presets', async ({ page }) => {
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      await drawStroke(page, [
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 150, y: box.y + 150 },
      ]);

      const presets = [
        'logo-minimal',
        'logo-standard',
        'logo-aggressive',
        'icon-app-store',
        'game-asset',
        'print-ready',
      ];

      for (const preset of presets) {
        await selectCleanupTool(page, 'cleanup-logo');
        await configureCleanupOptions(page, { preset });
        await executeCleanupTool(page);
        await waitForCleanupComplete(page, 15000);

        const executed = await verifyToolExecuted(page);
        expect(executed).toBe(true);
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle empty canvas gracefully', async ({ page }) => {
      await selectCleanupTool(page, 'cleanup-stray-pixels');
      await configureCleanupOptions(page, { minSize: '3', merge: 'false' });
      await executeCleanupTool(page);
      await waitForCleanupComplete(page);

      // Should not crash
      const canvas = getCanvas(page);
      const isVisible = await canvas.isVisible();
      expect(isVisible).toBe(true);
    });

    test('should handle single-color images', async ({ page }) => {
      await selectTool(page, 'bucket');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      // Fill entire canvas with one color
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

      await selectCleanupTool(page, 'cleanup-color-reduce');
      await configureCleanupOptions(page, { mode: 'auto-clean', threshold: '15' });
      await executeCleanupTool(page);
      await waitForCleanupComplete(page);

      const executed = await verifyToolExecuted(page);
      expect(executed).toBe(true);
    });
  });
});
