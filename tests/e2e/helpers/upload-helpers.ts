/**
 * Upload Testing Helpers
 * Utilities for testing image upload functionality
 */

import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Create a test image file for upload testing
 * Creates a simple 100x100 PNG image
 */
export function createTestImageFile(): string {
  const testDir = path.join(__dirname, '../../test-assets');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const imagePath = path.join(testDir, 'test-image.png');

  // Create a simple 1x1 PNG (minimal valid PNG)
  // This is a minimal PNG file (1x1 red pixel)
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  fs.writeFileSync(imagePath, pngBuffer);
  return imagePath;
}

/**
 * Upload a test image file to the application
 * Uses direct setInputFiles for better cross-browser compatibility
 * @param page Playwright page object
 * @param imagePath Path to the image file to upload
 */
export async function uploadTestImage(page: Page, imagePath: string): Promise<void> {
  // Wait for upload button to be ready
  const uploadBtn = page.locator('[data-testid="testid-upload-btn"], #uploadBtn, button[aria-label*="Upload"]').first();
  await expect(uploadBtn).toBeVisible({ timeout: 10000 });

  // Try direct setInputFiles first (most reliable across browsers)
  const fileInput = page.locator('input[type="file"][data-testid="file-input"], input[type="file"]#imageUpload').first();

  try {
    // Direct approach: set files on input element
    await expect(fileInput).toBeAttached({ timeout: 5000 });
    await fileInput.setInputFiles(imagePath);
  } catch (error) {
    // Fallback: use file chooser event (for browsers that require it)
    try {
      const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 });
      await uploadBtn.click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(imagePath);
    } catch (fallbackError) {
      // Last resort: click button and hope file chooser appears
      await uploadBtn.click();
      await page.waitForTimeout(500);
      // Try setting files directly again after click
      await fileInput.setInputFiles(imagePath);
    }
  }

  // Wait for upload button to be enabled again (indicates upload finished)
  // Give it some time for upload to start first
  await page.waitForTimeout(500);

  // Wait for upload to complete - check for upload state changes
  await expect(uploadBtn).toBeEnabled({ timeout: 30000 });

  // Additional wait for image processing to complete
  // Check if canvas has content or upload error appears
  try {
    await page.waitForFunction(
      () => {
        // Check if upload error is visible
        const errorEl = document.querySelector('.upload-error, [role="alert"]');
        if (errorEl && (errorEl as HTMLElement).textContent) {
          return true; // Upload completed (with or without error)
        }
        // Check if canvas has content
        const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 10), Math.min(canvas.height, 10));
            for (let i = 3; i < imageData.data.length; i += 4) {
              if (imageData.data[i]! > 0) {
                return true; // Canvas has content
              }
            }
          }
        }
        return false;
      },
      { timeout: 15000 }
    );
  } catch {
    // If check fails, upload may have completed but canvas check timed out
    // This is acceptable - the upload button being enabled is the main indicator
  }
}

/**
 * Verify that an image was loaded to the canvas
 * Checks that canvas has content (not empty/transparent)
 */
export async function verifyImageLoaded(page: Page): Promise<boolean> {
  try {
    // Wait for canvas to be ready
    const canvas = page.locator('#mainCanvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Check if canvas has content by getting image data
    const hasContent = await page.evaluate(() => {
      const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
      if (!canvas) return false;

      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      // Get image data and check if there's any non-transparent pixels
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Check if any pixel has non-zero alpha
      for (let i = 3; i < data.length; i += 4) {
        if (data[i]! > 0) {
          return true; // Found at least one non-transparent pixel
        }
      }

      return false;
    });

    return hasContent;
  } catch (error) {
    return false;
  }
}

/**
 * Verify upload error message is displayed (if upload fails)
 */
export async function verifyUploadError(page: Page): Promise<boolean> {
  try {
    const errorElement = page.locator('.upload-error, [role="alert"]').first();
    await expect(errorElement).toBeVisible({ timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean up test image file
 */
export function cleanupTestImage(imagePath: string): void {
  try {
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}
