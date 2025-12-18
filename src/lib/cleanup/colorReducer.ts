/**
 * Color Noise Reducer
 * Reduces color variations and enforces palettes
 */

import {
  extractUniqueColors,
  findNearestPaletteColor,
  colorsSimilar,
  deltaE,
} from './utils/colorDistance';
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
  onProgress?: (progress: number, stage: string) => void; // Progress callback
}

/**
 * Auto-clean: Merge similar colors within threshold
 */
function autoCleanColors(imageData: ImageData, threshold: number, useLab: boolean): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  result.data.set(data);

  // Extract unique colors and group similar ones
  const uniqueColors = extractUniqueColors(imageData);
  const colorGroups: Array<Array<{ r: number; g: number; b: number; a: number; count: number }>> =
    [];
  const colorToGroup = new Map<string, number>();

  for (const color of uniqueColors) {
    let assigned = false;

    // Try to find existing group
    for (let i = 0; i < colorGroups.length; i++) {
      const group = colorGroups[i]!;
      const representative = group[0]!;

      const similar = useLab
        ? deltaE(color.r, color.g, color.b, representative.r, representative.g, representative.b) <
          threshold
        : colorsSimilar(
            color.r,
            color.g,
            color.b,
            representative.r,
            representative.g,
            representative.b,
            threshold
          );

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
 * K-means clustering on main thread (fallback when worker unavailable)
 * Uses LAB color space for perceptual accuracy
 */
function kmeansClusteringMainThread(
  imageData: ImageData,
  k: number,
  maxIterations: number = 20
): Array<{ r: number; g: number; b: number }> {
  const { data } = imageData;
  const pixels: Array<{ r: number; g: number; b: number; index: number }> = [];

  // Extract all opaque pixels
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]!;
    if (a >= 128) {
      pixels.push({
        r: data[i]!,
        g: data[i + 1]!,
        b: data[i + 2]!,
        index: i,
      });
    }
  }

  if (pixels.length === 0) return [];

  // Initialize centroids randomly
  const centroids: Array<{ r: number; g: number; b: number }> = [];
  for (let i = 0; i < k; i++) {
    const randomPixel = pixels[Math.floor(Math.random() * pixels.length)]!;
    centroids.push({ r: randomPixel.r, g: randomPixel.g, b: randomPixel.b });
  }

  const assignments = new Array<number>(pixels.length);
  const convergenceThreshold = 0.5; // As per G'MIC best practices

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign pixels to nearest centroid using LAB color space (Delta E)
    for (let i = 0; i < pixels.length; i++) {
      const pixel = pixels[i]!;
      let minDist = Infinity;
      let nearest = 0;

      for (let j = 0; j < centroids.length; j++) {
        const centroid = centroids[j]!;
        // Use Delta E for perceptual color distance
        const dist = deltaE(pixel.r, pixel.g, pixel.b, centroid.r, centroid.g, centroid.b);

        if (dist < minDist) {
          minDist = dist;
          nearest = j;
        }
      }

      assignments[i] = nearest;
    }

    // Update centroids using weighted averages (pixel count weighting)
    const newCentroids = centroids.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));

    for (let i = 0; i < pixels.length; i++) {
      const pixel = pixels[i]!;
      const cluster = assignments[i]!;
      newCentroids[cluster]!.r += pixel.r;
      newCentroids[cluster]!.g += pixel.g;
      newCentroids[cluster]!.b += pixel.b;
      newCentroids[cluster]!.count++;
    }

    // Calculate average difference for convergence check
    let totalDiff = 0;
    let converged = true;
    for (let j = 0; j < centroids.length; j++) {
      const newCentroid = newCentroids[j]!;
      if (newCentroid.count > 0) {
        const oldR = centroids[j]!.r;
        const oldG = centroids[j]!.g;
        const oldB = centroids[j]!.b;
        centroids[j]!.r = Math.round(newCentroid.r / newCentroid.count);
        centroids[j]!.g = Math.round(newCentroid.g / newCentroid.count);
        centroids[j]!.b = Math.round(newCentroid.b / newCentroid.count);

        // Calculate difference in LAB space for accurate convergence check
        const diff = deltaE(oldR, oldG, oldB, centroids[j]!.r, centroids[j]!.g, centroids[j]!.b);
        totalDiff += diff;

        if (diff > convergenceThreshold) {
          converged = false;
        }
      }
    }

    // Check average difference across all centroids
    const avgDiff = totalDiff / centroids.length;
    if (converged || avgDiff < convergenceThreshold) break;
  }

  return centroids;
}

/**
 * Quantize: Reduce to N colors using K-means
 */
async function quantizeColors(
  imageData: ImageData,
  nColors: number,
  useWorker: boolean,
  onProgress?: (progress: number, stage: string) => void
): Promise<ImageData> {
  if (useWorker && WorkerManager.isCleanupWorkerAvailable()) {
    try {
      if (!WorkerManager.isCleanupWorkerAvailable()) {
        WorkerManager.initCleanupWorker();
      }

      const progressCallback: ((progress: number, stage?: string) => void) | undefined = onProgress
        ? (progress: number, stage?: string) => onProgress(progress, stage || '')
        : undefined;

      const result = (await WorkerManager.executeCleanupOperation(
        'quantize-colors',
        {
          imageData,
          nColors,
        },
        progressCallback
      )) as ImageData;

      return result;
    } catch (error) {
      logger.warn('Worker quantization failed, falling back to main thread:', error);
      // Fall through to main thread implementation
    }
  }

  // Main thread K-means implementation using LAB color space
  const uniqueColors = extractUniqueColors(imageData);
  if (uniqueColors.length <= nColors) {
    // Already has fewer colors than target
    return imageData;
  }

  // Use proper K-means clustering
  const palette = kmeansClusteringMainThread(imageData, nColors, 20);

  // Assign pixels to nearest palette color using LAB color space
  return lockToPalette(imageData, palette, true);
}

/**
 * Reduce color noise in image
 */
export async function reduceColorNoise(
  imageData: ImageData,
  options: ColorReducerOptions
): Promise<ImageData> {
  const {
    mode,
    threshold = 15,
    nColors = 16,
    palette,
    useWorker = true,
    useLab = true,
    onProgress,
  } = options;

  switch (mode) {
    case 'auto-clean':
      return autoCleanColors(imageData, threshold, useLab);

    case 'palette-lock':
      if (!palette || palette.length === 0) {
        throw new Error('Palette required for palette-lock mode');
      }
      return lockToPalette(imageData, palette, useLab);

    case 'quantize':
      return quantizeColors(imageData, nColors, useWorker, onProgress);

    default:
      throw new Error(`Unknown color reducer mode: ${mode}`);
  }
}
