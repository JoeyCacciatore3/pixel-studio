/**
 * Visual Regression Testing Helpers
 * Provides screenshot comparison and visual testing capabilities
 */

import { Page, expect } from '@playwright/test';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';

/**
 * Visual Test Configuration
 */
export interface VisualTestConfig {
  threshold?: number; // Pixel difference threshold (0-1)
  maxDiffPixels?: number; // Maximum number of different pixels
  maxDiffPixelRatio?: number; // Maximum ratio of different pixels
  fullPage?: boolean; // Capture full page or viewport
  clip?: { x: number; y: number; width: number; height: number }; // Clip region
  mask?: Array<{ x: number; y: number; width: number; height: number }>; // Mask regions
}

/**
 * Visual Comparison Result
 */
export interface VisualComparisonResult {
  match: boolean;
  diff?: string; // Path to diff image
  diffPixels?: number;
  diffRatio?: number;
  baseline?: string; // Path to baseline image
  actual?: string; // Path to actual screenshot
}

/**
 * Default visual test configuration
 */
export const defaultVisualConfig: VisualTestConfig = {
  threshold: 0.2,
  maxDiffPixels: 100,
  maxDiffPixelRatio: 0.01,
  fullPage: false,
};

/**
 * Get baseline directory path
 */
function getBaselineDir(): string {
  return join(process.cwd(), 'tests/e2e/visual-baselines');
}

/**
 * Get baseline image path
 */
function getBaselinePath(testName: string, variant?: string): string {
  const filename = variant ? `${testName}-${variant}.png` : `${testName}.png`;
  return join(getBaselineDir(), filename);
}

/**
 * Get actual screenshot path
 */
function getActualPath(testName: string, variant?: string): string {
  const filename = variant ? `${testName}-${variant}-actual.png` : `${testName}-actual.png`;
  return join(process.cwd(), 'tests/screenshots', filename);
}

/**
 * Get diff image path
 */
function getDiffPath(testName: string, variant?: string): string {
  const filename = variant ? `${testName}-${variant}-diff.png` : `${testName}-diff.png`;
  return join(process.cwd(), 'tests/screenshots', filename);
}

/**
 * Ensure baseline directory exists
 */
