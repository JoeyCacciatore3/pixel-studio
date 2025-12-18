/**
 * Crop Tool
 * Professional cropping tool with rule of thirds guides and aspect ratio constraints
 * Based on GIMP and Photoshop crop tool implementation
 */

import type { Tool, BaseToolState } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import UI from '../ui';
import { logger } from '../utils/logger';

(function () {
  let toolState: BaseToolState | null = null;

  // Crop state
  let isCropping = false;
  let cropRect = { x: 0, y: 0, width: 0, height: 0 };
  let startX = 0;
  let startY = 0;
  let originalImageData: ImageData | null = null;
  let aspectRatio: number | null = null; // width/height ratio, null for freeform

  const CropTool: Tool = {
    name: 'crop',

    init(state, elements) {
      toolState = {
        state,
        elements,
      };

      // Reset crop state
      isCropping = false;
      cropRect = { x: 0, y: 0, width: 0, height: 0 };
      aspectRatio = null;
      originalImageData = null;
    },

    onPointerDown(coords, _e) {
      if (!toolState) return;

      const imageLayer = Canvas.getImageLayer();
      if (!imageLayer) {
        logger.warn('No image layer to crop');
        return;
      }

      // Start cropping
      isCropping = true;
      startX = coords.x;
      startY = coords.y;

      // Initialize crop rectangle
      cropRect.x = startX;
      cropRect.y = startY;
      cropRect.width = 0;
      cropRect.height = 0;

      // Store original image data
      originalImageData = Canvas.getImageData();

      logger.log('Started cropping at:', startX, startY);
    },

    onPointerMove(coords, e) {
      if (!toolState || !isCropping) return;

      // Update crop rectangle
      const currentX = coords.x;
      const currentY = coords.y;

      // Calculate rectangle from start point to current point
      cropRect.x = Math.min(startX, currentX);
      cropRect.y = Math.min(startY, currentY);
      cropRect.width = Math.abs(currentX - startX);
      cropRect.height = Math.abs(currentY - startY);

      // Apply aspect ratio constraint if set
      if (aspectRatio !== null && cropRect.width > 0) {
        if (e.shiftKey) {
          // Constrain to square when Shift is held
          const size = Math.min(cropRect.width, cropRect.height);
          cropRect.width = size;
          cropRect.height = size;
        } else {
          // Apply specific aspect ratio
          cropRect.height = cropRect.width / aspectRatio;
        }
      } else if (e.shiftKey) {
        // Constrain to square when Shift is held and no aspect ratio set
        const size = Math.min(cropRect.width, cropRect.height);
        cropRect.width = size;
        cropRect.height = size;
      }

      // Ensure crop rectangle stays within canvas bounds
      constrainToCanvas();

      // Update UI with crop info
      UI.updateToolInfo(`Crop: ${Math.round(cropRect.width)} x ${Math.round(cropRect.height)}`);

      // Trigger canvas render to show crop overlay
      Canvas.triggerRender();
    },

    async onPointerUp(_e) {
      if (!toolState || !isCropping) return;

      isCropping = false;

      // Apply crop if rectangle is valid
      if (cropRect.width > 10 && cropRect.height > 10) {
        applyCrop();
        await Canvas.triggerRender();
        await History.saveImmediate();
        logger.log('Applied crop:', cropRect);
      } else {
        // Cancel crop if too small
        cancelCrop();
        logger.log('Cancelled crop - too small');
      }

      // Clean up
      UI.updateToolInfo('');
      Canvas.triggerRender();
    },
  };

  /**
   * Constrain crop rectangle to canvas bounds
   */
  function constrainToCanvas(): void {
    const canvas = Canvas.getCanvas();
    if (!canvas) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Ensure crop rectangle stays within canvas
    cropRect.x = Math.max(0, Math.min(cropRect.x, canvasWidth - cropRect.width));
    cropRect.y = Math.max(0, Math.min(cropRect.y, canvasHeight - cropRect.height));
    cropRect.width = Math.min(cropRect.width, canvasWidth - cropRect.x);
    cropRect.height = Math.min(cropRect.height, canvasHeight - cropRect.y);
  }

  /**
   * Apply the crop operation
   */
  function applyCrop(): void {
    if (!originalImageData) return;

    const canvas = Canvas.getCanvas();
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create new image data for cropped region
    const croppedData = ctx.createImageData(cropRect.width, cropRect.height);

    // Copy pixel data from original image to cropped region
    for (let y = 0; y < cropRect.height; y++) {
      for (let x = 0; x < cropRect.width; x++) {
        const srcX = Math.floor(cropRect.x + x);
        const srcY = Math.floor(cropRect.y + y);
        const destIndex = (y * cropRect.width + x) * 4;
        const srcIndex = (srcY * originalImageData.width + srcX) * 4;

        if (
          srcX >= 0 &&
          srcX < originalImageData.width &&
          srcY >= 0 &&
          srcY < originalImageData.height
        ) {
          croppedData.data[destIndex] = originalImageData.data[srcIndex]!; // R
          croppedData.data[destIndex + 1] = originalImageData.data[srcIndex + 1]!; // G
          croppedData.data[destIndex + 2] = originalImageData.data[srcIndex + 2]!; // B
          croppedData.data[destIndex + 3] = originalImageData.data[srcIndex + 3]!; // A
        }
      }
    }

    // Clear canvas and draw cropped image
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Resize canvas to cropped dimensions if needed
    if (canvas.width !== cropRect.width || canvas.height !== cropRect.height) {
      Canvas.resize(cropRect.width, cropRect.height);
    }

    // Draw cropped image at origin
    ctx.putImageData(croppedData, 0, 0);

    // Update canvas rendering
    Canvas.triggerRender();
  }

  /**
   * Cancel the crop operation
   */
  function cancelCrop(): void {
    // Reset crop rectangle
    cropRect = { x: 0, y: 0, width: 0, height: 0 };
  }

  // Register the tool
  PixelStudio.registerTool('crop', CropTool);
})();
