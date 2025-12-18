/**
 * One-Click Logo Cleaner
 * Combines multiple cleanup operations into a single pipeline
 */

import { removeStrayPixels, type StrayPixelOptions } from './strayPixels';
import { reduceColorNoise, type ColorReducerOptions } from './colorReducer';
import { crispEdges, type EdgeCrispenerOptions } from './edgeCrispener';
import { smoothEdges, type EdgeSmootherOptions } from './edgeSmoother';
import { perfectOutline, type OutlinePerfecterOptions } from './outlinePerfecter';
import { logger } from '../utils/logger';

export type LogoCleanerPreset =
  | 'logo-minimal'
  | 'logo-standard'
  | 'logo-aggressive'
  | 'icon-app-store'
  | 'game-asset'
  | 'print-ready';

export interface LogoCleanerOptions {
  preset?: LogoCleanerPreset;
  strayRemoval?: StrayPixelOptions;
  colorReduction?: ColorReducerOptions;
  edgeCrispening?: EdgeCrispenerOptions;
  edgeSmoothing?: EdgeSmootherOptions;
  outlinePerfecting?: OutlinePerfecterOptions;
}

/**
 * Get preset configuration
 */
function getPresetConfig(preset: LogoCleanerPreset): LogoCleanerOptions {
  switch (preset) {
    case 'logo-minimal':
      return {
        strayRemoval: { minSize: 2, merge: false, useWorker: true },
        colorReduction: { mode: 'auto-clean', threshold: 10, useWorker: true, useLab: true },
        edgeCrispening: { method: 'threshold', threshold: 180, useWorker: true },
        edgeSmoothing: { mode: 'subtle', strength: 30, preserveCorners: true, useWorker: true },
        outlinePerfecting: { closeGaps: true, maxGapSize: 2 },
      };

    case 'logo-standard':
      return {
        strayRemoval: { minSize: 3, merge: false, useWorker: true },
        colorReduction: { mode: 'auto-clean', threshold: 15, useWorker: true, useLab: true },
        edgeCrispening: { method: 'threshold', threshold: 200, useWorker: true },
        edgeSmoothing: { mode: 'standard', strength: 50, preserveCorners: true, useWorker: true },
        outlinePerfecting: {
          closeGaps: true,
          maxGapSize: 3,
          straightenLines: false,
          smoothCurves: false,
        },
      };

    case 'logo-aggressive':
      return {
        strayRemoval: { minSize: 5, merge: true, useWorker: true },
        colorReduction: { mode: 'quantize', nColors: 8, useWorker: true, useLab: true },
        edgeCrispening: { method: 'erode', erodePixels: 2, useWorker: true },
        edgeSmoothing: { mode: 'smooth', strength: 70, preserveCorners: false, useWorker: true },
        outlinePerfecting: {
          closeGaps: true,
          maxGapSize: 5,
          straightenLines: true,
          snapAngles: [0, 45, 90, 135],
          smoothCurves: true,
          smoothStrength: 60,
          sharpenCorners: true,
          cornerThreshold: 120,
        },
      };

    case 'icon-app-store':
      return {
        strayRemoval: { minSize: 2, merge: false, useWorker: true },
        colorReduction: { mode: 'quantize', nColors: 16, useWorker: true, useLab: true },
        edgeCrispening: { method: 'threshold', threshold: 220, useWorker: true },
        edgeSmoothing: { mode: 'pixel-perfect', strength: 20, preserveCorners: true, useWorker: true },
        outlinePerfecting: { closeGaps: true, maxGapSize: 1 },
      };

    case 'game-asset':
      return {
        strayRemoval: { minSize: 1, merge: false, useWorker: true },
        colorReduction: { mode: 'auto-clean', threshold: 12, useWorker: true, useLab: true },
        edgeCrispening: { method: 'threshold', threshold: 200, useWorker: true },
        edgeSmoothing: { mode: 'subtle', strength: 25, preserveCorners: true, useWorker: true },
        outlinePerfecting: { closeGaps: true, maxGapSize: 2 },
      };

    case 'print-ready':
      return {
        strayRemoval: { minSize: 4, merge: false, useWorker: true },
        colorReduction: { mode: 'auto-clean', threshold: 8, useWorker: true, useLab: true },
        edgeCrispening: { method: 'decontaminate', backgroundColor: { r: 255, g: 255, b: 255 }, useWorker: true },
        edgeSmoothing: { mode: 'smooth', strength: 60, preserveCorners: true, useWorker: true },
        outlinePerfecting: {
          closeGaps: true,
          maxGapSize: 3,
          straightenLines: true,
          snapAngles: [0, 45, 90, 135],
          smoothCurves: true,
          smoothStrength: 50,
          sharpenCorners: true,
          cornerThreshold: 130,
        },
      };

    default:
      return getPresetConfig('logo-standard');
  }
}

/**
 * Clean logo using preset or custom options
 */
export async function cleanLogo(
  imageData: ImageData,
  options: LogoCleanerOptions
): Promise<ImageData> {
  const { preset, strayRemoval, colorReduction, edgeCrispening, edgeSmoothing, outlinePerfecting } =
    options;

  let result = imageData;

  // Get preset config if preset is specified
  const presetConfig = preset ? getPresetConfig(preset) : {};

  // Merge preset with custom options (custom takes precedence)
  const finalStrayRemoval = strayRemoval || presetConfig.strayRemoval;
  const finalColorReduction = colorReduction || presetConfig.colorReduction;
  const finalEdgeCrispening = edgeCrispening || presetConfig.edgeCrispening;
  const finalEdgeSmoothing = edgeSmoothing || presetConfig.edgeSmoothing;
  const finalOutlinePerfecting = outlinePerfecting || presetConfig.outlinePerfecting;

  try {
    // Pipeline: Stray removal → Color reduction → Edge crispening → Edge smoothing → Outline perfecting

    if (finalStrayRemoval) {
      logger.debug('Logo cleaner: Removing stray pixels');
      result = await removeStrayPixels(result, finalStrayRemoval);
    }

    if (finalColorReduction) {
      logger.debug('Logo cleaner: Reducing color noise');
      result = await reduceColorNoise(result, finalColorReduction);
    }

    if (finalEdgeCrispening) {
      logger.debug('Logo cleaner: Crisping edges');
      result = await crispEdges(result, finalEdgeCrispening);
    }

    if (finalEdgeSmoothing) {
      logger.debug('Logo cleaner: Smoothing edges');
      result = await smoothEdges(result, finalEdgeSmoothing);
    }

    if (finalOutlinePerfecting) {
      logger.debug('Logo cleaner: Perfecting outline');
      result = await perfectOutline(result, finalOutlinePerfecting);
    }
  } catch (error) {
    logger.error('Logo cleaner pipeline failed:', error);
    throw error;
  }

  return result;
}
