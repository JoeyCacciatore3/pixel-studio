/**
 * State Manager
 * Single source of truth for application state
 * Emits events on changes and integrates with React
 */

import type { AppState, PressureCurveType } from './types';
import EventEmitter from './utils/eventEmitter';
import { logger } from './utils/logger';

const StateManager = (function () {
  // Single source of truth
  let state: AppState | null = null;
  const listeners: Set<(state: AppState) => void> = new Set();

  /**
   * Initialize state manager
   */
  function init(initialState: AppState): void {
    // Deep copy to ensure immutability
    state = {
      ...initialState,
      layers: initialState.layers ? [...initialState.layers] : [],
      selection: initialState.selection ? { ...initialState.selection } : null,
      colorRangeSelection: initialState.colorRangeSelection
        ? new Uint8Array(initialState.colorRangeSelection)
        : null,
    };
  }

  /**
   * Check if StateManager is initialized
   */
  function isInitialized(): boolean {
    return state !== null;
  }

  /**
   * Get current state (read-only)
   */
  function getState(): Readonly<AppState> {
    if (!state) {
      throw new Error('StateManager not initialized');
    }
    return state;
  }

  /**
   * Subscribe to state changes
   * Returns unsubscribe function
   */
  function subscribe(listener: (state: AppState) => void): () => void {
    listeners.add(listener);
    // Call listener immediately with current state
    if (state) {
      listener(state);
    }
    return () => listeners.delete(listener);
  }

  /**
   * Update state (immutable)
   * OPTIMIZED: Only copies nested objects when they actually change (Item 3)
   */
  function updateState(updates: Partial<AppState>): void {
    if (!state) {
      throw new Error('StateManager not initialized');
    }

    // OPTIMIZATION (Item 3): Use structural sharing - only copy what changed
    // Check if we actually need to create a new state object
    const hasNestedChanges =
      updates.layers !== undefined ||
      updates.selection !== undefined ||
      updates.colorRangeSelection !== undefined;

    // If no nested changes and only simple property updates, use shallow copy
    if (!hasNestedChanges && Object.keys(updates).length > 0) {
      // Simple property update - just spread updates
      state = { ...state, ...updates };
    } else {
      // Create new state object with proper nested object handling
      const newState: AppState = {
        ...state,
        // Only copy layers array if it's being updated
        ...(updates.layers !== undefined ? { layers: [...updates.layers] } : {}), // Keep reference if unchanged (structural sharing)
        // Only copy selection if it's being updated
        ...(updates.selection !== undefined
          ? { selection: updates.selection ? { ...updates.selection } : null }
          : {}), // Keep reference if unchanged
        // Only copy colorRangeSelection if it's being updated
        ...(updates.colorRangeSelection !== undefined
          ? {
              colorRangeSelection: updates.colorRangeSelection
                ? new Uint8Array(updates.colorRangeSelection)
                : null,
            }
          : {}), // Keep reference if unchanged
        // Apply all other updates (non-nested objects)
        ...Object.fromEntries(
          Object.entries(updates).filter(
            ([key]) => key !== 'layers' && key !== 'selection' && key !== 'colorRangeSelection'
          )
        ),
      };

      state = newState;
    }

    // Notify all listeners
    listeners.forEach((listener) => listener(state!));

    // Emit event
    EventEmitter.emit('state:update', { state: state, updates });
  }

  /**
   * Update specific property with validation
   */
  function setProperty<K extends keyof AppState>(key: K, value: AppState[K]): void {
    updateState({ [key]: value } as Partial<AppState>);
  }

  // Specific setters with validation

  function setCurrentTool(tool: string): void {
    updateState({ currentTool: tool });
    EventEmitter.emit('state:toolChange', { tool });
  }

  function setColor(color: string): void {
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      throw new Error('Invalid color format. Expected hex color (e.g., #ff0000)');
    }
    updateState({ currentColor: color });
    EventEmitter.emit('state:colorChange', { color });
  }

  function setAlpha(alpha: number): void {
    const clamped = Math.max(0, Math.min(1, alpha));
    updateState({ currentAlpha: clamped });
  }

  function setBrushSize(size: number): void {
    const clamped = Math.max(1, Math.min(100, size));
    updateState({ brushSize: clamped });
  }

  function setBrushHardness(hardness: number): void {
    const clamped = Math.max(0, Math.min(100, hardness));
    updateState({ brushHardness: clamped });
  }

  function setBrushOpacity(opacity: number): void {
    const clamped = Math.max(0, Math.min(100, opacity));
    updateState({ brushOpacity: clamped });
  }

  function setBrushFlow(flow: number): void {
    const clamped = Math.max(0, Math.min(100, flow));
    updateState({ brushFlow: clamped });
  }

  function setBrushSpacing(spacing: number): void {
    const clamped = Math.max(1, Math.min(1000, spacing));
    updateState({ brushSpacing: clamped });
  }

  function setBrushJitter(jitter: number): void {
    const clamped = Math.max(0, Math.min(100, jitter));
    updateState({ brushJitter: clamped });
  }

  function setBrushTexture(texture: string | null): void {
    updateState({ brushTexture: texture });
  }

  function setBrushScatter(scatter: number): void {
    const clamped = Math.max(0, Math.min(100, scatter));
    updateState({ brushScatter: clamped });
  }

  function setBrushAngle(angle: number): void {
    const clamped = Math.max(0, Math.min(360, angle));
    updateState({ brushAngle: clamped });
  }

  function setBrushRoundness(roundness: number): void {
    const clamped = Math.max(0, Math.min(100, roundness));
    updateState({ brushRoundness: clamped });
  }

  function setPressureEnabled(enabled: boolean): void {
    updateState({ pressureEnabled: enabled });
  }

  function setPressureSize(enabled: boolean): void {
    updateState({ pressureSize: enabled });
  }

  function setPressureOpacity(enabled: boolean): void {
    updateState({ pressureOpacity: enabled });
  }

  function setPressureFlow(enabled: boolean): void {
    updateState({ pressureFlow: enabled });
  }

  function setPressureCurve(curve: PressureCurveType): void {
    updateState({ pressureCurve: curve });
  }

  function setStabilizerStrength(strength: number): void {
    const clamped = Math.max(0, Math.min(100, strength));
    updateState({ stabilizerStrength: clamped });
  }

  function setTolerance(tolerance: number): void {
    const clamped = Math.max(0, Math.min(255, tolerance));
    updateState({ tolerance: clamped });
  }

  function setZoom(zoom: number): void {
    const clamped = Math.max(0.25, Math.min(4, zoom));
    updateState({ zoom: clamped });
  }

  function setSelection(selection: AppState['selection']): void {
    updateState({
      selection: selection ? { ...selection } : null,
    });
    EventEmitter.emit('app:selectionChange', {
      hasSelection: !!selection,
    });
  }

  function setColorRangeSelection(selection: Uint8Array | null): void {
    updateState({
      colorRangeSelection: selection ? new Uint8Array(selection) : null,
    });
    EventEmitter.emit('app:selectionChange', {
      hasSelection: !!selection,
    });
  }

  function setSelectionMode(mode: 'replace' | 'add' | 'subtract' | 'intersect'): void {
    updateState({ selectionMode: mode });
  }

  function setSelectionFeather(feather: number): void {
    const clamped = Math.max(0, Math.min(100, feather));
    updateState({ selectionFeather: clamped });
  }

  function setSelectionAntiAlias(antiAlias: boolean): void {
    updateState({ selectionAntiAlias: antiAlias });
  }


  function setLayers(layers: AppState['layers']): void {
    // Validate layer structure
    if (!Array.isArray(layers)) {
      logger.error('setLayers: layers must be an array');
      return;
    }
    // Basic validation - ensure each layer has required properties
    const validLayers = layers.filter((layer) => {
      if (!layer || typeof layer !== 'object') return false;
      if (!layer.id || typeof layer.id !== 'string') return false;
      if (!layer.canvas || !(layer.canvas instanceof HTMLCanvasElement)) return false;
      return true;
    });
    if (validLayers.length !== layers.length) {
      logger.warn('setLayers: Some layers were invalid and filtered out');
    }
    updateState({ layers: [...validLayers] });
    EventEmitter.emit('layers:update', { layers: [...validLayers] });
  }

  function setActiveLayerId(id: string | null): void {
    updateState({ activeLayerId: id });
    EventEmitter.emit('layers:active', { activeLayerId: id });
  }

  return {
    init,
    isInitialized,
    getState,
    subscribe,
    updateState,
    setProperty,
    // Specific setters
    setCurrentTool,
    setColor,
    setAlpha,
    setBrushSize,
    setBrushHardness,
    setBrushOpacity,
    setBrushFlow,
    setBrushSpacing,
    setBrushJitter,
    setBrushTexture,
    setBrushScatter,
    setBrushAngle,
    setBrushRoundness,
    setPressureEnabled,
    setPressureSize,
    setPressureOpacity,
    setPressureFlow,
    setPressureCurve,
    setStabilizerStrength,
    setTolerance,
    setZoom,
    setSelection,
    setColorRangeSelection,
    setSelectionMode,
    setSelectionFeather,
    setSelectionAntiAlias,
    setLayers,
    setActiveLayerId,
  };
})();

export default StateManager;
