/**
 * Brush Presets Module
 * Manages brush preset save/load and default presets
 */

import type { BrushPreset, AppState } from './types';

const BrushPresets = (function () {
  const STORAGE_KEY = 'pixel-studio-brush-presets';
  let presets: BrushPreset[] = [];

  /**
   * Initialize with default presets
   */
  function init(): void {
    // Load from localStorage
    loadPresets();

    // Add default presets if none exist
    if (presets.length === 0) {
      createDefaultPresets();
      savePresets();
    }
  }

  /**
   * Create default professional presets
   */
  function createDefaultPresets(): void {
    presets = [
      {
        id: 'soft-brush',
        name: 'Soft Brush',
        category: 'paint',
        size: 10,
        hardness: 30,
        opacity: 100,
        flow: 50,
        spacing: 25,
        jitter: 0,
        texture: null,
        pressureSize: true,
        pressureOpacity: true,
        pressureFlow: false,
        pressureCurve: 'ease-out',
      },
      {
        id: 'hard-brush',
        name: 'Hard Brush',
        category: 'paint',
        size: 8,
        hardness: 100,
        opacity: 100,
        flow: 100,
        spacing: 25,
        jitter: 0,
        texture: null,
        pressureSize: true,
        pressureOpacity: false,
        pressureFlow: false,
        pressureCurve: 'linear',
      },
      {
        id: 'texture-brush',
        name: 'Texture Brush',
        category: 'texture',
        size: 15,
        hardness: 50,
        opacity: 80,
        flow: 60,
        spacing: 50,
        jitter: 10,
        texture: null,
        pressureSize: true,
        pressureOpacity: true,
        pressureFlow: true,
        pressureCurve: 'ease-in-out',
      },
      {
        id: 'airbrush',
        name: 'Airbrush',
        category: 'paint',
        size: 20,
        hardness: 0,
        opacity: 30,
        flow: 20,
        spacing: 1,
        jitter: 5,
        texture: null,
        pressureSize: true,
        pressureOpacity: true,
        pressureFlow: true,
        pressureCurve: 'ease-out',
      },
      {
        id: 'pencil-hard',
        name: 'Hard Pencil',
        category: 'pencil',
        size: 2,
        hardness: 100,
        opacity: 100,
        flow: 100,
        spacing: 10,
        jitter: 0,
        texture: null,
        pressureSize: true,
        pressureOpacity: false,
        pressureFlow: false,
        pressureCurve: 'linear',
      },
    ];
  }

  /**
   * Load presets from localStorage
   */
  function loadPresets(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        presets = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load brush presets:', error);
      presets = [];
    }
  }

  /**
   * Save presets to localStorage
   */
  function savePresets(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error('Failed to save brush presets:', error);
    }
  }

  /**
   * Get all presets
   */
  function getAllPresets(): BrushPreset[] {
    return [...presets];
  }

  /**
   * Get presets by category
   */
  function getPresetsByCategory(category: string): BrushPreset[] {
    return presets.filter((p) => p.category === category);
  }

  /**
   * Get preset by ID
   */
  function getPreset(id: string): BrushPreset | undefined {
    return presets.find((p) => p.id === id);
  }

  /**
   * Save current brush state as preset
   */
  function savePreset(name: string, category: string, state: AppState): string {
    const preset: BrushPreset = {
      id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      category,
      size: state.brushSize,
      hardness: state.brushHardness ?? 100,
      opacity: state.brushOpacity ?? 100,
      flow: state.brushFlow ?? 100,
      spacing: state.brushSpacing ?? 25,
      jitter: state.brushJitter ?? 0,
      texture: state.brushTexture,
      pressureSize: state.pressureSize ?? true,
      pressureOpacity: state.pressureOpacity ?? true,
      pressureFlow: state.pressureFlow ?? false,
      pressureCurve: state.pressureCurve ?? 'linear',
    };

    presets.push(preset);
    savePresets();
    return preset.id;
  }

  /**
   * Apply preset to state
   */
  function applyPreset(presetId: string, state: AppState): void {
    const preset = getPreset(presetId);
    if (!preset) return;

    state.brushSize = preset.size;
    state.brushHardness = preset.hardness;
    state.brushOpacity = preset.opacity;
    state.brushFlow = preset.flow;
    state.brushSpacing = preset.spacing;
    state.brushJitter = preset.jitter;
    state.brushTexture = preset.texture;
    state.pressureSize = preset.pressureSize;
    state.pressureOpacity = preset.pressureOpacity;
    state.pressureFlow = preset.pressureFlow;
    state.pressureCurve = preset.pressureCurve;
  }

  /**
   * Delete preset
   */
  function deletePreset(id: string): boolean {
    const index = presets.findIndex((p) => p.id === id);
    if (index >= 0) {
      presets.splice(index, 1);
      savePresets();
      return true;
    }
    return false;
  }

  /**
   * Export presets as JSON
   */
  function exportPresets(): string {
    return JSON.stringify(presets, null, 2);
  }

  /**
   * Import presets from JSON
   */
  function importPresets(json: string): boolean {
    try {
      const imported = JSON.parse(json);
      if (Array.isArray(imported)) {
        presets = imported;
        savePresets();
        return true;
      }
    } catch (error) {
      console.error('Failed to import presets:', error);
    }
    return false;
  }

  // Initialize on load
  init();

  return {
    getAllPresets,
    getPresetsByCategory,
    getPreset,
    savePreset,
    applyPreset,
    deletePreset,
    exportPresets,
    importPresets,
  };
})();

export default BrushPresets;
