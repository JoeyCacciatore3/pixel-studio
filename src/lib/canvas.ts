/**
 * Canvas Module
 * Manages canvas element, context, and all canvas operations
 */

import Layers from './layers';
import CanvasUtils from './canvasUtils';
import StateManager from './stateManager';
import EventEmitter from './utils/eventEmitter';
import { logger } from './utils/logger';
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from './constants';

const Canvas = (function () {
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let selectionCanvas: HTMLCanvasElement | null = null;
  let selectionCtx: CanvasRenderingContext2D | null = null;
  let useLayers = false;
  let devicePixelRatio = 1;
  let logicalWidth = 0;
  let logicalHeight = 0;
  // Dirty rectangle tracking for optimized rendering
  let dirtyRegions: Array<{ x: number; y: number; width: number; height: number }> = [];
  let dirtyTrackingEnabled = true;
  // Image layer tracking for move/scale/rotate tools
  const imageLayerMetadata = new Map<
    string,
    {
      source: HTMLImageElement;
      scaledWidth: number;
      scaledHeight: number;
      offsetX: number;
      offsetY: number;
    }
  >();

  /**
   * Initialize the canvas module
   * Optimized for mobile devices and high-DPI displays
   */
  function init(
    canvasElement: HTMLCanvasElement,
    selectionCanvasElement?: HTMLCanvasElement,
    enableLayers: boolean = false
  ) {
    canvas = canvasElement;

    // Get device pixel ratio for high-DPI display support
    devicePixelRatio = window.devicePixelRatio || 1;

    // Detect if mobile for optimization
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    // Store logical (CSS) dimensions
    // Use canvas attributes if available, otherwise get from bounding rect
    const rect = canvas.getBoundingClientRect();
    logicalWidth =
      canvas.width > 0 && rect.width === 0
        ? canvas.width
        : rect.width || canvas.width || DEFAULT_CANVAS_WIDTH;
    logicalHeight =
      canvas.height > 0 && rect.height === 0
        ? canvas.height
        : rect.height || canvas.height || DEFAULT_CANVAS_HEIGHT;

    // Initialize canvas utils (breaks circular dependency with Layers)
    CanvasUtils.init(canvas, logicalWidth, logicalHeight, devicePixelRatio);

    // Scale canvas for high-DPI displays (Retina, etc.)
    // This ensures crisp rendering on all displays
    if (devicePixelRatio > 1) {
      const physicalWidth = logicalWidth * devicePixelRatio;
      const physicalHeight = logicalHeight * devicePixelRatio;
      canvas.width = physicalWidth;
      canvas.height = physicalHeight;
      canvas.style.width = `${logicalWidth}px`;
      canvas.style.height = `${logicalHeight}px`;
    } else {
      // Ensure dimensions are set even without DPR
      canvas.width = logicalWidth;
      canvas.height = logicalHeight;
    }

    // Optimize context settings based on device
    // willReadFrequently: false enables GPU acceleration for drawing operations
    // Only set to true if we frequently read from this context (e.g., getImageData)
    ctx = canvas.getContext('2d', {
      willReadFrequently: false, // Optimize for drawing performance (GPU acceleration)
      alpha: true,
    });

    if (selectionCanvasElement) {
      selectionCanvas = selectionCanvasElement;

      // Scale selection canvas for high-DPI as well
      if (devicePixelRatio > 1) {
        selectionCanvas.width = logicalWidth * devicePixelRatio;
        selectionCanvas.height = logicalHeight * devicePixelRatio;
        selectionCanvas.style.width = `${logicalWidth}px`;
        selectionCanvas.style.height = `${logicalHeight}px`;
      }

      selectionCtx = selectionCanvas.getContext('2d', {
        willReadFrequently: false, // Optimize for drawing performance
        alpha: true,
      });
    }

    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }

    // Scale context to match device pixel ratio
    if (devicePixelRatio > 1) {
      ctx.scale(devicePixelRatio, devicePixelRatio);
      if (selectionCtx) {
        selectionCtx.scale(devicePixelRatio, devicePixelRatio);
      }
    }

    // Mobile-specific optimizations
    if (isMobile) {
      ctx.imageSmoothingEnabled = false; // Pixel art should be crisp
      ctx.imageSmoothingQuality = 'low';
    }

    useLayers = enableLayers;
    // Note: Layers.init() is called from app.ts, not here
    // This prevents double initialization
  }

  /**
   * Get the canvas element
   */
  function getCanvas(): HTMLCanvasElement {
    if (!canvas) {
      throw new Error('Canvas not initialized');
    }
    return canvas;
  }

  /**
   * Get the canvas context
   * If layers are enabled, returns the active layer's context
   * Uses cached contexts for better performance
   * Prevents drawing to locked layers (professional standard)
   */
  function getContext(): CanvasRenderingContext2D {
    // Ensure main context is initialized first
    if (!ctx) {
      throw new Error('Canvas context not initialized');
    }

    if (useLayers) {
      // Check if StateManager is initialized before accessing layers
      if (!StateManager.isInitialized()) {
        logger.warn('StateManager not initialized, using main context temporarily');
        return ctx;
      }

      try {
        // Check if layers are actually initialized by checking if we can get layers
        const layers = Layers.getAllLayers();
        if (layers.length > 0) {
          const activeLayerId = StateManager.getState().activeLayerId;
          if (!activeLayerId) {
            throw new Error('Layers enabled but no active layer selected');
          }

          const layer = Layers.get(activeLayerId);
          if (!layer) {
            throw new Error(`Active layer ${activeLayerId} not found`);
          }

          // Prevent drawing to locked layers (professional standard)
          if (layer.locked) {
            throw new Error('Cannot draw to locked layer');
          }

          // Use cached context from Layers module
          const layerCtx = Layers.getCachedContext(layer.canvas);
          if (!layerCtx) {
            throw new Error('Layer context not available');
          }

          return layerCtx;
        }
        // If layers enabled but no layers exist yet, fall back to main context
        // This can happen during initialization before first layer is created
        return ctx;
      } catch (error) {
        // Re-throw all errors - no silent fallbacks to prevent drawing to wrong canvas
        // The only exception is StateManager not initialized, which is handled above
        logger.error('Failed to get layer context:', error);
        throw error;
      }
    }

    return ctx;
  }

  /**
   * Get the selection canvas context
   */
  function getSelectionContext(): CanvasRenderingContext2D | null {
    return selectionCtx;
  }

  /**
   * Get the main canvas context directly (bypasses layer system)
   * Use this during initialization or when you need the main canvas context
   * regardless of layer state
   */
  function getMainContext(): CanvasRenderingContext2D {
    if (!ctx) {
      throw new Error('Canvas context not initialized');
    }
    return ctx;
  }

  /**
   * Check if canvas is initialized
   */
  function isInitialized(): boolean {
    return canvas !== null && ctx !== null;
  }

  /**
   * Get canvas width (logical width, not physical pixels)
   * Returns the CSS width, accounting for device pixel ratio
   * Delegates to CanvasUtils for consistency
   */
  function getWidth(): number {
    return CanvasUtils.getWidth();
  }

  /**
   * Get canvas height (logical height, not physical pixels)
   * Returns the CSS height, accounting for device pixel ratio
   * Delegates to CanvasUtils for consistency
   */
  function getHeight(): number {
    return CanvasUtils.getHeight();
  }

  /**
   * Get device pixel ratio
   * Useful for tools that need to know the display scaling
   * Delegates to CanvasUtils for consistency
   */
  function getDevicePixelRatio(): number {
    return CanvasUtils.getDevicePixelRatio();
  }

  /**
   * Get image data from canvas
   * If layers are enabled, returns data from active layer
   */
  function getImageData(): ImageData {
    if (!isInitialized()) {
      throw new Error('Canvas not initialized');
    }
    if (useLayers) {
      try {
        const activeLayerId = StateManager.getState().activeLayerId;
        if (activeLayerId) {
          const imageData = Layers.getImageData(activeLayerId);
          if (imageData) {
            return imageData;
          }
          // If layers enabled but getImageData returns null, throw error instead of falling through
          throw new Error('Failed to get image data from active layer');
        }
        // If layers enabled but no active layer, throw error instead of falling through to wrong canvas
        throw new Error('Layers enabled but no active layer selected');
      } catch (error) {
        // If StateManager not initialized or error getting state, fall back to main canvas
        // This provides graceful degradation if state is unavailable
        if (error instanceof Error && error.message.includes('StateManager not initialized')) {
          logger.warn('StateManager not initialized, using main canvas for getImageData');
          return getContext().getImageData(0, 0, getWidth(), getHeight());
        }
        // Re-throw other errors (like "no active layer" or "failed to get image data")
        throw error;
      }
    }
    return getContext().getImageData(0, 0, getWidth(), getHeight());
  }

  /**
   * Get image data from a specific region of the canvas
   * If layers are enabled, returns data from active layer
   * @param x - X coordinate of the region
   * @param y - Y coordinate of the region
   * @param width - Width of the region
   * @param height - Height of the region
   */
  function getImageDataRegion(x: number, y: number, width: number, height: number): ImageData {
    if (!isInitialized()) {
      throw new Error('Canvas not initialized');
    }
    if (useLayers) {
      try {
        const activeLayerId = StateManager.getState().activeLayerId;
        if (activeLayerId) {
          const layer = Layers.get(activeLayerId);
          if (layer) {
            // Use cached context for performance and consistency
            const layerCtx = Layers.getCachedContext(layer.canvas);
            if (layerCtx) {
              // Use logical dimensions since context is scaled by DPR
              // Clamp coordinates to valid bounds
              const canvasWidth = getWidth();
              const canvasHeight = getHeight();
              const clampedX = Math.max(0, Math.min(x, canvasWidth));
              const clampedY = Math.max(0, Math.min(y, canvasHeight));
              const clampedWidth = Math.max(0, Math.min(width, canvasWidth - clampedX));
              const clampedHeight = Math.max(0, Math.min(height, canvasHeight - clampedY));
              return layerCtx.getImageData(clampedX, clampedY, clampedWidth, clampedHeight);
            }
          }
        }
        // If layers enabled but no valid active layer, throw error instead of falling through
        throw new Error('getImageDataRegion: Layers enabled but no valid active layer');
      } catch (error) {
        // If StateManager not initialized or error getting state, fall back to main canvas
        // This provides graceful degradation if state is unavailable
        if (error instanceof Error && error.message.includes('StateManager not initialized')) {
          logger.warn('StateManager not initialized, using main canvas for getImageDataRegion');
          // Clamp coordinates to valid bounds
          const canvasWidth = getWidth();
          const canvasHeight = getHeight();
          const clampedX = Math.max(0, Math.min(x, canvasWidth));
          const clampedY = Math.max(0, Math.min(y, canvasHeight));
          const clampedWidth = Math.max(0, Math.min(width, canvasWidth - clampedX));
          const clampedHeight = Math.max(0, Math.min(height, canvasHeight - clampedY));
          return getContext().getImageData(clampedX, clampedY, clampedWidth, clampedHeight);
        }
        // Re-throw other errors
        throw error;
      }
    }
    // Clamp coordinates to valid bounds
    const canvasWidth = getWidth();
    const canvasHeight = getHeight();
    const clampedX = Math.max(0, Math.min(x, canvasWidth));
    const clampedY = Math.max(0, Math.min(y, canvasHeight));
    const clampedWidth = Math.max(0, Math.min(width, canvasWidth - clampedX));
    const clampedHeight = Math.max(0, Math.min(height, canvasHeight - clampedY));
    return getContext().getImageData(clampedX, clampedY, clampedWidth, clampedHeight);
  }

  /**
   * Put image data to canvas
   * If layers are enabled, puts data to active layer and re-renders
   */
  function putImageData(imageData: ImageData, x: number = 0, y: number = 0): void {
    if (useLayers) {
      try {
        const activeLayerId = StateManager.getState().activeLayerId;
        if (activeLayerId) {
          const layer = Layers.get(activeLayerId);
          if (layer) {
            // Use cached context for performance and consistency
            const layerCtx = Layers.getCachedContext(layer.canvas);
            if (layerCtx) {
              // Put image data at specified coordinates on the layer
              layerCtx.putImageData(imageData, x, y);
              Layers.render();
              // Mark dirty region
              if (dirtyTrackingEnabled) {
                markDirtyRegion(x, y, imageData.width, imageData.height);
              }
              return;
            }
          }
        }
        // If layers enabled but no valid active layer, log warning but don't fail silently
        logger.warn('putImageData: Layers enabled but no valid active layer');
        return;
      } catch (error) {
        // If StateManager not initialized, fall back to main canvas
        // This provides graceful degradation if state is unavailable
        if (error instanceof Error && error.message.includes('StateManager not initialized')) {
          logger.warn('StateManager not initialized, using main canvas for putImageData');
          if (!ctx) {
            throw new Error('Canvas context not initialized');
          }
          ctx.putImageData(imageData, x, y);
          // Mark dirty region
          if (dirtyTrackingEnabled) {
            markDirtyRegion(x, y, imageData.width, imageData.height);
          }
          return;
        }
        // Re-throw other errors
        throw error;
      }
    } else {
      if (!ctx) {
        throw new Error('Canvas context not initialized');
      }
      ctx.putImageData(imageData, x, y);
      // Mark dirty region
      if (dirtyTrackingEnabled) {
        markDirtyRegion(x, y, imageData.width, imageData.height);
      }
    }
  }

  /**
   * Merge two overlapping or adjacent rectangles
   */
  function mergeRegions(
    r1: { x: number; y: number; width: number; height: number },
    r2: { x: number; y: number; width: number; height: number }
  ): { x: number; y: number; width: number; height: number } | null {
    // Check if regions overlap or are adjacent (within 1px)
    const r1Right = r1.x + r1.width;
    const r1Bottom = r1.y + r1.height;
    const r2Right = r2.x + r2.width;
    const r2Bottom = r2.y + r2.height;

    const overlapX = r1.x <= r2Right + 1 && r1Right + 1 >= r2.x;
    const overlapY = r1.y <= r2Bottom + 1 && r1Bottom + 1 >= r2.y;

    if (overlapX && overlapY) {
      // Merge regions
      const minX = Math.min(r1.x, r2.x);
      const minY = Math.min(r1.y, r2.y);
      const maxRight = Math.max(r1Right, r2Right);
      const maxBottom = Math.max(r1Bottom, r2Bottom);
      return {
        x: minX,
        y: minY,
        width: maxRight - minX,
        height: maxBottom - minY,
      };
    }
    return null;
  }

  /**
   * OPTIMIZATION (Item 11): Optimize dirty regions by merging overlapping/adjacent regions
   * Improved algorithm: sorts regions first for better merge efficiency
   */
  function optimizeDirtyRegions(): void {
    if (dirtyRegions.length <= 1) return;

    // Sort regions by x, then y for more efficient merging
    dirtyRegions.sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      return a.y - b.y;
    });

    let merged = true;
    let iterations = 0;
    const maxIterations = dirtyRegions.length; // Prevent infinite loops

    while (merged && dirtyRegions.length > 1 && iterations < maxIterations) {
      iterations++;
      merged = false;

      // Try to merge adjacent regions (sorted order makes this more efficient)
      for (let i = 0; i < dirtyRegions.length - 1; i++) {
        const mergedRegion = mergeRegions(dirtyRegions[i]!, dirtyRegions[i + 1]!);
        if (mergedRegion) {
          // Replace both regions with merged one
          dirtyRegions[i] = mergedRegion;
          dirtyRegions.splice(i + 1, 1);
          merged = true;
          // Continue from current position (don't break) to merge more
        }
      }
    }
  }

  /**
   * Mark a region as dirty (needs redraw)
   * Optimizes regions by merging overlapping/adjacent areas
   */
  function markDirtyRegion(x: number, y: number, width: number, height: number): void {
    // Clamp to canvas bounds
    const clampedX = Math.max(0, Math.min(x, logicalWidth));
    const clampedY = Math.max(0, Math.min(y, logicalHeight));
    const clampedWidth = Math.min(width, logicalWidth - clampedX);
    const clampedHeight = Math.min(height, logicalHeight - clampedY);

    if (clampedWidth <= 0 || clampedHeight <= 0) return;

    dirtyRegions.push({ x: clampedX, y: clampedY, width: clampedWidth, height: clampedHeight });

    // Optimize regions periodically (every 10 additions) or if too many
    if (dirtyRegions.length % 10 === 0 || dirtyRegions.length > 50) {
      optimizeDirtyRegions();
    }

    // Limit dirty regions to prevent memory issues
    if (dirtyRegions.length > 100) {
      // Merge all regions into one full canvas redraw
      dirtyRegions = [{ x: 0, y: 0, width: logicalWidth, height: logicalHeight }];
    }
  }

  /**
   * Clear dirty regions (after redraw)
   */
  function clearDirtyRegions(): void {
    dirtyRegions = [];
  }

  /**
   * Get current dirty regions
   */
  function getDirtyRegions(): Array<{ x: number; y: number; width: number; height: number }> {
    return [...dirtyRegions];
  }

  /**
   * Enable or disable dirty rectangle tracking
   */
  function setDirtyTracking(enabled: boolean): void {
    dirtyTrackingEnabled = enabled;
    if (!enabled) {
      clearDirtyRegions();
    }
  }

  /**
   * Clear the canvas
   * If layers are enabled, clears active layer only (respects layer locking)
   * For clearing all layers, use clearAll()
   * Ensures synchronous render for immediate updates
   */
  async function clear(): Promise<void> {
    if (useLayers) {
      const activeLayerId = StateManager.getState().activeLayerId;
      if (activeLayerId) {
        // Use Layers.clearLayer() which respects layer locking (professional standard)
        Layers.clearLayer(activeLayerId);
        // Ensure render completes synchronously
        await Layers.renderSync();
      }
    } else {
      getContext().clearRect(0, 0, getWidth(), getHeight());
    }
  }

  /**
   * Clear all layers (professional standard - clears entire canvas)
   * Respects layer locking - locked layers are not cleared
   * If layers are not enabled, clears the entire canvas
   * Ensures synchronous render for immediate updates
   */
  async function clearAll(): Promise<void> {
    if (useLayers) {
      Layers.clearAll();
      // Ensure render completes synchronously
      await Layers.renderSync();
    } else {
      getContext().clearRect(0, 0, getWidth(), getHeight());
    }
  }

  /**
   * Clear the selection canvas
   */
  function clearSelectionCanvas(): void {
    if (selectionCtx && selectionCanvas) {
      selectionCtx.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);
    }
  }

  /**
   * Clear the overlay (selection overlay)
   */
  function clearOverlay(): void {
    clearSelectionCanvas();
  }

  /**
   * Resize the canvas
   * If layers are enabled, resizes all layers
   * Accounts for device pixel ratio
   */
  function resize(width: number, height: number): void {
    if (!canvas) return;

    const newWidth = Math.min(4096, Math.max(1, width));
    const newHeight = Math.min(4096, Math.max(1, height));

    // Update logical dimensions
    logicalWidth = newWidth;
    logicalHeight = newHeight;

    // Update canvas utils (maintains sync for Layers module)
    CanvasUtils.updateDimensions(newWidth, newHeight, devicePixelRatio);

    // Calculate physical dimensions with DPR
    const physicalWidth = newWidth * devicePixelRatio;
    const physicalHeight = newHeight * devicePixelRatio;

    if (useLayers) {
      // Resize all layers
      const layers = Layers.getAllLayers();

      for (const layer of layers) {
        // Get current layer content using cached context
        const layerCtx = Layers.getCachedContext(layer.canvas);
        if (layerCtx) {
          // Get image data using current logical dimensions
          // Note: layer canvas may already be scaled, so we need to account for that
          const layerLogicalW = layer.canvas.width / devicePixelRatio;
          const layerLogicalH = layer.canvas.height / devicePixelRatio;
          // Clamp dimensions to valid values
          const safeWidth = Math.max(1, Math.min(layerLogicalW, layer.canvas.width));
          const safeHeight = Math.max(1, Math.min(layerLogicalH, layer.canvas.height));
          const currentImageData = layerCtx.getImageData(0, 0, safeWidth, safeHeight);

          // Invalidate cached context before resizing (canvas resize invalidates context)
          Layers.invalidateContextCache(layer.canvas);

          // Resize layer canvas (physical pixels)
          layer.canvas.width = physicalWidth;
          layer.canvas.height = physicalHeight;
          layer.canvas.style.width = `${newWidth}px`;
          layer.canvas.style.height = `${newHeight}px`;

          // Invalidate old context cache and get new context
          Layers.invalidateContextCache(layer.canvas);
          const newCtx = layer.canvas.getContext('2d', { willReadFrequently: true });
          if (newCtx) {
            newCtx.scale(devicePixelRatio, devicePixelRatio);
            // Put image data back, clamping to new dimensions if needed
            const putWidth = Math.min(currentImageData.width, newWidth);
            const putHeight = Math.min(currentImageData.height, newHeight);
            if (putWidth > 0 && putHeight > 0) {
              // Create a sub-image if dimensions don't match
              if (putWidth !== currentImageData.width || putHeight !== currentImageData.height) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = putWidth;
                tempCanvas.height = putHeight;
                const tempCtx = tempCanvas.getContext('2d');
                if (tempCtx) {
                  tempCtx.putImageData(currentImageData, 0, 0);
                  const subImageData = tempCtx.getImageData(0, 0, putWidth, putHeight);
                  newCtx.putImageData(subImageData, 0, 0);
                }
              } else {
                newCtx.putImageData(currentImageData, 0, 0);
              }
            }
          }
        }
      }

      // Resize main canvas (physical pixels)
      canvas.width = physicalWidth;
      canvas.height = physicalHeight;
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;

      // Re-scale context (get new context and scale it)
      const tempCtx = canvas.getContext('2d', {
        willReadFrequently: ctx?.getImageData ? true : false,
        alpha: true,
      });
      if (tempCtx) {
        if (devicePixelRatio > 1) {
          tempCtx.scale(devicePixelRatio, devicePixelRatio);
        }
        ctx = tempCtx;
      }

      // Resize OffscreenCanvas if used
      Layers.resize();

      // Re-render all layers
      Layers.render();
    } else {
      const imageData = getImageData();
      canvas.width = physicalWidth;
      canvas.height = physicalHeight;
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;

      // Re-scale context
      const tempCtx = canvas.getContext('2d', {
        willReadFrequently: ctx?.getImageData ? true : false,
        alpha: true,
      });
      if (tempCtx) {
        if (devicePixelRatio > 1) {
          tempCtx.scale(devicePixelRatio, devicePixelRatio);
        }
        ctx = tempCtx;
        putImageData(imageData);
      }
    }

    // After resize operations, redraw layers
    if (useLayers) {
      redraw();
    }
  }

  /**
   * Load an image onto the canvas
   * If layers are enabled, creates a new layer with the image
   * Uses synchronous render for immediate display
   * @param img Image element to load
   * @param center Whether to center the image
   * @param layerName Optional layer name (defaults to "Image Layer N")
   */
  async function loadImage(
    img: HTMLImageElement,
    center: boolean = false,
    layerName?: string
  ): Promise<void> {
    logger.debug('[Canvas] loadImage called', {
      imageWidth: img.width,
      imageHeight: img.height,
      center,
      layerName,
      useLayers,
    });

    // Safety check for invalid image dimensions
    if (img.width <= 0 || img.height <= 0) {
      logger.error('[Canvas] Invalid image dimensions:', img.width, img.height);
      return;
    }

    // Verify image is fully loaded
    if (!img.complete) {
      logger.error('[Canvas] Image not fully loaded');
      return;
    }

    if (useLayers) {
      // Verify layer system is initialized
      if (!Layers.isInitialized()) {
        logger.error('[Canvas] Layer system not initialized');
        return;
      }

      // Create a new layer with the image
      const canvasWidth = getWidth();
      const canvasHeight = getHeight();

      logger.debug('[Canvas] loadImage: Canvas dimensions', { canvasWidth, canvasHeight });

      // Calculate scale to fit within canvas
      const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height);
      const finalScale = scale < 1 ? scale : 1;
      const scaledWidth = img.width * finalScale;
      const scaledHeight = img.height * finalScale;

      // Calculate offset for centering if requested
      let offsetX = 0;
      let offsetY = 0;
      if (center) {
        offsetX = (canvasWidth - scaledWidth) / 2;
        offsetY = (canvasHeight - scaledHeight) / 2;
      }

      // Generate layer name if not provided
      const layers = Layers.getAll();
      const imageLayerCount = layers.filter((l) => l.name.startsWith('Image Layer')).length;
      const defaultName = layerName || `Image Layer ${imageLayerCount + 1}`;

      // Create new layer (transparent background for image layers)
      logger.debug('[Canvas] loadImage: Creating layer', { layerName: defaultName });
      const newLayer = Layers.create(defaultName, undefined, undefined);

      // Draw image to the new layer
      const layerCtx = Layers.getCachedContext(newLayer.canvas);
      if (!layerCtx) {
        logger.error('[Canvas] loadImage: Failed to get layer context');
        return;
      }

      logger.debug('[Canvas] loadImage: Drawing image to layer', {
        offsetX,
        offsetY,
        scaledWidth,
        scaledHeight,
      });
      layerCtx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

      // Update layer bounds to track the image content
      // This ensures the layer is not incorrectly marked as empty
      Layers.updateLayerBounds(newLayer.id, offsetX, offsetY, scaledWidth, scaledHeight);

      // Store image metadata for move/scale/rotate tools
      imageLayerMetadata.set(newLayer.id, {
        source: img,
        scaledWidth,
        scaledHeight,
        offsetX,
        offsetY,
      });

      // Set new layer as active
      Layers.setActive(newLayer.id);
      logger.debug('[Canvas] loadImage: Layer set as active', { layerId: newLayer.id });

      // Re-render all layers synchronously for immediate display
      logger.debug('[Canvas] loadImage: Triggering render');
      await Layers.renderSync();
      logger.debug('[Canvas] loadImage: Render complete');
    } else {
      // Fallback for non-layer mode (shouldn't happen in normal operation)
      logger.warn('[Canvas] loadImage called but layers are disabled');
      await redraw();
    }
  }

  /**
   * Redraw canvas with image layer
   * If layers are enabled, renders all layers
   * Uses synchronous render for immediate updates
   */
  async function redraw(): Promise<void> {
    if (useLayers) {
      await Layers.renderSync();
    } else {
      const context = getContext();
      context.clearRect(0, 0, getWidth(), getHeight());
    }
  }

  /**
   * Convert canvas to data URL
   */
  function toDataURL(type?: string, quality?: number): string {
    try {
      const canvas = getCanvas();
      if (!canvas) {
        throw new Error('Canvas not available');
      }
      return canvas.toDataURL(type, quality);
    } catch (error) {
      logger.error('Failed to export canvas:', error);
      // Emit error event for UI feedback
      EventEmitter.emit('canvas:export-error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Get precise canvas coordinates from pointer event with sub-pixel precision
   * Returns floating-point coordinates for accurate tool placement
   * Professional apps maintain sub-pixel precision internally for accuracy
   * Accounts for device pixel ratio and zoom transformations
   */
  function getCanvasCoordsPrecise(e: PointerEvent | MouseEvent): { x: number; y: number } {
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    try {
      const rect = canvas.getBoundingClientRect();
      // Use logical dimensions for coordinate calculation
      // This ensures coordinates match the logical canvas size regardless of DPR
      const logicalW = getWidth();
      const logicalH = getHeight();
      // Prevent division by zero
      if (rect.width === 0 || rect.height === 0) {
        logger.warn('Canvas has zero dimensions');
        return { x: 0, y: 0 };
      }
      const scaleX = logicalW / rect.width;
      const scaleY = logicalH / rect.height;
      // Maintain sub-pixel precision for accurate tool placement
      // Clamp coordinates to valid canvas bounds
      const rawX = (e.clientX - rect.left) * scaleX;
      const rawY = (e.clientY - rect.top) * scaleY;
      return {
        x: Math.max(0, Math.min(rawX, logicalW)),
        y: Math.max(0, Math.min(rawY, logicalH)),
      };
    } catch (error) {
      logger.error('Error getting canvas coordinates:', error);
      return { x: 0, y: 0 };
    }
  }

  /**
   * Enable or disable layer system
   */
  function setLayersEnabled(enabled: boolean): void {
    useLayers = enabled;
    if (enabled && canvas && ctx) {
      Layers.init(canvas, ctx);
      if (Layers.getAllLayers().length === 0) {
        Layers.create('Layer 1');
        Layers.render();
      }
    }
  }

  /**
   * Get layers module (for external access)
   */
  function getLayers() {
    return Layers;
  }

  /**
   * Trigger layer render if layers are enabled
   * Call this after drawing operations to update the main canvas
   * Uses synchronous render for immediate updates
   */
  async function triggerRender(): Promise<void> {
    if (useLayers) {
      await Layers.renderSync();
    }
  }

  /**
   * Get the image layer (layer with name starting with "Image Layer")
   * Returns the first image layer found, or null if none exists
   */
  function getImageLayer(): { id: string; name: string; width: number; height: number } | null {
    if (!useLayers) {
      return null;
    }
    try {
      const layers = Layers.getAll();
      const imageLayer = layers.find((layer) => layer.name.startsWith('Image Layer'));
      if (!imageLayer) {
        return null;
      }
      const metadata = imageLayerMetadata.get(imageLayer.id);
      if (!metadata) {
        return null;
      }
      return {
        id: imageLayer.id,
        name: imageLayer.name,
        width: metadata.scaledWidth,
        height: metadata.scaledHeight,
      };
    } catch (error) {
      logger.error('Error getting image layer:', error);
      return null;
    }
  }

  /**
   * Get the offset of the image layer
   * Returns { x: 0, y: 0 } if no image layer or offset not found
   */
  function getImageOffset(): { x: number; y: number } {
    if (!useLayers) {
      return { x: 0, y: 0 };
    }
    try {
      const layers = Layers.getAll();
      const imageLayer = layers.find((layer) => layer.name.startsWith('Image Layer'));
      if (!imageLayer) {
        return { x: 0, y: 0 };
      }
      const metadata = imageLayerMetadata.get(imageLayer.id);
      if (!metadata) {
        return { x: 0, y: 0 };
      }
      return { x: metadata.offsetX, y: metadata.offsetY };
    } catch (error) {
      logger.error('Error getting image offset:', error);
      return { x: 0, y: 0 };
    }
  }

  /**
   * Set the offset of the image layer and redraw it at the new position
   */
  async function setImageOffset(offsetX: number, offsetY: number): Promise<void> {
    if (!useLayers) {
      return;
    }
    try {
      const layers = Layers.getAll();
      const imageLayer = layers.find((layer) => layer.name.startsWith('Image Layer'));
      if (!imageLayer) {
        logger.warn('setImageOffset: No image layer found');
        return;
      }
      const metadata = imageLayerMetadata.get(imageLayer.id);
      if (!metadata) {
        logger.warn('setImageOffset: No metadata found for image layer');
        return;
      }

      // Update offset in metadata
      metadata.offsetX = offsetX;
      metadata.offsetY = offsetY;
      imageLayerMetadata.set(imageLayer.id, metadata);

      // Clear the layer and redraw image at new offset
      const layerCtx = Layers.getCachedContext(imageLayer.canvas);
      if (layerCtx) {
        // Clear the layer
        layerCtx.clearRect(0, 0, getWidth(), getHeight());
        // Redraw image at new offset
        layerCtx.drawImage(
          metadata.source,
          offsetX,
          offsetY,
          metadata.scaledWidth,
          metadata.scaledHeight
        );
      }

      // Trigger render to update main canvas
      await triggerRender();
    } catch (error) {
      logger.error('Error setting image offset:', error);
    }
  }

  // Public API
  return {
    init,
    getCanvas,
    getContext,
    getSelectionContext,
    getWidth,
    getHeight,
    getDevicePixelRatio,
    getImageData,
    getImageDataRegion,
    putImageData,
    clear,
    clearAll,
    clearSelectionCanvas,
    clearOverlay,
    resize,
    loadImage,
    redraw,
    toDataURL,
    getCanvasCoordsPrecise,
    setLayersEnabled,
    getLayers,
    triggerRender,
    isInitialized,
    markDirtyRegion,
    clearDirtyRegions,
    getDirtyRegions,
    setDirtyTracking,
    getImageLayer,
    getImageOffset,
    setImageOffset,
    getMainContext,
  };
})();

export default Canvas;
