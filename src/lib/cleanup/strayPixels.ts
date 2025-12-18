/**
 * Stray Pixel Eliminator
 * Removes isolated pixels using connected component analysis
 */

import { removeSmallComponents, findNearestNeighborColor } from './utils/connectedComponents';
import WorkerManager from '../workers/workerManager';
import { logger } from '../utils/logger';

export interface StrayPixelOptions {
  minSize: number; // Minimum cluster size (1-10 pixels)
  merge: boolean; // Merge small regions into nearest neighbor instead of deleting
  useWorker: boolean; // Use Web Worker for large images
  onProgress?: (progress: number, stage?: string) => void; // Progress callback
}

/**
 * Remove stray pixels from image
 */
export async function removeStrayPixels(
  imageData: ImageData,
  options: StrayPixelOptions
): Promise<ImageData> {
  const { minSize, merge, useWorker, onProgress } = options;

  // Use worker for large images or if explicitly requested
  const shouldUseWorker =
    useWorker &&
    (imageData.width * imageData.height > 500 * 500 || WorkerManager.isCleanupWorkerAvailable());

  if (shouldUseWorker) {
    try {
      // Initialize worker if needed
      if (!WorkerManager.isCleanupWorkerAvailable()) {
        WorkerManager.initCleanupWorker();
      }

      const result = (await WorkerManager.executeCleanupOperation(
        'remove-stray-pixels',
        {
          imageData,
          minSize,
          merge,
        },
        onProgress
      )) as ImageData;

      return result;
    } catch (error) {
      logger.warn('Worker operation failed, falling back to main thread:', error);
      // Fall through to main thread implementation
    }
  }

  // Main thread implementation
  const isForeground = (_r: number, _g: number, _b: number, a: number): boolean => {
    return a >= 128; // Consider opaque pixels as foreground
  };

  if (merge) {
    // Merge mode: replace small components with nearest neighbor color
    const { findConnectedComponents } = await import('./utils/connectedComponents');
    const components = findConnectedComponents(imageData, isForeground, 8);
    const result = new ImageData(imageData.width, imageData.height);
    result.data.set(imageData.data);

    for (const component of components) {
      if (component.size < minSize) {
        const nearestColor = findNearestNeighborColor(imageData, component, 3);
        for (const { x, y } of component.pixels) {
          const index = (y * imageData.width + x) * 4;
          result.data[index] = nearestColor.r;
          result.data[index + 1] = nearestColor.g;
          result.data[index + 2] = nearestColor.b;
          result.data[index + 3] = nearestColor.a;
        }
      }
    }

    return result;
  } else {
    // Delete mode: remove small components (make transparent)
    return removeSmallComponents(imageData, minSize, isForeground, 8);
  }
}

/**
 * Preview stray pixels that would be removed
 * Returns ImageData with stray pixels highlighted
 */
export async function previewStrayPixels(
  imageData: ImageData,
  minSize: number
): Promise<ImageData> {
  // Import the connected components utility
  const { findConnectedComponents } = await import('./utils/connectedComponents');

  // Define foreground detection function
  const isForeground = (_r: number, _g: number, _b: number, a: number): boolean => {
    return a >= 128;
  };

  // Find all connected components
  const components = findConnectedComponents(imageData, isForeground, 8);

  // Create result image data
  const result = new ImageData(imageData.width, imageData.height);
  result.data.set(imageData.data);

  // Highlight small components in red
  for (const component of components) {
    if (component.size < minSize) {
      for (const { x, y } of component.pixels) {
        const index = (y * imageData.width + x) * 4;
        result.data[index] = 255; // R
        result.data[index + 1] = 0; // G
        result.data[index + 2] = 0; // B
        result.data[index + 3] = 200; // A (semi-transparent)
      }
    }
  }

  return result;
}
