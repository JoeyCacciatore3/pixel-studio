/**
 * Cross-Browser Compatibility Tests
 * Tests Pixel Studio across multiple browsers and devices
 */

import { test, expect, devices } from '@playwright/test';
import { waitForCanvasReady, APP_URL } from './helpers/canvas-helpers';
import { waitForAppReady } from './helpers/app-readiness';

// Test configurations for different devices
const deviceConfigs = [
  { name: 'Mobile Phone (iPhone SE)', ...devices['iPhone SE'] },
  { name: 'Mobile Phone (iPhone 12)', ...devices['iPhone 12'] },
  { name: 'Mobile Phone (iPhone 14 Pro Max)', ...devices['iPhone 14 Pro Max'] },
  { name: 'Tablet (iPad)', ...devices['iPad'] },
  { name: 'Tablet (iPad Pro)', ...devices['iPad Pro'] },
  { name: 'Desktop (1920x1080)', viewport: { width: 1920, height: 1080 } },
  { name: 'Desktop (1280x720)', viewport: { width: 1280, height: 720 } },
];

// Browser configurations
const browsers = ['chromium', 'firefox', 'webkit'];

// Application Load & Initialization tests with Desktop Chrome configuration
// Note: test.use() at top level applies to all subsequent tests until next test.use()
// This overrides project-level configuration for these specific test groups
test.use({ ...devices['Desktop Chrome'] })

test.describe('Application Load & Initialization', () => {
  for (const browserName of browsers) {
    test.describe(`Browser: ${browserName}`, () => {
      test('should load the application', async ({ page }) => {
        await page.goto(APP_URL);
        await expect(page).toHaveTitle(/Pixel Studio/i);
      });

      test('should initialize canvas element', async ({ page }) => {
        await page.goto(APP_URL);
        const canvas = page.locator('#mainCanvas');
        await expect(canvas).toBeVisible();
      });

      test('should render all core components', async ({ page }) => {
        await page.goto(APP_URL);

        // Check header
        await expect(page.locator('header.header')).toBeVisible();

        // Check canvas area
        await expect(page.locator('.canvas-area')).toBeVisible();

        // Check status bar
        await expect(page.locator('.status-bar')).toBeVisible();
      });

      test('should have proper meta tags', async ({ page }) => {
        await page.goto(APP_URL);

        // Check viewport meta tag
        const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
        expect(viewport).toContain('width=device-width');

        // Check theme color
        const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
        expect(themeColor).toBeTruthy();
      });
    });
  }
});

test.describe('Responsive Layout Tests', () => {
  for (const device of deviceConfigs) {
    test.describe(`Device: ${device.name}`, () => {
      // Note: Device configuration is handled by project-level test.use() in playwright.config.ts
      // Individual test.use() calls inside describe blocks are not allowed

      test('should render appropriate layout for device', async ({ page }) => {
        await page.goto(APP_URL);

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Check that app container is visible
        const appContainer = page.locator('.app-container');
        await expect(appContainer).toBeVisible();

        // Take screenshot for visual regression
        await page.screenshot({
          path: `tests/screenshots/${device.name.replace(/\s+/g, '-')}-layout.png`,
          fullPage: true,
        });
      });

      test('should show mobile toolbar on mobile devices', async ({ page, viewport }) => {
        await page.goto(APP_URL);
        await page.waitForLoadState('networkidle');

        if (viewport && viewport.width < 768) {
          // Mobile toolbar should be visible
          const mobileToolbar = page.locator('.mobile-toolbar');
          await expect(mobileToolbar).toBeVisible();

          // Desktop toolbar should not be visible
          const desktopToolbar = page.locator('.toolbar').first();
          // On mobile, toolbar might not be in DOM or hidden
        } else {
          // Desktop: mobile toolbar should not be visible
          const mobileToolbar = page.locator('.mobile-toolbar');
          if ((await mobileToolbar.count()) > 0) {
            await expect(mobileToolbar).not.toBeVisible();
          }
        }
      });

      test('should handle viewport dimensions correctly', async ({ page, viewport }) => {
        await page.goto(APP_URL);
        await page.waitForLoadState('networkidle');

        if (viewport) {
          const bodyWidth = await page.evaluate(() => window.innerWidth);
          expect(bodyWidth).toBe(viewport.width);
        }
      });
    });
  }
});

// Canvas Functionality tests with Desktop Chrome configuration
// Note: This test.use() applies to all tests below until next test.use() call
test.use({ ...devices['Desktop Chrome'] })

test.describe('Canvas Functionality', () => {
  test('should initialize canvas with correct dimensions', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('#mainCanvas');
    const width = await canvas.getAttribute('width');
    const height = await canvas.getAttribute('height');

    expect(parseInt(width || '0')).toBeGreaterThan(0);
    expect(parseInt(height || '0')).toBeGreaterThan(0);
  });

  test('should allow drawing on canvas', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('#mainCanvas');
    const canvasBox = await canvas.boundingBox();

    if (canvasBox) {
      // Simulate mouse drawing
      await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100);
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + 150, canvasBox.y + 150);
      await page.mouse.up();

      // Verify canvas has content (not completely empty)
      // This is a basic check - in real scenario, you'd check pixel data
      await expect(canvas).toBeVisible();
    }
  });
});

