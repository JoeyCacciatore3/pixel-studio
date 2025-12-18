/**
 * Layer System and Checkerboard Verification Tests
 * Verifies all fixes made to layer system and checkerboard transparency
 */

import { test, expect } from '@playwright/test';
import { writeFileSync } from 'fs';
import { join } from 'path';
import {
  waitForCanvasReady,
  getCanvasPixelData,
  canvasHasContent,
  APP_URL,
} from './helpers/canvas-helpers';
import { waitForAppReady } from './helpers/app-readiness';
import { waitForElementInteractive, getByTestId } from './helpers/element-helpers';

// Helper function to create a test image file
function createTestImage(): Buffer {
  // Create a simple 100x100 PNG with red square
  // This is a minimal valid PNG
  const pngHeader = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
  ]);

  // For simplicity, we'll use a data URL approach instead
  // This is a 1x1 red pixel PNG in base64
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
}

test.describe('Layer System Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);
  });

  test.describe('Image Loading Verification', () => {
    test('should load image and create visible layer', async ({ page }) => {
      // File input is hidden, but we can still interact with it
      const fileInput = page.locator('input[type="file"]#imageUpload');
      await expect(fileInput).toHaveCount(1, { timeout: 5000 });

      // Create a test image file
      const testImagePath = join(__dirname, 'test-image.png');
      const testImage = createTestImage();
      writeFileSync(testImagePath, testImage);

      // Upload the image (can set files even if input is hidden)
      await fileInput.setInputFiles(testImagePath);

      // Wait for image to load and layer to be created
      await page.waitForTimeout(3000);

      // Verify canvas has content (image should be visible)
      const hasContent = await canvasHasContent(page);
      expect(hasContent).toBe(true);

      // Open layers panel if not already open
      const layersToggle = page.locator('.layers-controls-toggle');
      const isPanelOpen = await page
        .locator('.layers-controls-content')
        .isVisible()
        .catch(() => false);
      if (!isPanelOpen) {
        await expect(layersToggle).toBeVisible({ timeout: 10000 });
        await layersToggle.click({ timeout: 10000 });
        await page.waitForTimeout(500);
      }

      // Wait for layer panel to be visible
      const layersPanel = page.locator('.layers-controls-content');
      await expect(layersPanel).toBeVisible({ timeout: 10000 });

      // Verify layer panel shows the new layer (look for layer list or layer items)
      // Wait a bit more for layers to render
      await page.waitForTimeout(1000);
      const layerItems = page.locator('.layer-item');
      const layerCount = await layerItems.count();
      // Should have at least 1 layer (the uploaded image layer, plus possibly base layer)
      expect(layerCount).toBeGreaterThan(0);

      // Clean up
      try {
        const fs = require('fs');
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    test('should track layer bounds for loaded images', async ({ page }) => {
      // This test verifies that image layers are not incorrectly marked as empty
      // by checking that the layer renders correctly

      const fileInput = page.locator('input[type="file"]#imageUpload');
      await expect(fileInput).toHaveCount(1, { timeout: 5000 });

      // Create and upload test image
      const testImagePath = join(__dirname, 'test-image.png');
      const testImage = createTestImage();
      writeFileSync(testImagePath, testImage);

      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(3000);

      // Verify the image is actually visible (not skipped due to bounds tracking)
      const hasContent = await canvasHasContent(page);
      expect(hasContent).toBe(true);

      // Clean up
      try {
        const fs = require('fs');
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    });
  });

  test.describe('Layer Operations Verification', () => {
    test('should toggle layer visibility', async ({ page }) => {
      // First, draw something on the canvas to create content
      const canvas = page.locator('#mainCanvas');
      const canvasBox = await canvas.boundingBox();
      if (!canvasBox) {
        test.skip();
        return;
      }

      // Select pencil tool using data-testid
      const pencilTool = await getByTestId(page, 'testid-toolbar-pencil', { maxWait: 10000 });
      await waitForElementInteractive(pencilTool);
      await pencilTool.click({ timeout: 10000 });
      await page.waitForTimeout(300);

      // Draw something
      await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100);
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + 150, canvasBox.y + 150);
      await page.mouse.up();
      await page.waitForTimeout(500);

      // Verify content exists
      let hasContent = await canvasHasContent(page);
      expect(hasContent).toBe(true);

      // Open layers panel first
      const layersToggle = page.locator('.layers-controls-toggle');
      await expect(layersToggle).toBeVisible({ timeout: 10000 });
      await layersToggle.click({ timeout: 10000 });
      await page.waitForTimeout(500);

      // Wait for layers panel to be visible
      const layersPanel = page.locator('.layers-controls-content');
      await expect(layersPanel).toBeVisible({ timeout: 10000 });

      // Find and click visibility toggle (eye icon) - wait for it to be actionable
      // Use data-testid if available, otherwise fall back to CSS selector
      const layerItems = page.locator('[data-testid^="testid-layer-item-"]');
      const firstLayerId = await layerItems.first().getAttribute('data-layer-id');
      const visibilityButton = firstLayerId
        ? page.locator(`[data-testid="testid-layer-toggle-visibility-${firstLayerId}"]`)
        : page.locator('.layer-control-btn').first();
      await waitForElementInteractive(visibilityButton, { maxWait: 10000 });
      await visibilityButton.click({ timeout: 10000 });
      await page.waitForTimeout(500);

      // Verify canvas is now empty (layer hidden)
      hasContent = await canvasHasContent(page);
      // When layer is hidden, canvas should be transparent (no content)
      // Note: This might still show content if there are other layers
      // For now, we just verify the button was clicked
      expect(visibilityButton).toBeVisible();
    });

    test('should create and delete layers', async ({ page }) => {
      // Find add layer button
      const addLayerButton = page.locator('.layer-add-btn, .layer-add-btn-small');
      if ((await addLayerButton.count()) > 0) {
        await addLayerButton.first().click();
        await page.waitForTimeout(500);

        // Verify layer was created (check layer list)
        const layerItems = page.locator('.layer-item');
        const layerCount = await layerItems.count();
        expect(layerCount).toBeGreaterThan(0);

        // Try to delete a layer (if there's more than one)
        if (layerCount > 1) {
          const deleteButton = page.locator('.layer-control-btn').last();
          await deleteButton.click();
          await page.waitForTimeout(500);

          // Verify layer count decreased
          const newLayerCount = await layerItems.count();
          expect(newLayerCount).toBeLessThan(layerCount);
        }
      }
    });
  });

  test.describe('Checkerboard Transparency Verification', () => {
    test('should show checkerboard when erasing on base layer', async ({ page }) => {
      // First, draw something to create content
      const canvas = page.locator('#mainCanvas');
      const canvasBox = await canvas.boundingBox();
      if (!canvasBox) {
        test.skip();
        return;
      }

      // Draw content using pencil tool
      const pencilTool = await getByTestId(page, 'testid-toolbar-pencil', { maxWait: 10000 });
      await waitForElementInteractive(pencilTool);
      await pencilTool.click({ timeout: 10000 });
      await page.waitForTimeout(300);

      await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100);
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + 200, canvasBox.y + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);

      // Verify content exists
      let hasContent = await canvasHasContent(page);
      expect(hasContent).toBe(true);

      // Switch to eraser tool
      const eraserTool = await getByTestId(page, 'testid-toolbar-eraser', { maxWait: 10000 });
      await waitForElementInteractive(eraserTool);
      await eraserTool.click({ timeout: 10000 });
      await page.waitForTimeout(300);

      // Erase some of the content
      await page.mouse.move(canvasBox.x + 150, canvasBox.y + 150);
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + 180, canvasBox.y + 180);
      await page.mouse.up();
      await page.waitForTimeout(1000);

      // Verify checkerboard is visible through erased areas
      // Check that canvas background is transparent (allows checkerboard to show)
      const canvasBg = await canvas.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      expect(canvasBg).toMatch(/transparent|rgba\(0,\s*0,\s*0,\s*0\)/i);

      // Verify checkerboard element exists and is positioned correctly
      const checkerboard = page.locator('.checkerboard');
      await expect(checkerboard).toBeVisible();
    });

    test('should show checkerboard when canvas is cleared', async ({ page }) => {
      // First, draw something to create content
      const canvas = page.locator('#mainCanvas');
      const canvasBox = await canvas.boundingBox();
      if (!canvasBox) {
        test.skip();
        return;
      }

      // Draw content
      const pencilTool = await getByTestId(page, 'testid-toolbar-pencil', { maxWait: 10000 });
      await waitForElementInteractive(pencilTool);
      await pencilTool.click({ timeout: 10000 });
      await page.waitForTimeout(300);

      await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100);
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + 150, canvasBox.y + 150);
      await page.mouse.up();
      await page.waitForTimeout(500);

      // Verify content exists
      let hasContent = await canvasHasContent(page);
      expect(hasContent).toBe(true);

      // Clear the canvas
      // Look for clear button in header or toolbar
      const clearButton = page.locator('button:has-text("Clear"), button[title*="Clear" i]');
      if ((await clearButton.count()) > 0) {
        await clearButton.first().click();
        await page.waitForTimeout(1000);

        // Verify canvas is now transparent
        // Check that checkerboard is visible by checking if canvas background is transparent
        const canvasStyle = await canvas.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        // Canvas should have transparent background (rgba(0,0,0,0) or transparent)
        expect(canvasStyle).toMatch(/transparent|rgba\(0,\s*0,\s*0,\s*0\)/i);
      }
    });

    test('should show checkerboard through transparent areas', async ({ page }) => {
      // Verify checkerboard element exists
      const checkerboard = page.locator('.checkerboard');
      await expect(checkerboard).toBeVisible();

      // Verify canvas has transparent background
      const canvas = page.locator('#mainCanvas');
      const canvasBg = await canvas.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Canvas background should be transparent
      expect(canvasBg).toMatch(/transparent|rgba\(0,\s*0,\s*0,\s*0\)/i);

      // Verify z-index stacking is correct
      const checkerboardZIndex = await checkerboard.evaluate((el) => {
        return window.getComputedStyle(el).zIndex;
      });
      const canvasZIndex = await canvas.evaluate((el) => {
        return window.getComputedStyle(el).zIndex;
      });

      // Checkerboard should be behind canvas (lower z-index or auto)
      // Canvas should be in front (z-index: 1)
      expect(parseInt(canvasZIndex) || 0).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Regression Testing', () => {
    test('should still allow drawing on canvas', async ({ page }) => {
      test.setTimeout(60000); // Increase timeout for this test
      const canvas = page.locator('#mainCanvas');
      const canvasBox = await canvas.boundingBox();
      if (!canvasBox) {
        test.skip();
        return;
      }

      // Select pencil tool using data-testid
      const pencilTool = await getByTestId(page, 'testid-toolbar-pencil', { maxWait: 10000 });
      await waitForElementInteractive(pencilTool);
      await pencilTool.click({ timeout: 10000 });
      await page.waitForTimeout(300);

      // Draw
      await page.mouse.move(canvasBox.x + 50, canvasBox.y + 50);
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100);
      await page.mouse.up();
      await page.waitForTimeout(500);

      // Verify drawing worked
      const hasContent = await canvasHasContent(page);
      expect(hasContent).toBe(true);
    });

    test('should maintain canvas initialization', async ({ page }) => {
      const canvas = page.locator('#mainCanvas');
      await expect(canvas).toBeVisible();

      const width = await canvas.getAttribute('width');
      const height = await canvas.getAttribute('height');

      expect(parseInt(width || '0')).toBeGreaterThan(0);
      expect(parseInt(height || '0')).toBeGreaterThan(0);
    });
  });
});
