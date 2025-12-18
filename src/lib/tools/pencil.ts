/**
 * Pencil Tool
 * Professional drawing tool with advanced brush features
 */

import type { AppState, Tool, DrawingToolState } from '../types';
import Canvas from '../canvas';
import History from '../history';
import PixelStudio from '../app';
import StateManager from '../stateManager';
import { hexToRgba } from '../colorUtils';
import { createStabilizer } from './stabilizer';
import { logger } from '../utils/logger';
import {
  getPressure,
  calculateBrushSize,
  calculateBrushOpacity,
  calculateBrushFlow,
  calculateSpacing,
  applyJitter,
  applyScatter,
  applyTextureBlending,
  generateBrushTexture,
  type BrushTexture,
} from './brushHelpers';
import { rafThrottle } from '../utils/debounce';

(function () {
  let toolState: DrawingToolState | null = null;

  // Throttled render for real-time feedback during drawing
  const throttledRender = rafThrottle(() => Canvas.triggerRender());

  const PencilTool: Tool = {
    name: 'pencil',

    init(state, elements) {
      const stabilizer = createStabilizer();
      const stabilizerStrength = state.stabilizerStrength ?? 30;
      stabilizer.setStrength(stabilizerStrength);

      toolState = {
        state,
        elements,
        isDrawing: false,
        lastX: 0,
        lastY: 0,
        brushCache: new Map<string, ImageData>(),
        stabilizer,
        distanceSinceLastStamp: 0,
        lastStampX: 0,
        lastStampY: 0,
        currentPressure: 0.5,
      };
    },

    onPointerDown(coords, e) {
      if (!toolState) return;

      // Get pressure
      toolState.currentPressure = getPressure(e);

      // Use precise coordinates for sub-pixel accuracy
      // Professional apps maintain sub-pixel precision for accurate brush placement
      const preciseCoords = Canvas.getCanvasCoordsPrecise?.(e) || coords;

      // Reset stabilizer on new stroke
      toolState.stabilizer.reset();
      const smoothed = toolState.stabilizer.processPoint(preciseCoords.x, preciseCoords.y);
      const x = smoothed.x;
      const y = smoothed.y;
      toolState.lastX = x;
      toolState.lastY = y;
      toolState.lastStampX = x;
      toolState.lastStampY = y;
      toolState.distanceSinceLastStamp = 0;
      toolState.isDrawing = true;
      drawDot(x, y, e);
    },

    onPointerMove(coords, e) {
      if (!toolState || !toolState.isDrawing) return;

      // Update pressure
      toolState.currentPressure = getPressure(e);

      // Use precise coordinates for sub-pixel accuracy
      const preciseCoords = Canvas.getCanvasCoordsPrecise?.(e) || coords;

      // Apply stabilizer smoothing
      const smoothed = toolState.stabilizer.processPoint(preciseCoords.x, preciseCoords.y);
      const lastX = toolState.lastX;
      const lastY = toolState.lastY;
      drawLineWithSpacing(lastX, lastY, smoothed.x, smoothed.y, e);
      toolState.lastX = smoothed.x;
      toolState.lastY = smoothed.y;
    },

    async onPointerUp(_e) {
      if (toolState && toolState.isDrawing) {
        toolState.isDrawing = false;
        toolState.stabilizer.reset();
        toolState.distanceSinceLastStamp = 0;
        await Canvas.triggerRender();
        await History.saveImmediate();
      }
    },
  };

  /**
   * Create brush mask with hardness support
   * Includes cache size limit to prevent memory issues
   */
  const MAX_BRUSH_CACHE_SIZE = 50; // Limit brush cache to prevent memory leaks

  // OPTIMIZATION (Item 5): Pre-rendered brush stamp cache (HTMLCanvasElement instead of ImageData)
  // This allows using drawImage() which is faster than putImageData() (MDN best practice)
  const brushStampCache = new Map<string, HTMLCanvasElement>();

  function createBrushMask(size: number, hardness: number): ImageData {
    if (!toolState) {
      throw new Error('Tool not initialized');
    }

    const cacheKey = `${size}-${hardness}`;
    const cached = toolState.brushCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Limit cache size - remove oldest entries if cache is too large
    if (toolState.brushCache.size >= MAX_BRUSH_CACHE_SIZE) {
      // Remove first entry (oldest)
      const firstKey = toolState.brushCache.keys().next().value;
      if (firstKey) {
        toolState.brushCache.delete(firstKey);
        // Also remove from stamp cache
        brushStampCache.delete(firstKey);
      }
    }

    let ctx: CanvasRenderingContext2D;
    try {
      ctx = Canvas.getContext();
    } catch (error) {
      logger.error('Failed to get canvas context for brush mask:', error);
      throw new Error('Canvas not initialized');
    }

    const radius = size / 2;
    const diameter = Math.ceil(size);
    const center = diameter / 2;
    const mask = ctx.createImageData(diameter, diameter);
    const data = mask.data;

    // Hardness controls the gradient: 0 = soft (full gradient), 100 = hard (sharp edge)
    const hardnessRatio = hardness / 100;
    const innerRadius = radius * hardnessRatio;

    for (let y = 0; y < diameter; y++) {
      for (let x = 0; x < diameter; x++) {
        const dx = x - center;
        const dy = y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * diameter + x) * 4;

        if (dist <= innerRadius) {
          // Fully opaque inside inner radius
          data[idx + 3] = 255;
        } else if (dist <= radius) {
          // Gradient between inner and outer radius
          const gradient = 1 - (dist - innerRadius) / (radius - innerRadius);
          data[idx + 3] = Math.round(255 * gradient * gradient); // Quadratic falloff for smoother edge
        } else {
          // Transparent outside radius
          data[idx + 3] = 0;
        }
      }
    }

    toolState.brushCache.set(cacheKey, mask);
    return mask;
  }

  /**
   * OPTIMIZATION (Item 5): Get or create pre-rendered brush stamp
   * Pre-renders brush mask to offscreen canvas for faster drawing (MDN best practice)
   */
  function getBrushStamp(size: number, hardness: number): HTMLCanvasElement | null {
    if (typeof document === 'undefined') {
      return null; // SSR
    }

    const cacheKey = `${size}-${hardness}`;
    const cached = brushStampCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Create mask if not cached
    const mask = createBrushMask(size, hardness);

    // Pre-render mask to offscreen canvas
    const stampCanvas = document.createElement('canvas');
    stampCanvas.width = mask.width;
    stampCanvas.height = mask.height;
    const stampCtx = stampCanvas.getContext('2d');
    if (!stampCtx) {
      return null;
    }

    // Put mask data to canvas
    stampCtx.putImageData(mask, 0, 0);

    // Cache the pre-rendered stamp
    brushStampCache.set(cacheKey, stampCanvas);

    // Limit cache size
    if (brushStampCache.size > MAX_BRUSH_CACHE_SIZE) {
      const firstKey = brushStampCache.keys().next().value;
      if (firstKey) {
        brushStampCache.delete(firstKey);
      }
    }

    return stampCanvas;
  }

  /**
   * Draw a single brush stamp with all advanced features (texture, scatter, etc.)
   */
  function drawSingleBrushStamp(
    x: number,
    y: number,
    size: number,
    opacity: number,
    hardness: number,
    state: AppState,
    ctx: CanvasRenderingContext2D
  ): void {
    // OPTIMIZATION (Item 4): Round to integers to avoid sub-pixel rendering
    const finalX = Math.floor(x);
    const finalY = Math.floor(y);

    // Get current color and alpha dynamically from StateManager
    // This ensures color changes are immediately reflected (like GIMP/Photoshop)
    // Professional tools always read the current color from active state, not cached values
    let currentState;
    try {
      currentState = StateManager.getState();
    } catch (error) {
      logger.error('Failed to get state in pencil tool:', error);
      return; // Gracefully handle invalid state
    }

    // Validate color format before using (professional tool standard)
    if (!/^#[0-9A-Fa-f]{6}$/.test(currentState.currentColor)) {
      logger.warn('Invalid color format in pencil tool, skipping draw');
      return;
    }

    // Calculate pressure internally for brush dynamics (reserved for future use)
    // const brushPressure = toolState?.currentPressure ?? 0.5;

    const color = hexToRgba(currentState.currentColor, currentState.currentAlpha * opacity);

    // For small brushes or 100% hardness, use simple circle for performance
    if (size <= 2 || hardness >= 100) {
      ctx.beginPath();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      // OPTIMIZATION (Item 4): Use integer coordinates for arc center (already rounded above)
      ctx.arc(finalX, finalY, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }

    // Apply texture if enabled
    let finalColor = color;
    if (state.brushTexture && state.brushTexture !== 'none') {
      const textureData = generateBrushTexture(state.brushTexture as BrushTexture, size);
      if (textureData) {
        // Sample texture at brush center for this stamp
        const textureX = Math.floor(
          ((finalX % textureData.width) + textureData.width) % textureData.width
        );
        const textureY = Math.floor(
          ((finalY % textureData.height) + textureData.height) % textureData.height
        );
        const textureIndex = (textureY * textureData.width + textureX) * 4;

        const textureR = textureData.data[textureIndex]!;
        const textureG = textureData.data[textureIndex + 1]!;
        const textureB = textureData.data[textureIndex + 2]!;

        // Parse brush color
        const brushRgba = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (brushRgba) {
          const brushR = parseInt(brushRgba[1]!, 10);
          const brushG = parseInt(brushRgba[2]!, 10);
          const brushB = parseInt(brushRgba[3]!, 10);

          const blended = applyTextureBlending(
            brushR,
            brushG,
            brushB,
            textureR,
            textureG,
            textureB,
            50
          ); // 50% texture strength
          finalColor = `rgba(${blended.r}, ${blended.g}, ${blended.b}, ${opacity})`;
        }
      }
    }

    // OPTIMIZATION (Item 5): Use pre-rendered brush stamp for better performance
    const brushStamp = getBrushStamp(size, hardness);
    if (!brushStamp) {
      // Fallback to old method if stamp creation fails
      const mask = createBrushMask(size, hardness);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = mask.width;
      tempCanvas.height = mask.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // Apply color to mask with opacity
      const maskData = new ImageData(mask.width, mask.height);
      const rgba = finalColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!rgba) return;

      const r = parseInt(rgba[1] || '0', 10);
      const g = parseInt(rgba[2] || '0', 10);
      const b = parseInt(rgba[3] || '0', 10);
      const a = parseFloat(rgba[4] || '1');

      for (let i = 0; i < mask.data.length; i += 4) {
        const maskAlpha = mask.data[i + 3]! / 255;
        const finalMaskAlpha = maskAlpha * a;
        maskData.data[i] = r;
        maskData.data[i + 1] = g;
        maskData.data[i + 2] = b;
        maskData.data[i + 3] = Math.round(255 * finalMaskAlpha);
      }

      tempCtx.putImageData(maskData, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      const drawX = Math.floor(finalX - size / 2);
      const drawY = Math.floor(finalY - size / 2);
      ctx.drawImage(tempCanvas, drawX, drawY);
      return;
    }

    // Use pre-rendered stamp with color and opacity applied via globalCompositeOperation
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = opacity;
    // OPTIMIZATION (Item 4): Round drawImage coordinates to integers
    const drawX = Math.floor(finalX - size / 2);
    const drawY = Math.floor(finalY - size / 2);

    // Create temporary canvas for colored stamp (since color changes per draw)
    // But we can still benefit from pre-rendered mask
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = brushStamp.width;
    tempCanvas.height = brushStamp.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Apply color to pre-rendered stamp
    tempCtx.fillStyle = finalColor;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.drawImage(brushStamp, 0, 0);

    // Draw colored stamp to main canvas
    ctx.globalAlpha = 1; // Reset alpha after drawing
    ctx.drawImage(tempCanvas, drawX, drawY);
  }

  function drawDot(x: number, y: number, _e: PointerEvent): void {
    if (!toolState) return;

    let ctx: CanvasRenderingContext2D;
    try {
      // Canvas.getContext() automatically returns the active layer context when layers are enabled
      // This ensures drawing goes to the correct layer (professional tool behavior)
      ctx = Canvas.getContext();
    } catch (error) {
      logger.error('Failed to get canvas context for drawing:', error);
      return; // Silently fail if canvas not ready
    }

    // Use cached state for brush properties (size, hardness, etc.) for performance
    // These properties are less likely to change during a stroke
    const state = toolState.state;

    // Calculate brush properties with pressure
    const dotPressure = toolState.currentPressure;
    const baseSize = state.brushSize;
    const size = calculateBrushSize(
      baseSize,
      dotPressure,
      state.pressureEnabled ?? false,
      state.pressureSize ?? false,
      state.pressureCurve ?? 'linear'
    );

    const baseOpacity = (state.brushOpacity ?? 100) / 100;
    const opacity = calculateBrushOpacity(
      baseOpacity,
      dotPressure,
      state.pressureEnabled ?? false,
      state.pressureOpacity ?? false,
      state.pressureCurve ?? 'linear'
    );

    const baseFlow = (state.brushFlow ?? 100) / 100;
    const flow = calculateBrushFlow(
      baseFlow,
      dotPressure,
      state.pressureEnabled ?? false,
      state.pressureFlow ?? false,
      state.pressureCurve ?? 'linear'
    );

    // Combine opacity and flow (flow affects build-up, opacity affects max transparency)
    const finalOpacity = opacity * flow;
    const hardness = state.brushHardness || 100;

    // Apply jitter first
    const jittered = applyJitter(x, y, state.brushJitter ?? 0, state.brushSize);

    // Apply scatter (Procreate-style brush scattering)
    const scatterPoints = applyScatter(
      jittered.x,
      jittered.y,
      state.brushScatter ?? 0,
      state.brushSize,
      state.brushScatter ? Math.max(1, Math.floor((state.brushScatter / 100) * 5)) : 1
    );

    // Draw multiple scattered points
    for (const scatterPoint of scatterPoints) {
      drawSingleBrushStamp(
        scatterPoint.x,
        scatterPoint.y,
        size,
        finalOpacity,
        hardness,
        state,
        ctx
      );
    }
  }

  function drawLineWithSpacing(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    _e: PointerEvent
  ): void {
    if (!toolState) return;

    const state = toolState.state;
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const linePressure = toolState.currentPressure;
    const baseSize = state.brushSize;
    const size = calculateBrushSize(
      baseSize,
      linePressure,
      state.pressureEnabled ?? false,
      state.pressureSize ?? false,
      state.pressureCurve ?? 'linear'
    );

    const baseOpacity = (state.brushOpacity ?? 100) / 100;
    const opacity = calculateBrushOpacity(
      baseOpacity,
      linePressure,
      state.pressureEnabled ?? false,
      state.pressureOpacity ?? false,
      state.pressureCurve ?? 'linear'
    );

    const baseFlow = (state.brushFlow ?? 100) / 100;
    const flow = calculateBrushFlow(
      baseFlow,
      linePressure,
      state.pressureEnabled ?? false,
      state.pressureFlow ?? false,
      state.pressureCurve ?? 'linear'
    );

    const finalOpacity = opacity * flow;
    const hardness = state.brushHardness || 100;
    const spacing = calculateSpacing(size, state.brushSpacing ?? 25);

    let ctx: CanvasRenderingContext2D;
    try {
      ctx = Canvas.getContext();
    } catch (error) {
      logger.error('Failed to get canvas context for line drawing:', error);
      return;
    }

    // Update distance since last stamp
    toolState.distanceSinceLastStamp += dist;

    // Draw stamps along the line based on spacing
    if (toolState.distanceSinceLastStamp >= spacing) {
      const steps = Math.ceil(toolState.distanceSinceLastStamp / spacing);
      const stepSize = dist / steps;

      for (let i = 1; i <= steps; i++) {
        const t = (stepSize * i) / dist;
        const x = Math.floor(x1 + (x2 - x1) * t);
        const y = Math.floor(y1 + (y2 - y1) * t);
        drawSingleBrushStamp(x, y, size, finalOpacity, hardness, state, ctx);
      }

      toolState.distanceSinceLastStamp = 0;
      toolState.lastStampX = x2;
      toolState.lastStampY = y2;

      // Trigger throttled render for real-time feedback
      throttledRender();
    } else {
      // If spacing is very small or disabled, draw continuously
      if (spacing <= 0.5) {
        const steps = Math.max(1, Math.ceil(dist / Math.max(1, size / 3)));
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = Math.floor(x1 + (x2 - x1) * t);
          const y = Math.floor(y1 + (y2 - y1) * t);
          drawSingleBrushStamp(x, y, size, finalOpacity, hardness, state, ctx);
        }

        // Trigger throttled render for real-time feedback
        throttledRender();
      }
    }
  }

  // Register the tool
  PixelStudio.registerTool('pencil', PencilTool);
})();
