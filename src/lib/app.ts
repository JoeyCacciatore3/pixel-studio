/**
 * Main PixelStudio Application Module
 * Coordinates all modules and manages tool registration
 */

import type { Tool, AppState, CanvasElements } from './types';
import Canvas from './canvas';
import Layers from './layers';
import StateManager from './stateManager';
import { hexToRgba } from './colorUtils';
import EventEmitter from './utils/eventEmitter';
import { logger } from './utils/logger';

const PixelStudio = (function () {
  const tools: Map<string, Tool> = new Map();
  let currentTool: Tool | null = null;
  let elements: CanvasElements | null = null;
  let isReadyFlag = false;

  /**
   * Initialize tools (called after modules are initialized)
   * Note: Module initialization (StateManager, Canvas, Layers, History) is handled by init.ts
   */
  function init(
    _appState: AppState,
    canvasElements: CanvasElements,
    _enableLayers: boolean = true
  ): void {
    elements = canvasElements;

    // Initialize all registered tools
    if (elements) {
      const state = StateManager.getState();
      const elementsNonNull = elements; // Type narrowing
      tools.forEach((tool) => {
        tool.init(state, elementsNonNull);
      });

      // Select default tool
      if (state.currentTool && tools.has(state.currentTool)) {
        selectTool(state.currentTool);
      }
    }

    // Mark as ready and emit event
    isReadyFlag = true;
    EventEmitter.emit('app:ready', {
      timestamp: Date.now(),
    });
  }

  /**
   * Check if application is ready (all modules initialized)
   */
  function isReady(): boolean {
    return isReadyFlag;
  }

  /**
   * Register a tool
   */
  function registerTool(name: string, tool: Tool): void {
    tools.set(name, tool);
    if (elements) {
      // Only initialize tool if StateManager is ready
      if (StateManager.isInitialized()) {
        try {
          const state = StateManager.getState();
          tool.init(state, elements);
        } catch (error) {
          logger.error(`Failed to initialize tool ${name}:`, error);
          // Tool will be initialized later in PixelStudio.init()
        }
      }
      // If StateManager not initialized, tool will be initialized in PixelStudio.init()
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
    const tool = tools.get(name);
    if (tool) {
      currentTool = tool;
      const previousTool = StateManager.getState().currentTool;
      StateManager.setCurrentTool(name);
      if (elements && elements.canvas) {
        elements.canvas.className = `cursor-${name}`;
      }

      // Emit event for tool change (StateManager already emitted state:toolChange)
      EventEmitter.emit('app:toolChange', {
        tool: name,
        previousTool,
      });
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
    if (!elements) return;
    const state = StateManager.getState();
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
    if (!elements) return;
    try {
      StateManager.setColor(color);
      if (elements.colorPicker) {
        elements.colorPicker.value = color;
      }
      if (elements.hexInput) {
        elements.hexInput.value = color;
      }
      updateColorPreview();
    } catch (error) {
      logger.error('Invalid color format:', color, error);
    }
  }

  /**
   * Clear selection
   */
  function clearSelection(): void {
    StateManager.setSelection(null);
    StateManager.setColorRangeSelection(null);
    Canvas.clearOverlay();
    if (elements && elements.selectionOverlay) {
      elements.selectionOverlay.style.display = 'none';
    }
    // StateManager already emitted app:selectionChange event
  }

  /**
   * Get application state
   */
  function getState(): AppState | null {
    try {
      return StateManager.getState();
    } catch {
      return null;
    }
  }

  /**
   * Get canvas elements
   */
  function getElements(): CanvasElements | null {
    return elements;
  }

  /**
   * Get layers module
   * @returns The Layers module instance
   */
  function getLayers(): typeof Layers {
    return Layers;
  }

  /**
   * Emit selection change event (helper for tools to use)
   */
  function emitSelectionChange(): void {
    try {
      const state = StateManager.getState();
      EventEmitter.emit('app:selectionChange', {
        hasSelection: !!(state.selection || state.colorRangeSelection),
        selection: state.selection,
        colorRangeSelection: state.colorRangeSelection ? 'present' : null, // Don't send full array
      });
    } catch (error) {
      logger.error('Failed to emit selection change:', error);
      // Emit with safe defaults
      EventEmitter.emit('app:selectionChange', {
        hasSelection: false,
        selection: null,
        colorRangeSelection: null,
      });
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
    emitSelectionChange,
    isReady,
    // Expose event emitter for components to subscribe
    on: EventEmitter.on.bind(EventEmitter),
    off: EventEmitter.off.bind(EventEmitter),
  };
})();

export default PixelStudio;
