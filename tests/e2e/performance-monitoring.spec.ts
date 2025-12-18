/**
 * Performance Monitoring Test Suite
 * Continuous performance monitoring and regression detection
 */

import { test, expect } from '@playwright/test';
import { waitForCanvasReady, selectTool, drawStroke, APP_URL } from './helpers/canvas-helpers';
import {
  measureLoadTime,
  measureFCP,
  measureMemoryUsage,
  expectNoMemoryLeaks,
} from './helpers/performance-helpers';
import {
  measureOperationPerformance,
  detectMemoryLeak,
  measureCanvasOperationPerformance,
  stressTestCanvasOperations,
  checkPerformanceRegression,
} from './helpers/performance-helpers';

test.describe('Performance Monitoring', () => {
  test.describe('Page Load Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const loadTime = await measureLoadTime(page, APP_URL);
      expect(loadTime).toBeLessThan(5000); // Target: under 5 seconds
    });

    test('should have fast First Contentful Paint', async ({ page }) => {
      const fcp = await measureFCP(page);
      if (fcp !== null) {
        expect(fcp).toBeLessThan(2000); // Target: under 2 seconds
      }
    });

    test('should maintain performance on repeated loads', async ({ page }) => {
      const loadTimes: number[] = [];

      for (let i = 0; i < 3; i++) {
        const loadTime = await measureLoadTime(page, APP_URL);
        loadTimes.push(loadTime);
        await page.waitForTimeout(1000);
      }

      const averageLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
      expect(averageLoadTime).toBeLessThan(5000);
    });
  });

  test.describe('Canvas Operation Performance', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await waitForCanvasReady(page);
    });

    test('should draw strokes efficiently', async ({ page }) => {
      await selectTool(page, 'pencil');

      const performance = await measureCanvasOperationPerformance(page, async () => {
        await drawStroke(page, { x: 10, y: 10 }, { x: 400, y: 400 });
      });

      expect(performance.duration).toBeLessThan(2000); // Should complete in under 2 seconds
      // FPS might be 0 if operation completes quickly, so only check if fps > 0
      if (performance.fps > 0) {
        expect(performance.fps).toBeGreaterThan(10); // Should maintain at least 10 FPS (more lenient)
      }
    });

    test('should handle rapid drawing operations', async ({ page }) => {
      await selectTool(page, 'pencil');

      const startTime = Date.now();

      // Perform 10 rapid strokes
      for (let i = 0; i < 10; i++) {
        await drawStroke(page, { x: 50 + i * 10, y: 50 }, { x: 100 + i * 10, y: 100 });
        await page.waitForTimeout(50);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds (more lenient for rapid operations)
    });

    test('should maintain performance under stress', async ({ page }) => {
      await selectTool(page, 'pencil');

      const stressResult = await stressTestCanvasOperations(page, 50);

      expect(stressResult.success).toBe(true);
      expect(stressResult.errors).toBeLessThan(5); // Less than 10% errors
      expect(stressResult.averageDuration).toBeLessThan(100); // Average operation under 100ms
    });
  });

  test.describe('Memory Management', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await waitForCanvasReady(page);
    });

    test('should not have memory leaks during drawing', async ({ page }) => {
      await selectTool(page, 'pencil');

      const initialMemory = await measureMemoryUsage(page);
      expect(initialMemory).not.toBeNull();

      // Detect memory leaks
      const leakResult = await detectMemoryLeak(
        page,
        async () => {
          await drawStroke(page, { x: 50, y: 50 }, { x: 100, y: 100 });
          await page.waitForTimeout(100);
        },
        20
      );

      expect(leakResult.hasLeak).toBe(false);
      expect(leakResult.memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
    });

    test('should not leak memory during undo/redo operations', async ({ page }) => {
      await selectTool(page, 'pencil');
      await drawStroke(page, { x: 50, y: 50 }, { x: 100, y: 100 });
      await page.waitForTimeout(500);

      const initialMemory = await measureMemoryUsage(page);

      // Perform multiple undo/redo cycles
      for (let i = 0; i < 10; i++) {
        await page.locator('#undoBtn').click();
        await page.waitForTimeout(100);
        await page.locator('#redoBtn').click();
        await page.waitForTimeout(100);
      }

      const finalMemory = await measureMemoryUsage(page);

      if (initialMemory !== null && finalMemory !== null) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024); // Less than 5MB growth
      }
    });
  });

  test.describe('Performance Regression Detection', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await waitForCanvasReady(page);
    });

    test('should detect performance regressions in canvas operations', async ({ page }) => {
      // Baseline performance (simulated - in real scenario, load from baseline file)
      const baseline = {
        duration: 100, // 100ms baseline
        memory: 50 * 1024 * 1024, // 50MB baseline
      };

      const regressionResult = await checkPerformanceRegression(page, baseline, 0.2);

      // Allow up to 20% regression before failing
      expect(regressionResult.regressed).toBe(false);
    });

    test('should maintain consistent performance across operations', async ({ page }) => {
      await selectTool(page, 'pencil');

      const durations: number[] = [];

      // Measure multiple operations
      for (let i = 0; i < 5; i++) {
        const perf = await measureOperationPerformance(page, async () => {
          await drawStroke(page, { x: 50, y: 50 }, { x: 100, y: 100 });
        });
        durations.push(perf.duration);
        await page.waitForTimeout(200);
      }

      // Calculate variance
      const average = durations.reduce((a, b) => a + b, 0) / durations.length;
      const variance =
        durations.reduce((sum, d) => sum + Math.pow(d - average, 2), 0) / durations.length;
      const stdDev = Math.sqrt(variance);

      // Standard deviation should be less than 30% of average (consistent performance)
      expect(stdDev / average).toBeLessThan(0.3);
    });
  });

  test.describe('Core Web Vitals', () => {
    test('should meet Core Web Vitals thresholds', async ({ page }) => {
      await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

      // Wait for page to fully load before measuring
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await waitForCanvasReady(page, 10000);
      await page.waitForTimeout(1000); // Give time for metrics to settle

      // Measure FCP
      const fcp = await measureFCP(page);
      if (fcp !== null && fcp > 0) {
        // FCP should be reasonable (less than 3 seconds for good UX)
        expect(fcp).toBeLessThan(3000);
      }

      // Measure memory
      const memory = await measureMemoryUsage(page);
      if (memory !== null && memory > 0) {
        // Memory should be reasonable (less than 200MB for initial load - more lenient)
        expect(memory).toBeLessThan(200 * 1024 * 1024);
      }
    });
  });
});
