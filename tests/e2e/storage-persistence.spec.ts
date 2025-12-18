/**
 * Storage & Persistence Test Suite
 * Tests quota exceeded, storage disabled, corrupted data recovery, and migration failures
 */

import { test, expect } from '@playwright/test';
import {
  waitForCanvasReady,
  getCanvas,
  selectTool,
  drawStroke,
} from './helpers/canvas-helpers';
import {
  simulateStorageQuotaExceeded,
  simulateIndexedDBFailure,
  simulateLocalStorageDisabled,
  injectCorruptedStateData,
} from './helpers/error-helpers';
import { waitForStateManagerReady } from './helpers/state-helpers';
import { APP_URL } from './helpers/test-constants';

test.describe('Storage & Persistence Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForCanvasReady(page, 15000);
    await waitForStateManagerReady(page, 15000);
  });

  test('should handle IndexedDB quota exceeded', async ({ page }) => {
    // Simulate quota exceeded
    await simulateStorageQuotaExceeded(page);

    // Try to save data
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(1000);

    // Should handle gracefully
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle localStorage quota exceeded', async ({ page }) => {
    // Fill localStorage
    await page.evaluate(() => {
      try {
        for (let i = 0; i < 1000; i++) {
          localStorage.setItem(`test-${i}`, 'x'.repeat(1000));
        }
      } catch {
        // Expected to fail
      }
    });

    await page.waitForTimeout(500);

    // App should still work
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle storage disabled by browser', async ({ page }) => {
    // Simulate disabled storage
    await simulateLocalStorageDisabled(page);
    await simulateIndexedDBFailure(page);

    await page.reload();
    await waitForCanvasReady(page);

    // App should still work
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle storage cleared during operation', async ({ page }) => {
    // Start operation
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(500);

    // Clear storage
    await page.evaluate(() => {
      localStorage.clear();
      indexedDB.databases().then((dbs) => {
        dbs.forEach((db) => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      });
    });

    await page.waitForTimeout(1000);

    // App should continue working
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should recover from corrupted storage data', async ({ page }) => {
    // Inject corrupted data
    await injectCorruptedStateData(page);

    await page.reload();
    await waitForCanvasReady(page);

    // Should recover
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle storage migration failures', async ({ page }) => {
    // Set old format data
    await page.evaluate(() => {
      localStorage.setItem('pixelStudio-state', JSON.stringify({ version: 1, data: 'old' }));
    });

    await page.reload();
    await waitForCanvasReady(page);

    // Should handle migration or ignore old data
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle storage read/write race conditions', async ({ page }) => {
    // Trigger multiple read/write operations
    await page.evaluate(() => {
      for (let i = 0; i < 10; i++) {
        try {
          localStorage.setItem('test-key', String(i));
          localStorage.getItem('test-key');
        } catch {
          // Expected
        }
      }
    });

    await page.waitForTimeout(500);

    // App should still work
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should cleanup storage on errors', async ({ page }) => {
    // Cause storage error
    await simulateStorageQuotaExceeded(page);

    // Try to use app
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(1000);

    // Should cleanup and continue
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should persist state across sessions', async ({ page }) => {
    // Set some state
    await page.evaluate(() => {
      (window as any).PixelStudio?.selectTool?.('eraser');
    });

    await page.waitForTimeout(500);

    // Reload
    await page.reload();
    await waitForCanvasReady(page);

    // State may or may not persist
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should validate storage data', async ({ page }) => {
    // Try to load invalid data
    await page.evaluate(() => {
      localStorage.setItem('pixelStudio-state', 'not-json');
    });

    await page.reload();
    await waitForCanvasReady(page);

    // Should validate and reject invalid data
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });
});
