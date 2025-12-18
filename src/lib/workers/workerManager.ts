/**
 * Web Worker Manager
 * Manages worker lifecycle, pooling, and message queuing for performance-critical operations
 */

import type { BlendMode } from '../blendModes';
import { logger } from '../utils/logger';
import { DEFAULT_TIMEOUT } from '../constants';
import { createWorkerFromCode, terminateWorker } from './createWorker';
import { getBlendWorkerCode } from './blendWorker';
import { getHistoryWorkerCode } from './historyWorker';
import { getImageWorkerCode } from './imageWorker';
import { getCleanupWorkerCode } from './cleanupWorker';

interface BlendWorkerMessage {
  type: 'blend';
  data: {
    base: ImageData;
    overlay: ImageData;
    blendMode: BlendMode;
    opacity: number;
  };
  id: string;
}

interface BlendWorkerResponse {
  type: 'success' | 'error';
  data?: ImageData;
  error?: string;
  id: string;
}

interface HistoryWorkerMessage {
  type: 'compress' | 'decompress';
  data: {
    imageData?: ImageData;
    compressed?: ArrayBuffer;
  };
  id: string;
}

interface HistoryWorkerResponse {
  type: 'success' | 'error';
  data?: {
    compressed?: ArrayBuffer;
    imageData?: ImageData;
  };
  error?: string;
  id: string;
}

interface ImageWorkerMessage {
  type: 'validate' | 'process';
  data: {
    file: File;
  };
  id: string;
}

interface ImageWorkerResponse {
  type: 'success' | 'error';
  data?: {
    valid?: boolean;
    width?: number;
    height?: number;
    format?: string;
    imageData?: ImageData;
  };
  error?: string;
  id: string;
}

type BlendCallback = (result: ImageData | null, error: string | null) => void;
type HistoryCallback = (result: ArrayBuffer | ImageData | null, error: string | null) => void;
type ImageCallback = (result: ImageWorkerResponse['data'] | null, error: string | null) => void;
type ProgressCallback = (progress: number, stage?: string) => void;

/**
 * Worker Manager Module
 * Handles worker creation, pooling, and message queuing
 */
