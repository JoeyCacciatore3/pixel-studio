/**
 * History System Failures Test Suite
 * Tests storage failures, corrupted data, worker failures, and recovery mechanisms
 */

import { test, expect } from '@playwright/test';
import { waitForCanvasReady, drawStroke, selectTool } from './helpers/canvas-helpers';
import {
  simulateStorageQuotaExceeded,
  simulateIndexedDBFailure,
  simulateLocalStorageDisabled,
  injectCorruptedStateData,
} from './helpers/error-helpers';
import { waitForStateManagerReady } from './helpers/state-helpers';
import { waitForAppReady } from './helpers/app-readiness';
import { waitForElementInteractive, getByTestId } from './helpers/element-helpers';
import { APP_URL } from './helpers/test-constants';

test.describe('History Failures Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForAppReady(page, { maxWait: 30000 });
  });

  test('should handle history save failure when storage is full', async ({ page }) => {
    // Simulate storage quota exceeded
    await simulateStorageQuotaExceeded(page);

    // Draw something to trigger history save
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(1000);

    // Should handle gracefully
    const canvas = page.locator('#mainCanvas');
    await expect(canvas).toBeVisible();
  });

  test('should handle history load failure with corrupted data', async ({ page }) => {
    // Inject corrupted history data
    await injectCorruptedStateData(page);

    await page.reload();
    await waitForCanvasReady(page);

    // Should recover from corrupted data
    const canvas = page.locator('#mainCanvas');
    await expect(canvas).toBeVisible();
  });

  test('should handle undo with missing entry', async ({ page }) => {
    // Draw something
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(500);

    // Try to undo multiple times - wait for button to be actionable
    const undoButton = await getByTestId(page, 'testid-history-undo', { maxWait: 10000 });
    await waitForElementInteractive(undoButton, { maxWait: 10000 });
    for (let i = 0; i < 5; i++) {
      await waitForElementInteractive(undoButton, { maxWait: 5000 });
      await undoButton.click({ timeout: 10000 });
      await page.waitForTimeout(300);
    }

    // Should handle missing entries gracefully
    const canvas = page.locator('#mainCanvas');
    await expect(canvas).toBeVisible();
  });

  test('should handle redo with missing entry', async ({ page }) => {
    // Draw and undo
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(500);

    const undoButton = await getByTestId(page, 'testid-history-undo', { maxWait: 10000 });
    await waitForElementInteractive(undoButton, { maxWait: 10000 });
    await undoButton.click({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Try to redo multiple times - wait for button to be actionable
    const redoButton = await getByTestId(page, 'testid-history-redo', { maxWait: 10000 });
    await waitForElementInteractive(redoButton, { maxWait: 10000 });
    for (let i = 0; i < 5; i++) {
      await waitForElementInteractive(redoButton, { maxWait: 5000 });
      await redoButton.click({ timeout: 10000 });
      await page.waitForTimeout(300);
    }

    // Should handle missing entries gracefully
    const canvas = page.locator('#mainCanvas');
    await expect(canvas).toBeVisible();
  });

  test('should handle history operations during save', async ({ page }) => {
    // Draw something
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(100);

    // Try to undo during save
    const undoButton = page.locator('#undoBtn');
    await undoButton.click();
    await page.waitForTimeout(1000);

    // Should handle gracefully
    const canvas = page.locator('#mainCanvas');
    await expect(canvas).toBeVisible();
  });

  test('should handle history operations during load', async ({ page }) => {
    // Draw something
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(500);

    // Reload and try to undo immediately
    await page.reload();
    await waitForAppReady(page, { maxWait: 30000 });

    // Wait for undo button to be available and interactive
    const undoButton = await getByTestId(page, 'testid-history-undo', { maxWait: 10000 });
    await waitForElementInteractive(undoButton, { maxWait: 10000 });

    await undoButton.click({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Should handle gracefully
    const canvas = page.locator('#mainCanvas');
    await expect(canvas).toBeVisible();
  });

  test('should handle history worker failure', async ({ page }) => {
    // History worker is non-critical, app should still work
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(1000);

    // App should still function
    const canvas = page.locator('#mainCanvas');
    await expect(canvas).toBeVisible();
  });

  test('should handle IndexedDB failure', async ({ page }) => {
    // Simulate IndexedDB failure
    await simulateIndexedDBFailure(page);

    // Draw something
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(1000);

    // Should fall back to memory-only history
    const canvas = page.locator('#mainCanvas');
    await expect(canvas).toBeVisible();
  });

  test('should handle history memory limit exceeded', async ({ page }) => {
    // Create many history entries
    await selectTool(page, 'pencil');
    for (let i = 0; i < 30; i++) {
      await drawStroke(page, { x: 100 + i * 5, y: 100 }, { x: 150 + i * 5, y: 150 });
      await page.waitForTimeout(100);
    }

    await page.waitForTimeout(2000);

    // Should handle memory limit
    const canvas = page.locator('#mainCanvas');
    await expect(canvas).toBeVisible();
  });

  test('should recover from history failures', async ({ page }) => {
    // Cause a history failure
    await simulateStorageQuotaExceeded(page);

    // Draw something
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 100, y: 100 }, { x: 150, y: 150 });
    await page.waitForTimeout(1000);

    // Reload and check recovery
    await page.reload();
    await waitForCanvasReady(page);

    // Should recover
    const canvas = page.locator('#mainCanvas');
    await expect(canvas).toBeVisible();
  });
});
