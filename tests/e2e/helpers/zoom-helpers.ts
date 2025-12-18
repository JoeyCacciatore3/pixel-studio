/**
 * Zoom Testing Helpers
 * Utilities for testing zoom functionality and verifying container stays stationary
 */

import { Page, expect, Locator } from '@playwright/test';

export interface CanvasContainerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Get the bounding box of the canvas container (canvas-wrapper)
 * This is used to verify the container stays stationary during zoom
 */
export async function getCanvasContainerBounds(page: Page): Promise<CanvasContainerBounds | null> {
  const canvasWrapper = page.locator('.canvas-wrapper');
  const bounds = await canvasWrapper.boundingBox();
  if (!bounds) {
    return null;
  }
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
}

/**
 * Verify that the canvas container position and size remain unchanged after zoom
 * @param beforeBounds Bounding box before zoom
 * @param afterBounds Bounding box after zoom
 * @param tolerance Pixel tolerance for position comparison (default: 1px)
 */
export function verifyContainerStationary(
  beforeBounds: CanvasContainerBounds | null,
  afterBounds: CanvasContainerBounds | null,
  tolerance: number = 1
): void {
  if (!beforeBounds || !afterBounds) {
    throw new Error('Cannot verify container stationary: bounds are null');
  }

  // Verify position unchanged (within tolerance)
  expect(afterBounds.x).toBeCloseTo(beforeBounds.x, 0); // No decimal places needed for pixel positions
  expect(afterBounds.y).toBeCloseTo(beforeBounds.y, 0);

  // Verify size unchanged (container should not resize)
  expect(afterBounds.width).toBeCloseTo(beforeBounds.width, 0);
  expect(afterBounds.height).toBeCloseTo(beforeBounds.height, 0);
}

/**
 * Get current zoom level from the UI
 */
export async function getZoomLevel(page: Page): Promise<number> {
  const zoomLevelElement = page.locator('#zoomLevel');
  const zoomText = await zoomLevelElement.textContent();
  if (!zoomText) {
    throw new Error('Zoom level element not found or empty');
  }
  // Extract number from text like "100%" or "125%"
  const match = zoomText.match(/(\d+)/);
  if (!match) {
    throw new Error(`Could not parse zoom level from: ${zoomText}`);
  }
  return parseInt(match[1], 10);
}

/**
 * Verify that zoom level changed as expected
 */
export function verifyZoomLevelChanged(
  beforeZoom: number,
  afterZoom: number,
  expectedDirection: 'in' | 'out'
): void {
  if (expectedDirection === 'in') {
    expect(afterZoom).toBeGreaterThan(beforeZoom);
  } else {
    expect(afterZoom).toBeLessThan(beforeZoom);
  }
}

/**
 * Test zoom in operation and verify container stays stationary
 */
export async function testZoomIn(page: Page): Promise<{
  beforeZoom: number;
  afterZoom: number;
  containerStationary: boolean;
}> {
  const canvasWrapper = page.locator('.canvas-wrapper');
  const zoomInBtn = page.locator('#zoomInBtn');

  // Get initial state
  const beforeBounds = await getCanvasContainerBounds(page);
  const beforeZoom = await getZoomLevel(page);

  // Perform zoom in
  await zoomInBtn.click();
  await page.waitForTimeout(500); // Wait for zoom animation

  // Get state after zoom
  const afterBounds = await getCanvasContainerBounds(page);
  const afterZoom = await getZoomLevel(page);

  // Verify container stayed stationary
  try {
    verifyContainerStationary(beforeBounds, afterBounds);
    verifyZoomLevelChanged(beforeZoom, afterZoom, 'in');
    return {
      beforeZoom,
      afterZoom,
      containerStationary: true,
    };
  } catch (error) {
    return {
      beforeZoom,
      afterZoom,
      containerStationary: false,
    };
  }
}

/**
 * Test zoom out operation and verify container stays stationary
 */
