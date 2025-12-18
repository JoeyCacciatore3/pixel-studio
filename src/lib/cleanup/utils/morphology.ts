/**
 * Morphological Operations
 * Erosion, dilation, opening, closing, and skeletonization
 */

/**
 * Create a square structuring element
 */
function createSquareKernel(size: number): Array<[number, number]> {
  const kernel: Array<[number, number]> = [];
  const radius = Math.floor(size / 2);

  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      kernel.push([x, y]);
    }
  }

  return kernel;
}

/**
 * Erosion: Shrinks foreground regions
 */
export function erode(
  imageData: ImageData,
  kernelSize: number = 3,
  isForeground: (r: number, g: number, b: number, a: number) => boolean
): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  const resultData = result.data;
  const kernel = createSquareKernel(kernelSize);
  // const radius = Math.floor(kernelSize / 2)

  // Copy original data
  resultData.set(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4;
      const r = data[pixelIndex]!;
      const g = data[pixelIndex + 1]!;
      const b = data[pixelIndex + 2]!;
      const a = data[pixelIndex + 3]!;

      if (!isForeground(r, g, b, a)) continue;

      // Check if all neighbors are foreground
      let allForeground = true;
      for (const [dx, dy] of kernel) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          allForeground = false;
          break;
        }

        const neighborIndex = (ny * width + nx) * 4;
        const nr = data[neighborIndex]!;
        const ng = data[neighborIndex + 1]!;
        const nb = data[neighborIndex + 2]!;
        const na = data[neighborIndex + 3]!;

        if (!isForeground(nr, ng, nb, na)) {
          allForeground = false;
          break;
        }
      }

      // If not all neighbors are foreground, remove this pixel
      if (!allForeground) {
        resultData[pixelIndex] = 0;
        resultData[pixelIndex + 1] = 0;
        resultData[pixelIndex + 2] = 0;
        resultData[pixelIndex + 3] = 0;
      }
    }
  }

  return result;
}

/**
 * Dilation: Expands foreground regions
 */
