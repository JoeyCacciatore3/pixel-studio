/**
 * Brush Helpers
 * Utility functions for brush calculations, pressure curves, and spacing
 */

import type { PressureCurveType } from '../types';

/**
 * Apply pressure curve to a pressure value
 */
export function applyPressureCurve(pressure: number, curveType: PressureCurveType): number {
  // Clamp pressure to 0-1
  const clampedPressure = Math.max(0, Math.min(1, pressure));

  switch (curveType) {
    case 'linear':
      return clampedPressure;
    case 'ease-in':
      return clampedPressure * clampedPressure;
    case 'ease-out':
      return 1 - (1 - clampedPressure) * (1 - clampedPressure);
    case 'ease-in-out':
      return clampedPressure < 0.5
        ? 2 * clampedPressure * clampedPressure
        : 1 - Math.pow(-2 * clampedPressure + 2, 2) / 2;
    case 'custom':
      // Default to linear for custom (will be overridden by actual curve points)
      return clampedPressure;
    default:
      return clampedPressure;
  }
}

/**
 * Calculate brush size with pressure
 */
export function calculateBrushSize(
  baseSize: number,
  pressure: number,
  pressureEnabled: boolean,
  pressureSize: boolean,
  pressureCurve: PressureCurveType
): number {
  if (!pressureEnabled || !pressureSize || pressure === 0.5) {
    return baseSize;
  }
  const curveValue = applyPressureCurve(pressure, pressureCurve);
  // Map pressure to size: 0.0 = 0.3x, 1.0 = 1.0x (common in professional tools)
  const sizeMultiplier = 0.3 + curveValue * 0.7;
  return Math.max(1, baseSize * sizeMultiplier);
}

/**
 * Calculate brush opacity with pressure
 */
export function calculateBrushOpacity(
  baseOpacity: number,
  pressure: number,
  pressureEnabled: boolean,
  pressureOpacity: boolean,
  pressureCurve: PressureCurveType
): number {
  if (!pressureEnabled || !pressureOpacity || pressure === 0.5) {
    return baseOpacity;
  }
  const curveValue = applyPressureCurve(pressure, pressureCurve);
  return baseOpacity * curveValue;
}

/**
 * Calculate brush flow with pressure
 */
export function calculateBrushFlow(
  baseFlow: number,
  pressure: number,
  pressureEnabled: boolean,
  pressureFlow: boolean,
  pressureCurve: PressureCurveType
): number {
  if (!pressureEnabled || !pressureFlow || pressure === 0.5) {
    return baseFlow;
  }
  const curveValue = applyPressureCurve(pressure, pressureCurve);
  return baseFlow * curveValue;
}

/**
 * Calculate spacing distance for brush stamps
 */
export function calculateSpacing(brushSize: number, spacingPercent: number): number {
  return Math.max(0.1, (brushSize * spacingPercent) / 100);
}

/**
 * Apply jitter to coordinates
 */
export function applyJitter(
  x: number,
  y: number,
  jitterPercent: number,
  brushSize: number
): { x: number; y: number } {
  if (jitterPercent === 0) {
    return { x, y };
  }
  const maxJitter = (brushSize * jitterPercent) / 100;
  const jitterX = (Math.random() - 0.5) * 2 * maxJitter;
  const jitterY = (Math.random() - 0.5) * 2 * maxJitter;
  return {
    x: x + jitterX,
    y: y + jitterY,
  };
}

/**
 * Get pressure from PointerEvent
 */
export function getPressure(e: PointerEvent): number {
  // PointerEvent.pressure is 0.0 to 1.0 for stylus, 0.5 for mouse
  // If pressure is 0.5, it's likely a mouse (no pressure sensitivity)
  if (e.pointerType === 'mouse' || e.pressure === 0.5) {
    return 0.5; // Neutral pressure for mouse
  }
  return e.pressure;
}

/**
 * Check if device supports pressure
 */
export function supportsPressure(e: PointerEvent): boolean {
  return e.pointerType === 'pen' && e.pressure !== 0.5;
}
