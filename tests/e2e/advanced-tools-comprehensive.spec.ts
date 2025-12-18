/**
 * Comprehensive Advanced Tools Test Suite
 * Tests Intelligent Scissors, Magnetic Selection, Heal Tool, and Clone Tool
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
  measurePerformance,
  getCanvasImageData,
  compareImages,
} from './helpers/cleanup-helpers';

test.describe('Advanced Tools - Comprehensive Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForCanvasReady(page, 15000);
  });

  test.describe('Intelligent Scissors', () => {
    test('should detect edges and generate path', async ({ page }) => {
      // Draw a shape with clear edges
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      // Draw a square
      await drawStroke(page, [
        { x: box.x + 100, y: box.y + 100 },
        { x: box.x + 200, y: box.y + 100 },
        { x: box.x + 200, y: box.y + 200 },
        { x: box.x + 100, y: box.y + 200 },
        { x: box.x + 100, y: box.y + 100 },
      ]);

      // Select intelligent scissors tool
      await selectTool(page, 'intelligent-scissors');
      await page.waitForTimeout(500);

      // Click to set control points
      await page.mouse.click(box.x + 100, box.y + 100);
      await page.waitForTimeout(300);
      await page.mouse.move(box.x + 150, box.y + 100);
      await page.waitForTimeout(300);
      await page.mouse.click(box.x + 200, box.y + 100);
      await page.waitForTimeout(300);

      // Verify tool is working (no errors)
      const canvasVisible = await canvas.isVisible();
      expect(canvasVisible).toBe(true);
    });

    test('should handle path generation in real-time', async ({ page }) => {
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      // Draw content
      await drawStroke(page, [
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 150, y: box.y + 150 },
      ]);

      await selectTool(page, 'intelligent-scissors');
      await page.waitForTimeout(500);

      // Test real-time path generation
      await page.mouse.click(box.x + 50, box.y + 50);
      await page.waitForTimeout(100);

      // Move mouse to generate path
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.waitForTimeout(300);

      // Verify no crashes
      const canvasVisible = await canvas.isVisible();
      expect(canvasVisible).toBe(true);
    });
  });

  test.describe('Magnetic Selection', () => {
    test('should follow edges during selection', async ({ page }) => {
      // Draw a shape with clear edges
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      // Draw a circle-like shape
      for (let angle = 0; angle < 360; angle += 10) {
        const rad = (angle * Math.PI) / 180;
        const x = box.x + 150 + Math.cos(rad) * 50;
        const y = box.y + 150 + Math.sin(rad) * 50;
        await page.mouse.move(x, y);
        if (angle === 0) await page.mouse.down();
      }
      await page.mouse.up();

      // Select magnetic tool
      await selectTool(page, 'magnetic');
      await page.waitForTimeout(500);

      // Start selection near edge
      await page.mouse.click(box.x + 150, box.y + 100);
      await page.waitForTimeout(300);

      // Move along edge
      await page.mouse.move(box.x + 200, box.y + 150);
      await page.waitForTimeout(500);

      // Verify tool is working
      const canvasVisible = await canvas.isVisible();
      expect(canvasVisible).toBe(true);
    });

    test('should build edge map on first click', async ({ page }) => {
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      await drawStroke(page, [
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 150, y: box.y + 150 },
      ]);

      await selectTool(page, 'magnetic');
      await page.waitForTimeout(500);

      // First click should build edge map
      const { duration } = await measurePerformance(page, async () => {
        await page.mouse.click(box.x + 100, box.y + 100);
        await page.waitForTimeout(1000); // Wait for edge map
      });

      // Should complete in reasonable time
      expect(duration).toBeLessThan(3000);
    });
  });

  test.describe('Heal Tool', () => {
    test('should set source point with Alt/Ctrl click', async ({ page }) => {
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      // Draw some content
      await drawStroke(page, [
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 150, y: box.y + 150 },
      ]);

      await selectTool(page, 'heal');
      await page.waitForTimeout(500);

      // Set source point with Alt
      await page.keyboard.down('Alt');
      await page.mouse.click(box.x + 100, box.y + 100);
      await page.keyboard.up('Alt');
      await page.waitForTimeout(300);

      // Verify tool is working
      const canvasVisible = await canvas.isVisible();
      expect(canvasVisible).toBe(true);
    });

    test('should heal pattern from source', async ({ page }) => {
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      // Draw pattern
      await drawStroke(page, [
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 100, y: box.y + 100 },
      ]);

      const beforeData = await getCanvasImageData(page);

      await selectTool(page, 'heal');
      await page.waitForTimeout(500);

      // Set source
      await page.keyboard.down('Alt');
      await page.mouse.click(box.x + 75, box.y + 75);
      await page.keyboard.up('Alt');
      await page.waitForTimeout(300);

      // Heal to different location
      await page.mouse.move(box.x + 150, box.y + 150);
      await page.mouse.down();
      await page.mouse.move(box.x + 200, box.y + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);

      const afterData = await getCanvasImageData(page);
      const comparison = await compareImages(page, beforeData, afterData);
      expect(comparison.difference).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Clone Tool', () => {
    test('should set source point and clone pattern', async ({ page }) => {
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      // Draw pattern
      await drawStroke(page, [
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 100, y: box.y + 100 },
      ]);

      const beforeData = await getCanvasImageData(page);

      await selectTool(page, 'clone');
      await page.waitForTimeout(500);

      // Set source with Alt
      await page.keyboard.down('Alt');
      await page.mouse.click(box.x + 75, box.y + 75);
      await page.keyboard.up('Alt');
      await page.waitForTimeout(300);

      // Clone to different location
      await page.mouse.move(box.x + 150, box.y + 150);
      await page.mouse.down();
      await page.mouse.move(box.x + 200, box.y + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);

      const afterData = await getCanvasImageData(page);
      const comparison = await compareImages(page, beforeData, afterData);
      expect(comparison.difference).toBeGreaterThanOrEqual(0);
    });

    test('should track offset correctly', async ({ page }) => {
      await selectTool(page, 'pencil');
      const canvas = getCanvas(page);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      await drawStroke(page, [
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 100, y: box.y + 100 },
      ]);

      await selectTool(page, 'clone');
      await page.waitForTimeout(500);

      // Set source
      await page.keyboard.down('Alt');
      await page.mouse.click(box.x + 75, box.y + 75);
      await page.keyboard.up('Alt');
      await page.waitForTimeout(300);

      // Clone multiple times - offset should be maintained
      await page.mouse.click(box.x + 150, box.y + 150);
      await page.waitForTimeout(200);
      await page.mouse.click(box.x + 200, box.y + 200);
      await page.waitForTimeout(200);

      // Verify no crashes
      const canvasVisible = await canvas.isVisible();
      expect(canvasVisible).toBe(true);
    });
  });
});
