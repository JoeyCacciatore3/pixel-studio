/**
 * History Compression Web Worker
 * Compresses and serializes history entries off the main thread
 *
 * Exports worker code as a string for use with Blob URL workers
 */

/**
 * Returns the history worker code as a string
 * This code will run in a Web Worker context
 */
export function getHistoryWorkerCode(): string {
  return `
// Compress ImageData using WebP encoding for better compression
// Falls back to simple format if WebP not available
async function compressImageData(imageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Try WebP compression first (better compression ratio)
  try {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(imageData, 0, 0);
      const blob = await canvas.convertToBlob({
        type: 'image/webp',
        quality: 0.85, // Good balance between quality and size
      });
      const arrayBuffer = await blob.arrayBuffer();

      // Store format marker (1 = WebP) + dimensions + compressed data
      const buffer = new ArrayBuffer(9 + arrayBuffer.byteLength);
      const view = new DataView(buffer);
      view.setUint8(0, 1); // Format: 1 = WebP
      view.setUint32(1, width, true);
      view.setUint32(5, height, true);
      new Uint8Array(buffer, 9).set(new Uint8Array(arrayBuffer));

      return buffer;
    }
  } catch (webpError) {
    // WebP not supported, fall back to simple format
    console.warn('WebP compression not available, using simple format:', webpError);
  }

  // Fallback: Simple format (dimensions + raw data)
  // For pixel art, this is often sufficient
  const buffer = new ArrayBuffer(9 + data.length); // 1 byte format + 8 bytes for width/height
  const view = new DataView(buffer);
  view.setUint8(0, 0); // Format: 0 = raw
  view.setUint32(1, width, true);
  view.setUint32(5, height, true);
  new Uint8ClampedArray(buffer, 9).set(data);

  return buffer;
}

// Decompress ImageData from ArrayBuffer
// Supports both WebP and raw formats
async function decompressImageData(buffer) {
  const view = new DataView(buffer);
  const format = view.getUint8(0);

  if (format === 1) {
    // WebP format
    const width = view.getUint32(1, true);
    const height = view.getUint32(5, true);
    const compressedData = new Uint8Array(buffer, 9);

    try {
      const blob = new Blob([compressedData], { type: 'image/webp' });
      const imageBitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      ctx.drawImage(imageBitmap, 0, 0);
      imageBitmap.close();
      return ctx.getImageData(0, 0, width, height);
    } catch (error) {
      throw new Error(
        \`Failed to decompress WebP: \${error instanceof Error ? error.message : 'Unknown error'}\`
      );
    }
  } else {
    // Raw format (legacy or fallback)
    const width = view.getUint32(1, true);
    const height = view.getUint32(5, true);
    const data = new Uint8ClampedArray(buffer, 9);
    return new ImageData(data, width, height);
  }
}

self.onmessage = async (e) => {
  const { type, data, id } = e.data;

  try {
    switch (type) {
      case 'compress': {
        if (!data.imageData) {
          throw new Error('No image data provided for compression');
        }

        const compressed = await compressImageData(data.imageData);

        self.postMessage(
          {
            type: 'success',
            data: { compressed },
            id,
          },
          [compressed] // Transfer ownership
        );
        break;
      }

      case 'decompress': {
        if (!data.compressed) {
          throw new Error('No compressed data provided for decompression');
        }

        const imageData = await decompressImageData(data.compressed);

        self.postMessage(
          {
            type: 'success',
            data: { imageData },
            id,
          },
          [imageData.data.buffer] // Transfer ownership
        );
        break;
      }

      default:
        throw new Error(\`Unknown message type: \${type}\`);
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