const WorkerManager = (function () {
  let blendWorker: Worker | null = null;
  let historyWorker: Worker | null = null;
  let imageWorker: Worker | null = null;
  let cleanupWorker: Worker | null = null;
  let blendWorkerAvailable = true;
  let historyWorkerAvailable = true;
  let imageWorkerAvailable = true;
  let cleanupWorkerAvailable = true;
  let pendingBlends: Map<string, BlendCallback> = new Map();
  let pendingHistoryOps: Map<string, HistoryCallback> = new Map();
  let pendingImageOps: Map<string, ImageCallback> = new Map();
  let pendingCleanupOps: Map<
    string,
    (
      result: ImageData | Float32Array | null,
      error: string | null
    ) => void | {
      callback: (result: ImageData | Float32Array | null, error: string | null) => void;
      progressCallback?: ProgressCallback;
    }
  > = new Map();
  let blendIdCounter = 0;
  let historyIdCounter = 0;
  let imageIdCounter = 0;
  let cleanupIdCounter = 0;

  /**
   * Check if Web Workers are supported
   */
  function isWorkerSupported(): boolean {
    return typeof Worker !== 'undefined';
  }

  /**
   * Initialize blend worker
   * Requires modern browser with Worker support - no fallbacks
   */
  function initBlendWorker(): boolean {
    if (!isWorkerSupported()) {
      // In test environments, workers may not be available - return false instead of throwing
      if (
        typeof process !== 'undefined' &&
        (process.env.NODE_ENV === 'test' || process.env.VITEST)
      ) {
        return false;
      }
      throw new Error('Web Workers are required but not supported in this environment');
    }

    if (typeof window === 'undefined') {
      // SSR - workers cannot be initialized on server
      return false;
    }

    try {
      // Create worker from code string using Blob URL
      const workerCode = getBlendWorkerCode();
      blendWorker = createWorkerFromCode(workerCode);

      blendWorker.onmessage = (e: MessageEvent<BlendWorkerResponse>) => {
        const { id, type, data, error } = e.data;
        const callback = pendingBlends.get(id);
        if (callback) {
          pendingBlends.delete(id);
          if (type === 'success' && data) {
            callback(data, null);
          } else {
            callback(null, error || 'Unknown error');
          }
        }
      };

      blendWorker.onerror = (errorEvent) => {
        // Extract error information from ErrorEvent
        // Log properties individually to ensure they're visible
        const message = errorEvent.message ?? 'Unknown error';
        const filename = errorEvent.filename ?? 'unknown';
        const lineno = errorEvent.lineno ?? 0;
        const colno = errorEvent.colno ?? 0;
        const error = errorEvent.error;

        // Construct informative error message
        const errorMessage = `Blend worker error - Message: ${message}, File: ${filename}, Line: ${lineno}, Column: ${colno}`;
        const errorDetails =
          error instanceof Error
            ? `Error: ${error.message}${error.stack ? `\nStack: ${error.stack}` : ''}`
            : error
              ? `Error object: ${String(error)}`
              : 'No error object available';

        // Log with separate arguments for better visibility
        logger.error(errorMessage);
        if (errorDetails !== 'No error object available') {
          logger.error(errorDetails);
        }

        blendWorkerAvailable = false;
        // Reject all pending operations
        for (const [, callback] of pendingBlends.entries()) {
          callback(null, 'Worker error occurred');
        }
        pendingBlends.clear();
      };

      return true;
    } catch (error) {
      blendWorkerAvailable = false;
      throw new Error(
        `Failed to initialize blend worker: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Initialize history worker
   * Requires modern browser with Worker support - no fallbacks
   */
  function initHistoryWorker(): boolean {
    if (!isWorkerSupported()) {
      throw new Error('Web Workers are required but not supported in this environment');
    }

    if (typeof window === 'undefined') {
      // SSR - workers cannot be initialized on server
      return false;
    }

    try {
      // Create worker from code string using Blob URL
      const workerCode = getHistoryWorkerCode();
      historyWorker = createWorkerFromCode(workerCode);

      historyWorker.onmessage = (e: MessageEvent<HistoryWorkerResponse>) => {
        const { id, type, data, error } = e.data;
        const callback = pendingHistoryOps.get(id);
        if (callback) {
          pendingHistoryOps.delete(id);
          if (type === 'success' && data) {
            callback(data.compressed || data.imageData || null, null);
          } else {
            callback(null, error || 'Unknown error');
          }
        }
      };

      historyWorker.onerror = (errorEvent) => {
        // Extract error information from ErrorEvent
        // Log properties individually to ensure they're visible
        const message = errorEvent.message ?? 'Unknown error';
        const filename = errorEvent.filename ?? 'unknown';
        const lineno = errorEvent.lineno ?? 0;
        const colno = errorEvent.colno ?? 0;
        const error = errorEvent.error;

        // Construct informative error message
        const errorMessage = `History worker error - Message: ${message}, File: ${filename}, Line: ${lineno}, Column: ${colno}`;
        const errorDetails =
          error instanceof Error
            ? `Error: ${error.message}${error.stack ? `\nStack: ${error.stack}` : ''}`
            : error
              ? `Error object: ${String(error)}`
              : 'No error object available';

        // Log with separate arguments for better visibility
        logger.error(errorMessage);
        if (errorDetails !== 'No error object available') {
          logger.error(errorDetails);
        }

        historyWorkerAvailable = false;
        // Reject all pending operations
        for (const [, callback] of pendingHistoryOps.entries()) {
          callback(null, 'Worker error occurred');
        }
        pendingHistoryOps.clear();
      };

      return true;
    } catch (error) {
      historyWorkerAvailable = false;
      throw new Error(
        `Failed to initialize history worker: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Apply blend mode using worker (async)
   * Requires worker to be available - no fallbacks
   */
  /**
   * Compress ImageData using history worker (async)
   * Requires worker to be available - falls back gracefully if not
   */
  async function compressImageDataAsync(imageData: ImageData): Promise<ArrayBuffer> {
    if (!historyWorkerAvailable || !historyWorker) {
      throw new Error('History worker is not available. Call initHistoryWorker() first.');
    }

    return new Promise<ArrayBuffer>((resolve, reject) => {
      const id = `compress_${historyIdCounter++}_${Date.now()}`;

      // Set timeout for worker operations
      const timeout = setTimeout(() => {
        const pendingCallback = pendingHistoryOps.get(id);
        if (pendingCallback) {
          pendingHistoryOps.delete(id);
          reject(new Error('History compression timeout'));
        }
      }, DEFAULT_TIMEOUT);

      pendingHistoryOps.set(id, (result, error) => {
        clearTimeout(timeout);
        if (error) {
          reject(new Error(`History compression failed: ${error}`));
        } else if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          reject(new Error('No compressed result from worker'));
        }
      });

      try {
        if (!historyWorker) {
          throw new Error('Worker not available');
        }

        const message: HistoryWorkerMessage = {
          type: 'compress',
          data: { imageData },
          id,
        };

        // Transfer ImageData buffer for zero-copy
        historyWorker.postMessage(message, [imageData.data.buffer]);
      } catch (error) {
        clearTimeout(timeout);
        pendingHistoryOps.delete(id);
        reject(error instanceof Error ? error : new Error('Failed to send message to worker'));
      }
    });
  }

  /**
   * Decompress ArrayBuffer to ImageData using history worker (async)
   * Requires worker to be available - falls back gracefully if not
   */
  async function decompressImageDataAsync(compressed: ArrayBuffer): Promise<ImageData> {
    if (!historyWorkerAvailable || !historyWorker) {
      throw new Error('History worker is not available. Call initHistoryWorker() first.');
    }

    return new Promise<ImageData>((resolve, reject) => {
      const id = `decompress_${historyIdCounter++}_${Date.now()}`;

      // Set timeout for worker operations
      const timeout = setTimeout(() => {
        const pendingCallback = pendingHistoryOps.get(id);
        if (pendingCallback) {
          pendingHistoryOps.delete(id);
          reject(new Error('History decompression timeout'));
        }
      }, DEFAULT_TIMEOUT);

      pendingHistoryOps.set(id, (result, error) => {
        clearTimeout(timeout);
        if (error) {
          reject(new Error(`History decompression failed: ${error}`));
        } else if (result instanceof ImageData) {
          resolve(result);
        } else {
          reject(new Error('No image data result from worker'));
        }
      });

      try {
        if (!historyWorker) {
          throw new Error('Worker not available');
        }

        const message: HistoryWorkerMessage = {
          type: 'decompress',
          data: { compressed },
          id,
        };

        // Transfer ArrayBuffer for zero-copy
        historyWorker.postMessage(message, [compressed]);
      } catch (error) {
        clearTimeout(timeout);
        pendingHistoryOps.delete(id);
        reject(error instanceof Error ? error : new Error('Failed to send message to worker'));
      }
    });
  }

  async function applyBlendModeAsync(
    base: ImageData,
    overlay: ImageData,
    blendMode: BlendMode,
    opacity: number
  ): Promise<ImageData> {
    if (!blendWorkerAvailable || !blendWorker) {
      throw new Error('Blend worker is not available. Call initBlendWorker() first.');
    }

    return new Promise<ImageData>((resolve, reject) => {
      const id = `blend_${blendIdCounter++}_${Date.now()}`;

      // Set timeout for worker operations
      const timeout = setTimeout(() => {
        const pendingCallback = pendingBlends.get(id);
        if (pendingCallback) {
          pendingBlends.delete(id);
          // Timeout - reject with error, no fallback
          pendingCallback(null, 'Worker operation timed out');
        }
      }, DEFAULT_TIMEOUT);

      pendingBlends.set(id, (result, error) => {
        clearTimeout(timeout);
        if (error) {
          // Reject on error - no fallback
          reject(new Error(`Worker blend operation failed: ${error}`));
        } else if (result) {
          resolve(result);
        } else {
          reject(new Error('No result from worker'));
        }
      });

      try {
        if (!blendWorker) {
          throw new Error('Worker not available');
        }

        // Transfer ImageData buffers for zero-copy
        const message: BlendWorkerMessage = {
          type: 'blend',
          data: {
            base,
            overlay,
            blendMode,
            opacity,
          },
          id,
        };

        // Transfer ownership of ImageData buffers
        blendWorker.postMessage(message, [base.data.buffer, overlay.data.buffer]);
      } catch (error) {
        clearTimeout(timeout);
        pendingBlends.delete(id);
        // Reject on error - no fallback
        reject(error instanceof Error ? error : new Error('Failed to send message to worker'));
      }
    });
  }

  /**
   * Initialize image worker
   * Requires modern browser with Worker support - no fallbacks
   */
  function initImageWorker(): boolean {
    if (!isWorkerSupported()) {
      throw new Error('Web Workers are required but not supported in this environment');
    }

    if (typeof window === 'undefined') {
      // SSR - workers cannot be initialized on server
      return false;
    }

    try {
      // Create worker from code string using Blob URL
      const workerCode = getImageWorkerCode();
      imageWorker = createWorkerFromCode(workerCode);

      imageWorker.onmessage = (e: MessageEvent<ImageWorkerResponse>) => {
        const { id, type, data, error } = e.data;
        const callback = pendingImageOps.get(id);
        if (callback) {
          pendingImageOps.delete(id);
          if (type === 'success' && data) {
            callback(data, null);
          } else {
            callback(null, error || 'Unknown error');
          }
        }
      };

      imageWorker.onerror = (errorEvent) => {
        // Extract error information from ErrorEvent
        // Log properties individually to ensure they're visible
        const message = errorEvent.message ?? 'Unknown error';
        const filename = errorEvent.filename ?? 'unknown';
        const lineno = errorEvent.lineno ?? 0;
        const colno = errorEvent.colno ?? 0;
        const error = errorEvent.error;

        // Construct informative error message
        const errorMessage = `Image worker error - Message: ${message}, File: ${filename}, Line: ${lineno}, Column: ${colno}`;
        const errorDetails =
          error instanceof Error
            ? `Error: ${error.message}${error.stack ? `\nStack: ${error.stack}` : ''}`
            : error
              ? `Error object: ${String(error)}`
              : 'No error object available';

        // Log with separate arguments for better visibility
        logger.error(errorMessage);
        if (errorDetails !== 'No error object available') {
          logger.error(errorDetails);
        }

        imageWorkerAvailable = false;
        // Reject all pending operations
        for (const [, callback] of pendingImageOps.entries()) {
          callback(null, 'Worker error occurred');
        }
        pendingImageOps.clear();
      };

      return true;
    } catch (error) {
      imageWorkerAvailable = false;
      throw new Error(
        `Failed to initialize image worker: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate image file using image worker (async)
   */
  async function validateImageAsync(file: File): Promise<{
    valid: boolean;
    width?: number;
    height?: number;
    format?: string;
  }> {
    if (!imageWorkerAvailable || !imageWorker) {
      throw new Error('Image worker is not available. Call initImageWorker() first.');
    }

    return new Promise<{
      valid: boolean;
      width?: number;
      height?: number;
      format?: string;
    }>((resolve, reject) => {
      const id = `validate_${imageIdCounter++}_${Date.now()}`;

      // Set timeout for worker operations
      const timeout = setTimeout(() => {
        const pendingCallback = pendingImageOps.get(id);
        if (pendingCallback) {
          pendingImageOps.delete(id);
          reject(new Error('Image validation timeout'));
        }
      }, DEFAULT_TIMEOUT);

      pendingImageOps.set(id, (result, error) => {
        clearTimeout(timeout);
        if (error) {
          reject(new Error(`Image validation failed: ${error}`));
        } else if (result?.valid) {
          resolve({
            valid: true,
            width: result.width,
            height: result.height,
            format: result.format,
          });
        } else {
          reject(new Error('Image validation returned invalid result'));
        }
      });

      try {
        if (!imageWorker) {
          throw new Error('Worker not available');
        }

        const message: ImageWorkerMessage = {
          type: 'validate',
          data: { file },
          id,
        };

        imageWorker.postMessage(message);
      } catch (error) {
        clearTimeout(timeout);
        pendingImageOps.delete(id);
        reject(error instanceof Error ? error : new Error('Failed to send message to worker'));
      }
    });
  }

  /**
   * Process image file using image worker (async)
   */
  async function processImageAsync(file: File): Promise<{
    imageData: ImageData;
    width: number;
    height: number;
    format: string;
  }> {
    if (!imageWorkerAvailable || !imageWorker) {
      throw new Error('Image worker is not available. Call initImageWorker() first.');
    }

    return new Promise<{
      imageData: ImageData;
      width: number;
      height: number;
      format: string;
    }>((resolve, reject) => {
      const id = `process_${imageIdCounter++}_${Date.now()}`;

      // Set timeout for worker operations
      const timeout = setTimeout(() => {
        const pendingCallback = pendingImageOps.get(id);
        if (pendingCallback) {
          pendingImageOps.delete(id);
          reject(new Error('Image processing timeout'));
        }
      }, DEFAULT_TIMEOUT);

      pendingImageOps.set(id, (result, error) => {
        clearTimeout(timeout);
        if (error) {
          reject(new Error(`Image processing failed: ${error}`));
        } else if (result?.imageData && result.width && result.height) {
          resolve({
            imageData: result.imageData,
            width: result.width,
            height: result.height,
            format: result.format || file.type,
          });
        } else {
          reject(new Error('Image processing returned invalid result'));
        }
      });

      try {
        if (!imageWorker) {
          throw new Error('Worker not available');
        }

        const message: ImageWorkerMessage = {
          type: 'process',
          data: { file },
          id,
        };

        imageWorker.postMessage(message);
      } catch (error) {
        clearTimeout(timeout);
        pendingImageOps.delete(id);
        reject(error instanceof Error ? error : new Error('Failed to send message to worker'));
      }
    });
  }

  /**
   * Initialize cleanup worker
   */
  function initCleanupWorker(): boolean {
    if (!isWorkerSupported()) {
      throw new Error('Web Workers are required but not supported in this environment');
    }

    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const workerCode = getCleanupWorkerCode();
      cleanupWorker = createWorkerFromCode(workerCode);

      cleanupWorker.onmessage = (
        e: MessageEvent<{
          type: 'success' | 'error' | 'progress';
          data?: {
            imageData?: ImageData;
            edgeMap?: Float32Array;
            palette?: Array<{ r: number; g: number; b: number }>;
          };
          error?: string;
          progress?: number;
          stage?: string;
          id: string;
        }>
      ) => {
        const { id, type, data, error, progress, stage } = e.data;
        const callbackData = pendingCleanupOps.get(id);

        if (type === 'progress') {
          // Handle progress updates
          if (
            callbackData &&
            typeof callbackData === 'object' &&
            'progressCallback' in callbackData
          ) {
            const { progressCallback } = callbackData as { progressCallback?: ProgressCallback };
            if (progressCallback && progress !== undefined) {
              progressCallback(progress, stage);
            }
          }
          return;
        }

        const callback =
          typeof callbackData === 'function'
            ? callbackData
            : callbackData && typeof callbackData === 'object'
              ? (
                  callbackData as {
                    callback?: (
                      result: ImageData | Float32Array | null,
                      error: string | null
                    ) => void;
                  }
                )?.callback
              : undefined;

        if (callback) {
          pendingCleanupOps.delete(id);
          if (type === 'success' && data) {
            callback(data.imageData || data.edgeMap || null, null);
          } else {
            callback(null, error || 'Unknown error');
          }
        }
      };

      cleanupWorker.onerror = (errorEvent) => {
        const message = errorEvent.message ?? 'Unknown error';
        logger.error(`Cleanup worker error: ${message}`);
        cleanupWorkerAvailable = false;
        for (const [, callback] of pendingCleanupOps.entries()) {
          callback(null, 'Worker error occurred');
        }
        pendingCleanupOps.clear();
      };

      return true;
    } catch (error) {
      cleanupWorkerAvailable = false;
      throw new Error(
        `Failed to initialize cleanup worker: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute cleanup operation in worker
   */
  async function executeCleanupOperation(
    operation: 'remove-stray-pixels' | 'quantize-colors' | 'detect-edges' | 'morphology',
    data: {
      imageData?: ImageData;
      minSize?: number;
      merge?: boolean;
      nColors?: number;
      operation?: 'erode' | 'dilate';
      kernelSize?: number;
    },
    progressCallback?: ProgressCallback
  ): Promise<ImageData | Float32Array> {
    if (!cleanupWorkerAvailable || !cleanupWorker) {
      throw new Error('Cleanup worker is not available. Call initCleanupWorker() first.');
    }

    return new Promise<ImageData | Float32Array>((resolve, reject) => {
      const id = `cleanup_${cleanupIdCounter++}_${Date.now()}`;

      const timeout = setTimeout(() => {
        const pendingCallback = pendingCleanupOps.get(id);
        if (pendingCallback) {
          pendingCleanupOps.delete(id);
          reject(new Error('Cleanup operation timeout'));
        }
      }, 30000); // 30 second timeout for cleanup operations

      const callback = (result: ImageData | Float32Array | null, error: string | null) => {
        clearTimeout(timeout);
        if (error) {
          reject(new Error(`Cleanup operation failed: ${error}`));
        } else if (result) {
          resolve(result);
        } else {
          reject(new Error('No result from cleanup worker'));
        }
      };

      if (progressCallback) {
        const cleanupCallbackData = {
          callback,
          progressCallback,
        };
        pendingCleanupOps.set(
          id,
          cleanupCallbackData as unknown as (
            result: ImageData | Float32Array | null,
            error: string | null
          ) => void | {
            callback: (result: ImageData | Float32Array | null, error: string | null) => void;
            progressCallback?: ProgressCallback;
          }
        );
      } else {
        pendingCleanupOps.set(id, callback);
      }

      try {
        if (!cleanupWorker) {
          throw new Error('Worker not available');
        }

        const message = {
          type: operation,
          data,
          id,
        };

        if (data.imageData) {
          cleanupWorker.postMessage(message, [data.imageData.data.buffer]);
        } else {
          cleanupWorker.postMessage(message);
        }
      } catch (error) {
        clearTimeout(timeout);
        pendingCleanupOps.delete(id);
        reject(error instanceof Error ? error : new Error('Failed to send message to worker'));
      }
    });
  }

  /**
   * Terminate all workers and cleanup
   */
  function terminate(): void {
    if (blendWorker) {
      terminateWorker(blendWorker);
      blendWorker = null;
    }
    if (historyWorker) {
      terminateWorker(historyWorker);
      historyWorker = null;
    }
    if (imageWorker) {
      terminateWorker(imageWorker);
      imageWorker = null;
    }
    if (cleanupWorker) {
      terminateWorker(cleanupWorker);
      cleanupWorker = null;
    }
    pendingBlends.clear();
    pendingHistoryOps.clear();
    pendingImageOps.clear();
    pendingCleanupOps.clear();
    blendWorkerAvailable = false;
    historyWorkerAvailable = false;
    imageWorkerAvailable = false;
    cleanupWorkerAvailable = false;
  }

  /**
   * Check if blend worker is available
   */
  function isAvailable(): boolean {
    return blendWorkerAvailable && blendWorker !== null;
  }

  /**
   * Check if history worker is available
   */
  function isHistoryWorkerAvailable(): boolean {
    return historyWorkerAvailable && historyWorker !== null;
  }

  /**
   * Check if image worker is available
   */
  function isImageWorkerAvailable(): boolean {
    return imageWorkerAvailable && imageWorker !== null;
  }

  /**
   * Check if cleanup worker is available
   */
  function isCleanupWorkerAvailable(): boolean {
    return cleanupWorkerAvailable && cleanupWorker !== null;
  }

  return {
    initBlendWorker,
    initHistoryWorker,
    initImageWorker,
    initCleanupWorker,
    applyBlendModeAsync,
    compressImageDataAsync,
    decompressImageDataAsync,
    validateImageAsync,
    processImageAsync,
    executeCleanupOperation,
    terminate,
    isAvailable,
    isHistoryWorkerAvailable,
    isImageWorkerAvailable,
    isCleanupWorkerAvailable,
  };
})();

export default WorkerManager;
