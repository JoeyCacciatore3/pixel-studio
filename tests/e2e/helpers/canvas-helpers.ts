/**
 * Canvas Operation Test Helpers
 * Utilities for canvas operations, drawing, and canvas state management
 * Enhanced with MCP debugging capabilities
 */

import { Page, Locator, expect, TestInfo } from '@playwright/test';
import { APP_URL } from './test-constants';
import {
  captureDebugInfo,
  analyzeTestFailure,
  defaultMCPConfig,
} from './mcp-playwright-helpers';

// Re-export APP_URL for backward compatibility
export { APP_URL };

/**
 * Detect if test is running on a mobile project
 */
export async function isMobileProject(page: Page): Promise<boolean> {
  const viewport = page.viewportSize();
  if (!viewport) return false;

  // Check viewport size and user agent
  const isMobile = await page.evaluate(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth < 768;
  });

  return isMobile || (viewport.width < 768);
}

/**
 * Ensure desktop viewport if needed for toolbar visibility
 */
export async function ensureDesktopViewportIfNeeded(page: Page, forceDesktop: boolean = false): Promise<void> {
  const viewport = page.viewportSize();
  const isMobile = await isMobileProject(page);

  // Only change viewport if we need desktop and currently on mobile
  if (forceDesktop && (isMobile || !viewport || viewport.width < 768)) {
    await page.setViewportSize({ width: 1280, height: 720 });
    // Wait for CSS to apply and layout to update
    await page.waitForTimeout(300);
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {});
  }
}

/**
 * Wait for canvas to be ready with fail-safes
 */
export async function waitForCanvasReady(page: Page, maxWait: number = 10000): Promise<void> {
  const startTime = Date.now();
  const canvas = page.locator('#mainCanvas');

  // Ensure desktop viewport for toolbar visibility if needed
  await ensureDesktopViewportIfNeeded(page, false);

  try {
    // Wait for canvas element to be in DOM
    await expect(canvas).toBeVisible({ timeout: maxWait });
    await page.waitForTimeout(500);

    // Check canvas dimensions
    let isReady = false;
    const checkInterval = 500;
    const maxChecks = Math.floor(maxWait / checkInterval);

    for (let i = 0; i < maxChecks && Date.now() - startTime < maxWait; i++) {
      isReady = await canvas.evaluate((el: HTMLCanvasElement) => {
        return el.width > 0 && el.height > 0;
      });

      if (isReady) {
        // Verify context is available
        const hasContext = await isCanvasInitialized(page);
        if (hasContext) {
          return; // Success
        }
      }

      await page.waitForTimeout(checkInterval);
    }

    if (!isReady) {
      const dimensions = await getCanvasDimensions(page);
      throw new Error(`Canvas not ready after ${maxWait}ms. Dimensions: ${dimensions.width}x${dimensions.height}`);
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const dimensions = await getCanvasDimensions(page).catch(() => ({ width: 0, height: 0 }));
    throw new Error(`Canvas not ready after ${elapsed}ms (max: ${maxWait}ms). Dimensions: ${dimensions.width}x${dimensions.height}. Error: ${error}`);
  }
}

/**
 * Get canvas element
 */
export function getCanvas(page: Page): Locator {
  return page.locator('#mainCanvas');
}

/**
 * Get canvas context
 */
export async function getCanvasContext(page: Page): Promise<CanvasRenderingContext2D | null> {
  return await page.evaluate(() => {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (!canvas) return null;
    return canvas.getContext('2d');
  });
}

/**
 * Check if canvas is initialized
 */
export async function isCanvasInitialized(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    return ctx !== null && canvas.width > 0 && canvas.height > 0;
  });
}

/**
 * Get canvas dimensions
 */
export async function getCanvasDimensions(page: Page): Promise<{ width: number; height: number }> {
  return await page.evaluate(() => {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (!canvas) return { width: 0, height: 0 };
    return {
      width: canvas.width,
      height: canvas.height,
    };
  });
}

/**
 * Get canvas info including bounding box for coordinate calculations
 */
export async function getCanvasInfo(page: Page, timeout: number = 10000): Promise<{ box: { x: number; y: number; width: number; height: number } }> {
  const canvas = getCanvas(page);
  await expect(canvas).toBeVisible({ timeout });

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Canvas bounding box not available');
  }

  return { box };
}

