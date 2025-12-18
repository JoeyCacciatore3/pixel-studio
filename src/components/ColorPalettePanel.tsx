'use client';

import { useState, useEffect, useRef } from 'react';
import UI from '@/lib/ui';
import { useAppState } from '@/hooks/useAppState';
import StateManager from '@/lib/stateManager';
import PixelStudio from '@/lib/app';

export default function ColorPalettePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const state = useAppState();
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const hexInputRef = useRef<HTMLInputElement>(null);
  const alphaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Setup color controls once elements are mounted
    if (colorPickerRef.current && hexInputRef.current && alphaInputRef.current) {
      // Get the current UI elements and update them with our refs
      const elements = PixelStudio.getElements();
      if (elements) {
        elements.colorPicker = colorPickerRef.current;
        elements.hexInput = hexInputRef.current;
        elements.alphaInput = alphaInputRef.current;
      }

      UI.setupColorControls(
        (newColor) => {
          StateManager.setColor(newColor);
        },
        (newAlpha) => {
          StateManager.setAlpha(newAlpha);
        }
      );
    }
  }, []);

  // Default color swatches
  const defaultSwatches = [
    '#000000',
    '#FFFFFF',
    '#FF0000',
    '#00FF00',
    '#0000FF',
    '#FFFF00',
    '#FF00FF',
    '#00FFFF',
    '#808080',
    '#FFA500',
    '#800080',
    '#FFC0CB',
    '#A52A2A',
    '#000080',
    '#008000',
    '#800000',
    '#FFD700',
    '#C0C0C0',
    '#FF6347',
    '#40E0D0',
    '#EE82EE',
    '#90EE90',
    '#F0E68C',
    '#DDA0DD',
  ];

  const handleSwatchClick = (color: string) => {
    StateManager.setColor(color);
    if (colorPickerRef.current) {
      colorPickerRef.current.value = color;
    }
    if (hexInputRef.current) {
      hexInputRef.current.value = color;
    }
    PixelStudio.updateColorPreview();
  };

  const currentColor = state.currentColor || '#000000';
  const currentAlpha = state.currentAlpha || 100;

  // Convert hex to rgba for preview
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
  };

  return (
    <div className="color-palette-panel">
      <button
        className="color-palette-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle color palette"
        aria-expanded={isOpen}
        data-testid="testid-colors-toggle"
      >
        COLORS
      </button>
      {isOpen && (
        <div className="color-palette-content">
          <div className="panel-section">
            <h2 className="panel-title">Color</h2>

            {/* Color Preview */}
            <div className="color-preview-large">
              <div
                className="color-preview-inner"
                id="colorPreview"
                style={{
                  background: hexToRgba(currentColor, currentAlpha),
                }}
              />
            </div>

            {/* Color Inputs */}
            <div className="color-inputs">
              <div className="color-input-group full">
                <label>Color Picker</label>
                <input
                  ref={colorPickerRef}
                  type="color"
                  id="colorPicker"
                  defaultValue={currentColor}
                />
              </div>
              <div className="color-input-group">
                <label>Hex</label>
                <input
                  ref={hexInputRef}
                  type="text"
                  id="hexInput"
                  defaultValue={currentColor}
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
              <div className="color-input-group">
                <label>Alpha</label>
                <input
                  ref={alphaInputRef}
                  type="number"
                  id="alphaInput"
                  min="0"
                  max="100"
                  defaultValue={currentAlpha}
                />
              </div>
            </div>

            {/* Color Swatches */}
            <div className="swatches">
              {defaultSwatches.map((color, index) => (
                <button
                  key={index}
                  className="swatch"
                  style={{ background: color }}
                  onClick={() => handleSwatchClick(color)}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
