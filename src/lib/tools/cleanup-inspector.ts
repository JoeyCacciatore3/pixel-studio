/**
 * Pixel-Perfect Inspector Tool
 * Visualization tool for manual cleanup
 */

import type { Tool, AppState, CanvasElements } from '../types';
import Canvas from '../canvas';
import PixelStudio from '../app';
import { findConnectedComponents } from '../cleanup/utils/connectedComponents';
import { sobelEdgeDetection } from '../cleanup/utils/contourTrace';
import { extractUniqueColors } from '../cleanup/utils/colorDistance';
import { logger } from '../utils/logger';

type HighlightMode = 'stray' | 'jaggies' | 'color-noise' | 'fuzzy-edges' | 'thickness' | 'none';

(function () {
  let toolState: { state: AppState; elements: CanvasElements } | null = null;
  let highlightMode: HighlightMode = 'none';
  let showGrid = false;
  let comparisonMode = false;
  let originalImageData: ImageData | null = null;
  let overlayCanvas: HTMLCanvasElement | null = null;
  let overlayCtx: CanvasRenderingContext2D | null = null;

  const InspectorTool: Tool = {
    name: 'cleanup-inspector',

    init(state, elements) {
      toolState = { state, elements };
      highlightMode = 'none';
      showGrid = false;
      comparisonMode = false;

      // Create overlay canvas for highlights
      if (typeof document !== 'undefined') {
        overlayCanvas = document.createElement('canvas');
        overlayCtx = overlayCanvas.getContext('2d');
        if (overlayCtx) {
          overlayCanvas.style.position = 'absolute';
          overlayCanvas.style.pointerEvents = 'none';
          overlayCanvas.style.zIndex = '10';
        }
      }
    },

    onPointerDown(_coords, _e) {
      // Toggle highlight mode on click
      cycleHighlightMode();
    },

    onPointerMove(_coords, _e) {
      // Update highlights on move
      updateHighlights();
    },

    async onPointerUp(_e) {
      // No-op
    },

    /**
     * Set highlight mode
     */
    setHighlightMode(mode: HighlightMode): void {
      highlightMode = mode;
      updateHighlights();
    },

    /**
     * Toggle grid overlay
     */
    toggleGrid(): void {
      showGrid = !showGrid;
      updateHighlights();
    },

    /**
     * Toggle comparison view
     */
    toggleComparison(): void {
      comparisonMode = !comparisonMode;
      if (comparisonMode && !originalImageData) {
        originalImageData = Canvas.getImageData();
      }
      updateHighlights();
    },
  };

  function cycleHighlightMode(): void {
    const modes: HighlightMode[] = [
      'none',
      'stray',
      'jaggies',
      'color-noise',
      'fuzzy-edges',
      'thickness',
    ];
    const currentIndex = modes.indexOf(highlightMode);
    highlightMode = modes[(currentIndex + 1) % modes.length]!;
    updateHighlights();
  }

  function updateHighlights(): void {
    if (!toolState || !overlayCanvas || !overlayCtx) return;

    try {
      const imageData = Canvas.getImageData();
      const { width, height } = imageData;

      overlayCanvas.width = width;
      overlayCanvas.height = height;
      overlayCtx.clearRect(0, 0, width, height);

      // Draw grid if enabled
      if (showGrid) {
        overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        overlayCtx.lineWidth = 0.5;

        for (let x = 0; x <= width; x++) {
          overlayCtx.beginPath();
          overlayCtx.moveTo(x, 0);
          overlayCtx.lineTo(x, height);
          overlayCtx.stroke();
        }

        for (let y = 0; y <= height; y++) {
          overlayCtx.beginPath();
          overlayCtx.moveTo(0, y);
          overlayCtx.lineTo(width, y);
          overlayCtx.stroke();
        }
      }

      // Draw highlights based on mode
      switch (highlightMode) {
        case 'stray':
          highlightStrayPixels(imageData);
          break;
        case 'jaggies':
          highlightJaggies(imageData);
          break;
        case 'color-noise':
          highlightColorNoise(imageData);
          break;
        case 'fuzzy-edges':
          highlightFuzzyEdges(imageData);
          break;
        case 'thickness':
          highlightThicknessVariation(imageData);
          break;
        case 'none':
          // No highlights
          break;
      }

      // Draw comparison if enabled
      if (comparisonMode && originalImageData) {
        // This would require a side-by-side view implementation
        // For now, just log that comparison is enabled
        logger.debug('Comparison mode enabled');
      }
    } catch (error) {
      logger.error('Failed to update highlights:', error);
    }
  }

  function highlightStrayPixels(imageData: ImageData): void {
    if (!overlayCtx) return;

    const isForeground = (_r: number, _g: number, _b: number, a: number): boolean => {
      return a >= 128;
    };

    const components = findConnectedComponents(imageData, isForeground, 8);

    overlayCtx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // Red highlight

    for (const component of components) {
      if (component.size < 3) {
        // Highlight small components
        for (const { x, y } of component.pixels) {
          overlayCtx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  function highlightJaggies(imageData: ImageData): void {
    if (!overlayCtx) return;

    const edgeMap = sobelEdgeDetection(imageData);
    const { width, height } = imageData;

    overlayCtx.fillStyle = 'rgba(255, 255, 0, 0.5)'; // Yellow highlight

    // Detect staircase patterns
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = y * width + x;
        const edge = edgeMap[index]!;

        if (edge < 10) continue;

        const left = edgeMap[index - 1]!;
        const right = edgeMap[index + 1]!;
        const up = edgeMap[index - width]!;
        const down = edgeMap[index + width]!;

        const horizontalStep = Math.abs(left - right) > 20 && (left > 10 || right > 10);
        const verticalStep = Math.abs(up - down) > 20 && (up > 10 || down > 10);

        if (horizontalStep || verticalStep) {
          overlayCtx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  function highlightColorNoise(imageData: ImageData): void {
    if (!overlayCtx) return;

    const uniqueColors = extractUniqueColors(imageData);
    const colorMap = new Map<string, number>();

    // Count occurrences of each color
    for (const color of uniqueColors) {
      const key = `${color.r},${color.g},${color.b}`;
      colorMap.set(key, (colorMap.get(key) || 0) + color.count);
    }

    // Find similar colors (potential noise)
    overlayCtx.fillStyle = 'rgba(0, 255, 0, 0.3)'; // Green highlight

    const { width: _width, height: _height, data } = imageData;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]!;
      if (a < 128) continue;

      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const key = `${r},${g},${b}`;
      const count = colorMap.get(key) || 0;

      // Highlight colors that appear very few times (likely noise)
      if (count < 10) {
        const x = (i / 4) % _width;
        const y = Math.floor(i / 4 / _width);
        overlayCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  function highlightFuzzyEdges(imageData: ImageData): void {
    if (!overlayCtx) return;

    const { width: _width, height: _height, data } = imageData;

    overlayCtx.fillStyle = 'rgba(0, 0, 255, 0.5)'; // Blue highlight

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]!;

      // Highlight semi-transparent pixels (fuzzy edges)
      if (a > 0 && a < 255) {
        const x = (i / 4) % _width;
        const y = Math.floor(i / 4 / _width);
        overlayCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  function highlightThicknessVariation(imageData: ImageData): void {
    if (!overlayCtx) return;

    // This would require distance transform calculation
    // For now, just highlight edges
    overlayCtx.fillStyle = 'rgba(255, 0, 255, 0.5)'; // Magenta highlight

    const edgeMap = sobelEdgeDetection(imageData);
    const { width, height } = imageData;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        if (edgeMap[index]! > 30) {
          overlayCtx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  // Register the tool
  PixelStudio.registerTool('cleanup-inspector', InspectorTool);
})();
