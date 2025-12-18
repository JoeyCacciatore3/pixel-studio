/**
 * Edge Crispener
 * Removes fuzzy halos and semi-transparent edge pixels
 */

import { erode } from './utils/morphology';
import WorkerManager from '../workers/workerManager';
import { logger } from '../utils/logger';

export type EdgeCrispenerMethod = 'threshold' | 'erode' | 'decontaminate';

export interface EdgeCrispenerOptions {
  method: EdgeCrispenerMethod;
  threshold?: number; // For threshold: alpha threshold (0-255)
  erodePixels?: number; // For erode: number of pixels to erode
  backgroundColor?: { r: number; g: number; b: number }; // For decontaminate: background color
  useWorker?: boolean; // Use Web Worker for large images
}

/**
 * Threshold method: Simple alpha threshold
 */
function thresholdEdges(imageData: ImageData, threshold: number): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  result.data.set(data);

  for (let i = 3; i < data.length; i += 4) {
    const alpha = data[i]!;
    if (alpha < threshold) {
      // Make transparent
      result.data[i - 3] = 0; // R
      result.data[i - 2] = 0; // G
      result.data[i - 1] = 0; // B
      result.data[i] = 0;     // A
    } else {
      // Make fully opaque
      result.data[i] = 255;
    }
  }

  return result;
}

/**
 * Erode method: Morphological erosion of alpha channel
 */
async function erodeEdges(
  imageData: ImageData,
  erodePixels: number,
  useWorker: boolean
): Promise<ImageData> {
  if (useWorker && WorkerManager.isCleanupWorkerAvailable()) {
    try {
      if (!WorkerManager.isCleanupWorkerAvailable()) {
        WorkerManager.initCleanupWorker();
      }

      const result = (await WorkerManager.executeCleanupOperation('morphology', {
        imageData,
        operation: 'erode',
        kernelSize: erodePixels * 2 + 1,
      })) as ImageData;

      return result;
    } catch (error) {
      logger.warn('Worker erosion failed, falling back to main thread:', error);
    }
  }

  // Main thread implementation
  const isForeground = (_r: number, _g: number, _b: number, a: number): boolean => {
    return a >= 128;
  };

  return erode(imageData, erodePixels * 2 + 1, isForeground);
}

/**
 * Decontaminate method: Remove background color bleeding
 */
function decontaminateEdges(
  imageData: ImageData,
  backgroundColor: { r: number; g: number; b: number }
): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  result.data.set(data);

  const bgR = backgroundColor.r;
  const bgG = backgroundColor.g;
  const bgB = backgroundColor.b;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]!;

    // Only process semi-transparent edge pixels
    if (alpha > 0 && alpha < 255) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;

      // Calculate how much background color is present
      const alphaNorm = alpha / 255;
      const bgInfluence = 1 - alphaNorm;

      // Remove background color influence
      const newR = Math.round((r - bgR * bgInfluence) / alphaNorm);
      const newG = Math.round((g - bgG * bgInfluence) / alphaNorm);
      const newB = Math.round((b - bgB * bgInfluence) / alphaNorm);

      // Clamp values
      result.data[i] = Math.max(0, Math.min(255, newR));
      result.data[i + 1] = Math.max(0, Math.min(255, newG));
      result.data[i + 2] = Math.max(0, Math.min(255, newB));

      // Make fully opaque or fully transparent based on threshold
      if (alpha >= 128) {
        result.data[i + 3] = 255;
      } else {
        result.data[i + 3] = 0;
        result.data[i] = 0;
        result.data[i + 1] = 0;
        result.data[i + 2] = 0;
      }
    } else if (alpha >= 128) {
      // Fully opaque pixels: ensure they're fully opaque
      result.data[i + 3] = 255;
    }
  }

  return result;
}

/**
 * Crisp edges in image
 */
export async function crispEdges(
  imageData: ImageData,
  options: EdgeCrispenerOptions
): Promise<ImageData> {
  const {
    method,
    threshold = 200,
    erodePixels = 1,
    backgroundColor = { r: 255, g: 255, b: 255 },
    useWorker = true,
  } = options;

  switch (method) {
    case 'threshold':
      return thresholdEdges(imageData, threshold);

    case 'erode':
      return erodeEdges(imageData, erodePixels, useWorker);

    case 'decontaminate':
      return decontaminateEdges(imageData, backgroundColor);

    default:
      throw new Error(`Unknown edge crispener method: ${method}`);
  }
}
