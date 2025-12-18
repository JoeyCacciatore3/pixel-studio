/**
 * Mobile-Specific Basic Functions Tests
 * Tests touch interactions, pinch zoom, and mobile-specific UI
 */

import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers/app-readiness';
import {
  testPinchZoom,
  getCanvasContainerBounds,
  verifyContainerStationary,
  getZoomLevel,
} from './helpers/zoom-helpers';
import {
  uploadTestImage,
  verifyImageLoaded,
  createTestImageFile,
  cleanupTestImage,
} from './helpers/upload-helpers';
import { triggerExport, verifyExportDownloaded } from './helpers/export-helpers';

test.describe('Mobile Basic Functions', () => {
  test.beforeEach(async ({ page }) => {
    // Skip if not mobile
    const projectName = test.info().project.name;
    const isMobile = projectName.includes('Mobile') || projectName.includes('Tablet');

    if (!isMobile) {
      test.skip();
      return;
    }

    await waitForAppReady(page);
  });

  test('should select tool via touch', async ({ page }) => {
    // On mobile, tools are in mobile toolbar
    const mobileToolbar = page.locator('[data-testid="mobile-toolbar"]');
    await expect(mobileToolbar).toBeVisible({ timeout: 10000 });

    // Find pencil tool button
    const pencilBtn = page.locator('[data-testid="testid-mobile-toolbar-pencil"]');
    await expect(pencilBtn).toBeVisible({ timeout: 10000 });

    // Tap the tool button
    await pencilBtn.tap();
    await page.waitForTimeout(300);

    // Verify tool is selected (button should have active class)
    const isActive = await pencilBtn.evaluate((el) => el.classList.contains('active'));
    expect(isActive).toBe(true);
  });

  test('should perform pinch zoom gesture', async ({ page }) => {
    const canvas = page.locator('#mainCanvas');
    const canvasWrapper = page.locator('.canvas-wrapper');

    // Get initial state
    const beforeBounds = await getCanvasContainerBounds(page);
    expect(beforeBounds).not.toBeNull();
    const beforeZoom = await getZoomLevel(page);

    // Perform pinch zoom out
    await testPinchZoom(canvas, { direction: 'out', deltaX: 50, steps: 5 });
    await page.waitForTimeout(1000);

    // Verify container stayed stationary
    const afterBounds = await getCanvasContainerBounds(page);
    if (beforeBounds && afterBounds) {
      verifyContainerStationary(beforeBounds, afterBounds);
    }

    // Verify zoom changed
    const afterZoom = await getZoomLevel(page);
    expect(afterZoom).not.toBe(beforeZoom);
  });

  test('should toggle mobile panel', async ({ page }) => {
    const mobilePanelToggle = page.locator('.mobile-panel-toggle');
    await expect(mobilePanelToggle).toBeVisible({ timeout: 10000 });

    // Get initial state
    const initialExpanded = await mobilePanelToggle.getAttribute('aria-expanded');

    // Tap to toggle
    await mobilePanelToggle.tap();
    await page.waitForTimeout(500);

    // Verify state changed
    const afterToggle = await mobilePanelToggle.getAttribute('aria-expanded');
    expect(afterToggle).not.toBe(initialExpanded);
  });

  test('should upload image on mobile', async ({ page }) => {
    const imagePath = createTestImageFile();
    try {
      await uploadTestImage(page, imagePath);
      await page.waitForTimeout(2000);

      const imageLoaded = await verifyImageLoaded(page);
      expect(imageLoaded).toBe(true);
    } finally {
      cleanupTestImage(imagePath);
    }
  });

  test('should export on mobile', async ({ page }) => {
    // Draw something first
    const canvas = page.locator('#mainCanvas');
    await canvas.tap({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(1000);

    // Trigger export
    const { download, filename } = await triggerExport(page);

    // Verify download occurred
    const downloaded = await verifyExportDownloaded(download);
    expect(downloaded).toBe(true);
    expect(filename).toContain('.png');
  });

  test('should access mobile toolbar tools', async ({ page }) => {
    const mobileToolbar = page.locator('[data-testid="mobile-toolbar"]');
    await expect(mobileToolbar).toBeVisible({ timeout: 10000 });

    // Test accessing tools
    const tools = ['pencil', 'eraser', 'bucket'];

    for (const toolName of tools) {
      const toolBtn = page.locator(`[data-testid="testid-mobile-toolbar-${toolName}"]`);
      if (await toolBtn.isVisible().catch(() => false)) {
        await toolBtn.tap();
        await page.waitForTimeout(300);

        // Verify tool is active
        const isActive = await toolBtn.evaluate((el) => el.classList.contains('active'));
        expect(isActive).toBe(true);
      }
    }
  });

  test('should handle touch drawing', async ({ page }) => {
    const canvas = page.locator('#mainCanvas');

    // Select pencil tool
    const pencilBtn = page.locator('[data-testid="testid-mobile-toolbar-pencil"]');
    if (await pencilBtn.isVisible().catch(() => false)) {
      await pencilBtn.tap();
      await page.waitForTimeout(300);
    }

    // Perform touch drawing
    const startPos = { x: 100, y: 100 };
    const endPos = { x: 200, y: 200 };

    // Touch start
    await canvas.dispatchEvent('touchstart', {
      touches: [{ identifier: 0, clientX: startPos.x, clientY: startPos.y }],
      changedTouches: [{ identifier: 0, clientX: startPos.x, clientY: startPos.y }],
      targetTouches: [{ identifier: 0, clientX: startPos.x, clientY: startPos.y }],
    });

    // Touch move
    await canvas.dispatchEvent('touchmove', {
      touches: [{ identifier: 0, clientX: endPos.x, clientY: endPos.y }],
      changedTouches: [{ identifier: 0, clientX: endPos.x, clientY: endPos.y }],
      targetTouches: [{ identifier: 0, clientX: endPos.x, clientY: endPos.y }],
    });

    // Touch end
    await canvas.dispatchEvent('touchend', {
      touches: [],
      changedTouches: [{ identifier: 0, clientX: endPos.x, clientY: endPos.y }],
      targetTouches: [],
    });

    await page.waitForTimeout(1000);

    // Verify something was drawn (canvas should have content)
    const hasContent = await verifyImageLoaded(page);
    expect(hasContent).toBe(true);
  });
});
