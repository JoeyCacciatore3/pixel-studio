/**
 * Color Noise Reducer
 * Reduces color variations and enforces palettes
 */

import { extractUniqueColors, findNearestPaletteColor, colorsSimilar, deltaE } from './utils/colorDistance';
import WorkerManager from '../workers/workerManager';
import { logger } from '../utils/logger';

export type ColorReducerMode = 'auto-clean' | 'palette-lock' | 'quantize';

export interface ColorReducerOptions {
  mode: ColorReducerMode;
  threshold?: number; // For auto-clean: similarity threshold (0-255)
  nColors?: number; // For quantize: target number of colors
  palette?: Array<{ r: number; g: number; b: number }>; // For palette-lock: target palette
  useWorker?: boolean; // Use Web Worker for large images
  useLab?: boolean; // Use LAB color space for better perceptual accuracy
}

/**
 * Auto-clean: Merge similar colors within threshold
 */
function autoCleanColors(
  imageData: ImageData,
  threshold: number,
  useLab: boolean
): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  result.data.set(data);

  // Extract unique colors and group similar ones
  const uniqueColors = extractUniqueColors(imageData);
  const colorGroups: Array<Array<{ r: number; g: number; b: number; a: number; count: number }>> = [];
  const colorToGroup = new Map<string, number>();

  for (const color of uniqueColors) {
    let assigned = false;

    // Try to find existing group
    for (let i = 0; i < colorGroups.length; i++) {
      const group = colorGroups[i]!;
      const representative = group[0]!;

      const similar = useLab
        ? deltaE(color.r, color.g, color.b, representative.r, representative.g, representative.b) < threshold
        : colorsSimilar(color.r, color.g, color.b, representative.r, representative.g, representative.b, threshold);

      if (similar) {
        group.push(color);
        colorToGroup.set(`${color.r},${color.g},${color.b},${color.a}`, i);
        assigned = true;
        break;
      }
    }

    // Create new group if no match found
    if (!assigned) {
      const groupIndex = colorGroups.length;
      colorGroups.push([color]);
      colorToGroup.set(`${color.r},${color.g},${color.b},${color.a}`, groupIndex);
    }
  }

  // Calculate dominant color for each group
  const dominantColors = colorGroups.map((group) => {
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let totalA = 0;
    let totalCount = 0;

    for (const color of group) {
      totalR += color.r * color.count;
      totalG += color.g * color.count;
      totalB += color.b * color.count;
      totalA += color.a * color.count;
      totalCount += color.count;
    }

    return {
      r: Math.round(totalR / totalCount),
      g: Math.round(totalG / totalCount),
      b: Math.round(totalB / totalCount),
      a: Math.round(totalA / totalCount),
    };
  });

  // Replace colors in image
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]!;
    if (a < 128) continue; // Skip transparent pixels

    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const key = `${r},${g},${b},${a}`;

    const groupIndex = colorToGroup.get(key);
    if (groupIndex !== undefined) {
      const dominant = dominantColors[groupIndex]!;
      result.data[i] = dominant.r;
      result.data[i + 1] = dominant.g;
      result.data[i + 2] = dominant.b;
      result.data[i + 3] = dominant.a;
    }
  }

  return result;
}

/**
 * Palette lock: Force all colors to nearest palette color
 */
function lockToPalette(
  imageData: ImageData,
  palette: Array<{ r: number; g: number; b: number }>,
  useLab: boolean
): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  result.data.set(data);

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]!;
    if (a < 128) continue; // Skip transparent pixels

    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;

    const nearest = findNearestPaletteColor(r, g, b, palette, useLab);
    const paletteColor = palette[nearest.index]!;

    result.data[i] = paletteColor.r;
    result.data[i + 1] = paletteColor.g;
    result.data[i + 2] = paletteColor.b;
    // Keep original alpha
  }

  return result;
}

/**
 * Quantize: Reduce to N colors using K-means
 */
async function quantizeColors(
  imageData: ImageData,
  nColors: number,
  useWorker: boolean
): Promise<ImageData> {
  if (useWorker && WorkerManager.isCleanupWorkerAvailable()) {
    try {
      if (!WorkerManager.isCleanupWorkerAvailable()) {
        WorkerManager.initCleanupWorker();
      }

      const result = (await WorkerManager.executeCleanupOperation('quantize-colors', {
        imageData,
        nColors,
      })) as ImageData;

      return result;
    } catch (error) {
      logger.warn('Worker quantization failed, falling back to main thread:', error);
      // Fall through to main thread implementation
    }
  }

  // Simple main thread implementation (less efficient)
  // For better results, use worker
  const uniqueColors = extractUniqueColors(imageData);
  if (uniqueColors.length <= nColors) {
    // Already has fewer colors than target
    return imageData;
  }

  // Simple approach: take most common N colors
  const topColors = uniqueColors.slice(0, nColors).map((c) => ({ r: c.r, g: c.g, b: c.b }));

  return lockToPalette(imageData, topColors, false);
}

/**
 * Reduce color noise in image
 */
export async function reduceColorNoise(
  imageData: ImageData,
  options: ColorReducerOptions
): Promise<ImageData> {
  const { mode, threshold = 15, nColors = 16, palette, useWorker = true, useLab = true } = options;

  switch (mode) {
    case 'auto-clean':
      return autoCleanColors(imageData, threshold, useLab);

    case 'palette-lock':
      if (!palette || palette.length === 0) {
        throw new Error('Palette required for palette-lock mode');
      }
      return lockToPalette(imageData, palette, useLab);

    case 'quantize':
      return quantizeColors(imageData, nColors, useWorker);

    default:
      throw new Error(`Unknown color reducer mode: ${mode}`);
  }
}
