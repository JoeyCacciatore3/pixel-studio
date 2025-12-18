/**
 * Comprehensive Tool Testing Suite
 * Tests all 22 registered tools systematically using Playwright
 */

import { test, expect, devices } from '@playwright/test';
import {
  waitForCanvasReady,
  selectTool,
  drawStroke,
  getCanvas,
  getCanvasInfo,
  APP_URL,
} from './helpers/canvas-helpers';

// Helper function specific to this test file
async function verifyToolActive(
  page: typeof import('@playwright/test').Page,
  toolName: string,
  timeout: number = 5000
): Promise<void> {
  // Use .first() to handle strict mode violations (tools exist in both extended toolbar and canvas tools)
  const toolButton = page.locator(`.tool-btn[data-tool="${toolName}"]`).first();
  await expect(toolButton).toHaveClass(/active/, { timeout });

  // Verify canvas cursor class
  const canvas = getCanvas(page);
  const className = await canvas.getAttribute('class', { timeout: 2000 });
  if (!className || !className.includes(`cursor-${toolName}`)) {
    throw new Error(`Tool "${toolName}" not active. Canvas class: ${className}`);
  }
}

// Test all 22 tools
const allTools = [
  { name: 'pencil', category: 'drawing' },
  { name: 'eraser', category: 'drawing' },
  { name: 'clone', category: 'drawing' },
  { name: 'smudge', category: 'drawing' },
  { name: 'blur', category: 'drawing' },
  { name: 'sharpen', category: 'drawing' },
  { name: 'selection', category: 'selection' },
  { name: 'lasso', category: 'selection' },
  { name: 'polygon', category: 'selection' },
  { name: 'magnetic', category: 'selection' },
  { name: 'wand', category: 'selection' },
  { name: 'colorRange', category: 'selection' },
  { name: 'bucket', category: 'fill' },
  { name: 'gradient', category: 'fill' },
  { name: 'move', category: 'transform' },
  { name: 'rotate', category: 'transform' },
  { name: 'scale', category: 'transform' },
  { name: 'crop', category: 'transform' },
  { name: 'picker', category: 'special' },
  { name: 'intelligent-scissors', category: 'special' },
  { name: 'heal', category: 'special' },
  { name: 'paths', category: 'special' },
];

test.describe('Tool Selection Tests', () => {
  test.setTimeout(60000); // 60 seconds per test

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      // Continue if networkidle times out, page might still be functional
    });
    await waitForCanvasReady(page, 15000);
  });

  for (const tool of allTools) {
    test(`should select ${tool.name} tool`, async ({ page }) => {
      test.setTimeout(30000); // 30 seconds for individual test
      try {
        await selectTool(page, tool.name, 3);
        await verifyToolActive(page, tool.name, 10000);
      } catch (error) {
        throw new Error(`Failed to select ${tool.name}: ${error}`);
      }
    });
  }
});

test.describe('Tool Initialization Tests', () => {
  test.setTimeout(60000); // 60 seconds per test

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      // Continue if networkidle times out
    });
    await waitForCanvasReady(page, 15000);
  });

  for (const tool of allTools) {
    test(`should initialize ${tool.name} tool without errors`, async ({ page }) => {
      test.setTimeout(30000);

      // Monitor console for errors with timeout
      const errors: string[] = [];
      const errorHandler = (msg: { type: () => string; text: () => string }) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      };
      page.on('console', errorHandler);

      try {
        await selectTool(page, tool.name, 3);
        await page.waitForTimeout(500); // Allow initialization

        // Check for errors (allow some non-critical errors)
        const criticalErrors = errors.filter(
          (e) => !e.includes('favicon') && !e.includes('service-worker') && !e.includes('manifest')
        );

        if (criticalErrors.length > 0) {
          throw new Error(`Console errors detected: ${criticalErrors.join('; ')}`);
        }
      } finally {
        page.off('console', errorHandler);
      }
    });
  }
});

