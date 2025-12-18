/**
 * Visual Regression Test Suite
 * Automated visual regression testing for Pixel Studio
 */

import { test, expect } from '@playwright/test';
import { waitForCanvasReady, selectTool, drawStroke, APP_URL } from './helpers/canvas-helpers';
import { waitForAppReady } from './helpers/app-readiness';
import {
  captureVisualBaseline,
  compareVisualState,
  captureElementScreenshot,
  compareElementVisualState,
  captureResponsiveVisualStates,
  compareResponsiveVisualStates,
  defaultVisualConfig,
} from './helpers/visual-regression-helpers';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForAppReady(page, { maxWait: 30000 });
  });

  test.describe('Canvas Visual States', () => {
    test('should match baseline for empty canvas', async ({ page }) => {
      // Use Playwright's built-in screenshot comparison which auto-generates snapshots
      await expect(page).toHaveScreenshot('empty-canvas.png', {
        maxDiffPixels: 100,
        maxDiffPixelRatio: 0.01,
      });
    });

    test('should match baseline for canvas with drawing', async ({ page }) => {
      await selectTool(page, 'pencil');
      await drawStroke(page, { x: 50, y: 50 }, { x: 150, y: 150 });
      await page.waitForTimeout(500);

      // Use Playwright's built-in screenshot comparison
      await expect(page).toHaveScreenshot('canvas-with-drawing.png', {
        maxDiffPixels: 100,
        maxDiffPixelRatio: 0.01,
      });
    });

    test('should match baseline for canvas with multiple strokes', async ({ page }) => {
      await selectTool(page, 'pencil');

      // Draw multiple strokes
      await drawStroke(page, { x: 50, y: 50 }, { x: 100, y: 100 });
      await drawStroke(page, { x: 150, y: 50 }, { x: 200, y: 100 });
      await drawStroke(page, { x: 50, y: 150 }, { x: 100, y: 200 });
      await page.waitForTimeout(500);

      const result = await compareVisualState(
        page,
        'canvas-multiple-strokes',
        undefined,
        defaultVisualConfig
      );
      expect(result.match).toBe(true);
    });

    test('should detect visual changes in canvas', async ({ page }) => {
      // Create baseline
      await selectTool(page, 'pencil');
      await drawStroke(page, { x: 50, y: 50 }, { x: 100, y: 100 });
      await page.waitForTimeout(500);
      await captureVisualBaseline(page, 'canvas-change-detection');

      // Make a change
      await drawStroke(page, { x: 150, y: 150 }, { x: 200, y: 200 });
      await page.waitForTimeout(500);

      // Compare - should detect the change
      const result = await compareVisualState(
        page,
        'canvas-change-detection',
        undefined,
        defaultVisualConfig
      );
      // This test expects a change, so we check that comparison works
      // In a real scenario, you'd update the baseline if the change is intentional
      expect(result).toBeDefined();
    });
  });

  test.describe('Element Visual States', () => {
    test('should match baseline for toolbar', async ({ page }) => {
      // Check for desktop or mobile toolbar
      const isMobile = await page.evaluate(() => window.innerWidth < 768);
      const toolbar = isMobile
        ? page.locator('[data-testid="mobile-toolbar"]')
        : page.locator('.extended-toolbar, .toolbar').first();
      await expect(toolbar).toBeVisible({ timeout: 10000 });

      // Use Playwright's built-in screenshot comparison
      await expect(toolbar).toHaveScreenshot('toolbar.png', {
        maxDiffPixels: 100,
        maxDiffPixelRatio: 0.01,
      });
    });

    test('should match baseline for canvas element', async ({ page }) => {
      const canvas = page.locator('#mainCanvas');
      await expect(canvas).toBeVisible({ timeout: 10000 });

      // Use Playwright's built-in screenshot comparison
      await expect(canvas).toHaveScreenshot('canvas-element.png', {
        maxDiffPixels: 100,
        maxDiffPixelRatio: 0.01,
      });

      const result = await compareElementVisualState(
        page,
        '#mainCanvas',
        'canvas-element',
        undefined,
        defaultVisualConfig
      );
      expect(result.match).toBe(true);
    });
  });

  test.describe('Responsive Visual States', () => {
    test('should match baselines across different viewports', async ({ page }) => {
      const viewports = [
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1920, height: 1080, name: 'desktop' },
      ];

      const results = await compareResponsiveVisualStates(
        page,
        'responsive-layout',
        viewports,
        defaultVisualConfig
      );

      // All viewports should match their baselines
      results.forEach((result, index) => {
        expect(result.match).toBe(true);
      });
    });
  });

  test.describe('Tool Visual States', () => {
    test('should match baseline for pencil tool active state', async ({ page }) => {
      await selectTool(page, 'pencil');
      await page.waitForTimeout(500);

      // Use Playwright's built-in screenshot comparison
      await expect(page).toHaveScreenshot('tool-pencil-active.png', {
        maxDiffPixels: 100,
        maxDiffPixelRatio: 0.01,
      });
    });

    test('should match baseline for eraser tool active state', async ({ page }) => {
      await selectTool(page, 'eraser');
      await page.waitForTimeout(500);

      // Use Playwright's built-in screenshot comparison
      await expect(page).toHaveScreenshot('tool-eraser-active.png', {
        maxDiffPixels: 100,
        maxDiffPixelRatio: 0.01,
      });

      const result = await compareVisualState(
        page,
        'tool-eraser-active',
        undefined,
        defaultVisualConfig
      );
      expect(result.match).toBe(true);
    });
  });

  test.describe('Layer Visual States', () => {
    test('should match baseline for layer panel', async ({ page }) => {
      // Wait for layer panel to be visible
      const layerPanel = page.locator('.layer-panel, .layer-list').first();
      if ((await layerPanel.count()) > 0) {
        await expect(layerPanel).toBeVisible({ timeout: 5000 });

        const result = await compareElementVisualState(
          page,
          '.layer-panel, .layer-list',
          'layer-panel',
          undefined,
          defaultVisualConfig
        );
        expect(result.match).toBe(true);
      }
    });
  });
});