async function ensureBaselineDir(): Promise<void> {
  try {
    await mkdir(getBaselineDir(), { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

/**
 * Capture visual baseline
 */
export async function captureVisualBaseline(
  page: Page,
  testName: string,
  variant?: string,
  config: VisualTestConfig = defaultVisualConfig
): Promise<string> {
  await ensureBaselineDir();

  const baselinePath = getBaselinePath(testName, variant);

  const screenshotOptions: Parameters<Page['screenshot']>[0] = {
    path: baselinePath,
    fullPage: config.fullPage,
  };

  if (config.clip) {
    screenshotOptions.clip = config.clip;
  }

  await page.screenshot(screenshotOptions);

  return baselinePath;
}

/**
 * Compare visual state with baseline
 */
export async function compareVisualState(
  page: Page,
  testName: string,
  variant?: string,
  config: VisualTestConfig = defaultVisualConfig
): Promise<VisualComparisonResult> {
  await ensureBaselineDir();

  const baselinePath = getBaselinePath(testName, variant);
  const actualPath = getActualPath(testName, variant);
  const diffPath = getDiffPath(testName, variant);

  // Check if baseline exists
  let baselineExists = false;
  try {
    await access(baselinePath);
    baselineExists = true;
  } catch {
    // Baseline doesn't exist, create it
    await captureVisualBaseline(page, testName, variant, config);
    return {
      match: true,
      baseline: baselinePath,
      actual: actualPath,
    };
  }

  // Capture current state
  const screenshotOptions: Parameters<Page['screenshot']>[0] = {
    path: actualPath,
    fullPage: config.fullPage,
  };

  if (config.clip) {
    screenshotOptions.clip = config.clip;
  }

  await page.screenshot(screenshotOptions);

  // Compare images
  try {
    // Use Playwright's built-in visual comparison
    await expect(page).toHaveScreenshot(baselinePath, {
      threshold: config.threshold,
      maxDiffPixels: config.maxDiffPixels,
      maxDiffPixelRatio: config.maxDiffPixelRatio,
    });

    return {
      match: true,
      baseline: baselinePath,
      actual: actualPath,
    };
  } catch (error) {
    // Screenshot doesn't match
    // Playwright automatically generates diff, but we need to handle it
    const diffExists = await access(diffPath)
      .then(() => true)
      .catch(() => false);

    return {
      match: false,
      diff: diffExists ? diffPath : undefined,
      baseline: baselinePath,
      actual: actualPath,
    };
  }
}

/**
 * Update visual baseline (approve changes)
 */
export async function updateVisualBaseline(testName: string, variant?: string): Promise<void> {
  const actualPath = getActualPath(testName, variant);
  const baselinePath = getBaselinePath(testName, variant);

  try {
    // Copy actual to baseline
    const actualImage = await readFile(actualPath);
    await writeFile(baselinePath, actualImage);
  } catch (error) {
    throw new Error(`Failed to update baseline: ${error}`);
  }
}

/**
 * Capture element screenshot
 */
export async function captureElementScreenshot(
  page: Page,
  selector: string,
  testName: string,
  variant?: string
): Promise<string> {
  await ensureBaselineDir();

  const element = page.locator(selector);
  const baselinePath = getBaselinePath(testName, variant);

  await element.screenshot({ path: baselinePath });

  return baselinePath;
}

/**
 * Compare element visual state
 */
export async function compareElementVisualState(
  page: Page,
  selector: string,
  testName: string,
  variant?: string,
  config: VisualTestConfig = defaultVisualConfig
): Promise<VisualComparisonResult> {
  const element = page.locator(selector);
  const baselinePath = getBaselinePath(testName, variant);
  const actualPath = getActualPath(testName, variant);

  // Check if baseline exists
  let baselineExists = false;
  try {
    await access(baselinePath);
    baselineExists = true;
  } catch {
    // Baseline doesn't exist, create it
    await element.screenshot({ path: baselinePath });
    return {
      match: true,
      baseline: baselinePath,
      actual: actualPath,
    };
  }

  // Capture current state
  await element.screenshot({ path: actualPath });

  // Compare
  try {
    await expect(element).toHaveScreenshot(baselinePath, {
      threshold: config.threshold,
      maxDiffPixels: config.maxDiffPixels,
      maxDiffPixelRatio: config.maxDiffPixelRatio,
    });

    return {
      match: true,
      baseline: baselinePath,
      actual: actualPath,
    };
  } catch (error) {
    return {
      match: false,
      baseline: baselinePath,
      actual: actualPath,
    };
  }
}

/**
 * Capture responsive visual states
 */
export async function captureResponsiveVisualStates(
  page: Page,
  testName: string,
  viewports: Array<{ width: number; height: number; name: string }>
): Promise<string[]> {
  const paths: string[] = [];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(500); // Wait for layout to settle

    const path = await captureVisualBaseline(page, testName, viewport.name);
    paths.push(path);
  }

  return paths;
}

/**
 * Compare responsive visual states
 */
export async function compareResponsiveVisualStates(
  page: Page,
  testName: string,
  viewports: Array<{ width: number; height: number; name: string }>,
  config: VisualTestConfig = defaultVisualConfig
): Promise<VisualComparisonResult[]> {
  const results: VisualComparisonResult[] = [];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(500); // Wait for layout to settle

    const result = await compareVisualState(page, testName, viewport.name, config);
    results.push(result);
  }

  return results;
}

/**
 * Generate visual test report
 */
export async function generateVisualTestReport(
  results: Array<{ testName: string; result: VisualComparisonResult }>
): Promise<string> {
  const reportPath = join(process.cwd(), 'tests/reports/visual-regression-report.html');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Visual Regression Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .test { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
    .match { background-color: #d4edda; }
    .mismatch { background-color: #f8d7da; }
    .images { display: flex; gap: 20px; margin-top: 10px; }
    .image { text-align: center; }
    .image img { max-width: 400px; border: 1px solid #ccc; }
  </style>
</head>
<body>
  <h1>Visual Regression Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>

  ${results
    .map(
      ({ testName, result }) => `
    <div class="test ${result.match ? 'match' : 'mismatch'}">
      <h2>${testName} - ${result.match ? '✓ Match' : '✗ Mismatch'}</h2>
      <div class="images">
        ${
          result.baseline
            ? `
          <div class="image">
            <h3>Baseline</h3>
            <img src="${result.baseline}" alt="Baseline" />
          </div>
        `
            : ''
        }
        ${
          result.actual
            ? `
          <div class="image">
            <h3>Actual</h3>
            <img src="${result.actual}" alt="Actual" />
          </div>
        `
            : ''
        }
        ${
          result.diff
            ? `
          <div class="image">
            <h3>Diff</h3>
            <img src="${result.diff}" alt="Diff" />
          </div>
        `
            : ''
        }
      </div>
      ${result.diffPixels !== undefined ? `<p>Diff Pixels: ${result.diffPixels}</p>` : ''}
      ${result.diffRatio !== undefined ? `<p>Diff Ratio: ${(result.diffRatio * 100).toFixed(2)}%</p>` : ''}
    </div>
  `
    )
    .join('')}
</body>
</html>
  `;

  await writeFile(reportPath, html);
  return reportPath;
}
