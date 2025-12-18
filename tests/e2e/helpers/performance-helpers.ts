/**
 * Performance and Memory Test Helpers
 * Utilities for performance monitoring, memory leak detection, and performance regression testing
 * Enhanced with MCP integration for advanced monitoring
 */

import { Page } from '@playwright/test';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * Measure operation performance
 */
export async function measureOperationPerformance(
  page: Page,
  operation: () => Promise<void>
): Promise<{ duration: number; memoryBefore: number; memoryAfter: number }> {
  const memoryBefore = await getMemoryUsage(page);
  const startTime = Date.now();

  await operation();

  const duration = Date.now() - startTime;
  const memoryAfter = await getMemoryUsage(page);

  return { duration, memoryBefore, memoryAfter };
}

/**
 * Get memory usage (if available)
 */
export async function getMemoryUsage(page: Page): Promise<number> {
  return await page.evaluate(() => {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  });
}

/**
 * Measure page load time
 * Based on Canva performance measurement patterns
 * If already on the URL, reloads the page to get accurate load time
 */
export async function measureLoadTime(page: Page, url: string): Promise<number> {
  const startTime = Date.now();

  try {
    const currentUrl = page.url();
    if (
      currentUrl === url ||
      currentUrl.includes(url.replace('http://', '').replace('https://', ''))
    ) {
      // Already on the page, reload to measure load time
      await page.reload({ waitUntil: 'load', timeout: 30000 });
    } else {
      // Navigate to the page
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    }
    const loadTime = Date.now() - startTime;
    return loadTime;
  } catch (error) {
    // If navigation fails, return the time elapsed
    return Date.now() - startTime;
  }
}

/**
 * Measure First Contentful Paint (FCP)
 * Based on Web Performance API and Canva patterns
 * Checks for existing FCP entry first, then observes for new one
 */
export async function measureFCP(page: Page): Promise<number | null> {
  return await page.evaluate(() => {
    return new Promise<number | null>((resolve) => {
      try {
        // Check if FCP has already occurred
        const paintEntries = performance.getEntriesByType('paint') as PerformancePaintTiming[];
        const existingFCP = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
        if (existingFCP) {
          resolve(existingFCP.startTime);
          return;
        }

        // FCP hasn't occurred yet, observe for it
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'paint') {
              const paintEntry = entry as PerformancePaintTiming;
              if (paintEntry.name === 'first-contentful-paint') {
                observer.disconnect();
                resolve(paintEntry.startTime);
                return;
              }
            }
          }
        });

        try {
          observer.observe({ entryTypes: ['paint'] });
        } catch {
          // Paint entries not supported, return null
          resolve(null);
          return;
        }

        // Timeout after 10 seconds
        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, 10000);
      } catch (error) {
        resolve(null);
      }
    });
  });
}

/**
 * Measure memory usage
 * Returns memory in bytes or null if not available
 */
export async function measureMemoryUsage(page: Page): Promise<number | null> {
  return await page.evaluate(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize || null;
    }
    return null;
  });
}

/**
 * Detect memory leaks
 */
export async function detectMemoryLeak(
  page: Page,
  operation: () => Promise<void>,
  iterations: number = 10
): Promise<{ hasLeak: boolean; memoryGrowth: number }> {
  const initialMemory = await getMemoryUsage(page);

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

  const finalMemory = await getMemoryUsage(page);
  const memoryGrowth = finalMemory - initialMemory;

  // Consider it a leak if memory grew by more than 10MB
  const hasLeak = memoryGrowth > 10 * 1024 * 1024;

  return { hasLeak, memoryGrowth };
}

/**
 * Measure canvas operation performance
 */
export async function measureCanvasOperationPerformance(
  page: Page,
  operation: () => Promise<void>
): Promise<{
  duration: number;
  fps: number;
  frameCount: number;
}> {
  const startTime = Date.now();

  // Monitor frame rate
  const frameMonitor = page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let frames = 0;
      const start = performance.now();

      function countFrame() {
        frames++;
        if (performance.now() - start < 1000) {
          requestAnimationFrame(countFrame);
        } else {
          resolve(frames);
        }
      }

      requestAnimationFrame(countFrame);
    });
  });

  await operation();

  const duration = Date.now() - startTime;
  const frameCount = await frameMonitor;
  const fps = frameCount / (duration / 1000);

  return { duration, fps, frameCount };
}

/**
 * Measure layer rendering performance
 */
