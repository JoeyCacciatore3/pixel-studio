/**
 * Image Processing Web Worker
 * Handles image validation, format conversion, and processing off the main thread
 *
 * Exports worker code as a string for use with Blob URL workers
 */

import { VALID_IMAGE_TYPES, MAX_IMAGE_SIZE, MAX_IMAGE_DIMENSION } from '../constants';

/**
 * Returns the image worker code as a string
 * This code will run in a Web Worker context
 */
export function getImageWorkerCode(): string {
  return `
// Image validation constants
const VALID_IMAGE_TYPES = ${JSON.stringify(VALID_IMAGE_TYPES)};
const MAX_IMAGE_SIZE = ${MAX_IMAGE_SIZE};
const MAX_IMAGE_DIMENSION = ${MAX_IMAGE_DIMENSION};

self.onmessage = async (e) => {
  const { type, data, id } = e.data;

  try {
    switch (type) {
      case 'validate': {
        if (!data.file) {
          throw new Error('No file provided for validation');
        }

        // Validate file type
        if (!VALID_IMAGE_TYPES.includes(data.file.type)) {
          self.postMessage({
            type: 'error',
            error: 'Invalid file type. Supported: PNG, JPEG, GIF, WebP, BMP',
            id,
          });
          return;
        }

        // Validate file size
        if (data.file.size > MAX_IMAGE_SIZE) {
          self.postMessage({
            type: 'error',
            error: \`File too large. Maximum size: \${MAX_IMAGE_SIZE / (1024 * 1024)}MB\`,
            id,
          });
          return;
        }

        // Load image to validate dimensions
        const img = await createImageBitmap(data.file);
        const width = img.width;
        const height = img.height;

        // Warn if dimensions are very large
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          self.postMessage({
            type: 'success',
            data: {
              valid: true,
              width,
              height,
              format: data.file.type,
            },
            id,
          });
          return;
        }

        img.close();

        self.postMessage({
          type: 'success',
          data: {
            valid: true,
            width,
            height,
            format: data.file.type,
          },
          id,
        });
        break;
      }

      case 'process': {
        if (!data.file) {
          throw new Error('No file provided for processing');
        }

        // Create ImageBitmap from file
        const img = await createImageBitmap(data.file);

        // Create OffscreenCanvas to process image
        const canvas = new OffscreenCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Draw image to canvas
        ctx.drawImage(img, 0, 0);
        img.close();

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        self.postMessage(
          {
            type: 'success',
            data: {
              imageData,
              width: canvas.width,
              height: canvas.height,
              format: data.file.type,
            },
            id,
          },
          [imageData.data.buffer] // Transfer ownership
        );
        break;
      }

      case 'convert': {
        if (!data.imageData) {
          throw new Error('No image data provided for conversion');
        }

        // Convert ImageData to specified format
        const canvas = new OffscreenCanvas(data.imageData.width, data.imageData.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        ctx.putImageData(data.imageData, 0, 0);

        // Convert to blob
        const blob = await canvas.convertToBlob({
          type: data.format || 'image/png',
          quality: 0.92,
        });

        // Convert blob to ArrayBuffer for transfer
        const arrayBuffer = await blob.arrayBuffer();

        self.postMessage(
          {
            type: 'success',
            data: {
              format: data.format || 'image/png',
            },
            id,
          },
          [arrayBuffer] // Transfer ownership
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
