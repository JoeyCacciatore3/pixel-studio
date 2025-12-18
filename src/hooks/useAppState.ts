/**
 * React hook for accessing app state
 * Subscribes to StateManager and triggers re-renders on state changes
 */

import { useState, useEffect } from 'react';
import StateManager from '@/lib/stateManager';
import type { AppState } from '@/lib/types';

// Default state for initial render before StateManager is initialized
const DEFAULT_STATE: AppState = {
  currentTool: 'pencil',
  currentColor: '#6366f1',
  currentAlpha: 1,
  brushSize: 4,
  brushHardness: 100,
  brushOpacity: 100,
  brushFlow: 100,
  brushSpacing: 25,
  brushJitter: 0,
  brushTexture: null,
  brushScatter: 0,
  brushAngle: 0,
  brushRoundness: 100,
  pressureEnabled: false,
  pressureSize: true,
  pressureOpacity: true,
  pressureFlow: false,
  pressureCurve: 'linear',
  stabilizerStrength: 30,
  tolerance: 32,
  zoom: 1,
  selection: null,
  colorRangeSelection: null,
  selectionMode: 'replace',
  selectionFeather: 0,
  selectionAntiAlias: true,
  imageLayer: null,
  imageOffsetX: 0,
  imageOffsetY: 0,
  layers: [],
  activeLayerId: null,
};

export function useAppState(): AppState {
  const [state, setState] = useState<AppState>(() => {
    try {
      return StateManager.getState();
    } catch (error) {
      // StateManager not initialized yet, return default state
      // This will be updated once StateManager initializes and subscription triggers
      return DEFAULT_STATE;
    }
  });

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = StateManager.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  return state;
}
