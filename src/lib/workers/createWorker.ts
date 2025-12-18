/**
 * Worker Factory Utility
 * Creates Web Workers from code strings using Blob URLs
 * This eliminates the need for separate worker files and build plugins
 */

/**
 * Creates a Web Worker from a code string
 * @param workerCode - The worker code as a string
 * @returns A Worker instance
 */
export function createWorkerFromCode(workerCode: string): Worker {
  if (typeof window === 'undefined') {
    throw new Error('Workers can only be created in the browser');
  }

  if (typeof Worker === 'undefined') {
    throw new Error('Web Workers are not supported in this environment');
  }

  // Create a Blob from the worker code
  const blob = new Blob([workerCode], { type: 'application/javascript' });

  // Create a URL for the Blob
  const blobUrl = URL.createObjectURL(blob);

  // Create the worker from the Blob URL
  const worker = new Worker(blobUrl, { type: 'classic' });

  // Store the blob URL on the worker for cleanup
  (worker as Worker & { _blobUrl?: string })._blobUrl = blobUrl;

  return worker;
}

/**
 * Terminates a worker and revokes its Blob URL
 * @param worker - The worker to terminate
 */
export function terminateWorker(worker: Worker): void {
  const workerWithUrl = worker as Worker & { _blobUrl?: string };

  if (workerWithUrl._blobUrl) {
    URL.revokeObjectURL(workerWithUrl._blobUrl);
    workerWithUrl._blobUrl = undefined;
  }

  worker.terminate();
}
