/**
 * History Module
 * Manages undo/redo functionality
 */

import type { LayerState } from './types';
import Canvas from './canvas';
import Layers from './layers';
import EventEmitter from './utils/eventEmitter';
import indexedDBStorage from './storage/indexedDB';
import WorkerManager from './workers/workerManager';
import { imageDataToArrayBuffer, blobToImageData } from './imageUtils';
import { logger } from './utils/logger';

interface HistoryEntry {
  imageData: ImageData;
  layerState?: LayerState;
}

const History = (function () {
  let history: HistoryEntry[] = [];
  let historyIndex = -1;
  const maxHistory = 20;
  const maxMemoryHistory = 10; // Keep only 10 in memory, cache rest to IndexedDB
  let useLayers = false;
  let projectId: string | null = null;
  let isInitializedFlag = false; // Track initialization state
  // Track which entries are cached (index -> true means cached to IndexedDB)
  const cachedEntries = new Set<number>();
  // Track pending cache operations to prevent race conditions
  const pendingCacheOps = new Map<number, Promise<void>>();
  // Transaction grouping: group rapid consecutive actions
  let transactionGroupingTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingSave: (() => void) | null = null;
  const TRANSACTION_GROUPING_DELAY = 500; // Group actions within 500ms

  /**
   * Initialize the history module
   * Note: IndexedDB initializes lazily on first use to avoid blocking app initialization
   */
  function init(enableLayers: boolean = false, projectIdParam?: string): void {
    history = [];
    historyIndex = -1;
    useLayers = enableLayers;
    projectId = projectIdParam || `project-${Date.now()}`;
    cachedEntries.clear();
    pendingCacheOps.clear();
    isInitializedFlag = true; // Mark as initialized

    // Initialize history worker (non-blocking, fails gracefully)
    if (typeof window !== 'undefined') {
      try {
        WorkerManager.initHistoryWorker();
      } catch (error) {
        logger.warn('History worker initialization failed, will use fallback:', error);
      }
    }

    // IndexedDB will initialize lazily when first needed (save/load operations)
    // This prevents blocking app initialization if IndexedDB is slow
  }

  /**
   * Save current canvas state to history (internal, bypasses transaction grouping)
   * OPTIMIZED: Defers expensive getImageData operation to avoid blocking main thread
   */
  function saveInternal(): void {
    // OPTIMIZATION (Item 2): Defer expensive getImageData() call using requestIdleCallback
    // This prevents blocking the main thread during drawing operations
    const performSave = () => {
      let imageData: ImageData;
      try {
        imageData = Canvas.getImageData();
      } catch (error) {
        logger.error('Failed to get canvas image data for history:', error);
        // Don't save history if canvas data unavailable
        return;
      }
      const entry: HistoryEntry = { imageData };

      // If layers are enabled, also save layer state
      if (useLayers) {
        entry.layerState = Layers._createLayerSnapshot();
      }

      // Remove any redo states
      history = history.slice(0, historyIndex + 1);

      // Add new state
      history.push(entry);

      // Limit history size - cache to IndexedDB when memory limit reached
      if (history.length >= maxMemoryHistory) {
        // Cache oldest entry to IndexedDB before removing
        const entryToCache = history[0];
        // Calculate the actual history index (before removal, index 0 is at historyIndex - (history.length - 1))
        // After removal, all indices shift down by 1, so we need to track the original index
        const cacheIndex = historyIndex - (history.length - 1); // Original index of entry at position 0
        if (entryToCache && projectId) {
          // Store entry before removal
          const cachedEntryData = entryToCache;
          // Create cache operation promise
          const cachePromise = (async () => {
            try {
              // OPTIMIZATION (Item 7): Use worker for compression to avoid blocking main thread
              let arrayBuffer: ArrayBuffer;
              try {
                // Try using history worker for compression (better for pixel art)
                if (WorkerManager.isHistoryWorkerAvailable()) {
                  arrayBuffer = await WorkerManager.compressImageDataAsync(
                    cachedEntryData.imageData
                  );
                } else {
                  // Fallback: use imageUtils if worker not available
                  arrayBuffer = await imageDataToArrayBuffer(
                    cachedEntryData.imageData,
                    'image/png'
                  );
                }
              } catch (workerError) {
                // Fallback to imageUtils if worker fails
                logger.warn('History worker compression failed, using fallback:', workerError);
                arrayBuffer = await imageDataToArrayBuffer(cachedEntryData.imageData, 'image/png');
              }

              const savedId = await indexedDBStorage.saveHistoryEntry(
                projectId,
                cacheIndex,
                arrayBuffer
              );
              // If saveHistoryEntry returns null, it means it failed gracefully
              // In that case, don't remove from memory to prevent data loss
              if (!savedId) {
                logger.warn('History entry cache failed, keeping in memory');
                // Remove from pending ops
                pendingCacheOps.delete(cacheIndex);
                return;
              }
              // Mark as cached and remove from memory only after successful cache
              cachedEntries.add(cacheIndex);
              // Only remove from memory if entry is still at position 0 (hasn't been accessed)
              if (history.length > 0 && history[0] === cachedEntryData) {
                history.shift();
                historyIndex--;
              }
              // Remove from pending ops
              pendingCacheOps.delete(cacheIndex);
            } catch (error) {
              logger.error('Failed to cache history entry:', error);
              // Don't remove from memory if cache fails to prevent data loss
              // Remove from pending ops
              pendingCacheOps.delete(cacheIndex);
            }
          })();
          // Track pending operation
          pendingCacheOps.set(cacheIndex, cachePromise);
        } else {
          // If no projectId, just remove from memory (no caching)
          history.shift();
          historyIndex--;
        }
      }

      // Also limit total history (including cached)
      if (history.length > maxHistory) {
        history.shift();
        historyIndex--;
      }

      historyIndex = history.length - 1;

      // Emit event for history change
      EventEmitter.emit('history:save', {
        index: historyIndex,
        length: history.length,
        canUndo: canUndo(),
        canRedo: canRedo(),
      });
    };

    // Use requestIdleCallback if available for better performance, otherwise use setTimeout
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(performSave, { timeout: 1000 }); // Max 1s delay
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(performSave, 0);
    }
  }

  /**
   * Save current canvas state to history with transaction grouping
   * Groups rapid consecutive actions (e.g., drawing strokes) into single undo units
   */
  function save(): void {
    // Clear existing grouping timer
    if (transactionGroupingTimer) {
      clearTimeout(transactionGroupingTimer);
      transactionGroupingTimer = null;
    }

    // Create a new save operation
    pendingSave = () => {
      saveInternal();
      pendingSave = null;
    };

    // Set timer to execute save after grouping delay
    transactionGroupingTimer = setTimeout(() => {
      if (pendingSave) {
        pendingSave();
      }
      transactionGroupingTimer = null;
      pendingSave = null;
    }, TRANSACTION_GROUPING_DELAY);
  }

  /**
   * Force immediate save (bypasses transaction grouping)
   * Use when you need to ensure a history point is saved immediately
   * Ensures layers are rendered to main canvas before capturing state
   */
  async function saveImmediate(): Promise<void> {
    // Clear grouping timer and pending save
    if (transactionGroupingTimer) {
      clearTimeout(transactionGroupingTimer);
      transactionGroupingTimer = null;
    }
    pendingSave = null;

    // If layers are enabled, ensure main canvas is updated before capturing state
    if (useLayers) {
      await Layers.renderSync();
    }

    // Save immediately (synchronously, no requestIdleCallback)
    let imageData: ImageData;
    try {
      imageData = Canvas.getImageData();
    } catch (error) {
      logger.error('Failed to get canvas image data for history:', error);
      // Don't save history if canvas data unavailable
      return;
    }
    const entry: HistoryEntry = { imageData };

    // If layers are enabled, also save layer state
    if (useLayers) {
      entry.layerState = Layers._createLayerSnapshot();
    }

    // Remove any redo states
    history = history.slice(0, historyIndex + 1);

    // Add new state
    history.push(entry);

    // Limit history size - cache to IndexedDB when memory limit reached
    if (history.length >= maxMemoryHistory) {
      // Cache oldest entry to IndexedDB before removing
      const entryToCache = history[0];
      // Calculate the actual history index (before removal, index 0 is at historyIndex - (history.length - 1))
      // After removal, all indices shift down by 1, so we need to track the original index
      const cacheIndex = historyIndex - (history.length - 1); // Original index of entry at position 0
      if (entryToCache && projectId) {
        // Store entry before removal
        const cachedEntryData = entryToCache;
        // Create cache operation promise (don't await - fire and forget for performance)
        const cachePromise = (async () => {
          try {
            // OPTIMIZATION (Item 7): Use worker for compression to avoid blocking main thread
            let arrayBuffer: ArrayBuffer;
            try {
              // Try using history worker for compression (better for pixel art)
              if (WorkerManager.isHistoryWorkerAvailable()) {
                arrayBuffer = await WorkerManager.compressImageDataAsync(
                  cachedEntryData.imageData
                );
              } else {
                // Fallback: use imageUtils if worker not available
                arrayBuffer = await imageDataToArrayBuffer(
                  cachedEntryData.imageData,
                  'image/png'
                );
              }
            } catch (workerError) {
              // Fallback to imageUtils if worker fails
              logger.warn('History worker compression failed, using fallback:', workerError);
              arrayBuffer = await imageDataToArrayBuffer(cachedEntryData.imageData, 'image/png');
            }

            const savedId = await indexedDBStorage.saveHistoryEntry(
              projectId,
              cacheIndex,
              arrayBuffer
            );
            // If saveHistoryEntry returns null, it means it failed gracefully
            // In that case, don't remove from memory to prevent data loss
            if (!savedId) {
              logger.warn('History entry cache failed, keeping in memory');
              // Remove from pending ops
              pendingCacheOps.delete(cacheIndex);
              return;
            }
            // Mark as cached and remove from memory only after successful cache
            cachedEntries.add(cacheIndex);
            // Only remove from memory if entry is still at position 0 (hasn't been accessed)
            if (history.length > 0 && history[0] === cachedEntryData) {
              history.shift();
              historyIndex--;
            }
            // Remove from pending ops
            pendingCacheOps.delete(cacheIndex);
          } catch (error) {
            logger.error('Failed to cache history entry:', error);
            // Don't remove from memory if cache fails to prevent data loss
            // Remove from pending ops
            pendingCacheOps.delete(cacheIndex);
          }
        })();
        // Track pending operation
        pendingCacheOps.set(cacheIndex, cachePromise);
      } else {
        // If no projectId, just remove from memory (no caching)
        history.shift();
        historyIndex--;
      }
    }

    // Also limit total history (including cached)
    if (history.length > maxHistory) {
      history.shift();
      historyIndex--;
    }

    historyIndex = history.length - 1;

    // Emit event for history change
    EventEmitter.emit('history:save', {
      index: historyIndex,
      length: history.length,
      canUndo: canUndo(),
      canRedo: canRedo(),
    });
  }

  /**
   * Load history entry from IndexedDB if cached
   */
  async function loadCachedEntry(targetIndex: number): Promise<HistoryEntry | null> {
    if (!projectId || !cachedEntries.has(targetIndex)) {
      return null;
    }

    try {
      const arrayBuffer = await indexedDBStorage.loadHistoryEntryByIndex(projectId, targetIndex);
      if (!arrayBuffer) {
        logger.warn(`Failed to load cached history entry at index ${targetIndex}`);
        return null;
      }

      // OPTIMIZATION (Item 7): Try using history worker for decompression first
      let imageData: ImageData;
      try {
        // Check if data is compressed (has format marker) or is PNG blob
        if (arrayBuffer.byteLength >= 9) {
          const view = new DataView(arrayBuffer);
          const format = view.getUint8(0);
          // Format 0 or 1 means our compressed format
          if (format === 0 || format === 1) {
            try {
              // Try using history worker for decompression
              if (WorkerManager.isHistoryWorkerAvailable()) {
                imageData = await WorkerManager.decompressImageDataAsync(arrayBuffer);
              } else {
                // Fallback to image loading if worker not available
                throw new Error('History worker not available');
              }
            } catch (decompressError) {
              // Fallback to image loading if decompression fails
              logger.warn('History worker decompression failed, using fallback:', decompressError);
              const blob = new Blob([arrayBuffer], { type: 'image/png' });
              imageData = await blobToImageData(blob);
            }
          } else {
            // Not our format, use image loading
            const blob = new Blob([arrayBuffer], { type: 'image/png' });
            imageData = await blobToImageData(blob);
          }
        } else {
          // Invalid buffer, try as PNG blob
          const blob = new Blob([arrayBuffer], { type: 'image/png' });
          imageData = await blobToImageData(blob);
        }
      } catch (workerError) {
        // Fallback: load as image (for PNG blobs from old format or worker unavailable)
        logger.warn('History decompression failed, using image fallback:', workerError);
        const blob = new Blob([arrayBuffer], { type: 'image/png' });
        imageData = await blobToImageData(blob);
      }

      const entry: HistoryEntry = { imageData };
      if (useLayers) {
        // Note: Layer state is not cached in current implementation
        // This would need to be enhanced to cache layer state as well
      }

      return entry;
    } catch (error) {
      logger.error(`Error loading cached history entry at index ${targetIndex}:`, error);
      return null;
    }
  }

  /**
   * Undo the last action
   */
  async function undoAsync(): Promise<boolean> {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;

      // Check if we need to wait for pending cache operations
      const pendingOp = pendingCacheOps.get(targetIndex);
      if (pendingOp) {
        await pendingOp;
      }

      // Validate index before accessing
      if (targetIndex < 0 || targetIndex >= history.length) {
        logger.error('History index out of bounds in undo:', targetIndex, history.length);
        return false;
      }

      let entry = history[targetIndex];

      // If entry not in memory, try loading from cache
      if (!entry && cachedEntries.has(targetIndex)) {
        const loadedEntry = await loadCachedEntry(targetIndex);
        if (loadedEntry) {
          entry = loadedEntry;
          // Restore entry to memory for faster future access
          history[targetIndex] = entry;
          // Optionally, we could unmark as cached, but keeping it cached is fine
        }
      }

      if (!entry) {
        logger.error('History entry is null at index:', targetIndex);
        // Show user-friendly error message
        EventEmitter.emit('history:error', {
          message: 'Unable to load history entry. The entry may have been lost.',
          index: targetIndex,
        });
        return false;
      }

      historyIndex = targetIndex;

      // Restore layer state if available
      if (useLayers && entry.layerState) {
        Layers._restoreLayersFromState(entry.layerState);
        // Wait for rendering to complete before emitting event
        await Layers.renderSync();
      } else {
        Canvas.putImageData(entry.imageData);
      }

      // Emit event for history change after rendering completes
      EventEmitter.emit('history:undo', {
        index: historyIndex,
        length: history.length,
        canUndo: canUndo(),
        canRedo: canRedo(),
      });

      return true;
    }
    return false;
  }

  /**
   * Undo the last action
   * Now async to ensure rendering completes before returning
   */
  async function undo(): Promise<boolean> {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const entry = history[targetIndex];

      if (entry) {
        // Entry is in memory, restore immediately
        historyIndex = targetIndex;
        if (useLayers && entry.layerState) {
          Layers._restoreLayersFromState(entry.layerState);
          // Wait for rendering to complete
          await Layers.renderSync();
        } else {
          Canvas.putImageData(entry.imageData);
        }
        EventEmitter.emit('history:undo', {
          index: historyIndex,
          length: history.length,
          canUndo: canUndo(),
          canRedo: canRedo(),
        });
        return true;
      } else if (cachedEntries.has(targetIndex)) {
        // Entry is cached, load asynchronously
        return await undoAsync();
      } else {
        // Entry doesn't exist
        logger.error('History entry not found at index:', targetIndex);
        EventEmitter.emit('history:error', {
          message: 'History entry not available. It may have been cleared.',
          index: targetIndex,
        });
        return false;
      }
    }
    return false;
  }

  /**
   * Redo the last undone action
   */
  async function redoAsync(): Promise<boolean> {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;

      // Check if we need to wait for pending cache operations
      const pendingOp = pendingCacheOps.get(targetIndex);
      if (pendingOp) {
        await pendingOp;
      }

      // Validate index before accessing
      if (targetIndex < 0 || targetIndex >= history.length) {
        logger.error('History index out of bounds in redo:', targetIndex, history.length);
        return false;
      }

      let entry = history[targetIndex];

      // If entry not in memory, try loading from cache
      if (!entry && cachedEntries.has(targetIndex)) {
        const loadedEntry = await loadCachedEntry(targetIndex);
        if (loadedEntry) {
          entry = loadedEntry;
          // Restore entry to memory for faster future access
          history[targetIndex] = entry;
        }
      }

      if (!entry) {
        logger.error('History entry is null at index:', targetIndex);
        // Show user-friendly error message
        EventEmitter.emit('history:error', {
          message: 'Unable to load history entry. The entry may have been lost.',
          index: targetIndex,
        });
        return false;
      }

      historyIndex = targetIndex;

      // Restore layer state if available
      if (useLayers && entry.layerState) {
        Layers._restoreLayersFromState(entry.layerState);
        // Wait for rendering to complete before emitting event
        await Layers.renderSync();
      } else {
        Canvas.putImageData(entry.imageData);
      }

      // Emit event for history change after rendering completes
      EventEmitter.emit('history:redo', {
        index: historyIndex,
        length: history.length,
        canUndo: canUndo(),
        canRedo: canRedo(),
      });

      return true;
    }
    return false;
  }

  /**
   * Redo the last undone action
   * Now async to ensure rendering completes before returning
   */
  async function redo(): Promise<boolean> {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const entry = history[targetIndex];

      if (entry) {
        // Entry is in memory, restore immediately
        historyIndex = targetIndex;
        if (useLayers && entry.layerState) {
          Layers._restoreLayersFromState(entry.layerState);
          // Wait for rendering to complete
          await Layers.renderSync();
        } else {
          Canvas.putImageData(entry.imageData);
        }
        EventEmitter.emit('history:redo', {
          index: historyIndex,
          length: history.length,
          canUndo: canUndo(),
          canRedo: canRedo(),
        });
        return true;
      } else if (cachedEntries.has(targetIndex)) {
        // Entry is cached, load asynchronously
        return await redoAsync();
      } else {
        // Entry doesn't exist
        logger.error('History entry not found at index:', targetIndex);
        EventEmitter.emit('history:error', {
          message: 'History entry not available. It may have been cleared.',
          index: targetIndex,
        });
        return false;
      }
    }
    return false;
  }

  /**
   * Check if history module is initialized
   */
  function isInitialized(): boolean {
    return isInitializedFlag;
  }

  /**
   * Check if undo is available
   */
  function canUndo(): boolean {
    if (!isInitializedFlag) {
      return false; // Safe default when not initialized
    }
    return historyIndex > 0;
  }

  /**
   * Check if redo is available
   */
  function canRedo(): boolean {
    if (!isInitializedFlag) {
      return false; // Safe default when not initialized
    }
    return historyIndex < history.length - 1;
  }

  /**
   * Clear all history
   */
  function clear(): void {
    history = [];
    historyIndex = -1;
    cachedEntries.clear();
    pendingCacheOps.clear();
    EventEmitter.emit('history:clear', {
      index: historyIndex,
      length: history.length,
      canUndo: canUndo(),
      canRedo: canRedo(),
    });
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
    saveImmediate, // Force immediate save (bypasses transaction grouping)
    undo,
    redo,
    canUndo,
    canRedo,
    isInitialized,
    clear,
    getIndex,
    getLength,
    setLayersEnabled,
    // Expose event emitter for components to subscribe
    on: EventEmitter.on.bind(EventEmitter),
    off: EventEmitter.off.bind(EventEmitter),
  };
})();

export default History;