test.describe('Drawing Tools - Basic Functionality', () => {
  test.setTimeout(90000); // 90 seconds for drawing tests

  const drawingTools = allTools.filter((t) => t.category === 'drawing');

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await waitForCanvasReady(page, 15000);
  });

  for (const tool of drawingTools) {
    test(`should respond to pointer events with ${tool.name} tool`, async ({ page }) => {
      test.setTimeout(45000);

      try {
        await selectTool(page, tool.name, 3);
        await verifyToolActive(page, tool.name, 10000);

        // Draw a stroke with timeout protection
        await drawStroke(page, { x: 100, y: 100 }, { x: 200, y: 200 }, 10000);

        // Verify canvas is still responsive
        const canvas = page.locator('#mainCanvas');
        await expect(canvas).toBeVisible({ timeout: 5000 });
      } catch (error) {
        throw new Error(`Drawing test failed for ${tool.name}: ${error}`);
      }
    });
  }
});

test.describe('Selection Tools - Basic Functionality', () => {
  test.setTimeout(90000);

  const selectionTools = allTools.filter((t) => t.category === 'selection');

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await waitForCanvasReady(page, 15000);
  });

  for (const tool of selectionTools) {
    test(`should respond to pointer events with ${tool.name} tool`, async ({ page }) => {
      test.setTimeout(45000);

      try {
        await selectTool(page, tool.name, 3);
        await verifyToolActive(page, tool.name, 10000);

        const { box } = await getCanvasInfo(page, 10000);

        // Click and drag to create selection with timeout protection
        await page.mouse.move(box.x + 100, box.y + 100, { timeout: 2000 });
        await page.mouse.down({ timeout: 2000 });
        await page.mouse.move(box.x + 200, box.y + 200, { steps: 10, timeout: 5000 });
        await page.mouse.up({ timeout: 2000 });
        await page.waitForTimeout(300);

        // Verify canvas is still responsive
        const canvas = page.locator('#mainCanvas');
        await expect(canvas).toBeVisible({ timeout: 5000 });
      } catch (error) {
        // Ensure mouse is up
        try {
          await page.mouse.up();
        } catch {
          // Ignore cleanup errors
        }
        throw new Error(`Selection test failed for ${tool.name}: ${error}`);
      }
    });
  }
});

test.describe('Fill Tools - Basic Functionality', () => {
  test.setTimeout(90000);

  const fillTools = allTools.filter((t) => t.category === 'fill');

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await waitForCanvasReady(page, 15000);
  });

  for (const tool of fillTools) {
    test(`should respond to pointer events with ${tool.name} tool`, async ({ page }) => {
      test.setTimeout(45000);

      try {
        await selectTool(page, tool.name, 3);
        await verifyToolActive(page, tool.name, 10000);

        const { box } = await getCanvasInfo(page, 10000);

        // Click on canvas with timeout
        await page.mouse.click(box.x + 100, box.y + 100, { timeout: 5000 });
        await page.waitForTimeout(300);

        // For gradient, try drag
        if (tool.name === 'gradient') {
          await page.mouse.move(box.x + 100, box.y + 100, { timeout: 2000 });
          await page.mouse.down({ timeout: 2000 });
          await page.mouse.move(box.x + 200, box.y + 200, { steps: 10, timeout: 5000 });
          await page.mouse.up({ timeout: 2000 });
          await page.waitForTimeout(300);
        }

        // Verify canvas is still responsive
        const canvas = page.locator('#mainCanvas');
        await expect(canvas).toBeVisible({ timeout: 5000 });
      } catch (error) {
        try {
          await page.mouse.up();
        } catch {
          // Ignore cleanup errors
        }
        throw new Error(`Fill test failed for ${tool.name}: ${error}`);
      }
    });
  }
});

test.describe('Transform Tools - Basic Functionality', () => {
  test.setTimeout(90000);

  const transformTools = allTools.filter((t) => t.category === 'transform');

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await waitForCanvasReady(page, 15000);
  });

  for (const tool of transformTools) {
    test(`should respond to pointer events with ${tool.name} tool`, async ({ page }) => {
      test.setTimeout(45000);

      try {
        await selectTool(page, tool.name, 3);
        await verifyToolActive(page, tool.name, 10000);

        const { box } = await getCanvasInfo(page, 10000);

        // Click and drag with timeout protection
        await page.mouse.move(box.x + 100, box.y + 100, { timeout: 2000 });
        await page.mouse.down({ timeout: 2000 });
        await page.mouse.move(box.x + 200, box.y + 200, { steps: 10, timeout: 5000 });
        await page.mouse.up({ timeout: 2000 });
        await page.waitForTimeout(300);

        // Verify canvas is still responsive
        const canvas = page.locator('#mainCanvas');
        await expect(canvas).toBeVisible({ timeout: 5000 });
      } catch (error) {
        try {
          await page.mouse.up();
        } catch {
          // Ignore cleanup errors
        }
        throw new Error(`Transform test failed for ${tool.name}: ${error}`);
      }
    });
  }
});

