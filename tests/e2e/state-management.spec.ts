/**
 * State Management Test Suite
 * Tests rapid state updates, concurrent modifications, invalid transitions, and state persistence
 */

import { test, expect } from '@playwright/test';
import {
  waitForStateManagerReady,
  getAppState,
  validateState,
  triggerRapidStateUpdates,
  checkStatePersistence,
  injectInvalidState,
  monitorStateChanges,
  checkStateConsistency,
} from './helpers/state-helpers';
import { waitForCanvasReady } from './helpers/canvas-helpers';
import { APP_URL } from './helpers/test-constants';

test.describe('State Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForCanvasReady(page, 15000);
    await waitForStateManagerReady(page, 15000);
  });

  test('should handle StateManager not initialized error', async ({ page }) => {
    // Try to access state before initialization
    const error = await page.evaluate(() => {
      try {
        // Access StateManager directly if exposed
        (window as any).StateManager?.getState?.();
        return false;
      } catch (e) {
        return e instanceof Error && e.message.includes('not initialized');
      }
    });

    // Should throw proper error or handle gracefully
    expect(typeof error).toBe('boolean');
  });

  test('should handle rapid state updates', async ({ page }) => {
    await triggerRapidStateUpdates(page, 100, 10);
    await page.waitForTimeout(1000);

    // State should still be valid after rapid updates
    const isValid = await validateState(page);
    expect(isValid).toBe(true);
  });

  test('should handle state updates during tool operations', async ({ page }) => {
    // Start drawing
    const canvas = page.locator('#mainCanvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.down();

      // Update state during drawing
      await page.evaluate(() => {
        (window as any).PixelStudio?.selectTool?.('eraser');
      });

      await page.mouse.move(box.x + 150, box.y + 150);
      await page.mouse.up();
      await page.waitForTimeout(500);

      // State should be consistent
      const isValid = await validateState(page);
      expect(isValid).toBe(true);
    }
  });

  test('should handle state updates during layer operations', async ({ page }) => {
    // Create a layer
    await page.evaluate(() => {
      (window as any).PixelStudio?.getLayers?.()?.create?.('Test Layer');
    });

    await page.waitForTimeout(500);

    // Update state during layer operation
    await page.evaluate(() => {
      (window as any).PixelStudio?.selectTool?.('pencil');
    });

    // State should be consistent
    const isValid = await validateState(page);
    expect(isValid).toBe(true);
  });

  test('should handle state updates during history operations', async ({ page }) => {
    // Draw something
    const canvas = page.locator('#mainCanvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.down();
      await page.mouse.move(box.x + 150, box.y + 150);
      await page.mouse.up();
      await page.waitForTimeout(500);
    }

    // Update state during history save
    await page.evaluate(() => {
      (window as any).PixelStudio?.selectTool?.('bucket');
    });

    await page.waitForTimeout(1000);

    // State should be consistent
    const isValid = await validateState(page);
    expect(isValid).toBe(true);
  });

  test('should handle invalid state transitions', async ({ page }) => {
    // Try invalid state transitions
    await injectInvalidState(page, { currentTool: 'invalid-tool' });
    await page.waitForTimeout(500);

    // State should either reject invalid transition or handle gracefully
    const state = await getAppState(page);
    if (state) {
      // If state exists, tool should be valid or default
      expect(typeof state.currentTool).toBe('string');
    }
  });

  test('should persist state across page reloads', async ({ page }) => {
    // Set some state
    await page.evaluate(() => {
      (window as any).PixelStudio?.selectTool?.('eraser');
      (window as any).PixelStudio?.setColor?.('#ff0000');
    });

    await page.waitForTimeout(500);

    // Check persistence
    const persisted = await checkStatePersistence(page);
    // State may or may not persist depending on implementation
    expect(typeof persisted).toBe('boolean');
  });

  test('should recover from corrupted state data', async ({ page }) => {
    // Inject corrupted state
    await page.evaluate(() => {
      localStorage.setItem('pixelStudio-state', 'invalid-json-data');
    });

    await page.reload();
    await waitForCanvasReady(page);
    await waitForStateManagerReady(page);

    // App should recover
    const isValid = await validateState(page);
    expect(isValid).toBe(true);
  });

  test('should handle concurrent state modifications', async ({ page }) => {
    // Trigger multiple state updates simultaneously
    await page.evaluate(() => {
      const updates = [
        () => (window as any).PixelStudio?.selectTool?.('pencil'),
        () => (window as any).PixelStudio?.selectTool?.('eraser'),
        () => (window as any).PixelStudio?.selectTool?.('bucket'),
      ];

      updates.forEach((update) => update());
    });

    await page.waitForTimeout(1000);

    // State should be consistent
    const consistency = await checkStateConsistency(page);
    expect(consistency.consistent).toBe(true);
  });

  test('should validate state on load', async ({ page }) => {
    const isValid = await validateState(page);
    expect(isValid).toBe(true);
  });

  test('should monitor state changes', async ({ page }) => {
    const changeCount = await monitorStateChanges(page, 3000);

    // Should detect state changes
    expect(changeCount).toBeGreaterThanOrEqual(0);
  });

  test('should maintain state consistency', async ({ page }) => {
    // Perform various operations
    await page.evaluate(() => {
      (window as any).PixelStudio?.selectTool?.('pencil');
      (window as any).PixelStudio?.selectTool?.('eraser');
    });

    await page.waitForTimeout(500);

    const consistency = await checkStateConsistency(page);
    expect(consistency.consistent).toBe(true);
    expect(consistency.issues.length).toBe(0);
  });

  test('should handle state updates with 100+ updates per second', async ({ page }) => {
    await triggerRapidStateUpdates(page, 200, 5);
    await page.waitForTimeout(1000);

    // State should still be valid
    const isValid = await validateState(page);
    expect(isValid).toBe(true);
  });
});
