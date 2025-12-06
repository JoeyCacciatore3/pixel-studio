/**
 * Layers Module
 * Manages multi-layer system for pixel art editor
 */

import type { Layer, LayerState } from './types';
import Canvas from './canvas';
import { applyBlendMode, isNativeBlendMode, type BlendMode } from './blendModes';

const Layers = (function () {
  let layers: Layer[] = [];
  let activeLayerId: string | null = null;
  let mainCanvas: HTMLCanvasElement | null = null;
  let mainCtx: CanvasRenderingContext2D | null = null;

  /**
   * Generate unique layer ID
   */
  function generateLayerId(): string {
    return `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize the layers module
   */
  function init(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    mainCanvas = canvas;
    mainCtx = ctx;
    layers = [];
    activeLayerId = null;
  }

  /**
   * Create a new layer
   */
  function createLayer(name: string, imageData?: ImageData): Layer {
    const width = Canvas.getWidth();
    const height = Canvas.getHeight();

    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = width;
    layerCanvas.height = height;
    const layerCtx = layerCanvas.getContext('2d', { willReadFrequently: true });

    if (!layerCtx) {
      throw new Error('Failed to create layer canvas context');
    }

    // If imageData provided, draw it to the layer
    if (imageData) {
      layerCtx.putImageData(imageData, 0, 0);
    } else {
      // Clear with transparent background
      layerCtx.clearRect(0, 0, width, height);
    }

    const layer: Layer = {
      id: generateLayerId(),
      name,
      canvas: layerCanvas,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
    };

    layers.push(layer);

    // Set as active if it's the first layer
    if (layers.length === 1) {
      activeLayerId = layer.id;
    }

    return layer;
  }

  /**
   * Delete a layer
   */
  function deleteLayer(id: string): boolean {
    const index = layers.findIndex((l) => l.id === id);
    if (index === -1) return false;

    // Don't allow deleting the last layer
    if (layers.length <= 1) return false;

    layers.splice(index, 1);

    // If deleted layer was active, switch to another layer
    if (activeLayerId === id) {
      activeLayerId = layers.length > 0 ? layers[0]!.id : null;
    }

    return true;
  }

  /**
   * Get a layer by ID
   */
  function getLayer(id: string): Layer | undefined {
    return layers.find((l) => l.id === id);
  }

  /**
   * Get all layers
   */
  function getAllLayers(): Layer[] {
    return [...layers];
  }

  /**
   * Get the currently active layer
   */
  function getActiveLayer(): Layer | null {
    if (!activeLayerId) return null;
    return getLayer(activeLayerId) || null;
  }

  /**
   * Set the active layer
   */
  function setActiveLayer(id: string): boolean {
    const layer = getLayer(id);
    if (!layer) return false;
    activeLayerId = id;
    return true;
  }

  /**
   * Get layer state for history
   */
  function getState(): LayerState {
    return {
      layers: layers.map((layer) => ({
        ...layer,
        // Create new canvas with layer content for state snapshot
        canvas: (() => {
          const snapshot = document.createElement('canvas');
          snapshot.width = layer.canvas.width;
          snapshot.height = layer.canvas.height;
          const ctx = snapshot.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(layer.canvas, 0, 0);
          }
          return snapshot;
        })(),
      })),
      activeLayerId,
    };
  }

  /**
   * Restore layer state from history
   */
  function setState(state: LayerState): void {
    layers = state.layers.map((layer) => ({
      ...layer,
          // Ensure canvas is properly initialized
          canvas: (() => {
            const canvas = document.createElement('canvas');
            canvas.width = layer.canvas.width;
            canvas.height = layer.canvas.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(layer.canvas, 0, 0);
            }
            return canvas;
          })(),
    }));
    activeLayerId = state.activeLayerId;
  }

  /**
   * Render all visible layers to the main canvas
   */
  function renderLayers(): void {
    if (!mainCtx || !mainCanvas) return;

    const width = Canvas.getWidth();
    const height = Canvas.getHeight();

    // Clear main canvas
    mainCtx.clearRect(0, 0, width, height);

    // Create composite canvas for custom blend modes
    let compositeCanvas: HTMLCanvasElement | null = null;
    let compositeCtx: CanvasRenderingContext2D | null = null;
    let needsCustomBlending = false;

    // Check if any layer needs custom blending
    for (const layer of layers) {
      if (!layer.visible) continue;
      if (!isNativeBlendMode(layer.blendMode as BlendMode)) {
        needsCustomBlending = true;
        break;
      }
    }

    if (needsCustomBlending) {
      compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = width;
      compositeCanvas.height = height;
      compositeCtx = compositeCanvas.getContext('2d', { willReadFrequently: true });
      if (!compositeCtx) {
        needsCustomBlending = false;
      }
    }

    let baseImageData: ImageData | null = null;

    // Draw all visible layers from bottom to top
    for (const layer of layers) {
      if (!layer.visible) continue;

      const blendMode = layer.blendMode as BlendMode;

      if (needsCustomBlending && compositeCtx && !isNativeBlendMode(blendMode)) {
        // Use custom blend mode
        if (!baseImageData) {
          // First layer - just copy it
          baseImageData = compositeCtx.createImageData(width, height);
          const layerCtx = layer.canvas.getContext('2d', { willReadFrequently: true });
          if (layerCtx) {
            const layerData = layerCtx.getImageData(0, 0, width, height);
            baseImageData.data.set(layerData.data);
          }
        } else {
          // Blend with previous layers
          const layerCtx = layer.canvas.getContext('2d', { willReadFrequently: true });
          if (layerCtx) {
            const overlayData = layerCtx.getImageData(0, 0, width, height);
            baseImageData = applyBlendMode(baseImageData, overlayData, blendMode, layer.opacity);
          }
        }
      } else {
        // Use native blend mode
        if (needsCustomBlending && compositeCtx && baseImageData) {
          // Draw accumulated result so far
          compositeCtx.putImageData(baseImageData, 0, 0);
          baseImageData = null;
        }

        const targetCtx = needsCustomBlending && compositeCtx ? compositeCtx : mainCtx;
        if (targetCtx) {
          targetCtx.save();
          targetCtx.globalAlpha = layer.opacity;
          targetCtx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
          targetCtx.drawImage(layer.canvas, 0, 0);
          targetCtx.restore();
        }
      }
    }

    // Draw final composite if using custom blending
    if (needsCustomBlending && compositeCtx && baseImageData && compositeCanvas) {
      compositeCtx.putImageData(baseImageData, 0, 0);
      mainCtx.drawImage(compositeCanvas, 0, 0);
    }
  }

  /**
   * Extract selection to a new layer
   */
  function extractSelectionToLayer(
    selection: Uint8Array,
    _selectionBounds: { x: number; y: number; width: number; height: number }
  ): Layer | null {
    const activeLayer = getActiveLayer();
    if (!activeLayer) return null;

    const width = Canvas.getWidth();
    const height = Canvas.getHeight();

    // Get image data from active layer
    const layerCtx = activeLayer.canvas.getContext('2d', { willReadFrequently: true });
    if (!layerCtx) return null;

    const imageData = layerCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Create new layer with extracted selection
    const newLayerCanvas = document.createElement('canvas');
    newLayerCanvas.width = width;
    newLayerCanvas.height = height;
    const newLayerCtx = newLayerCanvas.getContext('2d', { willReadFrequently: true });
    if (!newLayerCtx) return null;

    // Copy selected pixels to new layer
    const newImageData = newLayerCtx.createImageData(width, height);
    const newData = newImageData.data;

    for (let i = 0; i < selection.length; i++) {
      if (selection[i]) {
        const idx = i * 4;
        newData[idx] = data[idx]!;
        newData[idx + 1] = data[idx + 1]!;
        newData[idx + 2] = data[idx + 2]!;
        newData[idx + 3] = data[idx + 3]!;
      }
    }

    newLayerCtx.putImageData(newImageData, 0, 0);

    // Remove selected pixels from original layer
    for (let i = 0; i < selection.length; i++) {
      if (selection[i]) {
        const idx = i * 4;
        data[idx + 3] = 0; // Set alpha to 0 (transparent)
      }
    }

    layerCtx.putImageData(imageData, 0, 0);

    // Create new layer
    const newLayer: Layer = {
      id: generateLayerId(),
      name: `Layer ${layers.length + 1}`,
      canvas: newLayerCanvas,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
    };

    layers.push(newLayer);
    activeLayerId = newLayer.id;

    // Re-render
    renderLayers();

    return newLayer;
  }

  /**
   * Update layer properties
   */
  function updateLayer(id: string, updates: Partial<Omit<Layer, 'id' | 'canvas'>>): boolean {
    const layer = getLayer(id);
    if (!layer) return false;

    Object.assign(layer, updates);
    renderLayers();
    return true;
  }

  /**
   * Duplicate a layer
   */
  function duplicateLayer(id: string): Layer | null {
    const layer = getLayer(id);
    if (!layer) return null;

    const width = Canvas.getWidth();
    const height = Canvas.getHeight();

    const newLayerCanvas = document.createElement('canvas');
    newLayerCanvas.width = width;
    newLayerCanvas.height = height;
    const newLayerCtx = newLayerCanvas.getContext('2d', { willReadFrequently: true });
    if (!newLayerCtx) return null;

    newLayerCtx.drawImage(layer.canvas, 0, 0);

    const newLayer: Layer = {
      id: generateLayerId(),
      name: `${layer.name} Copy`,
      canvas: newLayerCanvas,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
    };

    const index = layers.findIndex((l) => l.id === id);
    layers.splice(index + 1, 0, newLayer);

    renderLayers();
    return newLayer;
  }

  /**
   * Reorder layers
   */
  function reorderLayer(fromIndex: number, toIndex: number): boolean {
    if (fromIndex < 0 || fromIndex >= layers.length) return false;
    if (toIndex < 0 || toIndex >= layers.length) return false;

    const [layer] = layers.splice(fromIndex, 1);
    if (!layer) return false;

    layers.splice(toIndex, 0, layer);
    renderLayers();
    return true;
  }

  /**
   * Get image data from active layer
   */
  function getActiveLayerImageData(): ImageData | null {
    const layer = getActiveLayer();
    if (!layer) return null;

    const ctx = layer.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    return ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
  }

  /**
   * Put image data to active layer
   */
  function putActiveLayerImageData(imageData: ImageData): boolean {
    const layer = getActiveLayer();
    if (!layer) return false;

    const ctx = layer.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    ctx.putImageData(imageData, 0, 0);
    renderLayers();
    return true;
  }

  /**
   * Clear a specific layer by ID
   * Respects layer locking - will not clear locked layers
   */
  function clearLayer(id: string): boolean {
    const layer = getLayer(id);
    if (!layer) return false;

    // Don't clear locked layers (professional standard)
    if (layer.locked) return false;

    const ctx = layer.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    renderLayers();
    return true;
  }

  /**
   * Clear all unlocked layers
   * Respects layer locking - skips locked layers (professional standard)
   */
  function clearAllLayers(): void {
    let clearedAny = false;
    for (const layer of layers) {
      // Skip locked layers (professional apps prevent clearing locked layers)
      if (layer.locked) continue;

      const ctx = layer.canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        clearedAny = true;
      }
    }

    // Only re-render if we actually cleared something
    if (clearedAny) {
      renderLayers();
    }
  }

  // Public API
  return {
    init,
    createLayer,
    deleteLayer,
    getLayer,
    getAllLayers,
    getActiveLayer,
    setActiveLayer,
    getState,
    setState,
    renderLayers,
    extractSelectionToLayer,
    updateLayer,
    duplicateLayer,
    reorderLayer,
    getActiveLayerImageData,
    putActiveLayerImageData,
    clearLayer,
    clearAllLayers,
  };
})();

export default Layers;
