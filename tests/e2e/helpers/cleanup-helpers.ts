/**
 * Helper functions for cleanup tool testing
 * Provides utilities for image comparison, performance measurement, and asset loading
 */

import type { Page } from '@playwright/test';
import { getCanvas, waitForCanvasReady } from './canvas-helpers';
import { APP_URL } from './test-constants';

/**
 * Load a test image onto the canvas
 */
export async function loadTestImage(
  page: Page,
  imagePath: string,
  timeout: number = 10000
): Promise<void> {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForCanvasReady(page, timeout);

  // Use file input to load image
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(imagePath);

  // Wait for image to load
  await page.waitForTimeout(1000);
}

/**
 * Create a test image with known characteristics
 * Returns a data URL that can be loaded
 */
export function createTestImage(
  width: number,
  height: number,
  generator: (x: number, y: number) => { r: number; g: number; b: number; a: number }
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  const imageData = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const color = generator(x, y);
      imageData.data[index] = color.r;
      imageData.data[index + 1] = color.g;
      imageData.data[index + 2] = color.b;
      imageData.data[index + 3] = color.a;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Create test image with stray pixels
 */
export function createStrayPixelImage(width: number, height: number): string {
  return createTestImage(width, height, (x, y) => {
    // Create a solid background
    if (x < width / 2) {
      return { r: 100, g: 100, b: 100, a: 255 };
    }

    // Add some stray pixels
    if ((x === 10 && y === 10) || (x === 20 && y === 20) || (x === 30 && y === 30)) {
      return { r: 255, g: 0, b: 0, a: 255 };
    }

    return { r: 200, g: 200, b: 200, a: 255 };
  });
}

/**
 * Create test image with color noise
 */
export function createColorNoiseImage(width: number, height: number): string {
  return createTestImage(width, height, (x, y) => {
    // Base color with slight variations
    const baseR = 100;
    const baseG = 100;
    const baseB = 100;

    // Add noise
    const noise = Math.sin(x * 0.1) * 5;
    return {
      r: Math.max(0, Math.min(255, baseR + noise)),
      g: Math.max(0, Math.min(255, baseG + noise)),
      b: Math.max(0, Math.min(255, baseB + noise)),
      a: 255,
    };
  });
}

/**
 * Create test image with jagged edges
 */
export function createJaggedEdgeImage(width: number, height: number): string {
  return createTestImage(width, height, (x, y) => {
    // Create a circle with jagged edges
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

    // Add jaggedness
    const angle = Math.atan2(y - centerY, x - centerX);
    const jaggedDist = radius + Math.sin(angle * 8) * 2;

    if (dist < jaggedDist) {
      return { r: 255, g: 0, b: 0, a: 255 };
    }
    return { r: 0, g: 0, b: 0, a: 0 };
  });
}

/**
 * Create test image with fuzzy edges (semi-transparent)
 */
export function createFuzzyEdgeImage(width: number, height: number): string {
  return createTestImage(width, height, (x, y) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

    // Create gradient edge
    const edgeWidth = 5;
    if (dist < radius - edgeWidth) {
      return { r: 255, g: 0, b: 0, a: 255 };
    } else if (dist < radius + edgeWidth) {
      const alpha = Math.round(255 * (1 - (dist - radius + edgeWidth) / (2 * edgeWidth)));
      return { r: 255, g: 0, b: 0, a: alpha };
    }
    return { r: 0, g: 0, b: 0, a: 0 };
  });
}

/**
 * Get canvas image data as base64
 */
export async function getCanvasImageData(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');
    return canvas.toDataURL('image/png');
  });
}

/**
 * Compare two images (simple pixel difference)
 * Returns percentage of different pixels
 */
