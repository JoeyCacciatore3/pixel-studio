/**
 * Outline Perfecter
 * Closes gaps, straightens lines, smooths curves, and sharpens corners
 */

import { findAllContours, detectEdges } from './utils/contourTrace';
import { closing, dilate } from './utils/morphology';

export interface OutlinePerfecterOptions {
  closeGaps?: boolean; // Close gaps up to N pixels
  maxGapSize?: number; // Maximum gap size to close (1-5 pixels)
  straightenLines?: boolean; // Snap nearly-straight lines to perfect angles
  snapAngles?: number[]; // Angles to snap to (e.g., [0, 45, 90, 135])
  smoothCurves?: boolean; // Smooth curves
  smoothStrength?: number; // Smoothing strength (0-100)
  sharpenCorners?: boolean; // Sharpen rounded corners
  cornerThreshold?: number; // Angle threshold for corner detection (degrees)
}

/**
 * Close gaps in outline
 */
function closeGaps(imageData: ImageData, maxGapSize: number): ImageData {
  const isForeground = (_r: number, _g: number, _b: number, a: number): boolean => {
    return a >= 128;
  };

  // Use morphological closing to fill gaps
  return closing(imageData, maxGapSize * 2 + 1, isForeground);
}

/**
 * Straighten lines by snapping to angles
 */
function straightenLines(
  imageData: ImageData,
  snapAngles: number[]
): ImageData {
  const { width, height } = imageData;
  const edgeMap = detectEdges(imageData, 30, true);
  const contours = findAllContours(edgeMap, width, height);

  const result = new ImageData(width, height);
  result.data.set(imageData.data);

  // Process each contour
  for (const contour of contours) {
    if (contour.points.length < 3) continue;

    // Analyze line segments
    for (let i = 0; i < contour.points.length - 1; i++) {
      const p1 = contour.points[i]!;
      const p2 = contour.points[i + 1]!;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length < 2) continue; // Too short

      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const normalizedAngle = ((angle % 360) + 360) % 360;

      // Find nearest snap angle
      let nearestAngle = snapAngles[0]!;
      let minDiff = Math.abs(normalizedAngle - nearestAngle);

      for (const snapAngle of snapAngles) {
        const diff = Math.abs(normalizedAngle - snapAngle);
        if (diff < minDiff) {
          minDiff = diff;
          nearestAngle = snapAngle;
        }
      }

      // If close to a snap angle, straighten the line
      if (minDiff < 10) {
        const rad = (nearestAngle * Math.PI) / 180;
        const newDx = Math.cos(rad) * length;
        const newDy = Math.sin(rad) * length;

        // Draw straightened line
        const steps = Math.ceil(length);
        for (let j = 0; j <= steps; j++) {
          const t = j / steps;
          const x = Math.round(p1.x + newDx * t);
          const y = Math.round(p1.y + newDy * t);

          if (x >= 0 && x < width && y >= 0 && y < height) {
            const index = (y * width + x) * 4;
            // Get color from original pixel
            const origIndex = (p1.y * width + p1.x) * 4;
            result.data[index] = imageData.data[origIndex]!;
            result.data[index + 1] = imageData.data[origIndex + 1]!;
            result.data[index + 2] = imageData.data[origIndex + 2]!;
            result.data[index + 3] = 255;
          }
        }
      }
    }
  }

  return result;
}

/**
 * Smooth curves using moving average
 */
