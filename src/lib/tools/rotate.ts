/**
 * Rotate Tool
 * Professional rotation tool with pivot point, angle snapping, and preview
 * Based on GIMP and Photoshop rotate tool implementation
 */

import type { Tool, BaseToolState } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import UI from '../ui';
import { logger } from '../utils/logger';

(function () {
  let toolState: BaseToolState | null = null;

  // Rotation state
  let isRotating = false;
  let startAngle = 0;
  let currentAngle = 0;
  let pivotX = 0;
  let pivotY = 0;
  let originalImageData: ImageData | null = null;
  let previewCanvas: HTMLCanvasElement | null = null;

  // Rotation constraints
  const ANGLE_SNAP = 15; // degrees
  const MIN_ROTATION = -180;
  const MAX_ROTATION = 180;

  const RotateTool: Tool = {
    name: 'rotate',

    init(state, elements) {
      toolState = {
        state,
        elements,
      };

      // Reset rotation state
      isRotating = false;
      startAngle = 0;
      currentAngle = 0;
      originalImageData = null;

      if (previewCanvas) {
        previewCanvas.remove();
        previewCanvas = null;
      }
    },

    onPointerDown(coords, _e) {
      if (!toolState) return;

      const imageLayer = Canvas.getImageLayer();
      if (!imageLayer) {
        logger.warn('No image layer to rotate');
        return;
      }

      // Start rotation
      isRotating = true;

      // Get pivot point (center of image by default)
      const offset = Canvas.getImageOffset();
      const imgWidth = imageLayer.width;
      const imgHeight = imageLayer.height;

      pivotX = offset.x + imgWidth / 2;
      pivotY = offset.y + imgHeight / 2;

      // Calculate initial angle from pivot to mouse
      startAngle = (Math.atan2(coords.y - pivotY, coords.x - pivotX) * 180) / Math.PI;
      currentAngle = 0;

      // Store original image data for preview
      originalImageData = Canvas.getImageData();

      // Create preview canvas
      createPreviewCanvas();

      logger.log('Started rotation at pivot:', pivotX, pivotY);
    },

    onPointerMove(coords, e) {
      if (!toolState || !isRotating || !originalImageData) return;

      // Calculate new angle
      const newAngle = (Math.atan2(coords.y - pivotY, coords.x - pivotX) * 180) / Math.PI;
      let deltaAngle = newAngle - startAngle;

      // Snap to angles if Shift is held
      if (e.shiftKey) {
        deltaAngle = Math.round(deltaAngle / ANGLE_SNAP) * ANGLE_SNAP;
      }

      // Constrain angle
      deltaAngle = Math.max(MIN_ROTATION, Math.min(MAX_ROTATION, deltaAngle));
      currentAngle = deltaAngle;

      // Update preview
      updateRotationPreview();

      // Update UI with rotation info
      UI.updateToolInfo(`Rotation: ${currentAngle.toFixed(1)}°`);
    },

    async onPointerUp(_e) {
      if (!toolState || !isRotating) return;

      isRotating = false;

      if (currentAngle !== 0 && originalImageData) {
        // Apply the rotation
        applyRotation();
        await Canvas.triggerRender();
        await History.saveImmediate();
      }

      // Clean up
      cleanupPreview();
      UI.updateToolInfo('');
      logger.log('Completed rotation by', currentAngle, 'degrees');
    },
  };

  /**
   * Create preview canvas for real-time rotation feedback
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
   * Update rotation preview in real-time
   */
  function updateRotationPreview(): void {
    if (!previewCanvas || !originalImageData || currentAngle === 0) return;

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
    // const imgWidth = originalImageData.width; // Reserved for future use
    // const imgHeight = originalImageData.height; // Reserved for future use

    // Save context for transformations
    ctx.save();

    // Translate to pivot point
    ctx.translate(pivotX, pivotY);

    // Rotate by current angle
    ctx.rotate((currentAngle * Math.PI) / 180);

    // Translate back
    ctx.translate(-pivotX, -pivotY);

    // Draw rotated image
    ctx.putImageData(originalImageData, offset.x, offset.y);

    // Restore context
    ctx.restore();

    // Draw rotation guides
    drawRotationGuides(ctx);
  }

  /**
   * Draw rotation guides (pivot point, angle indicator)
   */
  function drawRotationGuides(ctx: CanvasRenderingContext2D): void {
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

    // Draw angle arc
    if (Math.abs(currentAngle) > 1) {
      ctx.strokeStyle = '#ffff00';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      const radius = 50;
      const startRad = 0;
      const endRad = (currentAngle * Math.PI) / 180;
      ctx.arc(pivotX, pivotY, radius, startRad, endRad);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /**
   * Apply the final rotation to the canvas
   */
  function applyRotation(): void {
    if (!originalImageData || currentAngle === 0) return;

    const canvas = Canvas.getCanvas();
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply rotation transformation
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate((currentAngle * Math.PI) / 180);
    ctx.translate(-pivotX, -pivotY);

    // Draw rotated image
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
    currentAngle = 0;
  }

  // Register the tool
  PixelStudio.registerTool('rotate', RotateTool);
})();
