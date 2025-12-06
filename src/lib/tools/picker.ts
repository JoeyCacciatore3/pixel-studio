/**
 * Color Picker Tool
 * Samples color from canvas
 */

import type { Tool, BaseToolState } from '../types';
import Canvas from '../canvas';
import { rgbToHex } from '../colorUtils';
import PixelStudio from '../app';

(function () {
  let toolState: BaseToolState | null = null;

  const PickerTool: Tool = {
    name: 'picker',

    init(state, elements) {
      toolState = {
        state,
        elements,
      };
    },

    onPointerDown(coords, _e) {
      if (!toolState) return;
      const x = Math.floor(coords.x);
      const y = Math.floor(coords.y);
      pickColor(x, y);
    },

    onPointerMove(_coords, _e) {
      // No action during move
    },

    onPointerUp(_e) {
      // No action on up
    },
  };

  function pickColor(x: number, y: number): void {
    if (!toolState) return;

    const width = Canvas.getWidth();
    const height = Canvas.getHeight();

    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }

    // Sample 3x3 area for better accuracy (or 5x5 for larger brushes)
    // Use 3x3 for precision, which is standard in professional tools
    const sampleSize = 3;
    const halfSize = Math.floor(sampleSize / 2);
    const startX = Math.max(0, Math.floor(x) - halfSize);
    const startY = Math.max(0, Math.floor(y) - halfSize);
    const endX = Math.min(width, Math.floor(x) + halfSize + 1);
    const endY = Math.min(height, Math.floor(y) + halfSize + 1);

    const imageData = Canvas.getContext().getImageData(
      startX,
      startY,
      endX - startX,
      endY - startY
    );
    const data = imageData.data;

    // Calculate average color from sampled area
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let totalA = 0;
    let pixelCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      totalR += data[i]!;
      totalG += data[i + 1]!;
      totalB += data[i + 2]!;
      totalA += data[i + 3]!;
      pixelCount++;
    }

    if (pixelCount === 0) return;

    const avgR = Math.round(totalR / pixelCount);
    const avgG = Math.round(totalG / pixelCount);
    const avgB = Math.round(totalB / pixelCount);
    const avgA = totalA / pixelCount / 255;

    const hex = rgbToHex(avgR, avgG, avgB);
    const alpha = avgA;

    const state = toolState.state;
    const elements = toolState.elements;

    // Validate hex color format before setting
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      console.error('Invalid hex color from picker:', hex);
      return;
    }

    state.currentColor = hex;
    state.currentAlpha = alpha;

    if (elements.colorPicker) {
      elements.colorPicker.value = hex;
    }
    if (elements.hexInput) {
      elements.hexInput.value = hex;
    }
    if (elements.alphaInput) {
      elements.alphaInput.value = Math.round(alpha * 100).toString();
    }

    PixelStudio.updateColorPreview();
  }

  // Register the tool
  PixelStudio.registerTool('picker', PickerTool);
})();
