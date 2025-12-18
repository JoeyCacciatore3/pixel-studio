/**
 * Application Initialization Module
 * Centralizes all initialization logic with proper ordering
 */

import type { AppState, CanvasElements } from './types';
import StateManager from './stateManager';
import Canvas from './canvas';
import Layers from './layers';
import History from './history';
import UI from './ui';
import PixelStudio from './app';
import WorkerManager from './workers/workerManager';
import { logger } from './utils/logger';

export interface InitOptions {
  enableLayers?: boolean;
}

/**
 * Initialize the application with proper ordering
 */
export function initializeApp(
  initialState: AppState,
  canvasElements: CanvasElements,
  options: InitOptions = {}
): void {
  const { enableLayers = true } = options;

  if (!canvasElements.canvas) {
    throw new Error('Canvas element is required but not provided');
  }

  // Initialize StateManager
  StateManager.init(initialState);

  // Initialize Canvas
  Canvas.init(canvasElements.canvas, canvasElements.selectionCanvas || undefined, enableLayers);

  // Initialize Layers (if enabled)
  if (enableLayers) {
    // Use getMainContext() to get the main canvas context directly
    // This bypasses the layer system which isn't initialized yet
    const ctx = Canvas.getMainContext();
    if (!ctx) {
      throw new Error('Canvas context is null');
    }
    Layers.init(canvasElements.canvas, ctx);

    const state = StateManager.getState();
    if (!state.layers || state.layers.length === 0) {
      // Create Layer 1 with transparent background (standard for image editors)
      // This allows checkerboard to show through erased/transparent areas
      Layers.create('Layer 1');
    } else {
      Layers._restoreLayersFromAppState(state.layers, state.activeLayerId);
    }
    // Use renderSync for immediate display on initialization
    // Note: renderSync is async but we call it without await to avoid blocking initialization
    // The render will complete asynchronously, but we handle errors
    Layers.renderSync().catch((error) => {
      logger.error('[Init] Failed to render layers during initialization:', error);
      // Emit error event so UI can handle it
      // The render will be retried on next user interaction
    });
  }

  // Initialize History (non-critical if it fails)
  try {
    History.init(enableLayers);
  } catch (error) {
    logger.error('Failed to initialize History:', error);
  }

  // Initialize UI
  UI.init(initialState, canvasElements);

  // Initialize PixelStudio
  PixelStudio.init(initialState, canvasElements, enableLayers);

  // Initialize workers (non-critical if they fail)
  try {
    WorkerManager.initBlendWorker();
  } catch (error) {
    logger.warn('Failed to initialize blend worker:', error);
  }

  try {
    WorkerManager.initHistoryWorker();
  } catch (error) {
    logger.warn('Failed to initialize history worker:', error);
  }

  try {
    WorkerManager.initImageWorker();
  } catch (error) {
    logger.warn('Failed to initialize image worker:', error);
  }

  try {
    WorkerManager.initCleanupWorker();
  } catch (error) {
    logger.warn('Failed to initialize cleanup worker:', error);
  }

  // Setup keyboard shortcuts (non-critical if it fails)
  try {
    UI.setupKeyboardShortcuts();
  } catch (error) {
    logger.error('Failed to setup keyboard shortcuts:', error);
  }

  // Save initial canvas state to history (non-critical if it fails)
  try {
    History.save();
  } catch (error) {
    logger.error('Failed to save initial history state:', error);
  }
}
