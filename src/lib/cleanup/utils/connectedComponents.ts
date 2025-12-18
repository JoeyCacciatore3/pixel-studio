/**
 * Connected Component Analysis
 * Finds and labels connected regions in binary images
 */

export interface ConnectedComponent {
  id: number;
  pixels: Array<{ x: number; y: number }>;
  size: number;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

/**
 * Find all connected components in a binary image
 * Uses 8-connectivity by default
 */
export function findConnectedComponents(
  imageData: ImageData,
  isForeground: (r: number, g: number, b: number, a: number) => boolean,
  connectivity: 4 | 8 = 8
): ConnectedComponent[] {
  const { width, height, data } = imageData;
  const visited = new Uint8Array(width * height);
  const components: ConnectedComponent[] = [];
  let componentId = 0;

  // Neighbors for 4-connectivity (up, down, left, right)
  const neighbors4 = [
    [0, -1], // up
    [0, 1], // down
    [-1, 0], // left
    [1, 0], // right
  ];

  // Neighbors for 8-connectivity (includes diagonals)
  const neighbors8 = [
    ...neighbors4,
    [-1, -1], // up-left
    [1, -1], // up-right
    [-1, 1], // down-left
    [1, 1], // down-right
  ];

  const neighbors = connectivity === 4 ? neighbors4 : neighbors8;

  /**
   * Flood fill to find all pixels in a connected component
   */
  function floodFill(startX: number, startY: number): ConnectedComponent | null {
    const pixels: Array<{ x: number; y: number }> = [];
    const stack: Array<[number, number]> = [[startX, startY]];
    let minX = startX;
    let minY = startY;
    let maxX = startX;
    let maxY = startY;

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const index = y * width + x;

      // Check bounds
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited[index]) continue;

      // Check if pixel is foreground
      const pixelIndex = (y * width + x) * 4;
      const r = data[pixelIndex]!;
      const g = data[pixelIndex + 1]!;
      const b = data[pixelIndex + 2]!;
      const a = data[pixelIndex + 3]!;

      if (!isForeground(r, g, b, a)) continue;

      // Mark as visited and add to component
      visited[index] = 1;
      pixels.push({ x, y });

      // Update bounds
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      // Add neighbors to stack
      for (const [dx, dy] of neighbors) {
        const nx = x + dx;
        const ny = y + dy;
        const neighborIndex = ny * width + nx;

        if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[neighborIndex]) {
          stack.push([nx, ny]);
        }
      }
    }

    if (pixels.length === 0) return null;

    return {
      id: componentId++,
      pixels,
      size: pixels.length,
      bounds: { minX, minY, maxX, maxY },
    };
  }

  // Scan image for unvisited foreground pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (visited[index]) continue;

      const pixelIndex = (y * width + x) * 4;
      const r = data[pixelIndex]!;
      const g = data[pixelIndex + 1]!;
      const b = data[pixelIndex + 2]!;
      const a = data[pixelIndex + 3]!;

      if (isForeground(r, g, b, a)) {
        const component = floodFill(x, y);
        if (component) {
          components.push(component);
        }
      }
    }
  }

  return components;
}

/**
 * Remove components smaller than minSize
 * Returns new ImageData with small components removed
 */
export function removeSmallComponents(
  imageData: ImageData,
  minSize: number,
  isForeground: (r: number, g: number, b: number, a: number) => boolean,
  connectivity: 4 | 8 = 8
): ImageData {
  const components = findConnectedComponents(imageData, isForeground, connectivity);
  const result = new ImageData(imageData.width, imageData.height);
  const resultData = result.data;

  // Copy original data
  resultData.set(imageData.data);

  // Remove small components (set to transparent)
  for (const component of components) {
    if (component.size < minSize) {
      for (const { x, y } of component.pixels) {
        const index = (y * imageData.width + x) * 4;
        resultData[index] = 0; // R
        resultData[index + 1] = 0; // G
        resultData[index + 2] = 0; // B
        resultData[index + 3] = 0; // A (transparent)
      }
    }
  }

  return result;
}

/**
 * Find nearest neighbor color for a component
 * Returns the most common color in surrounding pixels
 */
export function findNearestNeighborColor(
  imageData: ImageData,
  component: ConnectedComponent,
  radius: number = 3
): { r: number; g: number; b: number; a: number } {
  const { width, height, data } = imageData;
  const colorCounts = new Map<string, number>();
  const { minX, minY, maxX, maxY } = component.bounds;

  // Sample colors from surrounding area
  for (let y = Math.max(0, minY - radius); y < Math.min(height, maxY + radius); y++) {
    for (let x = Math.max(0, minX - radius); x < Math.min(width, maxX + radius); x++) {
      // Skip pixels that are part of the component
      const isInComponent = component.pixels.some((p) => p.x === x && p.y === y);
      if (isInComponent) continue;

      const index = (y * width + x) * 4;
      const a = data[index + 3]!;

      // Only consider opaque pixels
      if (a < 128) continue;

      const r = data[index]!;
      const g = data[index + 1]!;
      const b = data[index + 2]!;
      const key = `${r},${g},${b},${a}`;

      colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    }
  }

  // Find most common color
  let maxCount = 0;
  let dominantColor = { r: 0, g: 0, b: 0, a: 255 };

  for (const [key, count] of colorCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      const [r, g, b, a] = key.split(',').map(Number);
      dominantColor = { r, g, b, a };
    }
  }

  return dominantColor;
}
