/**
 * Image Utilities
 * Reusable functions for ImageData, Blob, and Canvas conversions
 * Eliminates code duplication across the codebase
 */

/**
 * Convert ImageData to Blob
 * @param imageData - The ImageData to convert
 * @param format - Image format (default: 'image/png')
 * @param quality - Quality for lossy formats (0-1, default: 0.92)
 * @returns Promise resolving to Blob
 */
export async function imageDataToBlob(
  imageData: ImageData,
  format: string = 'image/png',
  quality: number = 0.92
): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('Cannot create canvas during Server-Side Rendering');
  }

  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.putImageData(imageData, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      format,
      quality
    );
  });
}

/**
 * Convert Blob to ImageData
 * @param blob - The Blob to convert (should be an image)
 * @returns Promise resolving to ImageData
 */
export async function blobToImageData(blob: Blob): Promise<ImageData> {
  if (typeof document === 'undefined') {
    throw new Error('Cannot create canvas during Server-Side Rendering');
  }

  const imageUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return imageData;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

/**
 * Create a canvas element from ImageData
 * @param imageData - The ImageData to draw to canvas
 * @returns HTMLCanvasElement with the ImageData drawn
 */
export function createCanvasFromImageData(imageData: ImageData): HTMLCanvasElement {
  if (typeof document === 'undefined') {
    throw new Error('Cannot create canvas during Server-Side Rendering');
  }

  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Convert ImageData to ArrayBuffer via Blob
 * Convenience function that combines imageDataToBlob and blob.arrayBuffer()
 * @param imageData - The ImageData to convert
 * @param format - Image format (default: 'image/png')
 * @returns Promise resolving to ArrayBuffer
 */
export async function imageDataToArrayBuffer(
  imageData: ImageData,
  format: string = 'image/png'
): Promise<ArrayBuffer> {
  const blob = await imageDataToBlob(imageData, format);
  return blob.arrayBuffer();
}