export function dilate(
  imageData: ImageData,
  kernelSize: number = 3,
  isForeground: (r: number, g: number, b: number, a: number) => boolean
): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  const resultData = result.data;
  const kernel = createSquareKernel(kernelSize);

  // Copy original data
  resultData.set(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4;
      const r = data[pixelIndex]!;
      const g = data[pixelIndex + 1]!;
      const b = data[pixelIndex + 2]!;
      const a = data[pixelIndex + 3]!;

      if (isForeground(r, g, b, a)) {
        // Expand to neighbors
        for (const [dx, dy] of kernel) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const neighborIndex = (ny * width + nx) * 4;
            const nr = resultData[neighborIndex]!;
            const ng = resultData[neighborIndex + 1]!;
            const nb = resultData[neighborIndex + 2]!;
            const na = resultData[neighborIndex + 3]!;

            // Only dilate if neighbor is not already foreground
            if (!isForeground(nr, ng, nb, na)) {
              // Copy color from source pixel
              resultData[neighborIndex] = r;
              resultData[neighborIndex + 1] = g;
              resultData[neighborIndex + 2] = b;
              resultData[neighborIndex + 3] = a;
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * Opening: Erosion followed by dilation (removes small protrusions)
 */
export function opening(
  imageData: ImageData,
  kernelSize: number = 3,
  isForeground: (r: number, g: number, b: number, a: number) => boolean
): ImageData {
  const eroded = erode(imageData, kernelSize, isForeground);
  return dilate(eroded, kernelSize, isForeground);
}

/**
 * Closing: Dilation followed by erosion (fills small holes)
 */
export function closing(
  imageData: ImageData,
  kernelSize: number = 3,
  isForeground: (r: number, g: number, b: number, a: number) => boolean
): ImageData {
  const dilated = dilate(imageData, kernelSize, isForeground);
  return erode(dilated, kernelSize, isForeground);
}

/**
 * Skeletonization: Reduces shapes to 1-pixel wide skeletons
 * Uses Zhang-Suen thinning algorithm
 */
export function skeletonize(
  imageData: ImageData,
  isForeground: (r: number, g: number, b: number, a: number) => boolean
): ImageData {
  const { width, height, data } = imageData;
  let result = new ImageData(width, height);
  result.data.set(data);

  // Convert to binary
  const binary = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const pixelIndex = index * 4;
      const r = data[pixelIndex]!;
      const g = data[pixelIndex + 1]!;
      const b = data[pixelIndex + 2]!;
      const a = data[pixelIndex + 3]!;
      binary[index] = isForeground(r, g, b, a) ? 1 : 0;
    }
  }

  let changed = true;
  let iteration = 0;
  const maxIterations = 1000; // Safety limit

  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;

    // Subiteration 1
    const toRemove1: Array<[number, number]> = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = y * width + x;
        if (binary[index] === 0) continue;

        // Get 8 neighbors (P2-P9, clockwise from top)
        const p2 = binary[(y - 1) * width + x]!;
        const p3 = binary[(y - 1) * width + x + 1]!;
        const p4 = binary[y * width + x + 1]!;
        const p5 = binary[(y + 1) * width + x + 1]!;
        const p6 = binary[(y + 1) * width + x]!;
        const p7 = binary[(y + 1) * width + x - 1]!;
        const p8 = binary[y * width + x - 1]!;
        const p9 = binary[(y - 1) * width + x - 1]!;

        // Count transitions from 0 to 1
        let transitions = 0;
        if (p2 === 0 && p3 === 1) transitions++;
        if (p3 === 0 && p4 === 1) transitions++;
        if (p4 === 0 && p5 === 1) transitions++;
        if (p5 === 0 && p6 === 1) transitions++;
        if (p6 === 0 && p7 === 1) transitions++;
        if (p7 === 0 && p8 === 1) transitions++;
        if (p8 === 0 && p9 === 1) transitions++;
        if (p9 === 0 && p2 === 1) transitions++;

        const neighbors = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;

        // Conditions for removal
        if (
          transitions === 1 &&
          neighbors >= 2 &&
          neighbors <= 6 &&
          p2 * p4 * p6 === 0 &&
          p4 * p6 * p8 === 0
        ) {
          toRemove1.push([x, y]);
        }
      }
    }

    // Remove marked pixels
    for (const [x, y] of toRemove1) {
      const index = y * width + x;
      binary[index] = 0;
      changed = true;
    }

    // Subiteration 2
    const toRemove2: Array<[number, number]> = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = y * width + x;
        if (binary[index] === 0) continue;

        const p2 = binary[(y - 1) * width + x]!;
        const p3 = binary[(y - 1) * width + x + 1]!;
        const p4 = binary[y * width + x + 1]!;
        const p5 = binary[(y + 1) * width + x + 1]!;
        const p6 = binary[(y + 1) * width + x]!;
        const p7 = binary[(y + 1) * width + x - 1]!;
        const p8 = binary[y * width + x - 1]!;
        const p9 = binary[(y - 1) * width + x - 1]!;

        let transitions = 0;
        if (p2 === 0 && p3 === 1) transitions++;
        if (p3 === 0 && p4 === 1) transitions++;
        if (p4 === 0 && p5 === 1) transitions++;
        if (p5 === 0 && p6 === 1) transitions++;
        if (p6 === 0 && p7 === 1) transitions++;
        if (p7 === 0 && p8 === 1) transitions++;
        if (p8 === 0 && p9 === 1) transitions++;
        if (p9 === 0 && p2 === 1) transitions++;

        const neighbors = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;

        if (
          transitions === 1 &&
          neighbors >= 2 &&
          neighbors <= 6 &&
          p2 * p4 * p8 === 0 &&
          p2 * p6 * p8 === 0
        ) {
          toRemove2.push([x, y]);
        }
      }
    }

    // Remove marked pixels
    for (const [x, y] of toRemove2) {
      const index = y * width + x;
      binary[index] = 0;
      changed = true;
    }
  }

  // Convert back to ImageData
  const skeleton = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const pixelIndex = index * 4;
      if (binary[index] === 1) {
        // Copy original color
        skeleton.data[pixelIndex] = data[pixelIndex]!;
        skeleton.data[pixelIndex + 1] = data[pixelIndex + 1]!;
        skeleton.data[pixelIndex + 2] = data[pixelIndex + 2]!;
        skeleton.data[pixelIndex + 3] = data[pixelIndex + 3]!;
      } else {
        skeleton.data[pixelIndex] = 0;
        skeleton.data[pixelIndex + 1] = 0;
        skeleton.data[pixelIndex + 2] = 0;
        skeleton.data[pixelIndex + 3] = 0;
      }
    }
  }

  return skeleton;
}

/**
 * Distance transform: Calculate distance from each pixel to nearest background pixel
 */
export function distanceTransform(
  imageData: ImageData,
  isForeground: (r: number, g: number, b: number, a: number) => boolean
): Float32Array {
  const { width, height } = imageData;
  const distance = new Float32Array(width * height);

  // Initialize: 0 for background, Infinity for foreground
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const pixelIndex = index * 4;
      const r = imageData.data[pixelIndex]!;
      const g = imageData.data[pixelIndex + 1]!;
      const b = imageData.data[pixelIndex + 2]!;
      const a = imageData.data[pixelIndex + 3]!;

      distance[index] = isForeground(r, g, b, a) ? Infinity : 0;
    }
  }

  // Forward pass (top-left to bottom-right)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (distance[index] === 0) continue;

      let minDist = distance[index]!;
      if (x > 0) minDist = Math.min(minDist, distance[index - 1]! + 1);
      if (y > 0) minDist = Math.min(minDist, distance[index - width]! + 1);
      if (x > 0 && y > 0) minDist = Math.min(minDist, distance[index - width - 1]! + Math.SQRT2);
      if (x < width - 1 && y > 0)
        minDist = Math.min(minDist, distance[index - width + 1]! + Math.SQRT2);

      distance[index] = minDist;
    }
  }

  // Backward pass (bottom-right to top-left)
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const index = y * width + x;
      if (distance[index] === 0) continue;

      let minDist = distance[index]!;
      if (x < width - 1) minDist = Math.min(minDist, distance[index + 1]! + 1);
      if (y < height - 1) minDist = Math.min(minDist, distance[index + width]! + 1);
      if (x < width - 1 && y < height - 1)
        minDist = Math.min(minDist, distance[index + width + 1]! + Math.SQRT2);
      if (x > 0 && y < height - 1)
        minDist = Math.min(minDist, distance[index + width - 1]! + Math.SQRT2);

      distance[index] = minDist;
    }
  }

  return distance;
}
