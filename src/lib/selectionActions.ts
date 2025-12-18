/**
 * Selection Actions Module
 * Handles actions on selections (delete, extract to layer)
 */

import Canvas from './canvas';
import Layers from './layers';
import History from './history';
import PixelStudio from './app';

const SelectionActions = (function () {
  /**
   * Delete selected pixels
   */
  function deleteSelection(): boolean {
    const state = PixelStudio.getState();
    if (!state) return false;

    if (state.colorRangeSelection) {
      // Delete pixels in color range selection
      const imageData = Canvas.getImageData();
      const data = imageData.data;
      const selection = state.colorRangeSelection;

      for (let i = 0; i < selection.length; i++) {
        if (selection[i]) {
          const idx = i * 4;
          data[idx + 3] = 0; // Set alpha to 0 (transparent)
        }
      }

      Canvas.putImageData(imageData);
      PixelStudio.clearSelection();
      History.save();
      return true;
    } else if (state.selection) {
      // Delete rectangular selection
      const ctx = Canvas.getContext();
      ctx.clearRect(
        state.selection.x,
        state.selection.y,
        state.selection.width,
        state.selection.height
      );
      PixelStudio.clearSelection();
      History.save();
      return true;
    }

    return false;
  }

  /**
   * Extract selection to a new layer
   */
  function extractSelectionToLayer(): boolean {
    const state = PixelStudio.getState();
    if (!state) return false;

    // Check if layers are enabled
    const layers = Canvas.getLayers();
    if (!layers) {
      // If layers not enabled, enable them first
      Canvas.setLayersEnabled(true);
      History.setLayersEnabled(true);

      // Create initial layer from current canvas content
      const currentImageData = Canvas.getImageData();
      const width = Canvas.getWidth();
      const height = Canvas.getHeight();

      // Create a canvas for the initial layer
      const initialCanvas = document.createElement('canvas');
      initialCanvas.width = width;
      initialCanvas.height = height;
      const initialCtx = initialCanvas.getContext('2d', { willReadFrequently: true });
      if (initialCtx) {
        initialCtx.putImageData(currentImageData, 0, 0);
      }

      // Create layer from current content
      const initialLayer = Layers.create('Layer 1');
      const layerCtx = initialLayer.canvas.getContext('2d', { willReadFrequently: true });
      if (layerCtx) {
        layerCtx.putImageData(currentImageData, 0, 0);
      }

      Layers.render();
    }

    if (state.colorRangeSelection) {
      // Extract pixel-based selection
      const selection = state.colorRangeSelection;
      const bounds = state.selection;

      if (!bounds) {
        // Calculate bounds from selection
        const width = Canvas.getWidth();
        const height = Canvas.getHeight();
        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;

        for (let i = 0; i < selection.length; i++) {
          if (selection[i]) {
            const x = i % width;
            const y = Math.floor(i / width);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }

        const calculatedBounds = {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        };

        const newLayer = Layers.extractSelection(selection, calculatedBounds);
        if (newLayer) {
          PixelStudio.clearSelection();
          History.save();
          // State automatically updated via StateManager from Layers module
          return true;
        }
      } else {
        const newLayer = Layers.extractSelection(selection, bounds);
        if (newLayer) {
          PixelStudio.clearSelection();
          History.save();
          // State automatically updated via StateManager from Layers module
          return true;
        }
      }
    } else if (state.selection) {
      // Extract rectangular selection
      const width = Canvas.getWidth();
      const height = Canvas.getHeight();

      // Create selection mask
      const selection = new Uint8Array(width * height);
      const { x, y, width: selWidth, height: selHeight } = state.selection;

      for (let py = y; py < y + selHeight && py < height; py++) {
        for (let px = x; px < x + selWidth && px < width; px++) {
          const idx = py * width + px;
          selection[idx] = 1;
        }
      }

      const newLayer = Layers.extractSelection(selection, state.selection);
      if (newLayer) {
        PixelStudio.clearSelection();
        History.save();
        // State automatically updated via StateManager from Layers module
        return true;
      }
    }

    return false;
  }

  // Public API
  return {
    deleteSelection,
    extractSelectionToLayer,
  };
})();

export default SelectionActions;
