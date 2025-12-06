/**
 * History Module
 * Manages undo/redo functionality
 */

import type { LayerState } from './types';
import Canvas from './canvas';
import Layers from './layers';

interface HistoryEntry {
  imageData: ImageData;
  layerState?: LayerState;
}

const History = (function () {
  let history: HistoryEntry[] = [];
  let historyIndex = -1;
  const maxHistory = 20;
  let useLayers = false;

  /**
   * Initialize the history module
   */
  function init(enableLayers: boolean = false): void {
    history = [];
    historyIndex = -1;
    useLayers = enableLayers;
  }

  /**
   * Save current canvas state to history
   */
  function save(): void {
    const imageData = Canvas.getImageData();
    const entry: HistoryEntry = { imageData };

    // If layers are enabled, also save layer state
    if (useLayers) {
      entry.layerState = Layers.getState();
    }

    // Remove any redo states
    history = history.slice(0, historyIndex + 1);

    // Add new state
    history.push(entry);

    // Limit history size
    if (history.length > maxHistory) {
      history.shift();
    }

    historyIndex = history.length - 1;
  }

  /**
   * Undo the last action
   */
  function undo(): boolean {
    if (historyIndex > 0) {
      historyIndex--;
      const entry = history[historyIndex]!;

      // Restore layer state if available
      if (useLayers && entry.layerState) {
        Layers.setState(entry.layerState);
        Layers.renderLayers();
      } else {
        Canvas.putImageData(entry.imageData);
      }

      return true;
    }
    return false;
  }

  /**
   * Redo the last undone action
   */
  function redo(): boolean {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      const entry = history[historyIndex]!;

      // Restore layer state if available
      if (useLayers && entry.layerState) {
        Layers.setState(entry.layerState);
        Layers.renderLayers();
      } else {
        Canvas.putImageData(entry.imageData);
      }

      return true;
    }
    return false;
  }

  /**
   * Check if undo is available
   */
  function canUndo(): boolean {
    return historyIndex > 0;
  }

  /**
   * Check if redo is available
   */
  function canRedo(): boolean {
    return historyIndex < history.length - 1;
  }

  /**
   * Clear all history
   */
  function clear(): void {
    history = [];
    historyIndex = -1;
  }

  /**
   * Get the current history index
   */
  function getIndex(): number {
    return historyIndex;
  }

  /**
   * Get the history length
   */
  function getLength(): number {
    return history.length;
  }

  /**
   * Set whether to use layers in history
   */
  function setLayersEnabled(enabled: boolean): void {
    useLayers = enabled;
  }

  // Public API
  return {
    init,
    save,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    getIndex,
    getLength,
    setLayersEnabled,
  };
})();

export default History;