export async function compareImages(
  page: Page,
  beforeData: string,
  afterData: string
): Promise<{ difference: number; differentPixels: number; totalPixels: number }> {
  return await page.evaluate(
    ({ before, after }) => {
      const beforeCanvas = document.createElement('canvas');
      const afterCanvas = document.createElement('canvas');
      const beforeCtx = beforeCanvas.getContext('2d');
      const afterCtx = afterCanvas.getContext('2d');

      if (!beforeCtx || !afterCtx) {
        throw new Error('Could not get canvas contexts');
      }

      const beforeImg = new Image();
      const afterImg = new Image();

      return new Promise<{ difference: number; differentPixels: number; totalPixels: number }>(
        (resolve) => {
          let loaded = 0;

          const checkLoaded = () => {
            loaded++;
            if (loaded === 2) {
              beforeCanvas.width = beforeImg.width;
              beforeCanvas.height = beforeImg.height;
              afterCanvas.width = afterImg.width;
              afterCanvas.height = afterImg.height;

              beforeCtx.drawImage(beforeImg, 0, 0);
              afterCtx.drawImage(afterImg, 0, 0);

              const beforeData = beforeCtx.getImageData(
                0,
                0,
                beforeCanvas.width,
                beforeCanvas.height
              );
              const afterData = afterCtx.getImageData(0, 0, afterCanvas.width, afterCanvas.height);

              let differentPixels = 0;
              const totalPixels = beforeData.width * beforeData.height;

              for (let i = 0; i < beforeData.data.length; i += 4) {
                const r1 = beforeData.data[i]!;
                const g1 = beforeData.data[i + 1]!;
                const b1 = beforeData.data[i + 2]!;
                const a1 = beforeData.data[i + 3]!;

                const r2 = afterData.data[i]!;
                const g2 = afterData.data[i + 1]!;
                const b2 = afterData.data[i + 2]!;
                const a2 = afterData.data[i + 3]!;

                if (r1 !== r2 || g1 !== g2 || b1 !== b2 || a1 !== a2) {
                  differentPixels++;
                }
              }

              resolve({
                difference: (differentPixels / totalPixels) * 100,
                differentPixels,
                totalPixels,
              });
            }
          };

          beforeImg.onload = checkLoaded;
          afterImg.onload = checkLoaded;
          beforeImg.src = before;
          afterImg.src = after;
        }
      );
    },
    { before: beforeData, after: afterData }
  );
}

/**
 * Measure performance of an operation
 */
export async function measurePerformance<T>(
  page: Page,
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = await page.evaluate(() => performance.now());
  const result = await operation();
  const endTime = await page.evaluate(() => performance.now());

  return {
    result,
    duration: endTime - startTime,
  };
}

/**
 * Select a cleanup tool from the UI
 */
export async function selectCleanupTool(page: Page, toolName: string): Promise<void> {
  // Open cleanup panel if needed
  const cleanupButton = page.locator('[data-tool="cleanup"]').first();
  if (await cleanupButton.isVisible()) {
    await cleanupButton.click();
    await page.waitForTimeout(300);
  }

  // Select the specific cleanup tool
  const toolButton = page.locator(`[data-tool="${toolName}"]`).first();
  await toolButton.click();
  await page.waitForTimeout(300);
}

/**
 * Configure cleanup tool options
 */
export async function configureCleanupOptions(
  page: Page,
  options: Record<string, string | number>
): Promise<void> {
  for (const [key, value] of Object.entries(options)) {
    const input = page.locator(`[data-option="${key}"]`).first();
    if (await input.isVisible()) {
      await input.fill(String(value));
      await page.waitForTimeout(100);
    }
  }
}

/**
 * Execute a cleanup tool operation
 */
export async function executeCleanupTool(page: Page): Promise<void> {
  // Click on canvas to execute (for action tools)
  const canvas = getCanvas(page);
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(2000); // Wait for operation to complete
  }
}

/**
 * Wait for cleanup operation to complete
 */
export async function waitForCleanupComplete(page: Page, timeout: number = 10000): Promise<void> {
  // Wait for any loading indicators to disappear
  const loadingIndicator = page.locator('.loading, [data-loading]').first();
  if (await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false)) {
    await loadingIndicator.waitFor({ state: 'hidden', timeout });
  }

  // Wait a bit more for canvas to update
  await page.waitForTimeout(500);
}

/**
 * Verify tool executed successfully
 */
export async function verifyToolExecuted(page: Page): Promise<boolean> {
  // Check for error messages
  const errorMessage = page.locator('.error, [data-error]').first();
  if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
    return false;
  }

  // Check that canvas is still visible and responsive
  const canvas = getCanvas(page);
  return await canvas.isVisible();
}
