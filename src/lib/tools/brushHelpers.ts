/**
 * Brush Helpers
 * Advanced brush engine with texture, scatter, and dynamics support
 * Inspired by Procreate and GIMP brush systems
 */

import type { PressureCurveType } from '../types';

// Brush texture patterns for enhanced brush realism
export const BRUSH_TEXTURES = {
  none: 'none',
  canvas: 'canvas',
  paper: 'paper',
  rough: 'rough',
  smooth: 'smooth',
  custom: 'custom',
} as const;

export type BrushTexture = (typeof BRUSH_TEXTURES)[keyof typeof BRUSH_TEXTURES] | null;

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
    // OPTIMIZATION (Item 4): Round to integers to avoid sub-pixel rendering
    return { x: Math.floor(x), y: Math.floor(y) };
  }
  const maxJitter = (brushSize * jitterPercent) / 100;
  const jitterX = (Math.random() - 0.5) * 2 * maxJitter;
  const jitterY = (Math.random() - 0.5) * 2 * maxJitter;
  // OPTIMIZATION (Item 4): Round to integers to avoid sub-pixel rendering
  return {
    x: Math.floor(x + jitterX),
    y: Math.floor(y + jitterY),
  };
}

/**
 * Apply brush scatter (Procreate-style brush scattering)
 */
export function applyScatter(
  x: number,
  y: number,
  scatterPercent: number,
  brushSize: number,
  count: number = 1
): Array<{ x: number; y: number }> {
  if (scatterPercent === 0 || count <= 1) {
    return [{ x: Math.floor(x), y: Math.floor(y) }];
  }

  const points: Array<{ x: number; y: number }> = [];
  const maxScatter = (brushSize * scatterPercent) / 100;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * maxScatter;
    const scatterX = x + Math.cos(angle) * distance;
    const scatterY = y + Math.sin(angle) * distance;
    points.push({
      x: Math.floor(scatterX),
      y: Math.floor(scatterY),
    });
  }

  return points;
}

/**
 * Apply brush texture blending (mix brush color with texture)
 */
export function applyTextureBlending(
  brushR: number,
  brushG: number,
  brushB: number,
  textureR: number,
  textureG: number,
  textureB: number,
  textureStrength: number
): { r: number; g: number; b: number } {
  if (textureStrength === 0) {
    return { r: brushR, g: brushG, b: brushB };
  }

  // Blend brush color with texture using overlay-like blending
  const blendRatio = textureStrength / 100;

  const blendedR = blendColors(brushR, textureR, blendRatio);
  const blendedG = blendColors(brushG, textureG, blendRatio);
  const blendedB = blendColors(brushB, textureB, blendRatio);

  return { r: blendedR, g: blendedG, b: blendedB };
}

/**
 * Color blending function for texture mixing
 */
function blendColors(color1: number, color2: number, ratio: number): number {
  // Use soft-light blending for natural texture appearance
  const blended =
    color1 < 128 ? (2 * color1 * color2) / 255 : 255 - (2 * (255 - color1) * (255 - color2)) / 255;

  return Math.round(color1 * (1 - ratio) + blended * ratio);
}

/**
 * Generate texture pattern data
 */
export function generateBrushTexture(textureType: BrushTexture, size: number): ImageData | null {
  if (textureType === null || textureType === 'none') return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Generate different texture patterns
  switch (textureType) {
    case 'canvas':
      generateCanvasTexture(ctx, size);
      break;
    case 'paper':
      generatePaperTexture(ctx, size);
      break;
    case 'rough':
      generateRoughTexture(ctx, size);
      break;
    case 'smooth':
      generateSmoothTexture(ctx, size);
      break;
    default:
      return null;
  }

  return ctx.getImageData(0, 0, size, size);
}

/**
 * Generate canvas texture pattern
 */
function generateCanvasTexture(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(0, 0, size, size);

  // Add subtle canvas weave pattern
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;

  const weaveSize = size / 16;
  for (let i = 0; i < size; i += weaveSize) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }
}

/**
 * Generate paper texture pattern
 */
function generatePaperTexture(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, size, size);

  // Add paper grain
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 20;
    data[i] = Math.max(0, Math.min(255, data[i]! + noise)); // R
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1]! + noise)); // G
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2]! + noise)); // B
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Generate rough texture pattern
 */
function generateRoughTexture(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(0, 0, size, size);

  // Add rough, irregular pattern
  ctx.fillStyle = '#cccccc';
  for (let i = 0; i < size * size * 0.1; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = Math.random() * 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Generate smooth texture pattern
 */
function generateSmoothTexture(ctx: CanvasRenderingContext2D, size: number): void {
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(1, '#f0f0f0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
}

/**
 * Calculate brush angle dynamics
 */
export function calculateBrushAngle(
  baseAngle: number,
  angleDynamics: number,
  pressure: number
): number {
  if (angleDynamics === 0) return baseAngle;

  // Angle dynamics affect brush orientation based on stroke direction
  const angleVariation = (angleDynamics / 100) * 45 * (pressure - 0.5); // Max ±45° variation
  return baseAngle + angleVariation;
}

/**
 * Calculate brush roundness/aspect ratio
 */
export function calculateBrushRoundness(
  baseRoundness: number,
  roundnessDynamics: number,
  pressure: number
): number {
  if (roundnessDynamics === 0) return baseRoundness;

  // Roundness dynamics affect brush shape from circular to elliptical
  const roundnessVariation = (roundnessDynamics / 100) * 0.5 * (pressure - 0.5);
  return Math.max(0.1, Math.min(1, baseRoundness + roundnessVariation));
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
