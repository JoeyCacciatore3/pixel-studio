/**
 * Blend Modes Module
 * Extended blend mode implementations for professional compositing
 */

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'hard-light'
  | 'color-dodge'
  | 'color-burn'
  | 'darken'
  | 'lighten'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

/**
 * Apply blend mode to two image data arrays
 */
export function applyBlendMode(
  base: ImageData,
  overlay: ImageData,
  blendMode: BlendMode,
  opacity: number
): ImageData {
  const result = new ImageData(base.width, base.height);
  const baseData = base.data;
  const overlayData = overlay.data;
  const resultData = result.data;

  for (let i = 0; i < baseData.length; i += 4) {
    const baseR = baseData[i]! / 255;
    const baseG = baseData[i + 1]! / 255;
    const baseB = baseData[i + 2]! / 255;
    const baseA = baseData[i + 3]! / 255;

    const overlayR = overlayData[i]! / 255;
    const overlayG = overlayData[i + 1]! / 255;
    const overlayB = overlayData[i + 2]! / 255;
    const overlayA = (overlayData[i + 3]! / 255) * opacity;

    let r: number, g: number, b: number;

    switch (blendMode) {
      case 'normal':
        r = overlayR;
        g = overlayG;
        b = overlayB;
        break;
      case 'multiply':
        r = baseR * overlayR;
        g = baseG * overlayG;
        b = baseB * overlayB;
        break;
      case 'screen':
        r = 1 - (1 - baseR) * (1 - overlayR);
        g = 1 - (1 - baseG) * (1 - overlayG);
        b = 1 - (1 - baseB) * (1 - overlayB);
        break;
      case 'overlay':
        r = baseR < 0.5 ? 2 * baseR * overlayR : 1 - 2 * (1 - baseR) * (1 - overlayR);
        g = baseG < 0.5 ? 2 * baseG * overlayG : 1 - 2 * (1 - baseG) * (1 - overlayG);
        b = baseB < 0.5 ? 2 * baseB * overlayB : 1 - 2 * (1 - baseB) * (1 - overlayB);
        break;
      case 'soft-light':
        r =
          overlayR < 0.5
            ? 2 * baseR * overlayR + baseR * baseR * (1 - 2 * overlayR)
            : Math.sqrt(baseR) * (2 * overlayR - 1) + 2 * baseR * (1 - overlayR);
        g =
          overlayG < 0.5
            ? 2 * baseG * overlayG + baseG * baseG * (1 - 2 * overlayG)
            : Math.sqrt(baseG) * (2 * overlayG - 1) + 2 * baseG * (1 - overlayG);
        b =
          overlayB < 0.5
            ? 2 * baseB * overlayB + baseB * baseB * (1 - 2 * overlayB)
            : Math.sqrt(baseB) * (2 * overlayB - 1) + 2 * baseB * (1 - overlayB);
        break;
      case 'hard-light':
        r = overlayR < 0.5 ? 2 * baseR * overlayR : 1 - 2 * (1 - baseR) * (1 - overlayR);
        g = overlayG < 0.5 ? 2 * baseG * overlayG : 1 - 2 * (1 - baseG) * (1 - overlayG);
        b = overlayB < 0.5 ? 2 * baseB * overlayB : 1 - 2 * (1 - baseB) * (1 - overlayB);
        break;
      case 'color-dodge':
        r = baseR === 0 ? 0 : Math.min(1, baseR / (1 - overlayR));
        g = baseG === 0 ? 0 : Math.min(1, baseG / (1 - overlayG));
        b = baseB === 0 ? 0 : Math.min(1, baseB / (1 - overlayB));
        break;
      case 'color-burn':
        r = baseR === 1 ? 1 : Math.max(0, 1 - (1 - baseR) / overlayR);
        g = baseG === 1 ? 1 : Math.max(0, 1 - (1 - baseG) / overlayG);
        b = baseB === 1 ? 1 : Math.max(0, 1 - (1 - baseB) / overlayB);
        break;
      case 'darken':
        r = Math.min(baseR, overlayR);
        g = Math.min(baseG, overlayG);
        b = Math.min(baseB, overlayB);
        break;
      case 'lighten':
        r = Math.max(baseR, overlayR);
        g = Math.max(baseG, overlayG);
        b = Math.max(baseB, overlayB);
        break;
      case 'difference':
        r = Math.abs(baseR - overlayR);
        g = Math.abs(baseG - overlayG);
        b = Math.abs(baseB - overlayB);
        break;
      case 'exclusion':
        r = baseR + overlayR - 2 * baseR * overlayR;
        g = baseG + overlayG - 2 * baseG * overlayG;
        b = baseB + overlayB - 2 * baseB * overlayB;
        break;
      case 'hue':
      case 'saturation':
      case 'color':
      case 'luminosity': {
        // Convert to HSL for component-based blend modes
        const baseHSL = rgbToHsl(baseR, baseG, baseB);
        const overlayHSL = rgbToHsl(overlayR, overlayG, overlayB);
        let resultHSL: [number, number, number];

        if (blendMode === 'hue') {
          resultHSL = [overlayHSL[0], baseHSL[1], baseHSL[2]];
        } else if (blendMode === 'saturation') {
          resultHSL = [baseHSL[0], overlayHSL[1], baseHSL[2]];
        } else if (blendMode === 'color') {
          resultHSL = [overlayHSL[0], overlayHSL[1], baseHSL[2]];
        } else {
          // luminosity
          resultHSL = [baseHSL[0], baseHSL[1], overlayHSL[2]];
        }

        const rgb = hslToRgb(resultHSL[0], resultHSL[1], resultHSL[2]);
        r = rgb[0];
        g = rgb[1];
        b = rgb[2];
        break;
      }
      default:
        r = overlayR;
        g = overlayG;
        b = overlayB;
    }

    // Blend with opacity
    const finalR = baseR * (1 - overlayA) + r * overlayA;
    const finalG = baseG * (1 - overlayA) + g * overlayA;
    const finalB = baseB * (1 - overlayA) + b * overlayA;
    const finalA = baseA + overlayA * (1 - baseA);

    resultData[i] = Math.round(finalR * 255);
    resultData[i + 1] = Math.round(finalG * 255);
    resultData[i + 2] = Math.round(finalB * 255);
    resultData[i + 3] = Math.round(finalA * 255);
  }

  return result;
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
    }
  }

  return [h, s, l];
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [r, g, b];
}

/**
 * Check if blend mode is supported by canvas globalCompositeOperation
 */
export function isNativeBlendMode(mode: BlendMode): boolean {
  const nativeModes: BlendMode[] = [
    'normal',
    'multiply',
    'screen',
    'overlay',
    'darken',
    'lighten',
    'color-dodge',
    'color-burn',
    'hard-light',
    'soft-light',
    'difference',
    'exclusion',
  ];
  return nativeModes.includes(mode);
}