/**
 * Resize canvas
 */
export async function resizeCanvas(
  page: Page,
  width: number,
  height: number
): Promise<void> {
  await page.evaluate(
    ({ width, height }) => {
      const widthInput = document.getElementById('canvasWidth') as HTMLInputElement;
      const heightInput = document.getElementById('canvasHeight') as HTMLInputElement;
      if (widthInput) {
        widthInput.value = String(width);
        widthInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (heightInput) {
        heightInput.value = String(height);
        heightInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    { width, height }
  );
  await page.waitForTimeout(500);
}

/**
 * Draw stroke on canvas with fail-safes
 */
export async function drawStroke(
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
  timeout: number = 5000
): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const canvas = getCanvas(page);
      await expect(canvas).toBeVisible({ timeout });

      // Ensure canvas is ready
      const isReady = await isCanvasInitialized(page);
      if (!isReady) {
        await page.waitForTimeout(500);
        if (attempt < maxRetries) continue;
      }

      const box = await canvas.boundingBox({ timeout });
      if (!box) {
        throw new Error('Cannot draw stroke: canvas not available or not visible');
      }

      const startX = box.x + start.x;
      const startY = box.y + start.y;
      const endX = box.x + end.x;
      const endY = box.y + end.y;

      // Validate coordinates are within viewport
      const viewport = page.viewportSize();
      if (viewport) {
        if (startX < 0 || startY < 0 || endX > viewport.width || endY > viewport.height) {
          throw new Error(`Stroke coordinates out of bounds: start(${startX}, ${startY}), end(${endX}, ${endY}), viewport(${viewport.width}x${viewport.height})`);
        }
      }

      await page.mouse.move(startX, startY, { timeout: 2000 });
      await page.mouse.down({ timeout: 2000 });
      await page.mouse.move(endX, endY, { steps: 10, timeout: 3000 });
      await page.mouse.up({ timeout: 2000 });
      await page.waitForTimeout(200);

      // Success - return
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Cleanup on error
      try {
        await page.mouse.up();
      } catch {
        // Ignore cleanup errors
      }

      // If not last attempt, wait and retry
      if (attempt < maxRetries) {
        await page.waitForTimeout(500 * attempt); // Exponential backoff
        continue;
      }
    }
  }

  // All retries failed
  throw new Error(`Failed to draw stroke after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Get canvas data URL
 */
export async function getCanvasDataURL(page: Page): Promise<string> {
  return await page.locator('#mainCanvas').evaluate((canvas: HTMLCanvasElement) => {
    return canvas.toDataURL();
  });
}

/**
 * Compare canvas states (legacy - uses strict equality)
 * @deprecated Use compareCanvasStatesWithTolerance for better reliability
 */
export async function compareCanvasStates(
  page: Page,
  state1: string,
  state2: string
): Promise<boolean> {
  return state1 === state2;
}

export interface CanvasComparisonOptions {
  /**
   * Maximum percentage of pixels that can differ (0-1)
   * @default 0.01 (1%)
   */
  tolerance?: number

  /**
   * Maximum number of pixels that can differ
   * If set, overrides tolerance percentage
   */
  maxDiffPixels?: number

  /**
   * Region to compare (optional)
   * If not provided, compares entire canvas
   */
  region?: {
    x: number
    y: number
    width: number
    height: number
  }

  /**
   * Whether to return detailed diff information
   * @default false
   */
  detailed?: boolean
}

export interface CanvasComparisonResult {
  /**
   * Whether the canvases match within tolerance
   */
  match: boolean

  /**
   * Number of different pixels
   */
  diffPixels: number

  /**
   * Total number of pixels compared
   */
  totalPixels: number

  /**
   * Percentage of pixels that differ (0-1)
   */
  diffPercentage: number

  /**
   * Detailed diff information (if detailed=true)
   */
  diffDetails?: {
    regions: Array<{
      x: number
      y: number
      width: number
      height: number
      diffPixels: number
    }>
  }
}

/**
 * Compare canvas states with tolerance for rendering differences
 *
 * This function performs pixel-level comparison instead of string comparison,
 * allowing for small rendering differences that don't affect functionality.
 *
 * @param page - Playwright page object
 * @param state1 - First canvas state (data URL or canvas element)
 * @param state2 - Second canvas state (data URL or canvas element)
 * @param options - Comparison options
 * @returns Comparison result with match status and diff information
 */
export async function compareCanvasStatesWithTolerance(
  page: Page,
  state1: string | null,
  state2: string | null,
  options: CanvasComparisonOptions = {}
): Promise<CanvasComparisonResult> {
  const {
    tolerance = 0.01, // 1% default tolerance
    maxDiffPixels,
    region,
    detailed = false,
  } = options

  // Handle null states
  if (!state1 || !state2) {
    return {
      match: state1 === state2,
      diffPixels: state1 === state2 ? 0 : 1,
      totalPixels: 1,
      diffPercentage: state1 === state2 ? 0 : 1,
    }
  }

  // If both are data URLs and identical, return early
  if (state1 === state2) {
    return {
      match: true,
      diffPixels: 0,
      totalPixels: 0,
      diffPercentage: 0,
    }
  }

  // Perform pixel-level comparison
  const result = await page.evaluate(
    ({ state1, state2, region, tolerance, maxDiffPixels, detailed }) => {
      // Create image elements from data URLs
      const img1 = new Image()
      const img2 = new Image()

      return new Promise<CanvasComparisonResult>((resolve) => {
        let loaded = 0
        const onLoad = () => {
          loaded++
          if (loaded === 2) {
            // Both images loaded, compare them
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              resolve({
                match: false,
                diffPixels: 1,
                totalPixels: 1,
                diffPercentage: 1,
              })
              return
            }

            // Set canvas dimensions
            const width = region ? region.width : Math.max(img1.width, img2.width)
            const height = region ? region.height : Math.max(img1.height, img2.height)
            canvas.width = width
            canvas.height = height

            // Draw both images
            ctx.drawImage(img1, region ? -region.x : 0, region ? -region.y : 0)
            const imageData1 = ctx.getImageData(0, 0, width, height)

            ctx.clearRect(0, 0, width, height)
            ctx.drawImage(img2, region ? -region.x : 0, region ? -region.y : 0)
            const imageData2 = ctx.getImageData(0, 0, width, height)

            // Compare pixels
            let diffPixels = 0
            const data1 = imageData1.data
            const data2 = imageData2.data
            const totalPixels = width * height

            // Compare pixel by pixel (RGBA)
            for (let i = 0; i < data1.length; i += 4) {
              const r1 = data1[i]!
              const g1 = data1[i + 1]!
              const b1 = data1[i + 2]!
              const a1 = data1[i + 3]!

              const r2 = data2[i]!
              const g2 = data2[i + 1]!
              const b2 = data2[i + 2]!
              const a2 = data2[i + 3]!

              // Check if pixels differ (with small tolerance for anti-aliasing)
              const diff =
                Math.abs(r1 - r2) > 1 ||
                Math.abs(g1 - g2) > 1 ||
                Math.abs(b1 - b2) > 1 ||
                Math.abs(a1 - a2) > 1

              if (diff) {
                diffPixels++
              }
            }

            const diffPercentage = diffPixels / totalPixels
            const match =
              (maxDiffPixels !== undefined
                ? diffPixels <= maxDiffPixels
                : diffPercentage <= tolerance) && diffPixels < totalPixels * 0.5 // Never match if >50% different

            resolve({
              match,
              diffPixels,
              totalPixels,
              diffPercentage,
            })
          }
        }

        img1.onload = onLoad
        img2.onload = onLoad
        img1.src = state1
        img2.src = state2
      })
    },
    { state1, state2, region, tolerance, maxDiffPixels, detailed }
  )

  return result
}

/**
 * Get canvas pixel data
 */
export async function getCanvasPixelData(
  page: Page,
  x: number,
  y: number
): Promise<{ r: number; g: number; b: number; a: number } | null> {
  return await page.evaluate(
    ({ x, y }) => {
      const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
      if (!canvas) return null;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;

      const imageData = ctx.getImageData(x, y, 1, 1);
      const data = imageData.data;
      return {
        r: data[0]!,
        g: data[1]!,
        b: data[2]!,
        a: data[3]!,
      };
    },
    { x, y }
  );
}

/**
 * Check if canvas has content
 */
export async function canvasHasContent(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (!canvas) return false;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    // Sample a few pixels across the canvas
    const width = canvas.width;
    const height = canvas.height;
    const samplePoints = [
      { x: Math.floor(width * 0.25), y: Math.floor(height * 0.25) },
      { x: Math.floor(width * 0.5), y: Math.floor(height * 0.5) },
      { x: Math.floor(width * 0.75), y: Math.floor(height * 0.75) },
    ];

    for (const point of samplePoints) {
      const imageData = ctx.getImageData(point.x, point.y, 1, 1);
      if (imageData.data[3]! > 0) {
        // Found non-transparent pixel
        return true;
      }
    }

    return false;
  });
}

/**
 * Clear canvas with fail-safes
 */
export async function clearCanvas(page: Page): Promise<void> {
  const clearButton = page.locator('#clearBtn');
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (await clearButton.count() === 0) {
        throw new Error('Clear button not found');
      }

      await expect(clearButton).toBeVisible({ timeout: 5000 });
      await clearButton.click({ timeout: 5000 });
      await page.waitForTimeout(500);

      // Verify canvas was cleared (optional check)
      const hasContent = await canvasHasContent(page);
      if (hasContent && attempt < maxRetries) {
        // Canvas still has content, retry
        await page.waitForTimeout(500);
        continue;
      }

      return; // Success
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`Failed to clear canvas after ${maxRetries} attempts: ${error}`);
      }
      await page.waitForTimeout(500 * attempt);
    }
  }
}

/**
 * Select tool
 * Handles both desktop (.tool-btn) and mobile (.mobile-tool-btn) toolbars
 * Based on research from GIMP, Procreate, and Canva patterns
 *
 * First tries to call PixelStudio.selectTool() directly via JavaScript for reliability,
 * then falls back to clicking UI buttons if needed.
 */
export async function selectTool(page: Page, toolName: string, maxRetries: number = 3): Promise<void> {
  let retries = 0;
  const timeout = 10000;
  const maxTotalTime = 30000; // Maximum total time for all retries
  const startTime = Date.now();

  // Check if we're on mobile - if so, we may need to use mobile toolbar
  const isMobile = await isMobileProject(page);

  // Try both desktop and mobile selectors - use .first() to handle strict mode violations
  // Desktop toolbar uses .tool-btn[data-tool], mobile uses .mobile-tool-btn[data-tool]
  const desktopToolButton = page.locator(`.tool-btn[data-tool="${toolName}"]`).first();
  const mobileToolButton = page.locator(`.mobile-tool-btn[data-tool="${toolName}"]`).first();

  // Fallback: try by aria-label if data-tool not found (for backward compatibility)
  const desktopToolButtonByLabel = page.locator(`.tool-btn[aria-label*="${toolName}"]`).first();
  const mobileToolButtonByLabel = page.locator(`.mobile-tool-btn[aria-label*="${toolName}"]`).first();

  // Tools are rendered in canvas area (.canvas-tools-left, .canvas-tools-right, .canvas-tools-bottom)
  // or in mobile toolbar (.mobile-toolbar). Extended toolbar is hidden by CSS.
  // We'll search for tools anywhere in the DOM using .tool-btn[data-tool] or .mobile-tool-btn[data-tool]

  while (retries < maxRetries && Date.now() - startTime < maxTotalTime) {
    try {
      // Ensure desktop viewport for canvas tools visibility (only if not explicitly mobile test)
      if (!isMobile) {
        await ensureDesktopViewportIfNeeded(page, true);
        // Wait for canvas to be ready so tools are rendered
        await waitForCanvasReady(page, 5000).catch(() => {});
        // Give React time to render the canvas tools
        await page.waitForTimeout(500);
      } else {
        // For mobile, wait for mobile toolbar
        const mobileToolbar = page.locator('.mobile-toolbar').first();
        await expect(mobileToolbar).toBeVisible({ timeout: 5000 }).catch(() => {});
      }

      // First, try to call PixelStudio.selectTool() directly via JavaScript
      // This is more reliable than clicking UI buttons
      try {
        const toolSelected = await page.evaluate((toolName) => {
          try {
            if ((window as any).PixelStudio && typeof (window as any).PixelStudio.selectTool === 'function') {
              (window as any).PixelStudio.selectTool(toolName);
              // Verify it was set
              const state = (window as any).PixelStudio.getState?.();
              return state?.currentTool === toolName;
            }
            return false;
          } catch {
            return false;
          }
        }, toolName);

        if (toolSelected) {
          // Verify tool is active in UI
          await page.waitForTimeout(300);
          const stateActive = await page.evaluate((toolName) => {
            try {
              const state = (window as any).PixelStudio?.getState?.();
              return state?.currentTool === toolName;
            } catch {
              return false;
            }
          }, toolName).catch(() => false);

          if (stateActive) {
            return; // Success - tool selected via API
          }
        }
      } catch (apiError) {
        // API call failed, fall through to UI button click
      }

      // Wait for tool button to appear in DOM (either mobile or desktop)
      // Try to find the tool button - prefer data-tool attribute, fallback to aria-label
      let toolButton: Locator | null = null;
      let buttonFound = false;

      // First, wait for at least one tool button to exist in the DOM
      try {
        await page.waitForSelector('.tool-btn[data-tool], .mobile-tool-btn[data-tool]', {
          state: 'attached',
          timeout: 5000
        });
      } catch {
        // If no tool buttons found, wait a bit more for React to render
        await page.waitForTimeout(1000);
      }

      if (isMobile) {
        // Try mobile toolbar first
        const mobileCount = await mobileToolButton.count();
        if (mobileCount > 0) {
          toolButton = mobileToolButton;
          buttonFound = true;
        } else {
          // Fallback to aria-label
          const mobileLabelCount = await mobileToolButtonByLabel.count();
          if (mobileLabelCount > 0) {
            toolButton = mobileToolButtonByLabel;
            buttonFound = true;
          }
        }
      }

      // If not found on mobile or desktop, try desktop toolbar
      if (!buttonFound) {
        const desktopCount = await desktopToolButton.count();
        if (desktopCount > 0) {
          toolButton = desktopToolButton;
          buttonFound = true;
        } else {
          // Fallback to aria-label
          const desktopLabelCount = await desktopToolButtonByLabel.count();
          if (desktopLabelCount > 0) {
            toolButton = desktopToolButtonByLabel;
            buttonFound = true;
          }
        }
      }

      // If still not found, wait a bit more and try again
      if (!toolButton || !buttonFound) {
        await page.waitForTimeout(1000);
        // Try one more time
        const finalDesktopCount = await desktopToolButton.count();
        const finalMobileCount = await mobileToolButton.count();
        if (finalDesktopCount > 0) {
          toolButton = desktopToolButton;
          buttonFound = true;
        } else if (finalMobileCount > 0) {
          toolButton = mobileToolButton;
          buttonFound = true;
        } else {
          throw new Error(`Tool button "${toolName}" not found in any toolbar after waiting`);
        }
      }

      // Wait for tool button to be visible, or scroll to it if it exists but is hidden
      try {
        await expect(toolButton).toBeVisible({ timeout });
      } catch {
        // Button exists but might be hidden - try scrolling to it
        await toolButton.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
        // Wait a bit for scroll to complete
        await page.waitForTimeout(200);
      }

      // Click the tool button - use force if it's still not visible but exists in DOM
      const isVisible = await toolButton.isVisible().catch(() => false);
      if (isVisible) {
        await toolButton.click({ timeout: 5000 });
      } else {
        // Button exists in DOM but is hidden - try force click
        await toolButton.click({ force: true, timeout: 5000 });
      }
      await page.waitForTimeout(300);

      // Verify tool is active - check both class and state
      const isActive = await toolButton.evaluate((el) => {
        return el.classList.contains('active') ||
               el.getAttribute('aria-pressed') === 'true';
      });

      // Also verify via app state if available
      const stateActive = await page.evaluate((toolName) => {
        try {
          const state = (window as any).PixelStudio?.getState?.();
          return state?.currentTool === toolName;
        } catch {
          return false;
        }
      }, toolName).catch(() => false);

      if (isActive || stateActive) {
        return; // Success
      }

      retries++;
      if (retries < maxRetries && Date.now() - startTime < maxTotalTime) {
        await page.waitForTimeout(500);
      }
    } catch (error) {
      retries++;

      // On last retry, provide detailed error information
      if (retries >= maxRetries || Date.now() - startTime >= maxTotalTime) {
        const currentViewport = page.viewportSize();
        const viewportInfo = currentViewport
          ? `Current viewport: ${currentViewport.width}x${currentViewport.height}`
          : 'No viewport set';

        // Check if canvas tools or mobile toolbar are visible
        const canvasToolsVisible = await page.locator('.canvas-tools-left, .canvas-tools-right, .canvas-tools-bottom').first().isVisible().catch(() => false);
        const mobileToolbarVisible = await page.locator('.mobile-toolbar').first().isVisible().catch(() => false);
        const toolbarVisible = canvasToolsVisible || mobileToolbarVisible;

        // Check all possible button locations
        const desktopButtonCount = await desktopToolButton.count().catch(() => 0);
        const mobileButtonCount = await mobileToolButton.count().catch(() => 0);
        const desktopLabelCount = await desktopToolButtonByLabel.count().catch(() => 0);
        const mobileLabelCount = await mobileToolButtonByLabel.count().catch(() => 0);

        // Get current tool state
        const currentTool = await page.evaluate(() => {
          try {
            return (window as any).PixelStudio?.getState?.()?.currentTool || 'unknown';
          } catch {
            return 'unknown';
          }
        }).catch(() => 'unknown');

        const errorDetails = [
          `Failed to select tool "${toolName}" after ${retries} attempts`,
          `Timeout: ${Date.now() - startTime}ms`,
          `Viewport: ${viewportInfo}`,
          `Is Mobile: ${isMobile}`,
          `Toolbar visible: ${toolbarVisible}`,
          `Desktop button count (data-tool): ${desktopButtonCount}`,
          `Mobile button count (data-tool): ${mobileButtonCount}`,
          `Desktop button count (aria-label): ${desktopLabelCount}`,
          `Mobile button count (aria-label): ${mobileLabelCount}`,
          `Current tool in state: ${currentTool}`,
          `Error: ${error}`,
        ].join('\n  - ');

        throw new Error(errorDetails);
      }
      await page.waitForTimeout(500);
    }
  }

  throw new Error(`Failed to select tool "${toolName}" - exceeded maximum time limit (${maxTotalTime}ms) or retries (${maxRetries})`);
}

/**
 * Check if canvas context is lost
 */
export async function isCanvasContextLost(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (!canvas) return true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;

    // Try to read from context
    try {
      ctx.getImageData(0, 0, 1, 1);
      return false;
    } catch {
      return true;
    }
  });
}

/**
 * Trigger canvas resize during operation
 */
export async function triggerCanvasResizeDuringOperation(
  page: Page,
  operation: () => Promise<void>
): Promise<void> {
  // Start operation
  const operationPromise = operation();

  // Resize canvas during operation
  await page.waitForTimeout(100);
  await resizeCanvas(page, 800, 600);

  // Wait for operation to complete
  await operationPromise;
}

/**
 * Draw stroke with MCP debugging support
 * Enhanced version that captures debug info on failure
 */
export async function drawStrokeWithDebug(
  page: Page,
  testInfo: TestInfo,
  start: { x: number; y: number },
  end: { x: number; y: number },
  timeout: number = 5000
): Promise<void> {
  try {
    await drawStroke(page, start, end, timeout);
  } catch (error) {
    // Capture debug info on failure if MCP is enabled
    if (defaultMCPConfig.enabled && defaultMCPConfig.debugMode) {
      const debugInfo = await captureDebugInfo(page, testInfo, {
        captureScreenshots: true,
        captureVideo: true,
        analyzeNetwork: false,
        profilePerformance: false,
        captureTrace: true,
        consoleLogs: true,
      });

      const analysis = await analyzeTestFailure(
        testInfo.title,
        error as Error,
        debugInfo
      );

      console.error('Drawing failed. Analysis:', analysis);
    }
    throw error;
  }
}