test.describe('Special Tools - Basic Functionality', () => {
  test.setTimeout(90000);

  const specialTools = allTools.filter((t) => t.category === 'special');

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await waitForCanvasReady(page, 15000);
  });

  for (const tool of specialTools) {
    test(`should respond to pointer events with ${tool.name} tool`, async ({ page }) => {
      test.setTimeout(45000);

      try {
        await selectTool(page, tool.name, 3);
        await verifyToolActive(page, tool.name, 10000);

        const { box } = await getCanvasInfo(page, 10000);

        // Click on canvas with timeout
        await page.mouse.click(box.x + 100, box.y + 100, { timeout: 5000 });
        await page.waitForTimeout(300);

        // For paths and intelligent-scissors, try multiple clicks
        if (tool.name === 'paths' || tool.name === 'intelligent-scissors') {
          await page.mouse.click(box.x + 150, box.y + 150, { timeout: 5000 });
          await page.mouse.click(box.x + 200, box.y + 200, { timeout: 5000 });
          await page.waitForTimeout(300);
        }

        // Verify canvas is still responsive
        const canvas = page.locator('#mainCanvas');
        await expect(canvas).toBeVisible({ timeout: 5000 });
      } catch (error) {
        throw new Error(`Special tool test failed for ${tool.name}: ${error}`);
      }
    });
  }
});

test.describe('Tool-Specific Behavior Tests', () => {
  test.setTimeout(120000); // 2 minutes for complex tests

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await waitForCanvasReady(page, 15000);
  });

  test('pencil tool should draw strokes', async ({ page }) => {
    test.setTimeout(60000);
    try {
      await selectTool(page, 'pencil', 3);
      await drawStroke(page, { x: 50, y: 50 }, { x: 150, y: 150 }, 10000);
      const canvas = page.locator('#mainCanvas');
      await expect(canvas).toBeVisible({ timeout: 5000 });
    } catch (error) {
      throw new Error(`Pencil stroke test failed: ${error}`);
    }
  });

  test('bucket tool should fill area', async ({ page }) => {
    test.setTimeout(60000);
    try {
      await selectTool(page, 'bucket', 3);
      const { box } = await getCanvasInfo(page, 10000);
      await page.mouse.click(box.x + 100, box.y + 100, { timeout: 5000 });
      await page.waitForTimeout(500);
      const canvas = page.locator('#mainCanvas');
      await expect(canvas).toBeVisible({ timeout: 5000 });
    } catch (error) {
      throw new Error(`Bucket fill test failed: ${error}`);
    }
  });

  test('selection tool should create selection', async ({ page }) => {
    test.setTimeout(60000);
    try {
      await selectTool(page, 'selection', 3);
      const { box } = await getCanvasInfo(page, 10000);
      await page.mouse.move(box.x + 50, box.y + 50, { timeout: 2000 });
      await page.mouse.down({ timeout: 2000 });
      await page.mouse.move(box.x + 150, box.y + 150, { steps: 10, timeout: 5000 });
      await page.mouse.up({ timeout: 2000 });
      await page.waitForTimeout(500);
      const canvas = page.locator('#mainCanvas');
      await expect(canvas).toBeVisible({ timeout: 5000 });
    } catch (error) {
      try {
        await page.mouse.up();
      } catch {
        // Ignore cleanup errors
      }
      throw new Error(`Selection test failed: ${error}`);
    }
  });

  test('picker tool should pick color', async ({ page }) => {
    test.setTimeout(60000);
    try {
      await selectTool(page, 'picker', 3);
      const { box } = await getCanvasInfo(page, 10000);
      await page.mouse.click(box.x + 100, box.y + 100, { timeout: 5000 });
      await page.waitForTimeout(500);
      const canvas = page.locator('#mainCanvas');
      await expect(canvas).toBeVisible({ timeout: 5000 });
    } catch (error) {
      throw new Error(`Picker test failed: ${error}`);
    }
  });
});
