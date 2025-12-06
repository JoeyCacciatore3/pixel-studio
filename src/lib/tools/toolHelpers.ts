/**
 * Helper functions for tools
 */

import type { AppState, CanvasElements } from '../types';

export function assertState(state: AppState | undefined): asserts state is AppState {
  if (!state) {
    throw new Error('Tool state not initialized');
  }
}

export function assertElements(elements: CanvasElements | undefined): asserts elements is CanvasElements {
  if (!elements) {
    throw new Error('Tool elements not initialized');
  }
}