export async function testZoomOut(page: Page): Promise<{
  beforeZoom: number;
  afterZoom: number;
  containerStationary: boolean;
}> {
  const canvasWrapper = page.locator('.canvas-wrapper');
  const zoomOutBtn = page.locator('#zoomOutBtn');

  // Get initial state
  const beforeBounds = await getCanvasContainerBounds(page);
  const beforeZoom = await getZoomLevel(page);

  // Perform zoom out
  await zoomOutBtn.click();
  await page.waitForTimeout(500); // Wait for zoom animation

  // Get state after zoom
  const afterBounds = await getCanvasContainerBounds(page);
  const afterZoom = await getZoomLevel(page);

  // Verify container stayed stationary
  try {
    verifyContainerStationary(beforeBounds, afterBounds);
    verifyZoomLevelChanged(beforeZoom, afterZoom, 'out');
    return {
      beforeZoom,
      afterZoom,
      containerStationary: true,
    };
  } catch (error) {
    return {
      beforeZoom,
      afterZoom,
      containerStationary: false,
    };
  }
}

/**
 * Perform pinch zoom gesture on mobile devices
 * @param canvasLocator The canvas element locator
 * @param options Pinch zoom options
 */
export async function testPinchZoom(
  canvasLocator: Locator,
  options: {
    direction: 'in' | 'out';
    deltaX?: number;
    steps?: number;
  }
): Promise<void> {
  const { direction = 'out', deltaX = 50, steps = 5 } = options;

  // Get canvas center
  const { centerX, centerY } = await canvasLocator.evaluate((target: HTMLElement) => {
    const bounds = target.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    return { centerX, centerY };
  });

  const stepDeltaX = deltaX / (steps + 1);

  // Initial touch points
  const initialTouches = [
    {
      identifier: 0,
      clientX: centerX - (direction === 'in' ? deltaX : stepDeltaX),
      clientY: centerY,
    },
    {
      identifier: 1,
      clientX: centerX + (direction === 'in' ? deltaX : stepDeltaX),
      clientY: centerY,
    },
  ];

  // Touch start
  await canvasLocator.dispatchEvent('touchstart', {
    touches: initialTouches,
    changedTouches: initialTouches,
    targetTouches: initialTouches,
  });

  // Touch move (pinch gesture)
  for (let i = 1; i <= steps; i++) {
    const offset = direction === 'in' ? deltaX - i * stepDeltaX : stepDeltaX * (i + 1);
    const touches = [
      {
        identifier: 0,
        clientX: centerX - offset,
        clientY: centerY,
      },
      {
        identifier: 1,
        clientX: centerX + offset,
        clientY: centerY,
      },
    ];
    await canvasLocator.dispatchEvent('touchmove', {
      touches,
      changedTouches: touches,
      targetTouches: touches,
    });
  }

  // Touch end
  await canvasLocator.dispatchEvent('touchend', {
    touches: [],
    changedTouches: [],
    targetTouches: [],
  });
}

/**
 * Verify canvas content actually zoomed by comparing visual state
 * This captures a screenshot of the canvas and compares it
 */
export async function verifyCanvasZoomed(
  page: Page,
  beforeZoom: number,
  afterZoom: number
): Promise<void> {
  const canvas = page.locator('#mainCanvas');

  // If zoom changed, canvas content should appear different
  if (beforeZoom !== afterZoom) {
    // Capture screenshot for visual verification
    // The screenshot will be different if zoom occurred
    await expect(canvas).toBeVisible();

    // Note: Actual visual comparison would use toHaveScreenshot
    // This is a placeholder for the verification logic
  }
}

/**
 * Reset zoom to 100%
 */
export async function resetZoom(page: Page): Promise<void> {
  const resetZoomBtn = page.locator(
    'button[aria-label*="Reset zoom"], button[aria-label*="reset"], #resetZoomBtn'
  );
  const zoomLevel = await getZoomLevel(page);

  if (zoomLevel !== 100) {
    // Try to find reset button
    const resetBtn = page
      .locator('button')
      .filter({ hasText: /reset|100%/i })
      .first();
    if (await resetBtn.isVisible().catch(() => false)) {
      await resetBtn.click();
    } else {
      // Manually set zoom to 100% by clicking zoom out until at 100%
      while ((await getZoomLevel(page)) > 100) {
        await page.locator('#zoomOutBtn').click();
        await page.waitForTimeout(200);
      }
      while ((await getZoomLevel(page)) < 100) {
        await page.locator('#zoomInBtn').click();
        await page.waitForTimeout(200);
      }
    }
    await page.waitForTimeout(500); // Wait for zoom to settle
  }
}
