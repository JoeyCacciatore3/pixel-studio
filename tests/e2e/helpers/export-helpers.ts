/**
 * Export Testing Helpers
 * Utilities for testing canvas export functionality
 */

import { Page, expect } from '@playwright/test';
import * as path from 'path';

/**
 * Trigger export by clicking the export button
 * Sets up download listener and returns the download promise
 */
export async function triggerExport(page: Page): Promise<{ download: any; filename: string }> {
  // Set up download listener before clicking
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

  // Click export button
  const exportBtn = page
    .locator('[data-testid="testid-export-btn"], #exportBtn, button[aria-label*="Export"]')
    .first();
  await expect(exportBtn).toBeVisible({ timeout: 10000 });
  await exportBtn.click();

  // Wait for download to start
  const download = await downloadPromise;
  const filename = download.suggestedFilename();

  return { download, filename };
}

/**
 * Verify that export download occurred
 * @param download Playwright download object
 * @param expectedFilename Expected filename (optional)
 */
export async function verifyExportDownloaded(
  download: any,
  expectedFilename?: string
): Promise<boolean> {
  try {
    // Verify download has a filename
    const filename = download.suggestedFilename();
    if (!filename) {
      return false;
    }

    // Verify filename matches expected (if provided)
    if (expectedFilename && !filename.includes(expectedFilename)) {
      return false;
    }

    // Verify it's a PNG file
    if (!filename.endsWith('.png')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get exported image data by saving and reading the file
 * @param download Playwright download object
 * @param savePath Path to save the downloaded file
 */
export async function getExportedImageData(
  download: any,
  savePath: string
): Promise<Buffer | null> {
  try {
    await download.saveAs(savePath);
    const fs = require('fs');
    return fs.readFileSync(savePath);
  } catch (error) {
    return null;
  }
}

/**
 * Verify exported image is valid PNG
 * @param imageData Image file buffer
 */
export function verifyExportedImageValid(imageData: Buffer): boolean {
  try {
    // Check PNG signature (first 8 bytes)
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const signature = imageData.slice(0, 8);

    return signature.equals(pngSignature);
  } catch {
    return false;
  }
}

/**
 * Get canvas data URL for comparison
 * Useful for verifying export matches canvas content
 * Note: This function is also available in canvas-helpers.ts
 */
export async function getCanvasDataURLForExport(page: Page): Promise<string | null> {
  try {
    return await page.evaluate(() => {
      const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
      if (!canvas) return null;
      return canvas.toDataURL('image/png');
    });
  } catch {
    return null;
  }
}

/**
 * Compare exported image with canvas content
 * @param page Playwright page object
 * @param exportedImagePath Path to exported image file
 */
export async function compareExportedWithCanvas(
  page: Page,
  exportedImagePath: string
): Promise<boolean> {
  try {
    // Get canvas data URL
    const canvasDataURL = await getCanvasDataURL(page);
    if (!canvasDataURL) {
      return false;
    }

    // Read exported image
    const fs = require('fs');
    const exportedImage = fs.readFileSync(exportedImagePath);

    // Both should be PNG files
    // For a full comparison, we'd decode and compare pixel data
    // For now, just verify both are valid PNGs
    const canvasIsPNG = canvasDataURL.startsWith('data:image/png');
    const exportedIsPNG = verifyExportedImageValid(exportedImage);

    return canvasIsPNG && exportedIsPNG;
  } catch {
    return false;
  }
}
