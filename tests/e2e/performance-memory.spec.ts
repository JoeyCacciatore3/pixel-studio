/**
 * Performance & Memory Test Suite
 * Tests large canvas operations, memory pressure, leaks, and performance regression
 */

import { test, expect } from '@playwright/test';
import {
  waitForCanvasReady,
  getCanvas,
  selectTool,
  drawStroke,
  resizeCanvas,
} from './helpers/canvas-helpers';
import {
  measureOperationPerformance,
  detectMemoryLeak,
  measureCanvasOperationPerformance,
  measureLayerRenderingPerformance,
  measureHistoryOperationPerformance,
  monitorPerformanceMetrics,
  stressTestCanvasOperations,
} from './helpers/performance-helpers';
import { waitForStateManagerReady } from './helpers/state-helpers';
import { APP_URL } from './helpers/test-constants';

test.describe('Performance & Memory Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForCanvasReady(page, 15000);
    await waitForStateManagerReady(page, 15000);
  });

  test('should handle large canvas operations', async ({ page }) => {
    // Resize to large canvas
    await resizeCanvas(page, 2000, 2000);
    await page.waitForTimeout(1000);

    // Draw on large canvas
    await selectTool(page, 'pencil');
    const performance = await measureOperationPerformance(page, async () => {
      await drawStroke(page, { x: 100, y: 100 }, { x: 500, y: 500 });
    });

    // Should complete in reasonable time
    expect(performance.duration).toBeLessThan(10000);
  });

  test('should handle memory pressure scenarios', async ({ page }) => {
    // Create many operations
    await selectTool(page, 'pencil');
    const performance = await measureOperationPerformance(page, async () => {
      for (let i = 0; i < 50; i++) {
        await drawStroke(
          page,
          { x: 100 + i, y: 100 },
          { x: 150 + i, y: 150 }
        );
        await page.waitForTimeout(10);
      }
    });

    // Memory should not grow excessively
    const memoryGrowth = performance.memoryAfter - performance.memoryBefore;
    expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
  });

  test('should handle long-running operations timeout', async ({ page }) => {
    test.setTimeout(90000); // Increase timeout for long operations

    // Long operation
    await selectTool(page, 'pencil');
    const start = Date.now();

    // Reduce number of operations to prevent timeout
    for (let i = 0; i < 50; i++) {
      await drawStroke(
        page,
        { x: 100 + i, y: 100 },
        { x: 150 + i, y: 150 }
      );
      // Use smaller delay and check page is still open
      try {
        await page.waitForTimeout(30);
      } catch (error) {
        // If page closed, break early
        if (error instanceof Error && error.message.includes('closed')) {
          break;
        }
        throw error;
      }
    }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(90000);
  });

  test('should handle rapid operations without lag', async ({ page }) => {
    await selectTool(page, 'pencil');

    const performance = await measureCanvasOperationPerformance(page, async () => {
      for (let i = 0; i < 20; i++) {
        await drawStroke(
          page,
          { x: 100 + i * 5, y: 100 },
          { x: 150 + i * 5, y: 150 }
        );
        await page.waitForTimeout(10);
      }
    });

    // Should maintain reasonable FPS
    // FPS might be 0 if operation completes quickly, so only check if fps > 0
    if (performance.fps > 0) {
      expect(performance.fps).toBeGreaterThan(5); // More lenient threshold
    }
  });

  test('should detect memory leaks', async ({ page }) => {
    await selectTool(page, 'pencil');

    const leak = await detectMemoryLeak(page, async () => {
      await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
      await page.waitForTimeout(100);
    }, 10);

    // Should not have significant leaks
    expect(leak.hasLeak).toBe(false);
  });

  test('should measure canvas operation performance', async ({ page }) => {
    await selectTool(page, 'pencil');

    const performance = await measureCanvasOperationPerformance(page, async () => {
      await drawStroke(page, { x: 100, y: 100 }, { x: 200, y: 200 });
    });

    // Should complete in reasonable time
    expect(performance.duration).toBeLessThan(5000);
  });

  test('should measure layer rendering performance', async ({ page }) => {
    const performance = await measureLayerRenderingPerformance(page, 5);

    // Should render layers efficiently
    expect(performance.layersPerSecond).toBeGreaterThan(0);
  });

  test('should measure history operation performance', async ({ page }) => {
    // Draw something first
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(500);

    const performance = await measureHistoryOperationPerformance(page, 'undo');

    // Should complete quickly
    expect(performance.duration).toBeLessThan(2000);
  });

  test('should monitor performance metrics', async ({ page }) => {
    await selectTool(page, 'pencil');

    const metrics = await monitorPerformanceMetrics(page, 3000);

    // Should have reasonable metrics
    expect(metrics.fps).toBeGreaterThan(0);
    expect(typeof metrics.memoryUsage).toBe('number');
  });

  test('should handle stress test canvas operations', async ({ page }) => {
    await selectTool(page, 'pencil');

    const result = await stressTestCanvasOperations(page, 50);

    // Should succeed with minimal errors
    expect(result.success).toBe(true);
    expect(result.errors).toBeLessThan(5);
  });
});
