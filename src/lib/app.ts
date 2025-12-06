/**
 * Main PixelStudio Application Module
 * Coordinates all modules and manages tool registration
 */

import type { Tool, AppState, CanvasElements } from './types';
import Canvas from './canvas';
import History from './history';
import Layers from './layers';
import { hexToRgba } from './colorUtils';

const PixelStudio = (function () {
  const tools: Map<string, Tool> = new Map();
  let currentTool: Tool | null = null;
  let state: AppState;
  let elements: CanvasElements;

  /**
   * Initialize the application
   */
  function init(
    appState: AppState,
    canvasElements: CanvasElements,
    enableLayers: boolean = true
  ): void {
    state = appState;
    elements = canvasElements;

    // Initialize modules
    if (elements.canvas) {
      const ctx = elements.canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        Canvas.init(elements.canvas, elements.selectionCanvas || undefined, enableLayers);
        if (enableLayers) {
          Layers.init(elements.canvas, ctx);
          // Initialize layers in state if not already set
          if (!state.layers || state.layers.length === 0) {
            const initialLayer = Layers.createLayer('Layer 1');
            state.layers = Layers.getAllLayers();
            state.activeLayerId = initialLayer.id;
          } else {
            // Restore layers from state
            Layers.setState({ layers: state.layers, activeLayerId: state.activeLayerId });
          }
          Layers.renderLayers();
        }
      }
    }
    History.init(enableLayers);

    // Initialize all registered tools
    tools.forEach((tool) => {
      tool.init(state, elements);
    });

    // Select default tool
    if (state.currentTool && tools.has(state.currentTool)) {
      selectTool(state.currentTool);
    }
  }

  /**
   * Register a tool
   */
  function registerTool(name: string, tool: Tool): void {
    tools.set(name, tool);
    if (state && elements) {
      tool.init(state, elements);
    }
  }

  /**
   * Get a tool by name
   */
  function getTool(name: string): Tool | undefined {
    return tools.get(name);
  }

  /**
   * Select a tool
   */
  function selectTool(name: string): void {
    if (!state) return;
    const tool = tools.get(name);
    if (tool) {
      currentTool = tool;
      state.currentTool = name;
      if (elements && elements.canvas) {
        elements.canvas.className = `cursor-${name}`;
      }
    }
  }

  /**
   * Get current tool
   */
  function getCurrentTool(): Tool | null {
    return currentTool;
  }

  /**
   * Update color preview
   */
  function updateColorPreview(): void {
    if (!state || !elements) return;
    if (elements.colorPicker) {
      const preview = document.getElementById('colorPreview');
      if (preview) {
        preview.style.background = hexToRgba(state.currentColor, state.currentAlpha);
      }
    }
  }

  /**
   * Set color
   */
  function setColor(color: string): void {
    if (!state || !elements) return;
    // Validate hex color format
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      console.error('Invalid color format:', color);
      return;
    }
    state.currentColor = color;
    if (elements.colorPicker) {
      elements.colorPicker.value = color;
    }
    if (elements.hexInput) {
      elements.hexInput.value = color;
    }
    updateColorPreview();
  }

  /**
   * Clear selection
   */
  function clearSelection(): void {
    if (!state) return;
    state.selection = null;
    state.colorRangeSelection = null;
    Canvas.clearOverlay();
    if (elements && elements.selectionOverlay) {
      elements.selectionOverlay.style.display = 'none';
    }
  }

  /**
   * Get application state
   */
  function getState(): AppState | null {
    return state || null;
  }

  /**
   * Get canvas elements
   */
  function getElements(): CanvasElements {
    return elements;
  }

  /**
   * Get layers module
   */
  function getLayers() {
    return Layers;
  }

  /**
   * Sync layer state from layers module
   */
  function syncLayerState(): void {
    if (state) {
      state.layers = Layers.getAllLayers();
      const activeLayer = Layers.getActiveLayer();
      state.activeLayerId = activeLayer?.id || null;
    }
  }

  // Public API
  return {
    init,
    registerTool,
    getTool,
    selectTool,
    getCurrentTool,
    updateColorPreview,
    setColor,
    clearSelection,
    getState,
    getElements,
    getLayers,
    syncLayerState,
  };
})();

export default PixelStudio;
