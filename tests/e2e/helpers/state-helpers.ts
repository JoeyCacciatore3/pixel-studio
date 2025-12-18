/**
 * State Management Test Helpers
 * Utilities for testing state management, state updates, and state validation
 */

import { Page } from '@playwright/test';
import { APP_URL } from './test-constants';

/**
 * Wait for StateManager to be initialized
 */
export async function waitForStateManagerReady(page: Page, maxWait: number = 10000): Promise<void> {
  const startTime = Date.now();
  const maxIterations = Math.ceil(maxWait / 100) + 10; // Safety limit
  let iterations = 0;

  while (Date.now() - startTime < maxWait && iterations < maxIterations) {
    try {
      const isReady = await page.evaluate(() => {
        try {
          // Access StateManager through window or global scope
          // This assumes StateManager is exposed for testing
          return (window as any).PixelStudio?.getState() !== null;
        } catch {
          return false;
        }
      }).catch(() => false);

      if (isReady) {
        return;
      }

      iterations++;
      await page.waitForTimeout(100).catch(() => {
        // Page might be closed, break loop
        iterations = maxIterations;
      });
    } catch (error: any) {
      // If evaluation fails and page is closed, break to prevent hanging
      if (error.message?.includes('closed')) {
        break;
      }
      console.warn('StateManager check failed:', error);
      // Continue trying unless it's a page closed error
      if (error.message?.includes('closed')) {
        break;
      }
    }
  }

  throw new Error(`StateManager not ready after ${maxWait}ms`);
}

/**
 * Get current application state
 */
export async function getAppState(page: Page): Promise<any> {
  return await page.evaluate(() => {
    try {
      return (window as any).PixelStudio?.getState();
    } catch {
      return null;
    }
  });
}

/**
 * Verify state is valid
 */
export async function validateState(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    try {
      const state = (window as any).PixelStudio?.getState();
      if (!state) return false;

      // Basic validation
      return (
        typeof state.currentTool === 'string' &&
        typeof state.currentColor === 'string' &&
        typeof state.zoom === 'number' &&
        Array.isArray(state.layers)
      );
    } catch {
      return false;
    }
  });
}

/**
 * Trigger rapid state updates
 */
export async function triggerRapidStateUpdates(
  page: Page,
  count: number = 100,
  delay: number = 10
): Promise<void> {
  const maxTime = Math.max(count * delay * 2, 10000); // Safety: 2x expected time or 10s minimum

  await Promise.race([
    page.evaluate(
      ({ count, delay }) => {
        return new Promise<void>((resolve) => {
          let updates = 0;
          const interval = setInterval(() => {
            try {
              // Trigger state update by changing tool
              const tools = ['pencil', 'eraser', 'bucket', 'picker'];
              const tool = tools[updates % tools.length];
              (window as any).PixelStudio?.selectTool?.(tool);
              updates++;

              if (updates >= count) {
                clearInterval(interval);
                resolve();
              }
            } catch {
              clearInterval(interval);
              resolve();
            }
          }, delay);
        });
      },
      { count, delay }
    ),
    new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`triggerRapidStateUpdates timed out after ${maxTime}ms`));
      }, maxTime);
    }),
  ]);
}

/**
 * Check if state persisted across reload
 */
export async function checkStatePersistence(page: Page): Promise<boolean> {
  const stateBefore = await getAppState(page);
  if (!stateBefore) return false;

  await page.reload();
  await waitForStateManagerReady(page);

  const stateAfter = await getAppState(page);
  if (!stateAfter) return false;

  // Compare key properties
  return (
    stateBefore.currentTool === stateAfter.currentTool &&
    stateBefore.currentColor === stateAfter.currentColor &&
    stateBefore.zoom === stateAfter.zoom
  );
}

/**
 * Inject invalid state
 */
export async function injectInvalidState(page: Page, invalidState: any): Promise<void> {
  await page.evaluate((state) => {
    try {
      // Attempt to set invalid state
      (window as any).PixelStudio?._setState?.(state);
    } catch {
      // Expected to fail
    }
  }, invalidState);
}

/**
 * Monitor state changes
 */
export async function monitorStateChanges(
  page: Page,
  duration: number = 5000
): Promise<number> {
  return await page.evaluate((duration) => {
    return new Promise<number>((resolve) => {
      let changeCount = 0;
      const startTime = Date.now();

      // Listen for state change events
      const listener = () => {
        changeCount++;
      };

      try {
        (window as any).PixelStudio?.on?.('state:update', listener);
      } catch {
        // Event emitter might not be available
      }

      setTimeout(() => {
        try {
          (window as any).PixelStudio?.off?.('state:update', listener);
        } catch {
          // Ignore
        }
        resolve(changeCount);
      }, duration);
    });
  }, duration);
}

/**
 * Get state consistency check
 */
export async function checkStateConsistency(page: Page): Promise<{
  consistent: boolean;
  issues: string[];
}> {
  return await page.evaluate(() => {
    const issues: string[] = [];
    try {
      const state = (window as any).PixelStudio?.getState();
      if (!state) {
        issues.push('State is null');
        return { consistent: false, issues };
      }

      // Check layer consistency
      if (state.layers && state.layers.length > 0) {
        if (state.activeLayerId) {
          const activeLayer = state.layers.find((l: any) => l.id === state.activeLayerId);
          if (!activeLayer) {
            issues.push('Active layer ID does not match any layer');
          }
        }
      }

      // Check selection consistency
      if (state.selection) {
        if (
          typeof state.selection.x !== 'number' ||
          typeof state.selection.y !== 'number' ||
          typeof state.selection.width !== 'number' ||
          typeof state.selection.height !== 'number'
        ) {
          issues.push('Selection has invalid properties');
        }
      }

      return {
        consistent: issues.length === 0,
        issues,
      };
    } catch (error) {
      issues.push(`Error checking state: ${error}`);
      return { consistent: false, issues };
    }
  });
}
