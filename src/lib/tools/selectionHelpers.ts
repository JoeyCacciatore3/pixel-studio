/**
 * Selection Helpers
 * Utility functions for selection mode operations
 */

import type { SelectionMode } from '../types';

/**
 * Combine two selection masks based on mode
 */
export function combineSelections(
  existing: Uint8Array | null,
  newSelection: Uint8Array,
  mode: SelectionMode,
  width: number,
  height: number
): Uint8Array {
  const result = new Uint8Array(width * height);

  if (mode === 'replace' || !existing) {
    // Replace: just use new selection
    return newSelection;
  }

  // Combine based on mode
  for (let i = 0; i < width * height; i++) {
    const existingVal = existing[i] || 0;
    const newVal = newSelection[i] || 0;

    switch (mode) {
      case 'add':
        // Union: max of both
        result[i] = Math.max(existingVal, newVal);
        break;
      case 'subtract':
        // Subtract: existing minus new
        result[i] = Math.max(0, existingVal - newVal);
        break;
      case 'intersect':
        // Intersection: min of both
        result[i] = Math.min(existingVal, newVal);
        break;
      default:
        result[i] = newVal;
    }
  }

  return result;
}

/**
 * Create selection mask from rectangular selection
 */
export function createRectangularMask(
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number,
  feather?: number,
  _antiAlias?: boolean
): Uint8Array {
  const mask = new Uint8Array(canvasWidth * canvasHeight);

  const startX = Math.max(0, Math.floor(x));
  const endX = Math.min(canvasWidth, Math.floor(x + width));
  const startY = Math.max(0, Math.floor(y));
  const endY = Math.min(canvasHeight, Math.floor(y + height));

  for (let py = startY; py < endY; py++) {
    for (let px = startX; px < endX; px++) {
      const idx = py * canvasWidth + px;
      mask[idx] = 1;
    }
  }

  // Apply feathering if enabled
  if (feather && feather > 0) {
    return featherSelection(mask, feather, canvasWidth, canvasHeight);
  }

  return mask;
}

/**
 * Apply feathering to selection mask
 */
export function featherSelection(
  mask: Uint8Array,
  radius: number,
  width: number,
  height: number
): Uint8Array {
  const feathered = new Uint8Array(mask.length);
  const sigma = radius / 3;
  const kernelSize = Math.ceil(radius * 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let weightSum = 0;

      for (let ky = -kernelSize; ky <= kernelSize; ky++) {
        for (let kx = -kernelSize; kx <= kernelSize; kx++) {
          const px = x + kx;
          const py = y + ky;

          if (px >= 0 && px < width && py >= 0 && py < height) {
            const dist = Math.sqrt(kx * kx + ky * ky);
            if (dist <= radius) {
              const weight = Math.exp(-(dist * dist) / (2 * sigma * sigma));
              const idx = py * width + px;
              sum += mask[idx]! * weight;
              weightSum += weight;
            }
          }
        }
      }

      const idx = y * width + x;
      feathered[idx] = weightSum > 0 ? Math.round((sum / weightSum) * 255) / 255 : 0;
    }
  }

  return feathered;
}
