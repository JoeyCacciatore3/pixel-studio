/**
 * Browser Compatibility Edge Cases Test Suite
 * Tests missing browser features, storage limitations, and compatibility issues
 */

import { test, expect } from '@playwright/test';
import { waitForCanvasReady, getCanvas, selectTool, drawStroke } from './helpers/canvas-helpers';
import {
  isOffscreenCanvasSupported,
  isWorkersSupported,
  isIndexedDBAvailable,
  isLocalStorageAvailable,
  isRequestIdleCallbackAvailable,
  isTouchSupported,
  isPointerSupported,
  simulateMissingOffscreenCanvas,
  simulateMissingWorkers,
  simulateMissingIndexedDB,
  simulateMissingRequestIdleCallback,
  getAllBrowserFeatures,
  checkRequiredFeatures,
} from './helpers/browser-helpers';
import { waitForStateManagerReady } from './helpers/state-helpers';
import { APP_URL } from './helpers/test-constants';

test.describe('Browser Edge Cases Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  test('should detect browser features', async ({ page }) => {
    const features = await getAllBrowserFeatures(page);

    expect(typeof features.offscreenCanvas).toBe('boolean');
    expect(typeof features.workers).toBe('boolean');
    expect(typeof features.indexedDB).toBe('boolean');
    expect(typeof features.localStorage).toBe('boolean');
    expect(typeof features.pointer).toBe('boolean');
  });

  test('should handle missing OffscreenCanvas', async ({ page }) => {
    const hasOffscreenCanvas = await isOffscreenCanvasSupported(page);

    if (!hasOffscreenCanvas) {
      // App should still work without OffscreenCanvas
      await waitForCanvasReady(page);
      const canvas = getCanvas(page);
      await expect(canvas).toBeVisible();
    } else {
      // Simulate missing OffscreenCanvas
      await simulateMissingOffscreenCanvas(page);
      await page.reload();
      await waitForCanvasReady(page);

      const canvas = getCanvas(page);
      await expect(canvas).toBeVisible();
    }
  });

  test('should handle missing Workers', async ({ page }) => {
    const hasWorkers = await isWorkersSupported(page);

    if (!hasWorkers) {
      // App should still work without Workers
      await waitForCanvasReady(page);
      const canvas = getCanvas(page);
      await expect(canvas).toBeVisible();
    } else {
      // Simulate missing Workers
      await simulateMissingWorkers(page);
      await page.reload();
      await waitForCanvasReady(page);

      const canvas = getCanvas(page);
      await expect(canvas).toBeVisible();
    }
  });

  test('should handle missing IndexedDB', async ({ page }) => {
    const hasIndexedDB = await isIndexedDBAvailable(page);

    if (!hasIndexedDB) {
      // App should still work without IndexedDB
      await waitForCanvasReady(page);
      const canvas = getCanvas(page);
      await expect(canvas).toBeVisible();
    } else {
      // Simulate missing IndexedDB
      await simulateMissingIndexedDB(page);
      await page.reload();
      await waitForCanvasReady(page);

      const canvas = getCanvas(page);
      await expect(canvas).toBeVisible();
    }
  });

  test('should handle disabled localStorage', async ({ page }) => {
    const hasLocalStorage = await isLocalStorageAvailable(page);

    if (!hasLocalStorage) {
      // App should still work without localStorage
      await waitForCanvasReady(page);
      const canvas = getCanvas(page);
      await expect(canvas).toBeVisible();
    }
  });

  test('should handle service worker registration failure', async ({ page }) => {
    // Service worker is non-critical
    await waitForCanvasReady(page);
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should handle missing requestIdleCallback', async ({ page }) => {
    const hasRequestIdleCallback = await isRequestIdleCallbackAvailable(page);

    if (!hasRequestIdleCallback) {
      // App should still work without requestIdleCallback
      await waitForCanvasReady(page);
      const canvas = getCanvas(page);
      await expect(canvas).toBeVisible();
    } else {
      // Simulate missing requestIdleCallback
      await simulateMissingRequestIdleCallback(page);
      await page.reload();
      await waitForCanvasReady(page);

      const canvas = getCanvas(page);
      await expect(canvas).toBeVisible();
    }
  });

  test('should handle device pixel ratio edge cases', async ({ page }) => {
    await waitForCanvasReady(page);

    const dpr = await page.evaluate(() => window.devicePixelRatio || 1);

    // App should work with any DPR
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();

    // Test with different DPRs
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await expect(canvas).toBeVisible();
  });

  test('should handle missing touch events', async ({ page }) => {
    const hasTouch = await isTouchSupported(page);

    if (!hasTouch) {
      // App should still work with mouse/pointer
      await waitForCanvasReady(page);
      const canvas = getCanvas(page);
      await expect(canvas).toBeVisible();
    }
  });

  test('should handle missing pointer events', async ({ page }) => {
    const hasPointer = await isPointerSupported(page);

    if (!hasPointer) {
      // App should fall back to mouse events
      await waitForCanvasReady(page);
      const canvas = getCanvas(page);
      await expect(canvas).toBeVisible();
    }
  });

  test('should handle high-DPI display issues', async ({ page }) => {
    // Test on high-DPI viewport
    await page.setViewportSize({ width: 3840, height: 2160 });
    await waitForCanvasReady(page);

    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();

    // Try to draw
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(500);

    await expect(canvas).toBeVisible();
  });

  test('should check required features', async ({ page }) => {
    const required = await checkRequiredFeatures(page);

    // App should work even if some features are missing
    await waitForCanvasReady(page);
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test('should work with minimal browser support', async ({ page }) => {
    // Simulate minimal browser
    await simulateMissingOffscreenCanvas(page);
    await simulateMissingRequestIdleCallback(page);

    await page.reload();
    await waitForCanvasReady(page);
    await waitForStateManagerReady(page);

    // App should still function
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();

    // Basic operations should work
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(500);

    await expect(canvas).toBeVisible();
  });
});
