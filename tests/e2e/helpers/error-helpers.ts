/**
 * Error Handling Test Helpers
 * Utilities for error injection, error detection, and error recovery testing
 * Enhanced with MCP debugging capabilities
 */

import { Page, TestInfo } from '@playwright/test';
import { captureDebugInfo, analyzeTestFailure, defaultMCPConfig } from './mcp-playwright-helpers';

/**
 * Inject error into StateManager
 */
export async function injectStateManagerError(page: Page): Promise<void> {
  await page.evaluate(() => {
    try {
      // Try to access StateManager before initialization
      (window as any).PixelStudio?._forceStateManagerError?.();
    } catch {
      // Expected
    }
  });
}

/**
 * Inject canvas context error
 */
export async function injectCanvasContextError(page: Page): Promise<void> {
  await page.evaluate(() => {
    try {
      // Simulate canvas context loss
      const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
      if (canvas) {
        // Force context loss by setting invalid dimensions
        canvas.width = -1;
        canvas.height = -1;
      }
    } catch {
      // Expected
    }
  });
}

/**
 * Inject layer error
 */
export async function injectLayerError(page: Page, layerId?: string): Promise<void> {
  await page.evaluate(
    ({ layerId }) => {
      try {
        // Try to access invalid layer
        if (layerId) {
          (window as any).PixelStudio?.getLayers?.()?.get?.(layerId);
        } else {
          // Try to delete non-existent layer
          (window as any).PixelStudio?.getLayers?.()?.delete?.('invalid-layer-id');
        }
      } catch {
        // Expected
      }
    },
    { layerId }
  );
}

/**
 * Inject history error
 */
export async function injectHistoryError(page: Page): Promise<void> {
  await page.evaluate(() => {
    try {
      // Try to undo when no history
      (window as any).PixelStudio?._forceHistoryError?.();
    } catch {
      // Expected
    }
  });
}

/**
 * Check for console errors
 */
export async function collectConsoleErrors(page: Page, duration: number = 5000): Promise<string[]> {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.waitForTimeout(duration);

  return errors;
}

/**
 * Check for unhandled promise rejections
 */
export async function collectUnhandledRejections(
  page: Page,
  duration: number = 5000
): Promise<string[]> {
  const rejections: string[] = [];

  page.on('pageerror', (error) => {
    rejections.push(error.message);
  });

  await page.waitForTimeout(duration);

  return rejections;
}

/**
 * Simulate storage quota exceeded
 */
export async function simulateStorageQuotaExceeded(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Mock IndexedDB to throw quota exceeded error
    const originalOpen = indexedDB.open;
    indexedDB.open = function () {
      const request = originalOpen.apply(this, arguments as any);
      setTimeout(() => {
        const error = new DOMException('QuotaExceededError', 'QuotaExceededError');
        (request as any).onerror?.(new Event('error') as any);
        (request as any).error = error;
      }, 0);
      return request;
    };
  });
}

/**
 * Simulate IndexedDB failure
 */
export async function simulateIndexedDBFailure(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Mock IndexedDB to fail
    const originalOpen = indexedDB.open;
    indexedDB.open = function () {
      const request = originalOpen.apply(this, arguments as any);
      setTimeout(() => {
        const error = new DOMException('UnknownError', 'UnknownError');
        (request as any).onerror?.(new Event('error') as any);
        (request as any).error = error;
      }, 0);
      return request;
    };
  });
}

/**
 * Simulate localStorage disabled
 */
export async function simulateLocalStorageDisabled(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => {
          throw new DOMException('QuotaExceededError', 'QuotaExceededError');
        },
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null,
      },
      writable: false,
    });
  });
}

/**
 * Check error boundary rendered
 */
export async function checkErrorBoundaryRendered(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return (
      document.querySelector('.app-error') !== null ||
      document.querySelector('.error-display') !== null ||
      document.querySelector('.error-boundary') !== null ||
      document.querySelector('.canvas-error-boundary') !== null ||
      document.querySelector('.loading-overlay') !== null
    );
  });
}

/**
 * Check error recovery possible
 */
export async function checkErrorRecoveryPossible(page: Page): Promise<boolean> {
  try {
    // Use Playwright locators instead of invalid CSS selectors
    const retryLocators = [
      page.locator('button').filter({ hasText: 'Retry' }),
      page.locator('button').filter({ hasText: 'Try Again' }),
      page.locator('[onclick*="retry"]'),
    ];

    for (const locator of retryLocators) {
      if ((await locator.count()) > 0) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Trigger error recovery
 */
export async function triggerErrorRecovery(page: Page): Promise<void> {
  const retryButton = page
    .locator('button:has-text("Retry"), button:has-text("Try Again")')
    .first();
  if ((await retryButton.count()) > 0) {
    await retryButton.click();
    await page.waitForTimeout(1000);
  }
}

/**
 * Inject corrupted state data
 */
export async function injectCorruptedStateData(page: Page): Promise<void> {
  await page.evaluate(() => {
    try {
      // Try to set corrupted state
      localStorage.setItem('pixelStudio-state', 'invalid-json-data');
    } catch {
      // Expected
    }
  });
}

/**
 * Monitor error events
 */
export async function monitorErrorEvents(
  page: Page,
  duration: number = 5000
): Promise<{ errors: string[]; rejections: string[] }> {
  const errors: string[] = [];
  const rejections: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    rejections.push(error.message);
  });

  await page.waitForTimeout(duration);

  return { errors, rejections };
}

/**
 * Capture and analyze errors with MCP debugging
 */
export async function captureAndAnalyzeErrors(
  page: Page,
  testInfo: TestInfo,
  operation: () => Promise<void>
): Promise<{
  errors: string[];
  analysis?: ReturnType<typeof analyzeTestFailure> extends Promise<infer T> ? T : never;
}> {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  try {
    await operation();
  } catch (error) {
    // Capture debug info if MCP is enabled
    if (defaultMCPConfig.enabled && defaultMCPConfig.debugMode) {
      const debugInfo = await captureDebugInfo(page, testInfo, {
        captureScreenshots: true,
        captureVideo: true,
        analyzeNetwork: true,
        profilePerformance: false,
        captureTrace: true,
        consoleLogs: true,
      });

      const analysis = await analyzeTestFailure(testInfo.title, error as Error, debugInfo);

      return { errors, analysis };
    }
    throw error;
  }

  return { errors };
}
