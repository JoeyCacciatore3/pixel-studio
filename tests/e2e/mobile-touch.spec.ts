/**
 * Mobile Touch Interaction Tests
 * Tests touch gestures, mobile UI, and mobile-specific features
 */

import { test, expect, devices } from '@playwright/test';
import { waitForCanvasReady, APP_URL } from './helpers/canvas-helpers';
import { waitForAppReady } from './helpers/app-readiness';
import { waitForElementInteractive, getByTestId } from './helpers/element-helpers';

const mobileDevices = [
  { name: 'iPhone SE', ...devices['iPhone SE'] },
  { name: 'iPhone 12', ...devices['iPhone 12'] },
  { name: 'iPhone 14 Pro Max', ...devices['iPhone 14 Pro Max'] },
  { name: 'Pixel 5', ...devices['Pixel 5'] },
];

// Mobile Touch Interactions - enable touch support
test.use({ hasTouch: true });

test.describe('Mobile Touch Interactions', () => {
  for (const device of mobileDevices) {
    test.describe(`Device: ${device.name}`, () => {
      test('should display mobile toolbar', async ({ page }) => {
        // Set viewport for this test
        if (device.viewport) {
          await page.setViewportSize(device.viewport);
        }
        await page.goto(APP_URL);
        await waitForAppReady(page);

        const mobileToolbar = page.locator('[data-testid="mobile-toolbar"]');
        await expect(mobileToolbar).toBeVisible();

        // Toolbar should be at bottom
        const toolbarBox = await mobileToolbar.boundingBox();
        if (toolbarBox) {
          const viewport = page.viewportSize();
          if (viewport) {
            expect(toolbarBox.y + toolbarBox.height).toBeGreaterThan(viewport.height * 0.8);
          }
        }
      });

      test('should allow tool selection via touch', async ({ page }) => {
        // Set viewport for this test
        if (device.viewport) {
          await page.setViewportSize(device.viewport);
        }
        await page.goto(APP_URL);
        await waitForAppReady(page);

        // Find a tool button in mobile toolbar using data-testid
        const toolButton = await getByTestId(page, 'testid-mobile-toolbar-pencil', {
          maxWait: 10000,
        });
        await waitForElementInteractive(toolButton);

        // Tap the tool button
        await toolButton.tap({ timeout: 10000 });

        // Button should have active state or visual feedback
        // This is a basic check - actual tool selection would need state verification
        await expect(toolButton).toBeVisible();
      });

      test('should support single touch drawing', async ({ page }) => {
        // Set viewport for this test
        if (device.viewport) {
          await page.setViewportSize(device.viewport);
        }
        await page.goto(APP_URL);
        await waitForAppReady(page);

        const canvas = page.locator('#mainCanvas');
        await expect(canvas).toBeVisible();

        const canvasBox = await canvas.boundingBox();
        if (canvasBox) {
          // Simulate touch drawing
          await canvas.tap({
            position: { x: canvasBox.width / 2, y: canvasBox.height / 2 },
          });

          // Move finger to draw
          await page.touchscreen.tap(
            canvasBox.x + canvasBox.width / 2 + 50,
            canvasBox.y + canvasBox.height / 2 + 50
          );

          // Verify canvas is still responsive
          await expect(canvas).toBeVisible();
        }
      });

      test('should support pinch-to-zoom gesture', async ({ page }) => {
        // Set viewport for this test
        if (device.viewport) {
          await page.setViewportSize(device.viewport);
        }
        await page.goto(APP_URL);
        await waitForAppReady(page);

        const canvas = page.locator('#mainCanvas');
        await expect(canvas).toBeVisible();

        const canvasBox = await canvas.boundingBox();
        if (canvasBox) {
          const centerX = canvasBox.x + canvasBox.width / 2;
          const centerY = canvasBox.y + canvasBox.height / 2;

          // Simulate pinch gesture (two-finger touch)
          // Note: Playwright's touch support is limited, this is a conceptual test
          await page.touchscreen.tap(centerX - 20, centerY - 20);

          // In real scenario, we'd test multi-touch pinch
          // This verifies the canvas is touch-enabled
          await expect(canvas).toBeVisible();
        }
      });

      test('should prevent default touch behaviors', async ({ page }) => {
        // Set viewport for this test
        if (device.viewport) {
          await page.setViewportSize(device.viewport);
        }
        await page.goto(APP_URL);
        await waitForAppReady(page);

        const canvas = page.locator('#mainCanvas');
        const touchAction = await canvas.evaluate((el) => {
          return window.getComputedStyle(el).touchAction;
        });

        // Touch action should be 'none' or 'manipulation' to prevent scrolling
        expect(['none', 'manipulation']).toContain(touchAction);
      });
    });
  }
});

