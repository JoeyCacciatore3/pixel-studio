/**
 * Application Constants
 * Shared constants used across the application to avoid magic numbers
 */

// Canvas dimensions
export const DEFAULT_CANVAS_WIDTH = 512;
export const DEFAULT_CANVAS_HEIGHT = 512;

// Timing constants (in milliseconds)
export const DEBOUNCE_DELAY = 300;
export const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
export const MIN_SAVE_INTERVAL = 5000; // 5 seconds
export const DOUBLE_TAP_DELAY = 300;

// Timeout constants (in milliseconds)
export const DEFAULT_TIMEOUT = 5000;
export const SHORT_TIMEOUT = 3000;
export const MEDIUM_TIMEOUT = 15000;
export const LONG_TIMEOUT = 30000;
export const EXTENDED_TIMEOUT = 45000;

// Image validation constants
export const VALID_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
] as const;

export const MAX_IMAGE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_IMAGE_DIMENSION = 8192;

// Type exports
export type ValidImageType = (typeof VALID_IMAGE_TYPES)[number];
