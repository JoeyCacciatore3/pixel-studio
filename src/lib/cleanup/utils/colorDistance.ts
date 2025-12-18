/**
 * Color Distance Calculations
 * Perceptual color distance using LAB color space
 */

/**
 * Convert RGB to LAB color space
 * RGB values should be 0-255
 */
export function rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
  // Normalize to 0-1
  let rNorm = r / 255;
  let gNorm = g / 255;
  let bNorm = b / 255;

  // Convert to linear RGB
  rNorm = rNorm > 0.04045 ? Math.pow((rNorm + 0.055) / 1.055, 2.4) : rNorm / 12.92;
  gNorm = gNorm > 0.04045 ? Math.pow((gNorm + 0.055) / 1.055, 2.4) : gNorm / 12.92;
  bNorm = bNorm > 0.04045 ? Math.pow((bNorm + 0.055) / 1.055, 2.4) : bNorm / 12.92;

  // Convert to XYZ (using D65 illuminant)
  let x = (rNorm * 0.4124564 + gNorm * 0.3575761 + bNorm * 0.1804375) / 0.95047;
  let y = (rNorm * 0.2126729 + gNorm * 0.7151522 + bNorm * 0.072175) / 1.0;
  let z = (rNorm * 0.0193339 + gNorm * 0.119192 + bNorm * 0.9503041) / 1.08883;

  // Convert to LAB
  x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

  const l = 116 * y - 16;
  const a = 500 * (x - y);
  const labB = 200 * (y - z);

  return { l, a, b: labB };
}

/**
 * Calculate Delta E (CIE76) - perceptual color difference
 * Lower values mean colors are more similar
 */
export function deltaE(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const lab1 = rgbToLab(r1, g1, b1);
  const lab2 = rgbToLab(r2, g2, b2);

  const dl = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;

  return Math.sqrt(dl * dl + da * da + db * db);
}

/**
 * Calculate Euclidean distance in RGB space
 * Faster but less perceptually accurate than Delta E
 */
export function rgbDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;

  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Calculate Manhattan distance in RGB space
 * Even faster, good for quick comparisons
 */
export function rgbManhattanDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
}

/**
 * Check if two colors are similar within threshold
 * Uses Delta E for perceptual accuracy
 */
export function colorsSimilar(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
  threshold: number
): boolean {
  return deltaE(r1, g1, b1, r2, g2, b2) < threshold;
}

/**
 * Find nearest color in palette
 * Returns index and distance
 */
export function findNearestPaletteColor(
  r: number,
  g: number,
  b: number,
  palette: Array<{ r: number; g: number; b: number }>,
  useLab: boolean = true
): { index: number; distance: number } {
  let minDistance = Infinity;
  let nearestIndex = 0;

  for (let i = 0; i < palette.length; i++) {
    const color = palette[i]!;
    const distance = useLab
      ? deltaE(r, g, b, color.r, color.g, color.b)
      : rgbDistance(r, g, b, color.r, color.g, color.b);

    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }

  return { index: nearestIndex, distance: minDistance };
}

/**
 * Extract unique colors from image
 * Returns array of unique colors with their counts
 */
export function extractUniqueColors(imageData: ImageData): Array<{
  r: number;
  g: number;
  b: number;
  a: number;
  count: number;
}> {
  const colorMap = new Map<string, number>();
  const { width: _width, height: _height, data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const a = data[i + 3]!;

    // Only count opaque pixels
    if (a < 128) continue;

    const key = `${r},${g},${b},${a}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  const colors: Array<{ r: number; g: number; b: number; a: number; count: number }> = [];

  for (const [key, count] of colorMap.entries()) {
    const [r, g, b, a] = key.split(',').map(Number);
    colors.push({ r, g, b, a, count });
  }

  // Sort by count (most common first)
  colors.sort((a, b) => b.count - a.count);

  return colors;
}