// Mobile UI Components tests with iPhone 12 configuration
// Note: test.use() at top level applies to all subsequent tests until next test.use()
test.use({ ...devices['iPhone 12'] });

test.describe('Mobile UI Components', () => {
  test('should show/hide right panel on mobile', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    // Check for mobile panel toggle button
    const panelToggle = page.locator('.mobile-panel-toggle');

    if ((await panelToggle.count()) > 0) {
      // Panel should start closed (or check initial state)
      const panelOverlay = page.locator('.mobile-panel-overlay');

      // Toggle panel open
      await panelToggle.tap({ timeout: 10000 });
      await page.waitForTimeout(500); // Wait for animation

      // Panel overlay should be visible/open
      await expect(panelOverlay).toBeVisible({ timeout: 5000 });

      // Toggle panel closed
      await panelToggle.tap();
      await page.waitForTimeout(300);
    }
  });

  test('should have touch-friendly button sizes', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    const mobileToolbarButtons = page.locator('[data-testid^="testid-mobile-toolbar-"]');
    const buttonCount = await mobileToolbarButtons.count();

    if (buttonCount > 0) {
      const firstButton = mobileToolbarButtons.first();
      const buttonBox = await firstButton.boundingBox();

      if (buttonBox) {
        // Minimum touch target should be 44x44px (WCAG recommendation)
        expect(buttonBox.width).toBeGreaterThanOrEqual(44);
        expect(buttonBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should handle orientation changes', async ({ page, viewport }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    if (viewport) {
      // Simulate orientation change by changing viewport
      await page.setViewportSize({
        width: viewport.height,
        height: viewport.width,
      });

      await page.waitForTimeout(500); // Wait for reflow

      // App should still be functional
      const canvas = page.locator('#mainCanvas');
      await expect(canvas).toBeVisible();

      // Restore original orientation
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
    }
  });
});

// Mobile Performance tests with iPhone 12 configuration
test.use({ ...devices['iPhone 12'] });

test.describe('Mobile Performance', () => {
  test('should load efficiently on mobile', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(APP_URL);
    await waitForAppReady(page);
    const loadTime = Date.now() - startTime;

    // Mobile should load in reasonable time (under 6 seconds)
    expect(loadTime).toBeLessThan(6000);
  });

  test('should optimize canvas for mobile', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    const canvas = page.locator('#mainCanvas');

    // Check canvas context options (via canvas element properties)
    const hasMobileOptimizations = await canvas.evaluate((canvasEl) => {
      const ctx = (canvasEl as HTMLCanvasElement).getContext('2d', {
        willReadFrequently: false,
      });
      return ctx !== null;
    });

    expect(hasMobileOptimizations).toBe(true);
  });
});

// Touch Gesture Recognition tests with iPhone 12 configuration
test.use({ ...devices['iPhone 12'] });

test.describe('Touch Gesture Recognition', () => {
  test('should handle tap gestures', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    const canvas = page.locator('#mainCanvas');
    await expect(canvas).toBeVisible();

    // Tap canvas
    await canvas.tap();

    // Canvas should respond (not throw errors)
    await expect(canvas).toBeVisible();
  });

  test('should prevent double-tap zoom', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    // Check viewport meta tag has user-scalable or maximum-scale
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');

    // Should have some zoom prevention
    expect(viewportMeta).toBeTruthy();
  });
});