function smoothCurves(imageData: ImageData, strength: number): ImageData {
  const { width, height } = imageData;
  const edgeMap = detectEdges(imageData, 30, true);
  const contours = findAllContours(edgeMap, width, height);

  const result = new ImageData(width, height);
  result.data.set(imageData.data);

  const strengthNorm = strength / 100;
  const windowSize = Math.max(3, Math.floor(5 * strengthNorm));

  for (const contour of contours) {
    if (contour.points.length < windowSize) continue;

    const smoothed: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < contour.points.length; i++) {
      let sumX = 0;
      let sumY = 0;
      let count = 0;

      // Moving average window
      for (let j = -Math.floor(windowSize / 2); j <= Math.floor(windowSize / 2); j++) {
        const idx = (i + j + contour.points.length) % contour.points.length;
        const point = contour.points[idx]!;
        sumX += point.x;
        sumY += point.y;
        count++;
      }

      smoothed.push({
        x: Math.round(sumX / count),
        y: Math.round(sumY / count),
      });
    }

    // Draw smoothed contour
    for (let i = 0; i < smoothed.length; i++) {
      const point = smoothed[i]!;
      // const nextPoint = smoothed[(i + 1) % smoothed.length]!;

      if (point.x >= 0 && point.x < width && point.y >= 0 && point.y < height) {
        const index = (point.y * width + point.x) * 4;
        const origIndex = (contour.points[i]!.y * width + contour.points[i]!.x) * 4;
        result.data[index] = imageData.data[origIndex]!;
        result.data[index + 1] = imageData.data[origIndex + 1]!;
        result.data[index + 2] = imageData.data[origIndex + 2]!;
        result.data[index + 3] = 255;
      }
    }
  }

  return result;
}

/**
 * Sharpen corners
 */
function sharpenCorners(imageData: ImageData, threshold: number): ImageData {
  const { width, height } = imageData;
  const edgeMap = detectEdges(imageData, 30, true);
  const contours = findAllContours(edgeMap, width, height);

  const result = new ImageData(width, height);
  result.data.set(imageData.data);

  for (const contour of contours) {
    if (contour.points.length < 3) continue;

    for (let i = 0; i < contour.points.length; i++) {
      const prev = contour.points[(i - 1 + contour.points.length) % contour.points.length]!;
      const curr = contour.points[i]!;
      const next = contour.points[(i + 1) % contour.points.length]!;

      // Calculate angle at corner
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;

      const angle1 = Math.atan2(dy1, dx1) * (180 / Math.PI);
      const angle2 = Math.atan2(dy2, dx2) * (180 / Math.PI);
      let angleDiff = Math.abs(angle2 - angle1);
      if (angleDiff > 180) angleDiff = 360 - angleDiff;

      // If angle is close to 180 (straight line), it's not a corner
      // If angle is far from 180, it's a sharp corner
      // If angle is between threshold and 180, it's a rounded corner to sharpen
      if (angleDiff < 180 - threshold && angleDiff > threshold) {
        // This is a rounded corner - sharpen it
        const index = (curr.y * width + curr.x) * 4;
        result.data[index] = imageData.data[index]!;
        result.data[index + 1] = imageData.data[index + 1]!;
        result.data[index + 2] = imageData.data[index + 2]!;
        result.data[index + 3] = 255;

        // Dilate slightly to make corner more prominent
        const isForeground = (_r: number, _g: number, _b: number, a: number): boolean => {
          return a >= 128;
        };
        const dilated = dilate(
          new ImageData(new Uint8ClampedArray(result.data), width, height),
          3,
          isForeground
        );

        // Copy dilated corner back
        const dilatedIndex = (curr.y * width + curr.x) * 4;
        result.data[index] = dilated.data[dilatedIndex]!;
        result.data[index + 1] = dilated.data[dilatedIndex + 1]!;
        result.data[index + 2] = dilated.data[dilatedIndex + 2]!;
        result.data[index + 3] = dilated.data[dilatedIndex + 3]!;
      }
    }
  }

  return result;
}

/**
 * Perfect outline
 */
export async function perfectOutline(
  imageData: ImageData,
  options: OutlinePerfecterOptions
): Promise<ImageData> {
  const {
    closeGaps: shouldCloseGaps = true,
    maxGapSize = 3,
    straightenLines: shouldStraightenLines = false,
    snapAngles = [0, 45, 90, 135],
    smoothCurves: shouldSmoothCurves = false,
    smoothStrength = 50,
    sharpenCorners: doSharpenCorners = false,
    cornerThreshold = 120,
  } = options;

  let result = imageData;

  // Apply operations in order
  if (shouldCloseGaps) {
    result = closeGaps(result, maxGapSize);
  }

  if (shouldStraightenLines) {
    result = straightenLines(result, snapAngles);
  }

  if (shouldSmoothCurves) {
    result = smoothCurves(result, smoothStrength);
  }

  if (doSharpenCorners) {
    result = sharpenCorners(result, cornerThreshold);
  }

  return result;
}
