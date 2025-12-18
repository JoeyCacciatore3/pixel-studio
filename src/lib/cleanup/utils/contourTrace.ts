/**
 * Contour Tracing and Edge Detection
 * Finds edges and traces contours in images
 */

export interface Point {
  x: number;
  y: number;
}

export interface Contour {
  points: Point[];
  closed: boolean;
}

/**
 * Sobel edge detection
 * Returns edge magnitude map
 */
export function sobelEdgeDetection(imageData: ImageData): Float32Array {
  const { width, height, data } = imageData;
  const edgeMap = new Float32Array(width * height);

  // Sobel kernels
  const sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];

  const sobelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];

  // Convert to grayscale first
  const grayscale = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const pixelIndex = index * 4;
      const r = data[pixelIndex]!;
      const g = data[pixelIndex + 1]!;
      const b = data[pixelIndex + 2]!;
      // Luminance formula
      grayscale[index] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
  }

  // Apply Sobel operator
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelValue = grayscale[(y + ky) * width + (x + kx)]!;
          gx += pixelValue * sobelX[ky + 1]![kx + 1]!;
          gy += pixelValue * sobelY[ky + 1]![kx + 1]!;
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edgeMap[y * width + x] = magnitude;
    }
  }

  return edgeMap;
}

/**
 * Simple edge detection using alpha channel
 * Returns binary edge map (1 = edge, 0 = not edge)
 */
export function alphaEdgeDetection(imageData: ImageData, threshold: number = 128): Uint8Array {
  const { width, height, data } = imageData;
  const edgeMap = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const pixelIndex = index * 4;
      const a = data[pixelIndex + 3]!;

      // Check if pixel is on edge (has alpha but neighbor doesn't, or vice versa)
      let isEdge = false;

      if (a >= threshold) {
        // Check neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;

            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const neighborIndex = (ny * width + nx) * 4;
              const na = data[neighborIndex + 3]!;

              if (na < threshold) {
                isEdge = true;
                break;
              }
            } else {
              // Edge of image with opaque pixel = edge
              isEdge = true;
              break;
            }
          }
          if (isEdge) break;
        }
      }

      edgeMap[index] = isEdge ? 1 : 0;
    }
  }

  return edgeMap;
}

/**
 * Trace contour using Moore neighborhood algorithm
 */
export function traceContour(
  edgeMap: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number
): Contour | null {
  const visited = new Uint8Array(width * height);
  const points: Point[] = [];

  // Moore neighborhood (8-connected, starting from top-left, clockwise)
  const neighbors = [
    [-1, -1], // top-left
    [0, -1], // top
    [1, -1], // top-right
    [1, 0], // right
    [1, 1], // bottom-right
    [0, 1], // bottom
    [-1, 1], // bottom-left
    [-1, 0], // left
  ];

  let x = startX;
  let y = startY;
  let startIndex = y * width + x;

  // Check if starting point is valid
  if (x < 0 || x >= width || y < 0 || y >= height || edgeMap[startIndex] === 0) {
    return null;
  }

  // Find first edge pixel by scanning
  let found = false;
  for (let sy = 0; sy < height && !found; sy++) {
    for (let sx = 0; sx < width && !found; sx++) {
      const index = sy * width + sx;
      if (edgeMap[index] === 1) {
        x = sx;
        y = sy;
        startIndex = index;
        found = true;
      }
    }
  }

  if (!found) return null;

  const startPoint = { x, y };
  points.push(startPoint);
  visited[startIndex] = 1;

  let direction = 0; // Start looking in top-left direction
  let iterations = 0;
  const maxIterations = width * height; // Safety limit

  while (iterations < maxIterations) {
    iterations++;

    // Find next edge pixel in Moore neighborhood
    let foundNext = false;
    let nextX = x;
    let nextY = y;

    // Try all 8 directions starting from current direction
    for (let i = 0; i < 8; i++) {
      const dir = (direction + i) % 8;
      const [dx, dy] = neighbors[dir]!;
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const neighborIndex = ny * width + nx;
        if (edgeMap[neighborIndex] === 1) {
          nextX = nx;
          nextY = ny;
          direction = (dir + 6) % 8; // Update direction (look back 2 positions)
          foundNext = true;
          break;
        }
      }
    }

    if (!foundNext) break;

    // Check if we've returned to start (closed contour)
    if (nextX === startPoint.x && nextY === startPoint.y && points.length > 2) {
      return { points, closed: true };
    }

    const nextIndex = nextY * width + nextX;
    if (visited[nextIndex]) {
      // Already visited, might be a loop
      break;
    }

    points.push({ x: nextX, y: nextY });
    visited[nextIndex] = 1;
    x = nextX;
    y = nextY;
  }

  return points.length > 1 ? { points, closed: false } : null;
}

/**
 * Find all contours in edge map
 */
export function findAllContours(edgeMap: Uint8Array, width: number, height: number): Contour[] {
  const visited = new Uint8Array(width * height);
  const contours: Contour[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (edgeMap[index] === 1 && !visited[index]) {
        const contour = traceContour(edgeMap, width, height, x, y);
        if (contour) {
          contours.push(contour);
          // Mark all points in contour as visited
          for (const point of contour.points) {
            const pointIndex = point.y * width + point.x;
            visited[pointIndex] = 1;
          }
        }
      }
    }
  }

  return contours;
}

/**
 * Detect edge pixels using simple gradient
 */
export function detectEdges(
  imageData: ImageData,
  threshold: number = 30,
  useAlpha: boolean = true
): Uint8Array {
  if (useAlpha) {
    return alphaEdgeDetection(imageData, 128);
  }

  const edgeMap = sobelEdgeDetection(imageData);
  const { width, height } = imageData;
  const binary = new Uint8Array(width * height);

  // Threshold edge map
  for (let i = 0; i < edgeMap.length; i++) {
    binary[i] = edgeMap[i]! > threshold ? 1 : 0;
  }

  return binary;
}
