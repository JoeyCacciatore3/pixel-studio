/**
 * Fail-Safe Mechanisms for Tests
 * Automatic retry, timeout handling, error recovery verification, state consistency checks, and memory leak detection
 */

import { Page } from '@playwright/test';

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

/**
 * Execute with timeout
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 10000
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Verify error recovery
 */
export async function verifyErrorRecovery(
  page: Page,
  errorOperation: () => Promise<void>,
  recoveryCheck: () => Promise<boolean>
): Promise<boolean> {
  try {
    await errorOperation();
  } catch {
    // Expected error
  }

  await page.waitForTimeout(1000);
  return await recoveryCheck();
}

/**
 * Check state consistency with retry
 */
export async function checkStateConsistencyWithRetry(
  page: Page,
  maxRetries: number = 3
): Promise<{ consistent: boolean; issues: string[] }> {
  return await retryOperation(
    async () => {
      return await page.evaluate(() => {
        try {
          const state = (window as any).PixelStudio?.getState?.();
          if (!state) {
            return { consistent: false, issues: ['State is null'] };
          }

          const issues: string[] = [];

          // Check layer consistency
          if (state.layers && state.layers.length > 0) {
            if (state.activeLayerId) {
              const activeLayer = state.layers.find((l: any) => l.id === state.activeLayerId);
              if (!activeLayer) {
                issues.push('Active layer ID does not match any layer');
              }
            }
          }

          return {
            consistent: issues.length === 0,
            issues,
          };
        } catch (error) {
          return {
            consistent: false,
            issues: [`Error checking state: ${error}`],
          };
        }
      });
    },
    maxRetries,
    500
  );
}

/**
 * Detect memory leaks with monitoring
 */
export async function detectMemoryLeakWithMonitoring(
  page: Page,
  operation: () => Promise<void>,
  iterations: number = 10,
  thresholdMB: number = 10
): Promise<{ hasLeak: boolean; memoryGrowth: number; details: string }> {
  const initialMemory = await page.evaluate(() => {
    return (performance as any).memory?.usedJSHeapSize || 0;
  });

  // Run operation multiple times
  for (let i = 0; i < iterations; i++) {
    await operation();
    await page.waitForTimeout(100);
  }

  // Force garbage collection if available
  await page.evaluate(() => {
    if ((window as any).gc) {
      (window as any).gc();
    }
  });

  await page.waitForTimeout(1000);

  const finalMemory = await page.evaluate(() => {
    return (performance as any).memory?.usedJSHeapSize || 0;
  });

  const memoryGrowth = finalMemory - initialMemory;
  const memoryGrowthMB = memoryGrowth / (1024 * 1024);
  const hasLeak = memoryGrowthMB > thresholdMB;

  return {
    hasLeak,
    memoryGrowth: memoryGrowthMB,
    details: `Memory grew by ${memoryGrowthMB.toFixed(2)}MB over ${iterations} iterations`,
  };
}

/**
 * Monitor performance with regression detection
 */
export async function monitorPerformanceWithRegression(
  page: Page,
  operation: () => Promise<void>,
  baselineDuration: number,
  threshold: number = 0.2
): Promise<{ regressed: boolean; currentDuration: number; regression: number }> {
  const startTime = Date.now();
  await operation();
  const currentDuration = Date.now() - startTime;

  const regression = (currentDuration - baselineDuration) / baselineDuration;
  const regressed = regression > threshold;

  return {
    regressed,
    currentDuration,
    regression,
  };
}

/**
 * Safe operation wrapper with error handling
 */
export async function safeOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  logError: boolean = true
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (logError) {
      console.error('Operation failed:', error);
    }
    return fallback;
  }
}

/**
 * Wait for stable state
 */
export async function waitForStableState(
  page: Page,
  maxWait: number = 5000,
  checkInterval: number = 100
): Promise<void> {
  const startTime = Date.now();
  let lastState: string | null = null;
  let stableCount = 0;
  const requiredStableChecks = 3;
  const maxIterations = Math.ceil(maxWait / checkInterval) + 10; // Safety limit
  let iterations = 0;

  while (Date.now() - startTime < maxWait && iterations < maxIterations) {
    try {
      const currentState = await page.evaluate(() => {
        try {
          const state = (window as any).PixelStudio?.getState?.();
          return JSON.stringify(state);
        } catch {
          return null;
        }
      });

      if (currentState === lastState) {
        stableCount++;
        if (stableCount >= requiredStableChecks) {
          return;
        }
      } else {
        stableCount = 0;
        lastState = currentState;
      }

      iterations++;
      await page.waitForTimeout(checkInterval);
    } catch (error) {
      // If evaluation fails, break to prevent hanging
      console.warn('State stability check failed:', error);
      break;
    }
  }
}

/**
 * Comprehensive health check
 */
export async function comprehensiveHealthCheck(page: Page): Promise<{
  healthy: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  // Check canvas
  const canvasHealthy = await page.evaluate(() => {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    return canvas !== null && canvas.width > 0 && canvas.height > 0;
  });
  if (!canvasHealthy) {
    issues.push('Canvas not healthy');
  }

  // Check state
  const stateHealthy = await page.evaluate(() => {
    try {
      return (window as any).PixelStudio?.getState?.() !== null;
    } catch {
      return false;
    }
  });
  if (!stateHealthy) {
    issues.push('State not healthy');
  }

  // Check for errors
  const hasErrors = await page.evaluate(() => {
    return document.querySelector('.error-boundary, .app-error') !== null;
  });
  if (hasErrors) {
    issues.push('Error boundary rendered');
  }

  return {
    healthy: issues.length === 0,
    issues,
  };
}
