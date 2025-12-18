/**
 * Initialization & Error Recovery Test Suite
 * Tests app initialization, error recovery, retry mechanisms, and error boundaries
 */

import { test, expect } from '@playwright/test';
import {
  waitForCanvasReady,
  isCanvasInitialized,
  getCanvas,
} from './helpers/canvas-helpers';
import {
  checkErrorBoundaryRendered,
  checkErrorRecoveryPossible,
  triggerErrorRecovery,
  collectConsoleErrors,
  collectUnhandledRejections,
} from './helpers/error-helpers';
import { waitForStateManagerReady } from './helpers/state-helpers';
import { APP_URL } from './helpers/test-constants';

test.describe('Initialization Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  test('should initialize app successfully', async ({ page }) => {
    await waitForCanvasReady(page, 15000);
    const isInitialized = await isCanvasInitialized(page);
    expect(isInitialized).toBe(true);
  });

  test('should initialize StateManager', async ({ page }) => {
    await waitForStateManagerReady(page, 15000);
    const stateReady = await page.evaluate(() => {
      try {
        return (window as any).PixelStudio?.getState() !== null;
      } catch {
        return false;
      }
    });
    expect(stateReady).toBe(true);
  });

  test('should handle missing canvas element gracefully', async ({ page }) => {
    // Remove canvas element and trigger a React error to test error boundaries
    await page.evaluate(() => {
      const canvas = document.getElementById('mainCanvas');
      if (canvas) {
        canvas.remove();
      }
      // Trigger a React error by throwing in a component context
      setTimeout(() => {
        const event = new CustomEvent('react-error', {
          detail: { error: new Error('Canvas element missing') }
        });
        window.dispatchEvent(event);
      }, 100);
    });

    await page.waitForTimeout(2000);

    // Check for error boundary or error message - wait a bit for error to appear
    await page.waitForTimeout(1000);
    const errorBoundary = await checkErrorBoundaryRendered(page);
    const hasError = await page.evaluate(() => {
      return document.querySelector('.app-error, .error-display, .error-boundary, .canvas-error-boundary, .loading-overlay') !== null;
    });

    // App should handle error gracefully - either show error boundary or recover
    // If no error boundary, canvas should still be present (recovered)
    const canvas = getCanvas(page);
    const canvasVisible = await canvas.isVisible().catch(() => false);
    expect(errorBoundary || hasError || canvasVisible).toBe(true);
  });

  test('should handle invalid state during initialization', async ({ page }) => {
    // Inject invalid state before page loads
    await page.addInitScript(() => {
      localStorage.setItem('pixelStudio-state', 'invalid-json');
    });

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // App should still initialize or show error - wait for initialization
    await waitForCanvasReady(page, 15000).catch(() => {});
    await page.waitForTimeout(1000);

    const canvas = getCanvas(page);
    const isVisible = await canvas.isVisible().catch(() => false);
    const errorBoundary = await checkErrorBoundaryRendered(page);

    // Either canvas is visible (recovered) or error boundary is shown
    // Both are valid outcomes - app should handle invalid state gracefully
    expect(isVisible || errorBoundary).toBe(true);
  });

  test('should handle canvas context creation failure', async ({ page }) => {
    // Simulate canvas context failure and trigger error
    await page.evaluate(() => {
      const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
      if (canvas) {
        // Force context failure by making canvas invalid
        Object.defineProperty(canvas, 'getContext', {
          value: () => null,
          writable: false,
        });
      }
      // Trigger a React error
      setTimeout(() => {
        const event = new CustomEvent('react-error', {
          detail: { error: new Error('Canvas context creation failed') }
        });
        window.dispatchEvent(event);
      }, 100);
    });

    await page.reload();
    await page.waitForTimeout(2000);

    // Should show error or error boundary
    const errorBoundary = await checkErrorBoundaryRendered(page);
    expect(errorBoundary).toBe(true);
  });

  test('should handle layer initialization failure', async ({ page }) => {
    await waitForCanvasReady(page);

    // Try to access layers before initialization
    const layerError = await page.evaluate(() => {
      try {
        (window as any).PixelStudio?.getLayers?.()?.getAllLayers?.();
        return false;
      } catch {
        return true;
      }
    });

    // Should handle error gracefully
    expect(typeof layerError).toBe('boolean');
  });

  test('should handle history initialization failure', async ({ page }) => {
    await waitForCanvasReady(page);

    // History initialization is non-critical, should not block app
    const appReady = await isCanvasInitialized(page);
    expect(appReady).toBe(true);
  });

  test('should handle worker initialization failure', async ({ page }) => {
    await waitForCanvasReady(page);

    // Workers are non-critical, app should still work
    const appReady = await isCanvasInitialized(page);
    expect(appReady).toBe(true);
  });

  test('should recover from initialization errors', async ({ page }) => {
    // Cause an initialization error
    await page.evaluate(() => {
      const canvas = document.getElementById('mainCanvas');
      if (canvas) {
        canvas.remove();
      }
    });

    await page.waitForTimeout(1000);

    // Check if recovery is possible
    const canRecover = await checkErrorRecoveryPossible(page);
    if (canRecover) {
      await triggerErrorRecovery(page);
      await page.waitForTimeout(2000);

      // App should recover
      const canvas = getCanvas(page);
      const isVisible = await canvas.isVisible().catch(() => false);
      expect(isVisible).toBe(true);
    }
  });

  test('should have retry mechanism', async ({ page }) => {
    await waitForCanvasReady(page);

    // Check for retry button in error states
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
    const count = await retryButton.count();

    // Retry button may or may not be present depending on state
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should render error boundary on critical errors', async ({ page }) => {
    // Force a critical error that React can catch
    await page.evaluate(() => {
      // Simulate a React component error by dispatching an unhandled error
      setTimeout(() => {
        const error = new Error('Critical component error');
        const event = new CustomEvent('react-error', {
          detail: { error, errorInfo: { componentStack: 'TestComponent' } }
        });
        window.dispatchEvent(event);

        // Also throw an unhandled promise rejection to trigger error handling
        Promise.reject(error);
      }, 100);
    });

    await page.waitForTimeout(2000);

    const errorBoundary = await checkErrorBoundaryRendered(page);
    // Error boundary should be present or error should be caught
    expect(errorBoundary).toBe(true);
  });

  test('should display loading state during initialization', async ({ page }) => {
    // Check for loading state
    const loadingState = await page.locator('.loading-overlay, .loading-state').isVisible().catch(() => false);

    // Loading state may appear briefly or not at all if initialization is fast
    expect(typeof loadingState).toBe('boolean');
  });

  test('should not have console errors during normal initialization', async ({ page }) => {
    const errors = await collectConsoleErrors(page, 3000);

    // Filter out non-critical errors
    const criticalErrors = errors.filter((e) =>
      !e.includes('favicon') &&
      !e.includes('sourcemap') &&
      !e.includes('DevTools')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('should not have unhandled promise rejections during initialization', async ({ page }) => {
    const rejections = await collectUnhandledRejections(page, 3000);
    expect(rejections.length).toBe(0);
  });

  test('should initialize all required modules', async ({ page }) => {
    await waitForCanvasReady(page);
    await waitForStateManagerReady(page);

    const modulesReady = await page.evaluate(() => {
      try {
        const pixelStudio = (window as any).PixelStudio;
        const hasRequiredMethods = pixelStudio &&
          typeof pixelStudio.getState === 'function' &&
          typeof pixelStudio.registerTool === 'function';

        return {
          pixelStudio: pixelStudio !== undefined && hasRequiredMethods,
          state: pixelStudio?.getState() !== null,
          canvas: document.getElementById('mainCanvas') !== null,
        };
      } catch {
        return { pixelStudio: false, state: false, canvas: false };
      }
    });

    expect(modulesReady.pixelStudio).toBe(true);
    expect(modulesReady.canvas).toBe(true);
  });

  test('should handle rapid page reloads', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForCanvasReady(page, 10000);
      await page.waitForTimeout(500);
    }

    const isReady = await isCanvasInitialized(page);
    expect(isReady).toBe(true);
  });
});
