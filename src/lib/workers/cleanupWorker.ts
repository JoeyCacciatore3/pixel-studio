/**
 * Cleanup Web Worker
 * Handles CPU-intensive cleanup operations off the main thread
 *
 * Exports worker code as a string for use with Blob URL workers
 */

/**
 * Returns the cleanup worker code as a string
 * This code will run in a Web Worker context
 */
export function getCleanupWorkerCode(): string {
  return `
// LAB Color Space Conversion (for perceptual color accuracy)
// Convert RGB to LAB color space
function rgbToLab(r, g, b) {
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
  x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x + 16 / 116);
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y + 16 / 116);
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z + 16 / 116);

  const l = 116 * y - 16;
  const a = 500 * (x - y);
  const labB = 200 * (y - z);

  return { l, a, b: labB };
}

// Calculate Delta E (CIE76) - perceptual color difference
function deltaE(r1, g1, b1, r2, g2, b2) {
  const lab1 = rgbToLab(r1, g1, b1);
  const lab2 = rgbToLab(r2, g2, b2);

  const dl = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;

  return Math.sqrt(dl * dl + da * da + db * db);
}

// Connected Component Analysis
function findConnectedComponents(imageData, isForeground, connectivity = 8) {
  const { width, height, data } = imageData;
  const visited = new Uint8Array(width * height);
  const components = [];
  let componentId = 0;

  const neighbors4 = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  const neighbors8 = [...neighbors4, [-1, -1], [1, -1], [-1, 1], [1, 1]];
  const neighbors = connectivity === 4 ? neighbors4 : neighbors8;

  function floodFill(startX, startY) {
    const pixels = [];
    const stack = [[startX, startY]];
    let minX = startX, minY = startY, maxX = startX, maxY = startY;

    while (stack.length > 0) {
      const [x, y] = stack.pop();
      const index = y * width + x;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited[index]) continue;

      const pixelIndex = (y * width + x) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const a = data[pixelIndex + 3];

      if (!isForeground(r, g, b, a)) continue;

      visited[index] = 1;
      pixels.push({ x, y });
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      for (const [dx, dy] of neighbors) {
        const nx = x + dx;
        const ny = y + dy;
        const neighborIndex = ny * width + nx;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[neighborIndex]) {
          stack.push([nx, ny]);
        }
      }
    }

    return pixels.length > 0 ? { id: componentId++, pixels, size: pixels.length } : null;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (visited[index]) continue;

      const pixelIndex = (y * width + x) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const a = data[pixelIndex + 3];

      if (isForeground(r, g, b, a)) {
        const component = floodFill(x, y);
        if (component) components.push(component);
      }
    }
  }

  return components;
}

// K-means clustering for color quantization (using LAB color space for perceptual accuracy)
function kmeansClustering(imageData, k, maxIterations = 20) {
  const { width, height, data } = imageData;
  const pixels = [];

  // Extract all opaque pixels
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a >= 128) {
      pixels.push({
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
        index: i
      });
    }
  }

  if (pixels.length === 0) return [];

  // Initialize centroids randomly (k-means++ style would be better but random is acceptable)
  const centroids = [];
  for (let i = 0; i < k; i++) {
    const randomPixel = pixels[Math.floor(Math.random() * pixels.length)];
    centroids.push({ r: randomPixel.r, g: randomPixel.g, b: randomPixel.b });
  }

  let assignments = new Array(pixels.length);
  const convergenceThreshold = 0.5; // As per G'MIC best practices

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign pixels to nearest centroid using LAB color space (Delta E)
    for (let i = 0; i < pixels.length; i++) {
      const pixel = pixels[i];
      let minDist = Infinity;
      let nearest = 0;

      for (let j = 0; j < centroids.length; j++) {
        const centroid = centroids[j];
        // Use Delta E for perceptual color distance
        const dist = deltaE(pixel.r, pixel.g, pixel.b, centroid.r, centroid.g, centroid.b);

        if (dist < minDist) {
          minDist = dist;
          nearest = j;
        }
      }

      assignments[i] = nearest;
    }

    // Update centroids using weighted averages (pixel count weighting)
    const newCentroids = centroids.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));

    for (let i = 0; i < pixels.length; i++) {
      const pixel = pixels[i];
      const cluster = assignments[i];
      newCentroids[cluster].r += pixel.r;
      newCentroids[cluster].g += pixel.g;
      newCentroids[cluster].b += pixel.b;
      newCentroids[cluster].count++;
    }

    // Calculate average difference for convergence check
    let totalDiff = 0;
    let converged = true;
    for (let j = 0; j < centroids.length; j++) {
      const newCentroid = newCentroids[j];
      if (newCentroid.count > 0) {
        const oldR = centroids[j].r;
        const oldG = centroids[j].g;
        const oldB = centroids[j].b;
        centroids[j].r = Math.round(newCentroid.r / newCentroid.count);
        centroids[j].g = Math.round(newCentroid.g / newCentroid.count);
        centroids[j].b = Math.round(newCentroid.b / newCentroid.count);

        // Calculate difference in LAB space for accurate convergence check
        const diff = deltaE(oldR, oldG, oldB, centroids[j].r, centroids[j].g, centroids[j].b);
        totalDiff += diff;

        if (diff > convergenceThreshold) {
          converged = false;
        }
      }
    }

    // Check average difference across all centroids
    const avgDiff = totalDiff / centroids.length;
    if (converged || avgDiff < convergenceThreshold) break;
  }

  return centroids;
}

// Sobel edge detection
function sobelEdgeDetection(imageData) {
  const { width, height, data } = imageData;
  const edgeMap = new Float32Array(width * height);

  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

  const grayscale = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const pixelIndex = index * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      grayscale[index] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelValue = grayscale[(y + ky) * width + (x + kx)];
          gx += pixelValue * sobelX[ky + 1][kx + 1];
          gy += pixelValue * sobelY[ky + 1][kx + 1];
        }
      }

      edgeMap[y * width + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  return edgeMap;
}

// Morphological operations
function erode(imageData, kernelSize, isForeground) {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  result.data.set(data);

  const radius = Math.floor(kernelSize / 2);
  const kernel = [];
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      kernel.push([x, y]);
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const a = data[pixelIndex + 3];

      if (!isForeground(r, g, b, a)) continue;

      let allForeground = true;
      for (const [dx, dy] of kernel) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          allForeground = false;
          break;
        }

        const neighborIndex = (ny * width + nx) * 4;
        const nr = data[neighborIndex];
        const ng = data[neighborIndex + 1];
        const nb = data[neighborIndex + 2];
        const na = data[neighborIndex + 3];

        if (!isForeground(nr, ng, nb, na)) {
          allForeground = false;
          break;
        }
      }

      if (!allForeground) {
        result.data[pixelIndex] = 0;
        result.data[pixelIndex + 1] = 0;
        result.data[pixelIndex + 2] = 0;
        result.data[pixelIndex + 3] = 0;
      }
    }
  }

  return result;
}

function dilate(imageData, kernelSize, isForeground) {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  result.data.set(data);

  const radius = Math.floor(kernelSize / 2);
  const kernel = [];
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      kernel.push([x, y]);
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const a = data[pixelIndex + 3];

      if (isForeground(r, g, b, a)) {
        for (const [dx, dy] of kernel) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const neighborIndex = (ny * width + nx) * 4;
            const nr = result.data[neighborIndex];
            const ng = result.data[neighborIndex + 1];
            const nb = result.data[neighborIndex + 2];
            const na = result.data[neighborIndex + 3];

            if (!isForeground(nr, ng, nb, na)) {
              result.data[neighborIndex] = r;
              result.data[neighborIndex + 1] = g;
              result.data[neighborIndex + 2] = b;
              result.data[neighborIndex + 3] = a;
            }
          }
        }
      }
    }
  }

  return result;
}

// Color distance (RGB)
function rgbDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

self.onmessage = async (e) => {
  const { type, data, id } = e.data;

  try {
    switch (type) {
      case 'remove-stray-pixels': {
        const { imageData, minSize, merge } = data;
        const isForeground = (r, g, b, a) => a >= 128;

        // Report progress: 0% - Starting
        self.postMessage({ type: 'progress', progress: 0, stage: 'Analyzing components...', id });

        const components = findConnectedComponents(imageData, isForeground, 8);

        // Report progress: 50% - Processing
        self.postMessage({ type: 'progress', progress: 50, stage: 'Removing stray pixels...', id });

        const result = new ImageData(imageData.width, imageData.height);
        result.data.set(imageData.data);

        for (const component of components) {
          if (component.size < minSize) {
            if (merge) {
              // Find nearest neighbor color (simplified)
              let nearestR = 0, nearestG = 0, nearestB = 0, nearestCount = 0;
              const { minX, minY, maxX, maxY } = component.bounds || {
                minX: Math.min(...component.pixels.map(p => p.x)),
                minY: Math.min(...component.pixels.map(p => p.y)),
                maxX: Math.max(...component.pixels.map(p => p.x)),
                maxY: Math.max(...component.pixels.map(p => p.y))
              };

              for (let y = Math.max(0, minY - 3); y < Math.min(imageData.height, maxY + 3); y++) {
                for (let x = Math.max(0, minX - 3); x < Math.min(imageData.width, maxX + 3); x++) {
                  const isInComponent = component.pixels.some(p => p.x === x && p.y === y);
                  if (isInComponent) continue;

                  const index = (y * imageData.width + x) * 4;
                  const a = imageData.data[index + 3];
                  if (a >= 128) {
                    nearestR += imageData.data[index];
                    nearestG += imageData.data[index + 1];
                    nearestB += imageData.data[index + 2];
                    nearestCount++;
                  }
                }
              }

              if (nearestCount > 0) {
                nearestR = Math.round(nearestR / nearestCount);
                nearestG = Math.round(nearestG / nearestCount);
                nearestB = Math.round(nearestB / nearestCount);
              }

              for (const { x, y } of component.pixels) {
                const index = (y * imageData.width + x) * 4;
                result.data[index] = nearestR;
                result.data[index + 1] = nearestG;
                result.data[index + 2] = nearestB;
                result.data[index + 3] = 255;
              }
            } else {
              // Remove (make transparent)
              for (const { x, y } of component.pixels) {
                const index = (y * imageData.width + x) * 4;
                result.data[index] = 0;
                result.data[index + 1] = 0;
                result.data[index + 2] = 0;
                result.data[index + 3] = 0;
              }
            }
          }
        }

        // Report progress: 100% - Complete
        self.postMessage({ type: 'progress', progress: 100, stage: 'Complete', id });

        self.postMessage(
          { type: 'success', data: { imageData: result }, id },
          [result.data.buffer]
        );
        break;
      }

      case 'quantize-colors': {
        const { imageData, nColors } = data;

        // Report progress: 0% - Starting
        self.postMessage({ type: 'progress', progress: 0, stage: 'Initializing K-means...', id });

        // Report progress: 25% - Clustering
        const palette = kmeansClustering(imageData, nColors, 20);
        self.postMessage({ type: 'progress', progress: 50, stage: 'Generating palette...', id });

        const result = new ImageData(imageData.width, imageData.height);
        result.data.set(imageData.data);

        // Assign pixels to nearest palette color using LAB color space
        const totalPixels = imageData.data.length / 4;
        for (let i = 0; i < imageData.data.length; i += 4) {
          const a = imageData.data[i + 3];
          if (a < 128) continue;

          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];

          let minDist = Infinity;
          let nearest = palette[0];

          for (const color of palette) {
            // Use Delta E for perceptual color matching
            const dist = deltaE(r, g, b, color.r, color.g, color.b);
            if (dist < minDist) {
              minDist = dist;
              nearest = color;
            }
          }

          result.data[i] = nearest.r;
          result.data[i + 1] = nearest.g;
          result.data[i + 2] = nearest.b;

          // Report progress: 50-95% - Assigning colors
          if ((i / 4) % Math.floor(totalPixels / 10) === 0) {
            const progress = 50 + Math.floor((i / imageData.data.length) * 45);
            self.postMessage({ type: 'progress', progress, stage: 'Assigning colors...', id });
          }
        }

        // Report progress: 100% - Complete
        self.postMessage({ type: 'progress', progress: 100, stage: 'Complete', id });

        self.postMessage(
          { type: 'success', data: { imageData: result, palette }, id },
          [result.data.buffer]
        );
        break;
      }

      case 'detect-edges': {
        const { imageData } = data;
        const edgeMap = sobelEdgeDetection(imageData);

        self.postMessage(
          { type: 'success', data: { edgeMap }, id },
          [edgeMap.buffer]
        );
        break;
      }

      case 'morphology': {
        const { imageData, operation, kernelSize } = data;
        const isForeground = (r, g, b, a) => a >= 128;

        let result;
        if (operation === 'erode') {
          result = erode(imageData, kernelSize, isForeground);
        } else if (operation === 'dilate') {
          result = dilate(imageData, kernelSize, isForeground);
        } else {
          throw new Error(\`Unknown morphology operation: \${operation}\`);
        }

        self.postMessage(
          { type: 'success', data: { imageData: result }, id },
          [result.data.buffer]
        );
        break;
      }

      default:
        throw new Error(\`Unknown cleanup operation: \${type}\`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      id,
    });
  }
};
`;
}
