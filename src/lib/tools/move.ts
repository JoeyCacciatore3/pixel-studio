/**
 * Move Tool
 * Moves image layers
 */

import type { Tool } from '../types';
import Canvas from '../canvas';
import PixelStudio from '../app';

(function () {
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  const MoveTool: Tool = {
    name: 'move',

    init(_state, _elements) {
      isDragging = false;
      dragStartX = 0;
      dragStartY = 0;
    },

    onPointerDown(coords, _e) {
      const imageLayer = Canvas.getImageLayer();
      if (imageLayer) {
        isDragging = true;
        const offset = Canvas.getImageOffset();
        dragStartX = coords.x - offset.x;
        dragStartY = coords.y - offset.y;
      }
    },

    onPointerMove(coords, _e) {
      if (isDragging) {
        const offsetX = coords.x - dragStartX;
        const offsetY = coords.y - dragStartY;
        Canvas.setImageOffset(offsetX, offsetY);
      }
    },

    onPointerUp(_e) {
      isDragging = false;
    },
  };

  // Register the tool
  PixelStudio.registerTool('move', MoveTool);
})();
