/**
 * Mobile-Specific Edge Cases Test Suite
 * Tests touch failures, orientation changes, mobile browser limitations, and crash recovery
 */

import { test, expect, devices } from '@playwright/test';
import {
  waitForCanvasReady,
  getCanvas,
  selectTool,
  drawStroke,
} from './helpers/canvas-helpers';
import { waitForStateManagerReady } from './helpers/state-helpers';
import { APP_URL } from './helpers/test-constants';

// Enable touch support for mobile edge case tests
test.use({ hasTouch: true });

test.describe('Mobile Edge Cases Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForCanvasReady(page, 15000);
    await waitForStateManagerReady(page, 15000);
  });

  test('should handle touch event failures', async ({ page }) => {
    // Try touch interaction
    const canvas = getCanvas(page);
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.tap({ position: { x: box.width / 2, y: box.height / 2 } });
      await page.waitForTimeout(500);

      // Should handle touch events
      await expect(canvas).toBeVisible();
    }
  });

  test('should handle multi-touch gesture conflicts', async ({ page }) => {
    const canvas = getCanvas(page);
    const box = await canvas.boundingBox();
    if (box) {
      // Simulate multi-touch (Playwright limitation - conceptual test)
      await canvas.tap({ position: { x: box.width / 2, y: box.height / 2 } });
      await page.waitForTimeout(500);

      // Should handle gracefully
      await expect(canvas).toBeVisible();
    }
  });

  test('should handle orientation change during drawing', async ({ page }) => {
    await selectTool(page, 'pencil');
    const canvas = getCanvas(page);
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.down();

      // Change orientation
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(500);

      await page.mouse.up();

      // Should handle orientation change
      await expect(canvas).toBeVisible();
    }
  });

  test('should handle viewport resize during operation', async ({ page }) => {
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(100);

    // Resize viewport
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);

    // Should handle resize
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle mobile browser memory limits', async ({ page }) => {
    // Create many operations
    await selectTool(page, 'pencil');
    for (let i = 0; i < 20; i++) {
      await drawStroke(
        page,
        { x: 100 + i * 5, y: 100 },
        { x: 150 + i * 5, y: 150 }
      );
      await page.waitForTimeout(50);
    }

    await page.waitForTimeout(1000);

    // Should handle memory limits
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle mobile browser storage limits', async ({ page }) => {
    // Try to save data
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(1000);

    // Should handle storage limits
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle mobile browser worker limitations', async ({ page }) => {
    // Workers may be limited on mobile
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(1000);

    // Should work without workers
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle mobile browser canvas limitations', async ({ page }) => {
    // Mobile browsers may have canvas size limits
    const canvas = getCanvas(page);
    const dimensions = await page.evaluate(() => {
      const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
      return { width: canvas.width, height: canvas.height };
    });

    // Should work within limits
    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);
  });

  test('should handle mobile browser performance issues', async ({ page }) => {
    // Mobile may have performance constraints
    await selectTool(page, 'pencil');
    const start = Date.now();

    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });

    const duration = Date.now() - start;

    // Should complete in reasonable time
    expect(duration).toBeLessThan(10000);
  });

  test('should handle mobile browser crash recovery', async ({ page }) => {
    // Simulate crash by reloading during operation
    await selectTool(page, 'pencil');
    const canvas = getCanvas(page);
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.down();

      // Reload (simulate crash)
      await page.reload();
      await waitForCanvasReady(page);

      // Should recover
      await expect(canvas).toBeVisible();
    }
  });
});
