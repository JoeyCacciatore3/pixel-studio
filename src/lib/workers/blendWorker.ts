/**
 * Blend Mode Web Worker
 * Handles custom blend mode calculations off the main thread
 *
 * Exports worker code as a string for use with Blob URL workers
 */

/**
 * Returns the blend worker code as a string
 * This code will run in a Web Worker context
 */
export function getBlendWorkerCode(): string {
  return `
// Blend mode functions
function blendMultiply(base, overlay) {
  return base * overlay;
}

function blendScreen(base, overlay) {
  return 1 - (1 - base) * (1 - overlay);
}

function blendOverlay(base, overlay) {
  return base < 0.5 ? 2 * base * overlay : 1 - 2 * (1 - base) * (1 - overlay);
}

function blendSoftLight(base, overlay) {
  return overlay < 0.5
    ? 2 * base * overlay + base * base * (1 - 2 * overlay)
    : Math.sqrt(base) * (2 * overlay - 1) + 2 * base * (1 - overlay);
}

function blendHardLight(base, overlay) {
  return overlay < 0.5 ? 2 * base * overlay : 1 - 2 * (1 - base) * (1 - overlay);
}

function blendColorDodge(base, overlay) {
  return overlay === 1 ? 1 : Math.min(1, base / (1 - overlay));
}

function blendColorBurn(base, overlay) {
  return overlay === 0 ? 0 : Math.max(0, 1 - (1 - base) / overlay);
}

function blendDarken(base, overlay) {
  return Math.min(base, overlay);
}

function blendLighten(base, overlay) {
  return Math.max(base, overlay);
}

function blendDifference(base, overlay) {
  return Math.abs(base - overlay);
}

function blendExclusion(base, overlay) {
  return base + overlay - 2 * base * overlay;
}

function rgbToHsl(r, g, b) {
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

function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
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

function applyBlendMode(base, overlay, blendMode, opacity) {
  const result = new ImageData(base.width, base.height);
  const baseData = base.data;
  const overlayData = overlay.data;
  const resultData = result.data;

  for (let i = 0; i < baseData.length; i += 4) {
    const baseR = baseData[i] / 255;
    const baseG = baseData[i + 1] / 255;
    const baseB = baseData[i + 2] / 255;
    const baseA = baseData[i + 3] / 255;

    const overlayR = overlayData[i] / 255;
    const overlayG = overlayData[i + 1] / 255;
    const overlayB = overlayData[i + 2] / 255;
    const overlayA = (overlayData[i + 3] / 255) * opacity;

    let r, g, b;

    switch (blendMode) {
      case 'multiply':
        r = blendMultiply(baseR, overlayR);
        g = blendMultiply(baseG, overlayG);
        b = blendMultiply(baseB, overlayB);
        break;
      case 'screen':
        r = blendScreen(baseR, overlayR);
        g = blendScreen(baseG, overlayG);
        b = blendScreen(baseB, overlayB);
        break;
      case 'overlay':
        r = blendOverlay(baseR, overlayR);
        g = blendOverlay(baseG, overlayG);
        b = blendOverlay(baseB, overlayB);
        break;
      case 'soft-light':
        r = blendSoftLight(baseR, overlayR);
        g = blendSoftLight(baseG, overlayG);
        b = blendSoftLight(baseB, overlayB);
        break;
      case 'hard-light':
        r = blendHardLight(baseR, overlayR);
        g = blendHardLight(baseG, overlayG);
        b = blendHardLight(baseB, overlayB);
        break;
      case 'color-dodge':
        r = blendColorDodge(baseR, overlayR);
        g = blendColorDodge(baseG, overlayG);
        b = blendColorDodge(baseB, overlayB);
        break;
      case 'color-burn':
        r = blendColorBurn(baseR, overlayR);
        g = blendColorBurn(baseG, overlayG);
        b = blendColorBurn(baseB, overlayB);
        break;
      case 'darken':
        r = blendDarken(baseR, overlayR);
        g = blendDarken(baseG, overlayG);
        b = blendDarken(baseB, overlayB);
        break;
      case 'lighten':
        r = blendLighten(baseR, overlayR);
        g = blendLighten(baseG, overlayG);
        b = blendLighten(baseB, overlayB);
        break;
      case 'difference':
        r = blendDifference(baseR, overlayR);
        g = blendDifference(baseG, overlayG);
        b = blendDifference(baseB, overlayB);
        break;
      case 'exclusion':
        r = blendExclusion(baseR, overlayR);
        g = blendExclusion(baseG, overlayG);
        b = blendExclusion(baseB, overlayB);
        break;
      case 'hue': {
        const [, baseS, baseL] = rgbToHsl(baseR, baseG, baseB);
        const [overlayH] = rgbToHsl(overlayR, overlayG, overlayB);
        const [newR, newG, newB] = hslToRgb(overlayH, baseS, baseL);
        r = newR;
        g = newG;
        b = newB;
        break;
      }
      case 'saturation': {
        const [baseH, , baseL] = rgbToHsl(baseR, baseG, baseB);
        const [, overlayS] = rgbToHsl(overlayR, overlayG, overlayB);
        const [newR, newG, newB] = hslToRgb(baseH, overlayS, baseL);
        r = newR;
        g = newG;
        b = newB;
        break;
      }
      case 'color': {
        const [, , baseL] = rgbToHsl(baseR, baseG, baseB);
        const [overlayH, overlayS] = rgbToHsl(overlayR, overlayG, overlayB);
        const [newR, newG, newB] = hslToRgb(overlayH, overlayS, baseL);
        r = newR;
        g = newG;
        b = newB;
        break;
      }
      case 'luminosity': {
        const [baseH, baseS] = rgbToHsl(baseR, baseG, baseB);
        const [, , overlayL] = rgbToHsl(overlayR, overlayG, overlayB);
        const [newR, newG, newB] = hslToRgb(baseH, baseS, overlayL);
        r = newR;
        g = newG;
        b = newB;
        break;
      }
      default:
        // Normal blend
        r = overlayR;
        g = overlayG;
        b = overlayB;
    }

    // Apply opacity and alpha compositing
    const alpha = overlayA + baseA * (1 - overlayA);
    const invAlpha = alpha > 0 ? 1 / alpha : 0;

    resultData[i] = Math.round((r * overlayA + baseR * baseA * (1 - overlayA)) * invAlpha * 255);
    resultData[i + 1] = Math.round(
      (g * overlayA + baseG * baseA * (1 - overlayA)) * invAlpha * 255
    );
    resultData[i + 2] = Math.round(
      (b * overlayA + baseB * baseA * (1 - overlayA)) * invAlpha * 255
    );
    resultData[i + 3] = Math.round(alpha * 255);
  }

  return result;
}

self.onmessage = (e) => {
  const { type, data, id } = e.data;

  try {
    if (type === 'blend') {
      const result = applyBlendMode(data.base, data.overlay, data.blendMode, data.opacity);

      self.postMessage(
        {
          type: 'success',
          data: result,
          id,
        },
        [result.data.buffer] // Transfer ownership for zero-copy
      );
    } else {
      throw new Error(\`Unknown message type: \${type}\`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      id,
    });
  }
};
`;
}
