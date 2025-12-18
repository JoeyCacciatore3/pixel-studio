/**
 * Scale Tool
 * Professional scaling tool with aspect ratio preservation and pivot point
 * Based on GIMP and Photoshop scale tool implementation
 */

import type { Tool, BaseToolState } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import UI from '../ui';
import { logger } from '../utils/logger';

(function () {
  let toolState: BaseToolState | null = null;

  // Scaling state
  let isScaling = false;
  // let startScale = { x: 1, y: 1 }; // Reserved for future use
  let currentScale = { x: 1, y: 1 };
  let pivotX = 0;
  let pivotY = 0;
  let originalImageData: ImageData | null = null;
  let previewCanvas: HTMLCanvasElement | null = null;
  let maintainAspectRatio = true;

  // Scale constraints
  const MIN_SCALE = 0.01; // 1%
  const MAX_SCALE = 10; // 1000%

  const ScaleTool: Tool = {
    name: 'scale',

    init(state, elements) {
      toolState = {
        state,
        elements,
      };

      // Reset scaling state
      isScaling = false;
      // startScale = { x: 1, y: 1 }; // Reserved for future use
      currentScale = { x: 1, y: 1 };
      originalImageData = null;
      maintainAspectRatio = true;

      if (previewCanvas) {
        previewCanvas.remove();
        previewCanvas = null;
      }
    },

    onPointerDown(_coords, _e) {
      if (!toolState) return;

      const imageLayer = Canvas.getImageLayer();
      if (!imageLayer) {
        logger.warn('No image layer to scale');
        return;
      }

      // Start scaling
      isScaling = true;

      // Get pivot point (center of image by default)
      const offset = Canvas.getImageOffset();
      const imgWidth = imageLayer.width;
      const imgHeight = imageLayer.height;

      pivotX = offset.x + imgWidth / 2;
      pivotY = offset.y + imgHeight / 2;

      // Store original scale (reserved for future use)
      // startScale = { x: 1, y: 1 };
      currentScale = { x: 1, y: 1 };

      // Store original image data for preview
      originalImageData = Canvas.getImageData();

      // Create preview canvas
      createPreviewCanvas();

      logger.log('Started scaling at pivot:', pivotX, pivotY);
    },

    onPointerMove(coords, e) {
      if (!toolState || !isScaling || !originalImageData) return;

      // Calculate scale factors based on distance from pivot
      const dx = coords.x - pivotX;
      const dy = coords.y - pivotY;

      // Use distance from pivot as scale factor
      const distance = Math.sqrt(dx * dx + dy * dy);
      const baseScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, distance / 100));

      // Apply aspect ratio constraint if Shift is held or maintainAspectRatio is true
      if (maintainAspectRatio || e.shiftKey) {
        currentScale.x = baseScale;
        currentScale.y = baseScale;
      } else {
        // Independent scaling based on x/y distance
        currentScale.x = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.abs(dx) / 50));
        currentScale.y = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.abs(dy) / 50));
      }

      // Update preview
      updateScalePreview();

      // Update UI with scale info
      UI.updateToolInfo(
        `Scale: ${Math.round(currentScale.x * 100)}% x ${Math.round(currentScale.y * 100)}%`
      );
    },

    async onPointerUp(_e) {
      if (!toolState || !isScaling) return;

      isScaling = false;

      if ((currentScale.x !== 1 || currentScale.y !== 1) && originalImageData) {
        // Apply the scaling
        applyScaling();
        await Canvas.triggerRender();
        await History.saveImmediate();
      }

      // Clean up
      cleanupPreview();
      UI.updateToolInfo('');
      logger.log('Completed scaling to', currentScale.x * 100 + '% x', currentScale.y * 100 + '%');
    },
  };

  /**
   * Create preview canvas for real-time scaling feedback
   */
  function createPreviewCanvas(): void {
    if (previewCanvas) return;

    previewCanvas = document.createElement('canvas');
    previewCanvas.style.position = 'absolute';
    previewCanvas.style.pointerEvents = 'none';
    previewCanvas.style.opacity = '0.8';
    previewCanvas.style.zIndex = '1000';

    if (!toolState?.elements.canvasWrapper) return;
    toolState.elements.canvasWrapper.appendChild(previewCanvas);
  }

  /**
   * Update scale preview in real-time
   */
  function updateScalePreview(): void {
    if (!previewCanvas || !originalImageData) return;

    const canvas = Canvas.getCanvas();
    if (!canvas) return;

    // Set preview canvas size to match main canvas
    previewCanvas.width = canvas.width;
    previewCanvas.height = canvas.height;

    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    // Clear preview
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // Get current image offset and dimensions
    const offset = Canvas.getImageOffset();

    // Save context for transformations
    ctx.save();

    // Translate to pivot point
    ctx.translate(pivotX, pivotY);

    // Scale
    ctx.scale(currentScale.x, currentScale.y);

    // Translate back
    ctx.translate(-pivotX, -pivotY);

    // Draw scaled image
    ctx.putImageData(originalImageData, offset.x, offset.y);

    // Restore context
    ctx.restore();

    // Draw scaling guides
    drawScalingGuides(ctx);
  }

  /**
   * Draw scaling guides (pivot point, scale indicators)
   */
  function drawScalingGuides(ctx: CanvasRenderingContext2D): void {
    // Draw pivot point
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 5, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw cross at pivot
    ctx.beginPath();
    ctx.moveTo(pivotX - 10, pivotY);
    ctx.lineTo(pivotX + 10, pivotY);
    ctx.moveTo(pivotX, pivotY - 10);
    ctx.lineTo(pivotX, pivotY + 10);
    ctx.stroke();

    // Draw scale bounding box
    const offset = Canvas.getImageOffset();
    const imgWidth = originalImageData?.width || 0;
    const imgHeight = originalImageData?.height || 0;

    ctx.strokeStyle = '#ffff00';
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(offset.x, offset.y, imgWidth * currentScale.x, imgHeight * currentScale.y);
    ctx.setLineDash([]);
  }

  /**
   * Apply the final scaling to the canvas
   */
  function applyScaling(): void {
    if (!originalImageData) return;

    const canvas = Canvas.getCanvas();
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply scaling transformation
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.scale(currentScale.x, currentScale.y);
    ctx.translate(-pivotX, -pivotY);

    // Draw scaled image
    const offset = Canvas.getImageOffset();
    ctx.putImageData(originalImageData, offset.x, offset.y);

    ctx.restore();

    // Update canvas rendering
    Canvas.triggerRender();
  }

  /**
   * Clean up preview canvas
   */
  function cleanupPreview(): void {
    if (previewCanvas) {
      previewCanvas.remove();
      previewCanvas = null;
    }
    originalImageData = null;
    currentScale = { x: 1, y: 1 };
  }

  // Register the tool
  PixelStudio.registerTool('scale', ScaleTool);
})();