export async function measureLayerRenderingPerformance(
  page: Page,
  layerCount: number
): Promise<{ duration: number; layersPerSecond: number }> {
  const startTime = Date.now();

  await page.evaluate(
    async ({ layerCount }) => {
      // Create multiple layers and measure render time
      for (let i = 0; i < layerCount; i++) {
        // Trigger layer creation
        (window as any).PixelStudio?.getLayers?.()?.create?.(`Layer ${i}`);
      }
      // Wait for rendering
      await new Promise((resolve) => setTimeout(resolve, 100));
    },
    { layerCount }
  );

  const duration = Date.now() - startTime;
  const layersPerSecond = (layerCount / duration) * 1000;

  return { duration, layersPerSecond };
}

/**
 * Measure history operation performance
 */
export async function measureHistoryOperationPerformance(
  page: Page,
  operation: 'undo' | 'redo' | 'save'
): Promise<{ duration: number }> {
  const startTime = Date.now();

  await page.evaluate((op) => {
    if (op === 'undo') {
      document.getElementById('undoBtn')?.click();
    } else if (op === 'redo') {
      document.getElementById('redoBtn')?.click();
    } else {
      // Trigger save
      (window as any).PixelStudio?._triggerHistorySave?.();
    }
  }, operation);

  await page.waitForTimeout(500);

  const duration = Date.now() - startTime;
  return { duration };
}

/**
 * Monitor performance metrics
 */
export async function monitorPerformanceMetrics(
  page: Page,
  duration: number = 5000
): Promise<{
  fps: number;
  memoryUsage: number;
  cpuUsage: number;
}> {
  // Wait for page to be stable before evaluating
  await page.waitForLoadState('domcontentloaded');

  try {
    return await page.evaluate((duration) => {
      return new Promise<{ fps: number; memoryUsage: number; cpuUsage: number }>((resolve) => {
        let frames = 0;
        const start = performance.now();
        const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

        function countFrame() {
          frames++;
          const elapsed = performance.now() - start;
          if (elapsed < duration) {
            requestAnimationFrame(countFrame);
          } else {
            const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
            const fps = (frames / elapsed) * 1000;
            const memoryUsage = endMemory - startMemory;
            // CPU usage is harder to measure, approximate based on frame rate
            const cpuUsage = Math.max(0, 100 - fps * 2);

            resolve({ fps, memoryUsage, cpuUsage });
          }
        }

        requestAnimationFrame(countFrame);
      });
    }, duration);
  } catch (error: any) {
    // Handle navigation race condition
    if (
      error.message?.includes('Execution context was destroyed') ||
      error.message?.includes('navigation')
    ) {
      // Wait for navigation to complete and retry
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
      // Return default values if evaluation fails
      return { fps: 0, memoryUsage: 0, cpuUsage: 0 };
    }
    throw error;
  }
}

/**
 * Check for performance regression
 */
export async function checkPerformanceRegression(
  page: Page,
  baseline: { duration: number; memory: number },
  threshold: number = 0.2
): Promise<{ regressed: boolean; regression: number }> {
  const current = await measureOperationPerformance(page, async () => {
    // Run a standard operation
    await page.waitForTimeout(100);
  });

  const durationRegression = (current.duration - baseline.duration) / baseline.duration;
  const memoryRegression = (current.memoryAfter - baseline.memory) / baseline.memory;

  const regression = Math.max(durationRegression, memoryRegression);
  const regressed = regression > threshold;

  return { regressed, regression };
}

/**
 * Stress test canvas operations
 */
export async function stressTestCanvasOperations(
  page: Page,
  operationCount: number = 100
): Promise<{
  success: boolean;
  averageDuration: number;
  errors: number;
}> {
  let errors = 0;
  const durations: number[] = [];

  for (let i = 0; i < operationCount; i++) {
    try {
      const start = Date.now();
      // Perform a canvas operation
      await page.evaluate(() => {
        const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillRect(Math.random() * 100, Math.random() * 100, 10, 10);
          }
        }
      });
      durations.push(Date.now() - start);
    } catch {
      errors++;
    }
  }

  const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const success = errors < operationCount * 0.1; // Less than 10% errors

  return { success, averageDuration, errors };
}

/**
 * Performance Budget Configuration
 */
export interface PerformanceBudget {
  loadTime: number; // Maximum load time in ms
  fcp: number; // Maximum First Contentful Paint in ms
  lcp: number; // Maximum Largest Contentful Paint in ms
  memory: number; // Maximum memory usage in bytes
  canvasOperationDuration: number; // Maximum canvas operation duration in ms
}

