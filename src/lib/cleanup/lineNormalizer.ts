/**
 * Line Thickness Normalizer
 * Normalizes inconsistent line thickness
 */

import { skeletonize, distanceTransform } from './utils/morphology';

export interface LineNormalizerOptions {
  targetWidth: number; // Target line width in pixels (1, 2, 3, etc.)
  useWorker?: boolean; // Use Web Worker for large images
}

/**
 * Normalize line thickness
 */
export async function normalizeLineThickness(
  imageData: ImageData,
  options: LineNormalizerOptions
): Promise<ImageData> {
  const { targetWidth, useWorker: _useWorker = true } = options;

  const isForeground = (_r: number, _g: number, _b: number, a: number): boolean => {
    return a >= 128;
  };

  // Calculate distance transform to find thickness
  const distance = distanceTransform(imageData, isForeground);
  const { width, height } = imageData;

  // Skeletonize to find line centers
  const skeleton = skeletonize(imageData, isForeground);

  const result = new ImageData(width, height);
  result.data.set(imageData.data);

  // Process each skeleton pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const pixelIndex = index * 4;
      const skeletonA = skeleton.data[pixelIndex + 3]!;

      if (skeletonA < 128) continue; // Not on skeleton

      const currentThickness = distance[index]! * 2; // Distance transform gives radius

      if (currentThickness > targetWidth) {
        // Line is too thick - need to erode
        const excess = currentThickness - targetWidth;
        const erodeRadius = Math.ceil(excess / 2);

        // Erode around this point
        for (let dy = -erodeRadius; dy <= erodeRadius; dy++) {
          for (let dx = -erodeRadius; dx <= erodeRadius; dx++) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > erodeRadius) continue;

            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const neighborIndex = ny * width + nx;
              const neighborDist = distance[neighborIndex]!;
              const neighborThickness = neighborDist * 2;

              // Only remove if it's part of the excess
              if (neighborThickness > targetWidth && dist <= erodeRadius) {
                const neighborPixelIndex = neighborIndex * 4;
                result.data[neighborPixelIndex] = 0;
                result.data[neighborPixelIndex + 1] = 0;
                result.data[neighborPixelIndex + 2] = 0;
                result.data[neighborPixelIndex + 3] = 0;
              }
            }
          }
        }
      } else if (currentThickness < targetWidth) {
        // Line is too thin - need to dilate
        const deficit = targetWidth - currentThickness;
        const dilateRadius = Math.ceil(deficit / 2);

        // Get color from skeleton pixel
        const r = skeleton.data[pixelIndex]!;
        const g = skeleton.data[pixelIndex + 1]!;
        const b = skeleton.data[pixelIndex + 2]!;
        const a = skeleton.data[pixelIndex + 3]!;

        // Dilate around this point
        for (let dy = -dilateRadius; dy <= dilateRadius; dy++) {
          for (let dx = -dilateRadius; dx <= dilateRadius; dx++) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > dilateRadius) continue;

            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const neighborIndex = ny * width + nx;
              const neighborPixelIndex = neighborIndex * 4;
              const neighborA = result.data[neighborPixelIndex + 3]!;

              // Only add if pixel is transparent or has less thickness
              if (neighborA < 128) {
                const neighborDist = distance[neighborIndex]!;
                const neighborThickness = neighborDist * 2;

                if (neighborThickness < targetWidth && dist <= dilateRadius) {
                  result.data[neighborPixelIndex] = r;
                  result.data[neighborPixelIndex + 1] = g;
                  result.data[neighborPixelIndex + 2] = b;
                  result.data[neighborPixelIndex + 3] = a;
                }
              }
            }
          }
        }
      }
    }
  }

  return result;
}
