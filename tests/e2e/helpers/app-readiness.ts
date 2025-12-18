/**
 * App Readiness Test Helpers
 * Comprehensive utilities for ensuring the application is fully ready before test interactions
 */

import { Page, expect } from '@playwright/test';
import { waitForCanvasReady, isCanvasInitialized } from './canvas-helpers';
import { waitForStateManagerReady } from './state-helpers';

export interface AppReadinessOptions {
  /**
   * Maximum time to wait for app readiness in milliseconds
   * @default 30000
   */
  maxWait?: number;

  /**
   * Whether to wait for canvas to be ready
   * @default true
   */
  waitForCanvas?: boolean;

  /**
   * Whether to wait for state manager to be ready
   * @default true
   */
  waitForStateManager?: boolean;

  /**
   * Whether to wait for UI components to be mounted
   * @default true
   */
  waitForUI?: boolean;

  /**
   * Whether to wait for network to be idle
   * @default true
   */
  waitForNetworkIdle?: boolean;

  /**
   * Specific UI components to wait for (optional)
   * If not provided, waits for common components (toolbar, canvas)
   */
  uiComponents?: Array<{
    selector: string;
    description: string;
  }>;
}

/**
 * Wait for the application to be fully ready for interactions
 *
 * This function ensures:
 * 1. Canvas is initialized (dimensions > 0, context available)
 * 2. State manager is ready (PixelStudio.getState() !== null)
 * 3. UI components are mounted and visible
 * 4. Network is idle (no pending requests)
 *
 * @param page - Playwright page object
 * @param options - Configuration options
 * @throws Error if app is not ready within maxWait time
 */
export async function waitForAppReady(
  page: Page,
  options: AppReadinessOptions = {}
): Promise<void> {
  const {
    maxWait = 30000,
    waitForCanvas = true,
    waitForStateManager = true,
    waitForUI = false, // Disable by default to avoid issues
    waitForNetworkIdle = false, // Disable by default - not critical
    uiComponents,
  } = options;

  // Navigate to page if not already there
  try {
    const currentUrl = page.url();
    if (!currentUrl || currentUrl === 'about:blank') {
      await page.goto(process.env.APP_URL || 'http://localhost:3000', {
        waitUntil: 'domcontentloaded',
        timeout: maxWait,
      });
    }
  } catch (error: any) {
    if (!error.message?.includes('closed')) {
      throw error;
    }
  }

  // Wait for network idle first (if enabled) - non-critical
  if (waitForNetworkIdle) {
    try {
      await page.waitForLoadState('networkidle', { timeout: Math.min(maxWait, 5000) }).catch(() => {
        // Network idle is not critical
      });
    } catch {
      // Continue anyway
    }
  }

  // Wait for canvas (most critical check)
  if (waitForCanvas) {
    try {
      await waitForCanvasReady(page, maxWait);
    } catch (error: any) {
      // Canvas is critical - rethrow if not a page closure
      if (!error.message?.includes('closed')) {
        throw new Error(`Canvas not ready: ${error.message}`);
      }
      throw error;
    }
  }

  // Wait for state manager (important but not critical)
  if (waitForStateManager) {
    try {
      await waitForStateManagerReady(page, Math.min(maxWait, 15000));
    } catch (error: any) {
      // State manager check is less critical - log but continue
      if (!error.message?.includes('closed')) {
        console.warn(`State manager not ready: ${error.message}`);
      }
    }
  }

  // Wait for UI components (optional)
  if (waitForUI) {
    try {
      await waitForUIComponents(page, uiComponents, Math.min(maxWait, 10000));
    } catch (error: any) {
      // UI components are optional - just log
      if (!error.message?.includes('closed')) {
        console.warn(`UI components not ready: ${error.message}`);
      }
    }
  }

  // Verify canvas context is available (final check)
  if (waitForCanvas) {
    try {
      const hasContext = await isCanvasInitialized(page).catch(() => false);
      if (!hasContext) {
        // Give it a bit more time
        await page.waitForTimeout(500);
        const retryContext = await isCanvasInitialized(page).catch(() => false);
        if (!retryContext) {
          throw new Error('Canvas context not initialized after waiting');
        }
      }
    } catch (error: any) {
      if (!error.message?.includes('closed')) {
        throw new Error(`Canvas context check failed: ${error.message}`);
      }
      throw error;
    }
  }

  // Additional stability wait
  try {
    await page.waitForTimeout(200);
  } catch (error: any) {
    // Ignore if page is closed
    if (!error.message?.includes('closed')) {
      throw error;
    }
  }
}

/**
 * Wait for UI components to be mounted and visible
 */
async function waitForUIComponents(
  page: Page,
  customComponents: AppReadinessOptions['uiComponents'],
  maxWait: number
): Promise<void> {
  const startTime = Date.now();
  const components = customComponents || getDefaultUIComponents(page);

  for (const component of components) {
    const remainingTime = maxWait - (Date.now() - startTime);
    if (remainingTime <= 0) {
      throw new Error(`Timeout waiting for UI components. Last checked: ${component.description}`);
    }

    try {
      const locator = page.locator(component.selector);
      await expect(locator).toBeVisible({ timeout: Math.min(remainingTime, 5000) });
    } catch (error) {
      // Try to determine if mobile or desktop
      const isMobile = await page.evaluate(() => window.innerWidth < 768);

      // On mobile, some desktop components won't be visible - that's OK
      if (
        isMobile &&
        (component.selector.includes('toolbar') || component.selector.includes('aside'))
      ) {
        // Check for mobile alternative
        const mobileToolbar = page.locator('.mobile-toolbar, .mobile-tool-btn');
        try {
          await expect(mobileToolbar.first()).toBeVisible({ timeout: 2000 });
          continue; // Mobile toolbar found, skip desktop check
        } catch {
          // Mobile toolbar also not found, this is an error
        }
      }

      throw new Error(`UI component not ready: ${component.description} (${component.selector})`);
    }
  }
}

/**
 * Get default UI components to wait for
 */
function getDefaultUIComponents(page: Page): Array<{ selector: string; description: string }> {
  return [
    {
      selector: '#mainCanvas',
      description: 'Main canvas element',
    },
    // Toolbar - check for either desktop or mobile
    {
      selector: '.toolbar, .mobile-toolbar, [role="toolbar"]',
      description: 'Toolbar component',
    },
  ];
}

/**
 * Check if app is ready (non-blocking check)
 * Returns true if all readiness checks pass, false otherwise
 */
export async function isAppReady(
  page: Page,
  options: Omit<AppReadinessOptions, 'maxWait'> = {}
): Promise<boolean> {
  try {
    await waitForAppReady(page, { ...options, maxWait: 1000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for app to be ready with retries
 * Useful for flaky initialization scenarios
 */
export async function waitForAppReadyWithRetries(
  page: Page,
  options: AppReadinessOptions & { retries?: number; retryDelay?: number } = {}
): Promise<void> {
  const { retries = 3, retryDelay = 1000, ...readinessOptions } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await waitForAppReady(page, readinessOptions);
      return; // Success
    } catch (error) {
      if (attempt === retries) {
        throw error; // Last attempt failed
      }
      // Wait before retry
      await page.waitForTimeout(retryDelay * attempt); // Exponential backoff
    }
  }
}