/**
 * Default performance budgets
 */
export const defaultPerformanceBudget: PerformanceBudget = {
  loadTime: 5000,
  fcp: 2000,
  lcp: 2500,
  memory: 100 * 1024 * 1024, // 100MB
  canvasOperationDuration: 2000,
};

/**
 * Get performance baseline from file
 */
export async function getPerformanceBaseline(testName: string): Promise<PerformanceBudget | null> {
  try {
    const baselinePath = join(process.cwd(), 'tests/e2e/performance-baselines', `${testName}.json`);
    const data = await readFile(baselinePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Save performance baseline to file
 */
export async function savePerformanceBaseline(
  testName: string,
  budget: PerformanceBudget
): Promise<void> {
  const baselineDir = join(process.cwd(), 'tests/e2e/performance-baselines');
  const baselinePath = join(baselineDir, `${testName}.json`);

  try {
    await writeFile(baselinePath, JSON.stringify(budget, null, 2));
  } catch (error) {
    console.error('Error saving performance baseline:', error);
  }
}

/**
 * Measure and assert performance against budget
 */
export async function assertPerformanceBudget(
  page: Page,
  budget: PerformanceBudget = defaultPerformanceBudget
): Promise<{
  passed: boolean;
  violations: Array<{ metric: string; actual: number; budget: number }>;
}> {
  const violations: Array<{ metric: string; actual: number; budget: number }> = [];

  // Measure load time
  const loadTime = await measureLoadTime(page, page.url());
  if (loadTime > budget.loadTime) {
    violations.push({ metric: 'loadTime', actual: loadTime, budget: budget.loadTime });
  }

  // Measure FCP
  const fcp = await measureFCP(page);
  if (fcp !== null && fcp > budget.fcp) {
    violations.push({ metric: 'fcp', actual: fcp, budget: budget.fcp });
  }

  // Measure memory
  const memory = await measureMemoryUsage(page);
  if (memory !== null && memory > budget.memory) {
    violations.push({ metric: 'memory', actual: memory, budget: budget.memory });
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Measure Core Web Vitals
 */
export async function measureCoreWebVitals(page: Page): Promise<{
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
}> {
  return await page.evaluate(() => {
    return new Promise<{
      fcp: number | null;
      lcp: number | null;
      fid: number | null;
      cls: number | null;
      ttfb: number | null;
    }>((resolve) => {
      const vitals: {
        fcp: number | null;
        lcp: number | null;
        fid: number | null;
        cls: number | null;
        ttfb: number | null;
      } = {
        fcp: null,
        lcp: null,
        fid: null,
        cls: null,
        ttfb: null,
      };

      // Measure FCP
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            vitals.fcp = entry.startTime;
            fcpObserver.disconnect();
          }
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });

      // Measure LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        vitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Measure FID
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            vitals.fid = (entry as any).processingStart - entry.startTime;
            fidObserver.disconnect();
          }
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Measure CLS
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        vitals.cls = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Measure TTFB
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      if (navigation) {
        vitals.ttfb = navigation.responseStart - navigation.requestStart;
      }

      // Resolve after a delay to allow all metrics to be collected
      setTimeout(() => {
        resolve(vitals);
      }, 5000);
    });
  });
}

/**
 * Track performance metrics over time
 */
export async function trackPerformanceMetrics(
  page: Page,
  duration: number = 10000
): Promise<Array<{ timestamp: number; metrics: any }>> {
  const metrics: Array<{ timestamp: number; metrics: any }> = [];
  const startTime = Date.now();
  const interval = 1000; // Sample every second
  const maxDuration = Math.min(duration, 60000); // Cap at 60 seconds
  const maxIterations = Math.ceil(maxDuration / interval) + 1; // Safety limit
  let iterations = 0;

  while (Date.now() - startTime < maxDuration && iterations < maxIterations) {
    try {
      const memory = await measureMemoryUsage(page);
      const vitals = await measureCoreWebVitals(page);

      metrics.push({
        timestamp: Date.now(),
        metrics: {
          memory,
          ...vitals,
        },
      });

      iterations++;
      await page.waitForTimeout(interval);
    } catch (error) {
      // If measurement fails, break to prevent hanging
      console.warn('Performance measurement failed, stopping:', error);
      break;
    }
  }

  return metrics;
}
