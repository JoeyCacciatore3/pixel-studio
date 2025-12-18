'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Canvas from '@/lib/canvas';
import WorkerManager from '@/lib/workers/workerManager';
import { logger } from '@/lib/utils/logger';
import { useAppState } from '@/hooks/useAppState';
import History from '@/lib/history';

export default function Header() {
  const state = useAppState();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Update CSS variables when current color changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--current-color', state.currentColor);
    }
  }, [state.currentColor]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    logger.debug('[Header] Image upload started', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    try {
      // Validate file using image worker
      if (!WorkerManager.isImageWorkerAvailable()) {
        // Initialize image worker if not available
        try {
          WorkerManager.initImageWorker();
        } catch (error) {
          logger.warn('[Header] Image worker not available, skipping validation', error);
        }
      }

      if (WorkerManager.isImageWorkerAvailable()) {
        logger.debug('[Header] Validating image file');
        try {
          const validation = await WorkerManager.validateImageAsync(file);
          logger.debug('[Header] Image validation result', validation);
        } catch (validationError) {
          const errorMessage =
            validationError instanceof Error
              ? validationError.message
              : 'Image validation failed';
          logger.error('[Header] Image validation failed', validationError);
          setUploadError(errorMessage);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          setIsUploading(false);
          return;
        }
      }

      // Load image using Image() object (required for Canvas.loadImage)
      logger.debug('[Header] Loading image');
      const objectURL = URL.createObjectURL(file);
      const img = new Image();

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          logger.debug('[Header] Image loaded successfully', {
            width: img.width,
            height: img.height,
          });
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectURL);
          reject(new Error('Failed to load image. The file may be corrupted or in an unsupported format.'));
        };
        img.src = objectURL;
      });

      // Verify canvas is initialized before loading image
      if (!Canvas.isInitialized()) {
        throw new Error('Canvas is not initialized. Please wait for the application to finish loading.');
      }

      // Create new layer with image (use filename if available)
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      const layerName = fileName || undefined; // Use filename or let it default

      logger.debug('[Header] Creating layer and loading image to canvas', { layerName });
      await Canvas.loadImage(img, true, layerName);
      await History.saveImmediate();

      logger.debug('[Header] Image upload completed successfully');
      // Clear error on success
      setUploadError(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to upload image. Please try again.';
      logger.error('[Header] Failed to load image:', error);
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  const handleExport = useCallback(() => {
    try {
      const dataURL = Canvas.toDataURL();
      if (!dataURL) {
        throw new Error('Export failed: empty data URL');
      }
      const link = document.createElement('a');
      link.download = 'pixel-studio-artwork.png';
      link.href = dataURL;
      link.click();
    } catch (error) {
      logger.error('Export failed:', error);
      // Show user-friendly error message with more details
      const errorMessage =
        error instanceof Error
          ? error.message.includes('not available')
            ? 'Canvas is not ready for export. Please wait a moment and try again.'
            : error.message.includes('CORS')
              ? 'Export failed due to security restrictions. Please ensure the canvas content is from the same origin.'
              : `Export failed: ${error.message}`
          : 'Failed to export image. The canvas may be too large or the operation was interrupted.';
      alert(errorMessage);
    }
  }, []);

  return (
    <header className="header" role="banner" data-testid="main-header">
      <div className="logo" aria-label="Pixel Studio">
        <div className="logo-icon" aria-hidden="true">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
          </svg>
        </div>
        <span>Pixel Studio</span>
      </div>
      <nav className="header-actions" aria-label="Main actions" data-testid="main-nav">
        <button
          className="header-btn"
          onClick={handleUpload}
          id="uploadBtn"
          data-testid="testid-upload-btn"
          disabled={isUploading}
          aria-label="Upload image"
          title={isUploading ? 'Uploading...' : 'Upload image'}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          Upload
        </button>
        <button
          className="header-btn primary"
          onClick={handleExport}
          id="exportBtn"
          data-testid="testid-export-btn"
          aria-label="Export artwork"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export
        </button>
      </nav>
      {uploadError && (
        <div
          className="upload-error"
          role="alert"
          aria-live="polite"
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: 'var(--error-bg, #ef4444)',
            color: 'var(--error-text, #ffffff)',
            borderRadius: '4px',
            fontSize: '14px',
            zIndex: 1000,
            maxWidth: '400px',
            textAlign: 'center',
          }}
        >
          {uploadError}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        id="imageUpload"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
        aria-label="Upload image file"
        data-testid="file-input"
      />
    </header>
  );
}
