/**
 * Layers Module
 * Manages multi-layer system for pixel art editor
 * Uses StateManager as single source of truth for layer state
 */

import type { Layer, LayerState } from './types';
import Canvas from './canvas';
import CanvasUtils from './canvasUtils';
import StateManager from './stateManager';
import { isNativeBlendMode, type BlendMode } from './blendModes';
import EventEmitter from './utils/eventEmitter';
import WorkerManager from './workers/workerManager';
import { logger } from './utils/logger';

const Layers = (function () {
  // Maximum number of layers allowed (production limit)
  const MAX_LAYERS = 10;

  // Layer state is stored in StateManager, not here
  let mainCanvas: HTMLCanvasElement | null = null;
  let mainCtx: CanvasRenderingContext2D | null = null;
  let renderScheduled = false;
  // Context cache to avoid recreating contexts
  const contextCache = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  // OffscreenCanvas for compositing (required)
  let offscreenCanvas: OffscreenCanvas | null = null;
  let offscreenCtx: OffscreenRenderingContext | null = null;
  // Cache for composite results to avoid re-computing unchanged layers
  // Note: Caching implementation deferred for future optimization
  // let lastCompositeHash: string | null = null;
  // let cachedComposite: ImageData | null = null;
  // Reusable composite canvas to avoid recreation
  let reusableCompositeCanvas: HTMLCanvasElement | null = null;
  let reusableCompositeCtx: CanvasRenderingContext2D | null = null;
  // OPTIMIZATION (Item 6): Track bounding box of non-transparent content per layer
  // This allows skipping rendering of empty layers and optimizing sparse content
  const layerBounds = new Map<
    string,
    { x: number; y: number; width: number; height: number } | null
  >();

  /**
   * Type guard: Check if context is valid CanvasRenderingContext2D
   */
  function isValid2DContext(ctx: unknown): ctx is CanvasRenderingContext2D {
    return (
      ctx !== null &&
      ctx !== undefined &&
      typeof (ctx as CanvasRenderingContext2D).clearRect === 'function'
    );
  }

  /**
   * Type guard: Check if OffscreenRenderingContext can be used as 2D context
   */
  function isValidOffscreenContext(ctx: unknown): ctx is OffscreenRenderingContext {
    return ctx !== null && ctx !== undefined;
  }

  /**
   * Generate unique layer ID
   */
  function generateLayerId(): string {
    return `layer-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Get or cache canvas context
   * Avoids recreating contexts for better performance
   */
  function getCachedContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
    const cached = contextCache.get(canvas);
    if (cached) {
      return cached;
    }
    // willReadFrequently: false enables GPU acceleration for drawing operations
    // Layer contexts are primarily for drawing, not reading
    const ctx = canvas.getContext('2d', {
      willReadFrequently: false, // Optimize for drawing performance
      alpha: true, // Ensure alpha channel is enabled for transparency/erasing
    });
    if (ctx) {
      contextCache.set(canvas, ctx);
      return ctx;
    }
    return null;
  }

  /**
   * Invalidate cached context for a canvas
   * Call this when canvas dimensions change or context is otherwise invalidated
   */
  function invalidateContextCache(canvas: HTMLCanvasElement): void {
    contextCache.delete(canvas);
  }

  /**
   * Get layers array from StateManager
   */
  function getLayers(): Layer[] {
    if (!StateManager.isInitialized()) {
      logger.error('StateManager not initialized, cannot get layers');
      throw new Error('StateManager not initialized');
    }
    try {
      return StateManager.getState().layers;
    } catch (error) {
      logger.error('Failed to get layers from StateManager:', error);
      throw error;
    }
  }

  /**
   * Get active layer ID from StateManager
   */
  function getActiveLayerId(): string | null {
    if (!StateManager.isInitialized()) {
      logger.error('StateManager not initialized, cannot get active layer ID');
      throw new Error('StateManager not initialized');
    }
    try {
      return StateManager.getState().activeLayerId;
    } catch (error) {
      logger.error('Failed to get active layer ID from StateManager:', error);
      throw error;
    }
  }

  /**
   * Check if layers module is initialized
   */
  function isInitialized(): boolean {
    return mainCanvas !== null && mainCtx !== null;
  }

  /**
   * Initialize the layers module
   */
  function init(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    mainCanvas = canvas;
    mainCtx = ctx;

    // Initialize OffscreenCanvas if supported (for better performance)
    resizeOffscreenCanvas();

    // Initialize reusable composite canvas
    if (typeof document !== 'undefined') {
      const width = CanvasUtils.getWidth();
      const height = CanvasUtils.getHeight();
      const devicePixelRatio = CanvasUtils.getDevicePixelRatio();
      const physicalWidth = width * devicePixelRatio;
      const physicalHeight = height * devicePixelRatio;

      reusableCompositeCanvas = document.createElement('canvas');
      reusableCompositeCanvas.width = physicalWidth;
      reusableCompositeCanvas.height = physicalHeight;
      reusableCompositeCanvas.style.width = `${width}px`;
      reusableCompositeCanvas.style.height = `${height}px`;
      reusableCompositeCtx = reusableCompositeCanvas.getContext('2d', { willReadFrequently: true });
      if (reusableCompositeCtx && devicePixelRatio > 1) {
        reusableCompositeCtx.scale(devicePixelRatio, devicePixelRatio);
      }
    }

    // Initialize blend worker for async blend mode operations
    if (typeof window !== 'undefined') {
      WorkerManager.initBlendWorker();
    }
  }

  /**
   * Resize OffscreenCanvas to match current canvas dimensions
   * Called on initialization and when canvas is resized
   * Requires OffscreenCanvas support
   */
  function resizeOffscreenCanvas(): void {
    // Only check OffscreenCanvas in browser environment (not during SSR)
    if (typeof window === 'undefined' || typeof OffscreenCanvas === 'undefined') {
      // During SSR or if OffscreenCanvas is not available, skip initialization
      // It will be initialized when the browser environment is available
      return;
    }

    try {
      const width = CanvasUtils.getWidth();
      const height = CanvasUtils.getHeight();
      const devicePixelRatio = CanvasUtils.getDevicePixelRatio();
      const physicalWidth = width * devicePixelRatio;
      const physicalHeight = height * devicePixelRatio;

      // Recreate OffscreenCanvas with new dimensions
      offscreenCanvas = new OffscreenCanvas(physicalWidth, physicalHeight);
      offscreenCtx = offscreenCanvas.getContext('2d');
      if (offscreenCtx && devicePixelRatio > 1) {
        offscreenCtx.scale(devicePixelRatio, devicePixelRatio);
      }

      // Resize reusable composite canvas
      if (reusableCompositeCanvas && typeof document !== 'undefined') {
        reusableCompositeCanvas.width = physicalWidth;
        reusableCompositeCanvas.height = physicalHeight;
        reusableCompositeCanvas.style.width = `${width}px`;
        reusableCompositeCanvas.style.height = `${height}px`;
        reusableCompositeCtx = reusableCompositeCanvas.getContext('2d', {
          willReadFrequently: true,
        });
        if (reusableCompositeCtx && devicePixelRatio > 1) {
          reusableCompositeCtx.scale(devicePixelRatio, devicePixelRatio);
        }
      }

      // Clear cache on resize
      // Cache cleared (implementation deferred)
    } catch (error) {
      // OffscreenCanvas is required - throw error instead of falling back
      throw new Error(
        `OffscreenCanvas is required but failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a new layer
   * Accounts for device pixel ratio for high-DPI displays
   * Enforces maximum layer limit (MAX_LAYERS)
   * @param name Layer name
   * @param imageData Optional ImageData to initialize the layer with
   * @param backgroundColor Optional background color (hex format, e.g., '#FFFFFF')
   * @throws Error if layer limit is reached
   */
  function createLayer(name: string, imageData?: ImageData, backgroundColor?: string): Layer {
    logger.debug('[Layers] createLayer called', {
      name,
      hasImageData: !!imageData,
      backgroundColor,
    });

    // Check layer limit before creating (production requirement)
    // Get layers once to avoid redundant calls
    const currentLayers = getLayers();
    if (currentLayers.length >= MAX_LAYERS) {
      const errorMessage = `Maximum layer limit reached (${MAX_LAYERS} layers). Please delete a layer before creating a new one.`;
      EventEmitter.emit('layers:error', {
        message: errorMessage,
        type: 'limit_reached',
        currentCount: currentLayers.length,
        maxCount: MAX_LAYERS,
      });
      throw new Error(errorMessage);
    }

    // Only create canvas in browser environment
    if (typeof document === 'undefined') {
      throw new Error('Cannot create layer: document is not available (SSR)');
    }

    const width = CanvasUtils.getWidth();
    const height = CanvasUtils.getHeight();
    const devicePixelRatio = CanvasUtils.getDevicePixelRatio();
    const physicalWidth = width * devicePixelRatio;
    const physicalHeight = height * devicePixelRatio;

    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = physicalWidth;
    layerCanvas.height = physicalHeight;
    layerCanvas.style.width = `${width}px`;
    layerCanvas.style.height = `${height}px`;
    const layerCtx = layerCanvas.getContext('2d', {
      willReadFrequently: true,
      alpha: true, // Ensure alpha channel is enabled for transparency/erasing
    });

    if (!layerCtx) {
      throw new Error('Failed to create layer canvas context');
    }

    // Scale context to match device pixel ratio
    if (devicePixelRatio > 1) {
      layerCtx.scale(devicePixelRatio, devicePixelRatio);
    }

    // Fill with background color if provided, otherwise clear to transparent
    if (backgroundColor) {
      layerCtx.fillStyle = backgroundColor;
      layerCtx.fillRect(0, 0, width, height);
    } else {
      // Clear with transparent background
      layerCtx.clearRect(0, 0, width, height);
    }

    // If imageData provided, draw it to the layer (on top of background)
    if (imageData) {
      layerCtx.putImageData(imageData, 0, 0);
    }

    const layer: Layer = {
      id: generateLayerId(),
      name,
      canvas: layerCanvas,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      backgroundColor,
    };

    // OPTIMIZATION (Item 6): Initialize layer bounds
    // If imageData is provided, set bounds to image dimensions
    // If backgroundColor is provided, layer will always render (handled in layerIntersectsViewport)
    // Otherwise, initialize as null (empty) - will be updated when content is drawn
    if (imageData) {
      layerBounds.set(layer.id, {
        x: 0,
        y: 0,
        width: imageData.width,
        height: imageData.height,
      });
    } else if (backgroundColor) {
      // Layers with background colors always render, but we can track full canvas bounds
      const width = CanvasUtils.getWidth();
      const height = CanvasUtils.getHeight();
      layerBounds.set(layer.id, {
        x: 0,
        y: 0,
        width: width,
        height: height,
      });
    } else {
      // Empty layer - no content yet
      layerBounds.set(layer.id, null);
    }

    // Add to layers array in StateManager (reuse currentLayers from limit check)
    const newLayers = [...currentLayers, layer];
    StateManager.setLayers(newLayers);

    // Set as active if it's the first layer
    if (newLayers.length === 1) {
      StateManager.setActiveLayerId(layer.id);
      logger.debug('[Layers] createLayer: First layer set as active', { layerId: layer.id });
    }

    // Emit event for layer creation
    EventEmitter.emit('layers:create', {
      layer,
      layers: newLayers,
      activeLayerId: newLayers.length === 1 ? layer.id : getActiveLayerId(),
    });

    logger.debug('[Layers] createLayer: Layer created successfully', {
      layerId: layer.id,
      layerName: layer.name,
      totalLayers: newLayers.length,
      hasImageData: !!imageData,
      hasBackgroundColor: !!backgroundColor,
    });

    return layer;
  }

  /**
   * Delete a layer
   */
  function deleteLayer(id: string): boolean {
    const layers = getLayers();
    const index = layers.findIndex((l) => l.id === id);
    if (index === -1) return false;

    // Don't allow deleting the last layer
    if (layers.length <= 1) return false;

    const newLayers = layers.filter((l) => l.id !== id);
    StateManager.setLayers(newLayers);

    // OPTIMIZATION (Item 6): Remove layer bounds when layer is deleted
    layerBounds.delete(id);

    // If deleted layer was active, switch to another layer
    if (getActiveLayerId() === id) {
      StateManager.setActiveLayerId(newLayers.length > 0 ? newLayers[0]!.id : null);
    }

    // Emit event for layer deletion
    EventEmitter.emit('layers:delete', {
      deletedId: id,
      layers: newLayers,
      activeLayerId: getActiveLayerId(),
    });

    return true;
  }

  /**
   * Get a layer by ID
   */
  function getLayer(id: string): Layer | undefined {
    return getLayers().find((l) => l.id === id);
  }

  /**
   * Get all layers (returns copy)
   */
  function getAllLayers(): Layer[] {
    return [...getLayers()];
  }

  /**
   * Set the active layer
   */
  function setActiveLayer(id: string): boolean {
    const layer = getLayer(id);
    if (!layer) return false;
    StateManager.setActiveLayerId(id);

    // Emit event for active layer change (StateManager already emitted layers:active)
    EventEmitter.emit('layers:active', {
      activeLayerId: id,
      layer,
    });

    return true;
  }

  /**
   * Internal helper: Create layer state snapshot for history
   * Preserves canvas dimensions including DPR scaling
   * Creates canvas snapshots for undo/redo functionality
   */
  function createLayerSnapshot(): LayerState {
    if (typeof document === 'undefined') {
      // During SSR, return empty snapshot
      return { layers: [], activeLayerId: null };
    }

    const layers = getLayers();
    return {
      layers: layers.map((layer) => ({
        ...layer,
        // Create new canvas with layer content for state snapshot
        // Preserve physical dimensions for DPR
        canvas: (() => {
          const snapshot = document.createElement('canvas');
          // Preserve physical dimensions
          snapshot.width = layer.canvas.width;
          snapshot.height = layer.canvas.height;
          snapshot.style.width = layer.canvas.style.width || '';
          snapshot.style.height = layer.canvas.style.height || '';
          const ctx = snapshot.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            // Scale context to match original
            const devicePixelRatio = CanvasUtils.getDevicePixelRatio();
            if (devicePixelRatio > 1) {
              ctx.scale(devicePixelRatio, devicePixelRatio);
            }
            // Draw the layer (both contexts are scaled, so this works)
            ctx.drawImage(layer.canvas, 0, 0);
          }
          return snapshot;
        })(),
      })),
      activeLayerId: getActiveLayerId(),
    };
  }

  /**
   * Internal helper: Restore layers from state
   * Accounts for device pixel ratio when restoring canvases
   */
  function restoreLayersFromState(state: LayerState): void {
    if (typeof document === 'undefined') {
      // During SSR, skip restoration
      return;
    }

    const devicePixelRatio = CanvasUtils.getDevicePixelRatio();
    const width = CanvasUtils.getWidth();
    const height = CanvasUtils.getHeight();
    const physicalWidth = width * devicePixelRatio;
    const physicalHeight = height * devicePixelRatio;

    const layers = state.layers.map((layer) => ({
      ...layer,
      // Ensure canvas is properly initialized with DPR
      canvas: (() => {
        const canvas = document.createElement('canvas');
        // Check if snapshot has DPR dimensions or logical dimensions
        const snapshotIsLogical = layer.canvas.width === width && layer.canvas.height === height;

        if (snapshotIsLogical && devicePixelRatio > 1) {
          // Snapshot without DPR - restore with DPR
          canvas.width = physicalWidth;
          canvas.height = physicalHeight;
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.scale(devicePixelRatio, devicePixelRatio);
            ctx.drawImage(layer.canvas, 0, 0);
          }
        } else {
          // Snapshot with DPR or current DPR matches
          // Preserve snapshot dimensions
          canvas.width = layer.canvas.width;
          canvas.height = layer.canvas.height;
          canvas.style.width = layer.canvas.style.width || `${width}px`;
          canvas.style.height = layer.canvas.style.height || `${height}px`;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            // Scale context if needed
            if (devicePixelRatio > 1 && canvas.width === physicalWidth) {
              ctx.scale(devicePixelRatio, devicePixelRatio);
            }
            ctx.drawImage(layer.canvas, 0, 0);
          }
        }
        return canvas;
      })(),
    }));
    StateManager.setLayers(layers);
    StateManager.setActiveLayerId(state.activeLayerId);
  }

  /**
   * Internal helper: Restore layers from AppState (for initialization)
   * Creates layers from state.layers array
   */
  function restoreLayersFromAppState(layers: Layer[], activeLayerId: string | null): void {
    // Clear existing layers
    const currentLayers = getLayers();
    currentLayers.forEach((layer) => {
      deleteLayer(layer.id);
    });

    // Create layers from state
    layers.forEach((layer) => {
      const newLayer = createLayer(layer.name, undefined, layer.backgroundColor);
      // Update layer properties
      updateLayer(newLayer.id, {
        visible: layer.visible,
        locked: layer.locked,
        opacity: layer.opacity,
        blendMode: layer.blendMode,
        backgroundColor: layer.backgroundColor,
      });
      // Copy canvas content
      const ctx = getCachedContext(newLayer.canvas);
      if (ctx && layer.canvas) {
        ctx.clearRect(0, 0, newLayer.canvas.width, newLayer.canvas.height);
        ctx.drawImage(layer.canvas, 0, 0);
      }
    });

    // Set active layer
    if (activeLayerId) {
      setActiveLayer(activeLayerId);
    }
  }

  /**
   * Render all visible layers to the main canvas
   * Uses requestAnimationFrame for smooth 60fps rendering
   */
  function renderLayers(): void {
    if (!mainCtx || !mainCanvas) return;

    // Schedule render with requestAnimationFrame for optimal performance
    // This batches multiple render calls and ensures smooth 60fps
    if (!renderScheduled) {
      renderScheduled = true;
      requestAnimationFrame(async () => {
        renderScheduled = false;
        await doRenderLayers();

        // Emit event after rendering completes
        EventEmitter.emit('layers:render', {
          layers: getAllLayers(),
          activeLayerId: getActiveLayerId(),
        });
      });
    }
  }

  /**
   * Render all visible layers to the main canvas synchronously
   * Use this for critical operations that require immediate updates
   * (e.g., before saving history, after drawing operations)
   * This bypasses requestAnimationFrame for immediate rendering
   */
  async function renderLayersSync(): Promise<void> {
    if (!mainCtx || !mainCanvas) return;

    // Clear any pending async render
    renderScheduled = false;

    // Perform render immediately
    await doRenderLayers();

    // Emit event after rendering completes
    EventEmitter.emit('layers:render', {
      layers: getAllLayers(),
      activeLayerId: getActiveLayerId(),
    });
  }

  /**
   * Calculate viewport bounds considering zoom and pan
   * Returns viewport in canvas coordinates
   */
  function getViewportBounds(): { x: number; y: number; width: number; height: number } {
    const width = CanvasUtils.getWidth();
    const height = CanvasUtils.getHeight();

    // For now, viewport is the full canvas (no pan implemented yet)
    // When pan is added, calculate based on scroll position and zoom
    // Viewport in canvas coordinates (not screen coordinates)
    // Zoom is available via StateManager.getState().zoom if needed for future pan calculations
    return {
      x: 0,
      y: 0,
      width: width,
      height: height,
    };
  }

  /**
   * OPTIMIZATION (Item 6): Check if a layer intersects the viewport using tracked bounds
   * Skips rendering layers with empty bounds or layers outside viewport
   *
   * IMPORTANT: Layers with backgroundColor should ALWAYS be rendered, even if trackedBounds is null.
   * The null value means "no drawn content yet" but backgrounds are part of the layer itself.
   *
   * CRITICAL FIX: Don't skip layers just because bounds are null - check if layer has actual content.
   * Bounds tracking may not be initialized for all layers (e.g., image layers loaded before bounds tracking).
   */
  function layerIntersectsViewport(
    layer: Layer,
    viewport: { x: number; y: number; width: number; height: number }
  ): boolean {
    // CRITICAL FIX: Layers with background colors should always be considered as intersecting
    // Background colors are part of the layer itself, not "drawn content"
    if (layer.backgroundColor) {
      return true;
    }

    // const width = CanvasUtils.getWidth();
    // const height = CanvasUtils.getHeight();

    // Get tracked bounds for this layer
    const trackedBounds = layerBounds.get(layer.id);

    // CRITICAL FIX: If bounds are undefined (not tracked yet), assume layer has content
    // This handles cases where images are loaded before bounds are updated, or bounds tracking
    // hasn't been initialized. We should render the layer and let the actual content determine visibility.
    if (trackedBounds === undefined) {
      // Bounds not tracked yet - assume layer might have content, render it
      // This is safe because empty layers won't affect the final composite
      return true;
    }

    // If bounds are explicitly null, layer was marked as empty (cleared)
    if (trackedBounds === null) {
      return false;
    }

    // Use tracked bounds to check intersection
    const layerBoundsRect = trackedBounds;

    // Check intersection
    return !(
      layerBoundsRect.x + layerBoundsRect.width < viewport.x ||
      layerBoundsRect.x > viewport.x + viewport.width ||
      layerBoundsRect.y + layerBoundsRect.height < viewport.y ||
      layerBoundsRect.y > viewport.y + viewport.height
    );
  }

  /**
   * OPTIMIZATION (Item 6): Update layer bounds after drawing operation
   * Called by drawing tools to track non-transparent content bounds
   */
  function updateLayerBounds(
    layerId: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const currentBounds = layerBounds.get(layerId);
    if (!currentBounds) {
      // First content on layer - set initial bounds
      layerBounds.set(layerId, { x, y, width, height });
    } else {
      // Expand bounds to include new content
      const minX = Math.min(currentBounds.x, x);
      const minY = Math.min(currentBounds.y, y);
      const maxX = Math.max(currentBounds.x + currentBounds.width, x + width);
      const maxY = Math.max(currentBounds.y + currentBounds.height, y + height);
      layerBounds.set(layerId, {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      });
    }
  }

  /**
   * OPTIMIZATION (Item 6): Clear layer bounds (when layer is cleared)
   */
  function clearLayerBounds(layerId: string): void {
    layerBounds.set(layerId, null);
  }

  /**
   * Filter layers that intersect the viewport
   * Returns layers that should be rendered
   */
  function getLayersInViewport(
    visibleLayers: Layer[],
    viewport: { x: number; y: number; width: number; height: number }
  ): Layer[] {
    return visibleLayers.filter((layer) => layerIntersectsViewport(layer, viewport));
  }

  /**
   * Transfer composited content from OffscreenCanvas to main canvas
   * @throws Error if contexts are invalid or transfer fails
   */
  function transferToMainCanvas(
    offscreenCanvas: OffscreenCanvas,
    offscreenCtx: OffscreenRenderingContext,
    mainCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    hasDirtyRegions: boolean,
    dirtyRegions: Array<{ x: number; y: number; width: number; height: number }>
  ): void {
    if (!isValid2DContext(mainCtx)) {
      throw new Error('Invalid main canvas context for transfer');
    }
    if (!isValidOffscreenContext(offscreenCtx)) {
      throw new Error('Invalid offscreen context for transfer');
    }
    try {
      if (hasDirtyRegions) {
        // Only transfer dirty regions
        logger.log('[Layers] doRenderLayers: Transferring dirty regions', {
          regionCount: dirtyRegions.length,
        });
        for (const region of dirtyRegions) {
          const x = Math.max(0, Math.min(region.x, width));
          const y = Math.max(0, Math.min(region.y, height));
          const w = Math.min(region.width, width - x);
          const h = Math.min(region.height, height - y);

          // Extract region from offscreen canvas
          // Note: Type assertion needed because OffscreenRenderingContext type doesn't include getImageData
          // in TypeScript definitions, but it's available at runtime for 2d contexts
          const offscreen2D = offscreenCtx as unknown as CanvasRenderingContext2D;
          const regionImageData = offscreen2D.getImageData(x, y, w, h);
          mainCtx.putImageData(regionImageData, x, y);
        }
      } else {
        // Full transfer - try ImageBitmap first, fallback to getImageData if it fails
        logger.debug('[Layers] doRenderLayers: Transferring full canvas from OffscreenCanvas');
        try {
          const imageBitmap = offscreenCanvas.transferToImageBitmap();
          mainCtx.drawImage(imageBitmap, 0, 0);
          imageBitmap.close();
          logger.debug('[Layers] doRenderLayers: ImageBitmap transfer successful');
        } catch (imageBitmapError) {
          // Fallback: use getImageData/putImageData if ImageBitmap fails
          logger.debug(
            '[Layers] doRenderLayers: ImageBitmap transfer failed, using fallback',
            imageBitmapError
          );
          // Note: Type assertion needed because OffscreenRenderingContext type doesn't include getImageData
          // in TypeScript definitions, but it's available at runtime for 2d contexts
          const offscreen2D = offscreenCtx as unknown as CanvasRenderingContext2D;
          const fullImageData = offscreen2D.getImageData(0, 0, width, height);
          mainCtx.putImageData(fullImageData, 0, 0);
          logger.debug('[Layers] doRenderLayers: Fallback transfer successful');
        }
      }
    } catch (transferError) {
      logger.error('[Layers] doRenderLayers: Transfer failed', transferError);
      throw transferError;
    }
  }

  /**
   * Fallback rendering: draw directly to main canvas when transfer fails
   * @throws Error if context is invalid
   */
  function fallbackRenderToMain(
    mainCtx: CanvasRenderingContext2D,
    visibleLayers: Layer[],
    width: number,
    height: number
  ): void {
    if (!isValid2DContext(mainCtx)) {
      throw new Error('Invalid main canvas context for fallback render');
    }
    logger.warn('[Layers] doRenderLayers: Using fallback direct rendering to mainCtx');
    mainCtx.clearRect(0, 0, width, height);
    for (const layer of visibleLayers) {
      if (layer.backgroundColor) {
        mainCtx.fillStyle = layer.backgroundColor;
        mainCtx.fillRect(0, 0, width, height);
      }
      mainCtx.save();
      mainCtx.globalAlpha = layer.opacity;
      mainCtx.globalCompositeOperation =
        layer.blendMode === 'normal'
          ? 'source-over'
          : (layer.blendMode as GlobalCompositeOperation);
      mainCtx.drawImage(layer.canvas, 0, 0);
      mainCtx.restore();
    }
  }

  /**
   * Internal function that performs the actual layer rendering
   * Uses OffscreenCanvas when available for better performance
   * Uses Web Workers for custom blend modes when available
   * Implements viewport culling to skip off-screen layers
   */
  async function doRenderLayers(): Promise<void> {
    if (!mainCtx || !mainCanvas) {
      logger.warn('[Layers] doRenderLayers: mainCtx or mainCanvas is null');
      return;
    }

    const width = CanvasUtils.getWidth();
    const height = CanvasUtils.getHeight();

    // Use OffscreenCanvas for compositing (required, already validated at module load)
    const useOffscreen = offscreenCanvas !== null && offscreenCtx !== null;
    // Use main context if offscreen not available, otherwise use offscreen
    // Both share the same 2D rendering interface
    // Note: Type assertion needed because OffscreenRenderingContext type doesn't include all 2D methods
    // in TypeScript definitions, but they're available at runtime for 2d contexts
    const targetCtx = useOffscreen
      ? (offscreenCtx as unknown as CanvasRenderingContext2D)
      : mainCtx;

    if (!targetCtx) {
      logger.warn('[Layers] doRenderLayers: targetCtx is null', { useOffscreen });
      return;
    }

    logger.debug('[Layers] doRenderLayers: Starting render', {
      useOffscreen,
      width,
      height,
      hasMainCtx: !!mainCtx,
      hasOffscreenCanvas: !!offscreenCanvas,
    });

    // Get dirty regions for optimized rendering
    const dirtyRegions = Canvas.getDirtyRegions();
    const hasDirtyRegions = dirtyRegions.length > 0 && dirtyRegions.length < 50; // Use dirty rectangles if reasonable number

    // Clear target canvas (full clear for now, dirty regions will be used for drawing)
    targetCtx.clearRect(0, 0, width, height);

    // Calculate viewport bounds for culling
    const viewport = getViewportBounds();

    // Create composite canvas for custom blend modes
    let compositeCanvas: HTMLCanvasElement | null = null;
    let compositeCtx: CanvasRenderingContext2D | null = null;
    let needsCustomBlending = false;

    const layers = getLayers();
    // Filter visible layers early for better performance
    const visibleLayers = layers.filter((layer) => layer.visible);

    logger.debug('[Layers] doRenderLayers: Layer info', {
      totalLayers: layers.length,
      visibleLayers: visibleLayers.length,
      layerNames: visibleLayers.map((l) => l.name),
    });

    // Early exit if no visible layers
    if (visibleLayers.length === 0) {
      logger.log('[Layers] doRenderLayers: No visible layers, clearing canvas');
      targetCtx.clearRect(0, 0, width, height);
      // Transfer clear to main canvas if using offscreen
      if (useOffscreen && mainCtx) {
        mainCtx.clearRect(0, 0, width, height);
      }
      Canvas.clearDirtyRegions();
      return;
    }

    // Viewport culling: filter layers that intersect viewport
    // CRITICAL FIX: Use all visible layers for rendering, not just those in viewport
    // Viewport culling is an optimization, but we should render all visible layers
    // to ensure nothing is missed (especially important for image layers)
    const layersInViewport = getLayersInViewport(visibleLayers, viewport);

    // CRITICAL FIX: If viewport culling filtered out all layers but we have visible layers,
    // render all visible layers anyway. This handles edge cases where bounds tracking
    // hasn't been initialized correctly.
    const layersToRender = layersInViewport.length > 0 ? layersInViewport : visibleLayers;

    // Check if any visible layer needs custom blending
    for (const layer of layersToRender) {
      if (!isNativeBlendMode(layer.blendMode as BlendMode)) {
        needsCustomBlending = true;
        break;
      }
    }

    if (needsCustomBlending) {
      if (typeof document === 'undefined') {
        // During SSR, skip custom blending
        needsCustomBlending = false;
      } else {
        // Reuse composite canvas instead of creating new one (Item 8 optimization)
        if (reusableCompositeCanvas && reusableCompositeCtx) {
          compositeCanvas = reusableCompositeCanvas;
          compositeCtx = reusableCompositeCtx;
          // Clear and reset if dimensions changed
          const devicePixelRatio = CanvasUtils.getDevicePixelRatio();
          const physicalWidth = width * devicePixelRatio;
          const physicalHeight = height * devicePixelRatio;
          if (
            compositeCanvas.width !== physicalWidth ||
            compositeCanvas.height !== physicalHeight
          ) {
            compositeCanvas.width = physicalWidth;
            compositeCanvas.height = physicalHeight;
            compositeCanvas.style.width = `${width}px`;
            compositeCanvas.style.height = `${height}px`;
            compositeCtx = compositeCanvas.getContext('2d', { willReadFrequently: true });
            if (compositeCtx && devicePixelRatio > 1) {
              compositeCtx.scale(devicePixelRatio, devicePixelRatio);
            }
            reusableCompositeCtx = compositeCtx;
          } else {
            // Just clear the canvas for reuse
            compositeCtx.clearRect(0, 0, width, height);
          }
        } else {
          // Fallback: create new canvas if reusable one not available
          const devicePixelRatio = CanvasUtils.getDevicePixelRatio();
          const physicalWidth = width * devicePixelRatio;
          const physicalHeight = height * devicePixelRatio;
          compositeCanvas = document.createElement('canvas');
          compositeCanvas.width = physicalWidth;
          compositeCanvas.height = physicalHeight;
          compositeCanvas.style.width = `${width}px`;
          compositeCanvas.style.height = `${height}px`;
          compositeCtx = compositeCanvas.getContext('2d', { willReadFrequently: true });
          if (!compositeCtx) {
            needsCustomBlending = false;
          } else {
            // Scale context to match device pixel ratio
            if (devicePixelRatio > 1) {
              compositeCtx.scale(devicePixelRatio, devicePixelRatio);
            }
          }
        }
      }
    }

    let baseImageData: ImageData | null = null;

    // Draw all visible layers from bottom to top
    // CRITICAL FIX: Render all layers in layersToRender (which may be all visible layers
    // if viewport culling filtered everything out)
    for (const layer of layersToRender) {
      const blendMode = layer.blendMode as BlendMode;

      // Draw layer background color first if set
      if (layer.backgroundColor) {
        const drawTargetCtx = needsCustomBlending && compositeCtx ? compositeCtx : targetCtx;
        if (drawTargetCtx) {
          drawTargetCtx.save();
          drawTargetCtx.fillStyle = layer.backgroundColor;
          if (hasDirtyRegions) {
            // Only fill dirty regions
            for (const region of dirtyRegions) {
              const x = Math.max(0, Math.min(region.x, width));
              const y = Math.max(0, Math.min(region.y, height));
              const w = Math.min(region.width, width - x);
              const h = Math.min(region.height, height - y);
              drawTargetCtx.fillRect(x, y, w, h);
            }
          } else {
            // Full canvas fill
            drawTargetCtx.fillRect(0, 0, width, height);
          }
          drawTargetCtx.restore();
        }
      }

      if (needsCustomBlending && compositeCtx && !isNativeBlendMode(blendMode)) {
        // Use custom blend mode
        // OPTIMIZATION: Only call getImageData for layers that need custom blending (Item 1)
        // Note: Custom blend modes require full canvas data, but we only process layers that need it
        if (!baseImageData) {
          // First layer - just copy it
          baseImageData = compositeCtx.createImageData(width, height);
          const layerCtx = getCachedContext(layer.canvas);
          if (layerCtx) {
            // Layer context is scaled by DPR, so use logical dimensions
            // getImageData works with the scaled coordinate system
            const layerData = layerCtx.getImageData(0, 0, width, height);
            baseImageData.data.set(layerData.data);
          }
        } else {
          // Blend with previous layers
          const layerCtx = getCachedContext(layer.canvas);
          if (layerCtx) {
            // Layer context is scaled by DPR, so use logical dimensions
            const overlayData = layerCtx.getImageData(0, 0, width, height);

            // Use worker - require it to be available, no fallbacks
            if (!WorkerManager.isAvailable()) {
              throw new Error(
                'Blend worker is required but not available. Ensure initBlendWorker() was called successfully.'
              );
            }
            baseImageData = await WorkerManager.applyBlendModeAsync(
              baseImageData,
              overlayData,
              blendMode,
              layer.opacity
            );
          }
        }
      } else {
        // Use native blend mode
        if (needsCustomBlending && compositeCtx && baseImageData) {
          // Draw accumulated result so far
          compositeCtx.putImageData(baseImageData, 0, 0);
          baseImageData = null;
        }

        const drawTargetCtx = needsCustomBlending && compositeCtx ? compositeCtx : targetCtx;
        if (drawTargetCtx) {
          drawTargetCtx.save();
          drawTargetCtx.globalAlpha = layer.opacity;
          // Map 'normal' blend mode to 'source-over' for canvas composite operations
          // 'normal' is not a valid GlobalCompositeOperation value
          const compositeOp =
            blendMode === 'normal' ? 'source-over' : (blendMode as GlobalCompositeOperation);
          drawTargetCtx.globalCompositeOperation = compositeOp;

          if (hasDirtyRegions) {
            // Only draw dirty regions
            for (const region of dirtyRegions) {
              const x = Math.max(0, Math.min(region.x, width));
              const y = Math.max(0, Math.min(region.y, height));
              const w = Math.min(region.width, width - x);
              const h = Math.min(region.height, height - y);

              // Use clip to only draw the dirty region
              drawTargetCtx.beginPath();
              drawTargetCtx.rect(x, y, w, h);
              drawTargetCtx.clip();
              drawTargetCtx.drawImage(layer.canvas, 0, 0);
              drawTargetCtx.restore();
              drawTargetCtx.save(); // Restore save state for next iteration
              drawTargetCtx.globalAlpha = layer.opacity;
              // Map 'normal' blend mode to 'source-over' for canvas composite operations
              const compositeOp =
                blendMode === 'normal' ? 'source-over' : (blendMode as GlobalCompositeOperation);
              drawTargetCtx.globalCompositeOperation = compositeOp;
            }
          } else {
            // Full canvas draw
            // Layer canvas and target context are both scaled by DPR, so use logical dimensions
            // drawImage automatically handles the scaling since both canvases have same DPR
            drawTargetCtx.drawImage(layer.canvas, 0, 0);
          }

          drawTargetCtx.restore();
        }
      }
    }

    // Draw final composite if using custom blending
    if (needsCustomBlending && compositeCtx && baseImageData && compositeCanvas) {
      compositeCtx.putImageData(baseImageData, 0, 0);
      targetCtx.drawImage(compositeCanvas, 0, 0);
      // Note: compositeCanvas is a local variable and will be garbage collected
      // No explicit cleanup needed as it's scoped to this function
    }

    // Transfer from OffscreenCanvas to main canvas if using offscreen
    if (useOffscreen && offscreenCanvas && mainCtx && offscreenCtx) {
      try {
        transferToMainCanvas(
          offscreenCanvas,
          offscreenCtx,
          mainCtx,
          width,
          height,
          hasDirtyRegions,
          dirtyRegions
        );
      } catch (transferError) {
        logger.error(
          '[Layers] doRenderLayers: Transfer failed, using fallback render',
          transferError
        );
        // Last resort: draw directly to mainCtx by re-rendering
        // This is inefficient but ensures the canvas displays
        fallbackRenderToMain(mainCtx, visibleLayers, width, height);
      }
    } else if (!useOffscreen) {
      // Direct rendering path - targetCtx is already mainCtx
      logger.debug('[Layers] doRenderLayers: Using direct rendering (no OffscreenCanvas)');
      // Content should already be drawn to mainCtx via targetCtx
      // Verify by checking if canvas has content
      const testImageData = mainCtx.getImageData(0, 0, Math.min(10, width), Math.min(10, height));
      let hasContent = false;
      for (let i = 3; i < testImageData.data.length; i += 4) {
        if (testImageData.data[i] > 0) {
          hasContent = true;
          break;
        }
      }
      logger.debug('[Layers] doRenderLayers: Direct rendering complete', { hasContent });
    }

    // Clear dirty regions after rendering
    Canvas.clearDirtyRegions();

    // Final verification: check if main canvas has content
    if (mainCtx) {
      try {
        const verifyImageData = mainCtx.getImageData(
          0,
          0,
          Math.min(10, width),
          Math.min(10, height)
        );
        let hasContent = false;
        let whitePixelCount = 0;
        for (let i = 0; i < verifyImageData.data.length; i += 4) {
          const alpha = verifyImageData.data[i + 3];
          if (alpha > 0) {
            hasContent = true;
            // Check if it's white (background color)
            const r = verifyImageData.data[i];
            const g = verifyImageData.data[i + 1];
            const b = verifyImageData.data[i + 2];
            if (r === 255 && g === 255 && b === 255) {
              whitePixelCount++;
            }
            break;
          }
        }
        logger.debug('[Layers] doRenderLayers: Render complete', {
          hasContent,
          whitePixels: whitePixelCount,
          useOffscreen,
          visibleLayerCount: visibleLayers.length,
          layersInViewport: layersInViewport.length,
          layersRendered: layersToRender.length,
        });

        // Warn if no content was rendered but we expected some
        if (!hasContent && visibleLayers.length > 0) {
          logger.warn(
            '[Layers] doRenderLayers: WARNING - No content rendered despite visible layers',
            {
              visibleLayers: visibleLayers.map((l) => ({
                name: l.name,
                hasBackground: !!l.backgroundColor,
              })),
              layersInViewport: layersInViewport.map((l) => ({
                name: l.name,
                hasBackground: !!l.backgroundColor,
              })),
              layersRendered: layersToRender.map((l) => ({
                name: l.name,
                hasBackground: !!l.backgroundColor,
              })),
            }
          );
        }
      } catch (verifyError) {
        logger.error('[Layers] doRenderLayers: Failed to verify render', verifyError);
      }
    }
  }

  /**
   * Extract selection to a new layer
   * Enforces maximum layer limit (MAX_LAYERS)
   */
  function extractSelectionToLayer(
    selection: Uint8Array,
    _selectionBounds: { x: number; y: number; width: number; height: number }
  ): Layer | null {
    const activeLayerId = getActiveLayerId();
    if (!activeLayerId) return null;
    const activeLayer = getLayer(activeLayerId);
    if (!activeLayer) return null;

    // Check layer limit before extracting (production requirement)
    // Note: createLayer() will also check, but we check here for better error handling
    const currentLayers = getLayers();
    if (currentLayers.length >= MAX_LAYERS) {
      const errorMessage = `Maximum layer limit reached (${MAX_LAYERS} layers). Please delete a layer before extracting selection.`;
      EventEmitter.emit('layers:error', {
        message: errorMessage,
        type: 'limit_reached',
        currentCount: currentLayers.length,
        maxCount: MAX_LAYERS,
      });
      logger.warn(errorMessage);
      return null; // Return null instead of throwing for graceful handling
    }

    const width = CanvasUtils.getWidth();
    const height = CanvasUtils.getHeight();

    // OPTIMIZATION (Item 10): Use cached context instead of creating new one
    const layerCtx = getCachedContext(activeLayer.canvas);
    if (!layerCtx) return null;

    const imageData = layerCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Create new layer with extracted selection (handles DPR via createLayer)
    const newLayer = createLayer('Selection', undefined);
    const newLayerCtx = getCachedContext(newLayer.canvas);
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

    // Update bounds for the new layer with extracted selection
    // Use selection bounds if available, otherwise use full canvas
    updateLayerBounds(newLayer.id, 0, 0, width, height);

    // Remove selected pixels from original layer
    for (let i = 0; i < selection.length; i++) {
      if (selection[i]) {
        const idx = i * 4;
        data[idx + 3] = 0; // Set alpha to 0 (transparent)
      }
    }

    layerCtx.putImageData(imageData, 0, 0);

    // New layer already created above via createLayer
    StateManager.setActiveLayerId(newLayer.id);

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

    // Validate and clamp opacity to valid range (0-1)
    if (updates.opacity !== undefined) {
      updates.opacity = Math.max(0, Math.min(1, updates.opacity));
    }

    // Update layer in StateManager
    const layers = getLayers();
    const layerIndex = layers.findIndex((l) => l.id === id);
    if (layerIndex === -1) return false;

    const updatedLayer = { ...layer, ...updates };
    const newLayers = [...layers];
    newLayers[layerIndex] = updatedLayer;
    StateManager.setLayers(newLayers);

    renderLayers();

    // Emit event for layer update
    EventEmitter.emit('layers:update', {
      layerId: id,
      layer,
      updates,
      layers: getAllLayers(),
    });

    return true;
  }

  /**
   * Duplicate a layer
   * Accounts for device pixel ratio for high-DPI displays
   * Enforces maximum layer limit (MAX_LAYERS)
   */
  function duplicateLayer(id: string): Layer | null {
    const layer = getLayer(id);
    if (!layer) return null;

    // Check layer limit before duplicating (production requirement)
    const currentLayers = getLayers();
    if (currentLayers.length >= MAX_LAYERS) {
      const errorMessage = `Maximum layer limit reached (${MAX_LAYERS} layers). Please delete a layer before duplicating.`;
      EventEmitter.emit('layers:error', {
        message: errorMessage,
        type: 'limit_reached',
        currentCount: currentLayers.length,
        maxCount: MAX_LAYERS,
      });
      logger.warn(errorMessage);
      return null; // Return null instead of throwing for graceful handling
    }

    if (typeof document === 'undefined') {
      // During SSR, cannot create canvas
      return null;
    }

    const width = CanvasUtils.getWidth();
    const height = CanvasUtils.getHeight();
    const devicePixelRatio = CanvasUtils.getDevicePixelRatio();
    const physicalWidth = width * devicePixelRatio;
    const physicalHeight = height * devicePixelRatio;

    const newLayerCanvas = document.createElement('canvas');
    newLayerCanvas.width = physicalWidth;
    newLayerCanvas.height = physicalHeight;
    newLayerCanvas.style.width = `${width}px`;
    newLayerCanvas.style.height = `${height}px`;
    const newLayerCtx = newLayerCanvas.getContext('2d', { willReadFrequently: true });
    if (!newLayerCtx) return null;

    // Scale context to match device pixel ratio
    if (devicePixelRatio > 1) {
      newLayerCtx.scale(devicePixelRatio, devicePixelRatio);
    }

    // Draw the layer (both contexts are scaled, so this works correctly)
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

    // Add duplicate to layers in StateManager (insert after original)
    const layers = getLayers();
    const index = layers.findIndex((l) => l.id === id);
    const newLayers = [...layers];
    newLayers.splice(index + 1, 0, newLayer);
    StateManager.setLayers(newLayers);

    renderLayers();
    return newLayer;
  }

  /**
   * Reorder layers
   */
  function reorderLayer(fromIndex: number, toIndex: number): boolean {
    const layers = getLayers();
    if (fromIndex < 0 || fromIndex >= layers.length) return false;
    if (toIndex < 0 || toIndex >= layers.length) return false;

    const newLayers = [...layers];
    const [layer] = newLayers.splice(fromIndex, 1);
    if (!layer) return false;

    newLayers.splice(toIndex, 0, layer);
    StateManager.setLayers(newLayers);
    renderLayers();
    return true;
  }

  /**
   * Get image data from a layer by ID
   * Returns image data using logical dimensions (accounts for DPR scaling)
   */
  function getImageData(id: string): ImageData | null {
    const layer = getLayer(id);
    if (!layer) return null;

    const ctx = getCachedContext(layer.canvas);
    if (!ctx) return null;

    // Use logical dimensions since context is scaled by DPR
    const width = CanvasUtils.getWidth();
    const height = CanvasUtils.getHeight();
    return ctx.getImageData(0, 0, width, height);
  }

  /**
   * Put image data to a layer by ID
   */
  function putImageData(id: string, imageData: ImageData): boolean {
    const layer = getLayer(id);
    if (!layer) return false;

    const ctx = getCachedContext(layer.canvas);
    if (!ctx) return false;

    ctx.putImageData(imageData, 0, 0);

    // Update layer bounds to track the image data content
    // This ensures the layer is not incorrectly marked as empty
    updateLayerBounds(id, 0, 0, imageData.width, imageData.height);

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

    const ctx = getCachedContext(layer.canvas);
    if (!ctx) return false;

    // Use logical dimensions since context is scaled by DPR
    const width = CanvasUtils.getWidth();
    const height = CanvasUtils.getHeight();
    ctx.clearRect(0, 0, width, height);

    // OPTIMIZATION (Item 6): Clear layer bounds when layer is cleared
    clearLayerBounds(id);

    // Use renderSync for immediate updates when clearing
    renderLayersSync();
    return true;
  }

  /**
   * Clear all unlocked layers
   * Respects layer locking - skips locked layers (professional standard)
   */
  function clearAllLayers(): void {
    let clearedAny = false;
    // Use logical dimensions since contexts are scaled by DPR
    const width = CanvasUtils.getWidth();
    const height = CanvasUtils.getHeight();
    const layers = getLayers();

    for (const layer of layers) {
      // Skip locked layers (professional apps prevent clearing locked layers)
      if (layer.locked) continue;

      const ctx = getCachedContext(layer.canvas);
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        clearedAny = true;
      }
    }

    // Only re-render if we actually cleared something
    // Use renderSync for immediate updates when clearing
    if (clearedAny) {
      renderLayersSync();
    }
  }

  /**
   * Resize layers system to match new canvas dimensions
   * Updates OffscreenCanvas dimensions when canvas is resized
   */
  function resize(): void {
    resizeOffscreenCanvas();
    // Note: Individual layer resizing is handled by Canvas.resize()
    // This function handles layer system-level resize operations
  }

  /**
   * Get maximum number of layers allowed
   */
  function getMaxLayers(): number {
    return MAX_LAYERS;
  }

  // Public API
  return {
    // Short-form API
    init,
    isInitialized,
    create: createLayer,
    delete: deleteLayer,
    get: getLayer,
    getAll: getAllLayers,
    setActive: setActiveLayer,
    update: updateLayer,
    duplicate: duplicateLayer,
    reorder: reorderLayer,
    getImageData,
    putImageData,
    clear: clearLayer,
    clearAll: clearAllLayers,
    render: renderLayers,
    renderSync: renderLayersSync,
    extractSelection: extractSelectionToLayer,
    resize,
    getMaxLayers,
    // Long-form API (alternative naming for convenience)
    createLayer,
    deleteLayer,
    getLayer,
    getAllLayers,
    setActiveLayer,
    updateLayer,
    duplicateLayer,
    reorderLayer,
    clearLayer,
    clearAllLayers,
    renderLayers,
    renderLayersSync,
    extractSelectionToLayer,
    // Internal helpers for History module (not part of public API)
    _createLayerSnapshot: createLayerSnapshot,
    _restoreLayersFromState: restoreLayersFromState,
    _restoreLayersFromAppState: restoreLayersFromAppState,
    // Expose context cache helpers
    getCachedContext,
    invalidateContextCache,
    // Expose event emitter for components to subscribe
    on: EventEmitter.on.bind(EventEmitter),
    off: EventEmitter.off.bind(EventEmitter),
    // OPTIMIZATION (Item 6): Expose bounds update function for drawing tools
    updateLayerBounds,
  };
})();

export default Layers;