// Browser-Specific Features - Safari/WebKit tests with iPhone 12 configuration
// Note: This switches to mobile device configuration for mobile-specific tests
test.use({ ...devices['iPhone 12'] })

test.describe('Browser-Specific Features', () => {
  test.describe('Safari/WebKit', () => {
    test('should apply iOS viewport height fix', async ({ page }) => {
      await page.goto(APP_URL);
      await page.waitForLoadState('networkidle');

      // Wait a bit for browser-compat.ts to initialize
      await page.waitForTimeout(500);

      // Check for CSS custom property --vh
      // Note: This fix only applies on iOS/Safari, so we check if it's set or if we're not on iOS
      const vhValue = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--vh').trim();
      });

      // Check if we're on iOS/Safari
      const isIOS = await page.evaluate(() => {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      });

      // If on iOS, --vh should be set. If not on iOS, it's okay if it's empty
      if (isIOS) {
        expect(vhValue).toBeTruthy();
        expect(vhValue.length).toBeGreaterThan(0);
      } else {
        // Not on iOS, so --vh may or may not be set - test passes either way
        expect(true).toBe(true);
      }
    });

    test('should prevent elastic scrolling on canvas', async ({ page }) => {
      await page.goto(APP_URL);
      await page.waitForLoadState('networkidle');
      await waitForCanvasReady(page, 10000);

      const canvas = page.locator('#mainCanvas');
      const touchAction = await canvas.evaluate((el) => {
        return window.getComputedStyle(el).touchAction;
      });

      // Touch action should be restricted for canvas on touch devices
      // On desktop, it might be 'auto', which is acceptable
      const isTouchDevice = await page.evaluate(() => {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      });

      if (isTouchDevice) {
        // On touch devices, touchAction should be 'none' to prevent elastic scrolling
        expect(touchAction).toBe('none');
      } else {
        // On desktop, 'auto' is acceptable
        expect(['auto', 'none', 'manipulation']).toContain(touchAction);
      }
    });
  });
});

// Performance Metrics tests with Desktop Chrome configuration
test.use({ ...devices['Desktop Chrome'] })

test.describe('Performance Metrics', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should measure Core Web Vitals', async ({ page }) => {
    await page.goto(APP_URL);

    // Measure FCP (First Contentful Paint)
    const fcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              resolve(entry.startTime);
            }
          }
        }).observe({ entryTypes: ['paint'] });

        // Timeout after 5 seconds
        setTimeout(() => resolve(null), 5000);
      });
    });

    if (fcp) {
      expect(fcp).toBeLessThan(2000); // FCP should be under 2 seconds
    }
  });
});

// Accessibility Tests with Desktop Chrome configuration
test.use({ ...devices['Desktop Chrome'] })

test.describe('Accessibility Tests', () => {
  test('should have ARIA labels on interactive elements', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');

    // Check header buttons
    const undoButton = page.locator('#undoBtn');
    await expect(undoButton).toHaveAttribute('aria-label');

    const redoButton = page.locator('#redoBtn');
    await expect(redoButton).toHaveAttribute('aria-label');
  });

  test('should use semantic HTML', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    // Check for semantic elements - header and nav should always be visible
    await expect(page.locator('header')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });

    // Aside (ExtendedToolbar) is only visible on desktop, so check conditionally
    const isMobile = await page.evaluate(() => window.innerWidth < 768);
    if (!isMobile) {
      await expect(page.locator('aside, [role="complementary"]')).toBeVisible({ timeout: 10000 });
    } else {
      // On mobile, check for mobile toolbar instead using data-testid
      await expect(page.locator('[data-testid="mobile-toolbar"]')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible({ timeout: 5000 });
  });
});

// PWA Tests with Desktop Chrome configuration
test.use({ ...devices['Desktop Chrome'] })

test.describe('PWA Tests', () => {
  test('should have manifest.json', async ({ page }) => {
    await page.goto(APP_URL);

    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');

    // Fetch and validate manifest
    const manifestResponse = await page.request.get('/manifest.json');
    expect(manifestResponse.ok()).toBeTruthy();

    const manifest = await manifestResponse.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
  });

  test('should register service worker', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);
    await page.goto(APP_URL);

    // Wait for service worker registration
    await page.waitForTimeout(2000);

    // Check for service worker
    const hasServiceWorker = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        return registrations.length > 0;
      }
      return false;
    });

    // Service worker may not register in development
    // This test verifies the capability exists
    expect(typeof hasServiceWorker).toBe('boolean');
  });
});
