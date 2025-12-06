/**
 * Canvas Module
 * Manages canvas element, context, and all canvas operations
 */

import Layers from './layers';

const Canvas = (function () {
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let selectionCanvas: HTMLCanvasElement | null = null;
  let selectionCtx: CanvasRenderingContext2D | null = null;
  let imageLayer: HTMLImageElement | null = null;
  let imageOffsetX = 0;
  let imageOffsetY = 0;
  let useLayers = false;

  /**
   * Initialize the canvas module
   */
  function init(
    canvasElement: HTMLCanvasElement,
    selectionCanvasElement?: HTMLCanvasElement,
    enableLayers: boolean = false
  ) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (selectionCanvasElement) {
      selectionCanvas = selectionCanvasElement;
      selectionCtx = selectionCanvas.getContext('2d', { willReadFrequently: true });
    }

    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
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
   */
  function getContext(): CanvasRenderingContext2D {
    if (useLayers) {
      const layer = Layers.getActiveLayer();
      if (layer) {
        const layerCtx = layer.canvas.getContext('2d', { willReadFrequently: true });
        if (layerCtx) {
          return layerCtx;
        }
      }
    }
    if (!ctx) {
      throw new Error('Canvas context not initialized');
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
   * Check if canvas is initialized
   */
  function isInitialized(): boolean {
    return canvas !== null && ctx !== null;
  }

  /**
   * Get canvas width
   */
  function getWidth(): number {
    if (!canvas) {
      throw new Error('Canvas not initialized');
    }
    return canvas.width;
  }

  /**
   * Get canvas height
   */
  function getHeight(): number {
    if (!canvas) {
      throw new Error('Canvas not initialized');
    }
    return canvas.height;
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
      const imageData = Layers.getActiveLayerImageData();
      if (imageData) {
        return imageData;
      }
    }
    return getContext().getImageData(0, 0, getWidth(), getHeight());
  }

  /**
   * Put image data to canvas
   * If layers are enabled, puts data to active layer and re-renders
   */
  function putImageData(imageData: ImageData): void {
    if (useLayers) {
      Layers.putActiveLayerImageData(imageData);
    } else {
      if (!ctx) {
        throw new Error('Canvas context not initialized');
      }
      ctx.putImageData(imageData, 0, 0);
    }
  }

  /**
   * Clear the canvas
   * If layers are enabled, clears active layer only
   * For clearing all layers, use clearAll()
   */
  function clear(): void {
    if (useLayers) {
      const layer = Layers.getActiveLayer();
      if (layer) {
        const ctx = layer.canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
          Layers.renderLayers();
        }
      }
    } else {
      getContext().clearRect(0, 0, getWidth(), getHeight());
    }
  }

  /**
   * Clear all layers (professional standard - clears entire canvas)
   * Respects layer locking - locked layers are not cleared
   * If layers are not enabled, clears the entire canvas
   */
  function clearAll(): void {
    if (useLayers) {
      Layers.clearAllLayers();
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
   */
  function resize(width: number, height: number): void {
    if (!canvas) return;

    const newWidth = Math.min(4096, Math.max(1, width));
    const newHeight = Math.min(4096, Math.max(1, height));

    if (useLayers) {
      // Resize all layers
      const layers = Layers.getAllLayers();
      for (const layer of layers) {
        // Get current layer content
        const layerCtx = layer.canvas.getContext('2d', { willReadFrequently: true });
        if (layerCtx) {
          const currentImageData = layerCtx.getImageData(
            0,
            0,
            layer.canvas.width,
            layer.canvas.height
          );

          // Resize layer canvas
          layer.canvas.width = newWidth;
          layer.canvas.height = newHeight;

          // Put image data back (will be cropped/expanded as needed)
          const newCtx = layer.canvas.getContext('2d', { willReadFrequently: true });
          if (newCtx) {
            newCtx.putImageData(currentImageData, 0, 0);
          }
        }
      }

      // Resize main canvas
      canvas.width = newWidth;
      canvas.height = newHeight;

      // Re-render all layers
      Layers.renderLayers();
    } else {
      const imageData = getImageData();
      canvas.width = newWidth;
      canvas.height = newHeight;
      putImageData(imageData);
    }
  }

  /**
   * Load an image onto the canvas
   * If layers are enabled, draws to active layer
   */
  function loadImage(img: HTMLImageElement, center: boolean = false): void {
    imageLayer = img;
    if (center) {
      imageOffsetX = (getWidth() - img.width) / 2;
      imageOffsetY = (getHeight() - img.height) / 2;
    }

    if (useLayers) {
      // Draw image to active layer
      const layer = Layers.getActiveLayer();
      if (layer) {
        const layerCtx = layer.canvas.getContext('2d');
        if (layerCtx) {
          // Clear the layer first
          layerCtx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
          // Draw the image
          layerCtx.drawImage(img, imageOffsetX, imageOffsetY);
          // Re-render all layers
          Layers.renderLayers();
        }
      }
    } else {
      redraw();
    }
  }

  /**
   * Redraw canvas with image layer
   * If layers are enabled, renders all layers
   */
  function redraw(): void {
    if (useLayers) {
      Layers.renderLayers();
    } else {
      const context = getContext();
      context.clearRect(0, 0, getWidth(), getHeight());
      if (imageLayer) {
        context.drawImage(imageLayer, imageOffsetX, imageOffsetY);
      }
    }
  }

  /**
   * Set image offset
   */
  function setImageOffset(x: number, y: number): void {
    imageOffsetX = x;
    imageOffsetY = y;
    redraw();
  }

  /**
   * Get image layer
   */
  function getImageLayer(): HTMLImageElement | null {
    return imageLayer;
  }

  /**
   * Get image offset
   */
  function getImageOffset(): { x: number; y: number } {
    return { x: imageOffsetX, y: imageOffsetY };
  }

  /**
   * Convert canvas to data URL
   */
  function toDataURL(type?: string, quality?: number): string {
    return getCanvas().toDataURL(type, quality);
  }

  /**
   * Get canvas coordinates from pointer event
   */
  function getCanvasCoords(e: PointerEvent | MouseEvent): { x: number; y: number } {
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    try {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    } catch (error) {
      console.error('Error getting canvas coordinates:', error);
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
        Layers.createLayer('Layer 1');
        Layers.renderLayers();
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
   */
  function triggerRender(): void {
    if (useLayers) {
      Layers.renderLayers();
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
    getImageData,
    putImageData,
    clear,
    clearAll,
    clearSelectionCanvas,
    clearOverlay,
    resize,
    loadImage,
    redraw,
    setImageOffset,
    getImageLayer,
    getImageOffset,
    toDataURL,
    getCanvasCoords,
    setLayersEnabled,
    getLayers,
    triggerRender,
    isInitialized,
  };
})();

export default Canvas;
