/**
 * Edge Smoother
 * Detects and smooths jagged edges with anti-aliasing
 */

import { sobelEdgeDetection } from './utils/contourTrace';
import WorkerManager from '../workers/workerManager';
import { logger } from '../utils/logger';

export type SmoothingMode = 'subtle' | 'standard' | 'smooth' | 'pixel-perfect';

export interface EdgeSmootherOptions {
  mode: SmoothingMode;
  strength?: number; // 0-100, smoothing strength
  preserveCorners?: boolean; // Preserve hard corners
  useWorker?: boolean; // Use Web Worker for large images
}

/**
 * Detect staircase patterns in edges
 */
function detectStaircasePatterns(
  edgeMap: Float32Array,
  width: number,
  height: number
): Uint8Array {
  const patterns = new Uint8Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      const edge = edgeMap[index]!;

      if (edge < 10) continue; // Not an edge

      // Check for horizontal staircase
      const left = edgeMap[index - 1]!;
      const right = edgeMap[index + 1]!;
      const up = edgeMap[index - width]!;
      const down = edgeMap[index + width]!;

      // Detect step patterns (2+ pixels before stepping)
      const horizontalStep = Math.abs(left - right) > 20 && (left > 10 || right > 10);
      const verticalStep = Math.abs(up - down) > 20 && (up > 10 || down > 10);

      if (horizontalStep || verticalStep) {
        patterns[index] = 1;
      }
    }
  }

  return patterns;
}

/**
 * Apply anti-aliasing to edge pixels
 */
function applyAntiAliasing(
  imageData: ImageData,
  patterns: Uint8Array,
  mode: SmoothingMode,
  strength: number
): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  result.data.set(data);

  const strengthNorm = strength / 100;
  let aaLevel = 1; // Number of intermediate shades

  switch (mode) {
    case 'subtle':
      aaLevel = 1;
      break;
    case 'standard':
      aaLevel = 2;
      break;
    case 'smooth':
      aaLevel = 3;
      break;
    case 'pixel-perfect':
      aaLevel = 0; // No AA, only fix obvious jaggies
      break;
  }

  if (aaLevel === 0) {
    // Pixel-perfect mode: minimal smoothing
    return result;
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      if (patterns[index] === 0) continue;

      const pixelIndex = index * 4;
      const r = data[pixelIndex]!;
      const g = data[pixelIndex + 1]!;
      const b = data[pixelIndex + 2]!;
      const a = data[pixelIndex + 3]!;

      if (a < 128) continue; // Skip transparent pixels

      // Sample neighbors
      const neighbors: Array<{ r: number; g: number; b: number; a: number }> = [];

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;

          const nx = x + dx;
          const ny = y + dy;
          const neighborIndex = (ny * width + nx) * 4;
          const na = data[neighborIndex + 3]!;

          if (na >= 128) {
            neighbors.push({
              r: data[neighborIndex]!,
              g: data[neighborIndex + 1]!,
              b: data[neighborIndex + 2]!,
              a: na,
            });
          }
        }
      }

      if (neighbors.length === 0) continue;

      // Calculate average color
      let avgR = 0;
      let avgG = 0;
      let avgB = 0;
      let avgA = 0;

      for (const neighbor of neighbors) {
        avgR += neighbor.r;
        avgG += neighbor.g;
        avgB += neighbor.b;
        avgA += neighbor.a;
      }

      avgR = Math.round(avgR / neighbors.length);
      avgG = Math.round(avgG / neighbors.length);
      avgB = Math.round(avgB / neighbors.length);
      avgA = Math.round(avgA / neighbors.length);

      // Blend with original based on strength
      const blendedR = Math.round(r * (1 - strengthNorm) + avgR * strengthNorm);
      const blendedG = Math.round(g * (1 - strengthNorm) + avgG * strengthNorm);
      const blendedB = Math.round(b * (1 - strengthNorm) + avgB * strengthNorm);

      result.data[pixelIndex] = blendedR;
      result.data[pixelIndex + 1] = blendedG;
      result.data[pixelIndex + 2] = blendedB;
      result.data[pixelIndex + 3] = a; // Keep original alpha
    }
  }

  return result;
}

/**
 * Smooth edges in image
 */
export async function smoothEdges(
  imageData: ImageData,
  options: EdgeSmootherOptions
): Promise<ImageData> {
  const { mode, strength = 50, preserveCorners: _preserveCorners = true, useWorker = true } = options;

  // Use worker for edge detection if available
  let edgeMap: Float32Array;

  if (useWorker && WorkerManager.isCleanupWorkerAvailable()) {
    try {
      if (!WorkerManager.isCleanupWorkerAvailable()) {
        WorkerManager.initCleanupWorker();
      }

      const result = (await WorkerManager.executeCleanupOperation('detect-edges', {
        imageData,
      })) as Float32Array;

      edgeMap = result;
    } catch (error) {
      logger.warn('Worker edge detection failed, falling back to main thread:', error);
      edgeMap = sobelEdgeDetection(imageData);
    }
  } else {
    edgeMap = sobelEdgeDetection(imageData);
  }

  // Detect staircase patterns
  const patterns = detectStaircasePatterns(edgeMap, imageData.width, imageData.height);

  // Apply anti-aliasing
  return applyAntiAliasing(imageData, patterns, mode, strength);
}
