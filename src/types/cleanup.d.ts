/**
 * Type definitions for cleanup tool options
 */

/**
 * Color reducer cleanup mode
 */
export type CleanupMode = 'auto-clean' | 'palette-lock' | 'quantize';

/**
 * Edge crispen method
 */
export type CleanupMethod = 'threshold' | 'erode' | 'decontaminate';

/**
 * Edge smoother mode
 */
export type EdgeSmootherMode = 'subtle' | 'standard' | 'smooth' | 'pixel-perfect';

/**
 * Logo cleaner preset
 */
export type LogoCleanerPreset =
  | 'logo-minimal'
  | 'logo-standard'
  | 'logo-aggressive'
  | 'icon-app-store'
  | 'game-asset'
  | 'print-ready';
