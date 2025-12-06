/**
 * UI Module
 * Handles all UI interactions and updates
 * Adapted for React (uses refs and callbacks)
 */

import type { AppState, CanvasElements, Selection, PressureCurveType } from './types';
import PixelStudio from './app';
import Canvas from './canvas';
import History from './history';
import SelectionActions from './selectionActions';

const UI = (function () {
  let elements: CanvasElements | null = null;
  let state: AppState | null = null;

  /**
   * Initialize the UI module
   */
  function init(appState: AppState, canvasElements: CanvasElements): void {
    elements = canvasElements;
    state = appState;
  }

  /**
   * Setup color control event listeners
   */
  function setupColorControls(
    onColorChange: (color: string) => void,
    onAlphaChange: (alpha: number) => void
  ): void {
    if (!elements) return;

    // Color picker
    if (elements.colorPicker) {
      elements.colorPicker.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const color = target.value;
        // Validate hex color format
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
          if (state) {
            state.currentColor = color;
          }
          if (elements?.hexInput) {
            elements.hexInput.value = color;
          }
          onColorChange(color);
          PixelStudio.updateColorPreview();
        }
      });
    }

    // Hex input
    if (elements.hexInput) {
      elements.hexInput.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (/^#[0-9A-Fa-f]{6}$/.test(target.value)) {
          const color = target.value;
          if (state) {
            state.currentColor = color;
          }
          if (elements?.colorPicker) {
            elements.colorPicker.value = color;
          }
          onColorChange(color);
          PixelStudio.updateColorPreview();
        }
      });
    }

    // Alpha input
    if (elements.alphaInput) {
      elements.alphaInput.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const alpha = Math.max(0, Math.min(100, parseInt(target.value) || 0)) / 100;
        if (state) {
          state.currentAlpha = alpha;
        }
        onAlphaChange(alpha);
        PixelStudio.updateColorPreview();
      });
    }
  }

  /**
   * Setup slider event listeners
   */
  function setupSliders(
    onBrushSizeChange: (size: number) => void,
    onToleranceChange: (tolerance: number) => void
  ): void {
    if (!elements) return;

    // Brush size
    if (elements.brushSize) {
      elements.brushSize.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const size = parseInt(target.value) || 1;
        if (state) {
          state.brushSize = size;
        }
        onBrushSizeChange(size);
        const sizeValue = document.getElementById('sizeValue');
        if (sizeValue) {
          sizeValue.textContent = size + 'px';
        }
      });
    }

    // Tolerance
    if (elements.tolerance) {
      elements.tolerance.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const tolerance = parseInt(target.value) || 0;
        if (state) {
          state.tolerance = tolerance;
        }
        onToleranceChange(tolerance);
        const toleranceValue = document.getElementById('toleranceValue');
        if (toleranceValue) {
          toleranceValue.textContent = tolerance.toString();
        }
      });
    }
  }

  /**
   * Setup advanced brush control event listeners
   */
  function setupAdvancedBrushControls(
    onHardnessChange: (hardness: number) => void,
    onOpacityChange: (opacity: number) => void,
    onFlowChange: (flow: number) => void,
    onSpacingChange: (spacing: number) => void,
    onJitterChange: (jitter: number) => void,
    onStabilizerChange: (strength: number) => void,
    onPressureEnabledChange: (enabled: boolean) => void,
    onPressureSizeChange: (enabled: boolean) => void,
    onPressureOpacityChange: (enabled: boolean) => void,
    onPressureFlowChange: (enabled: boolean) => void,
    onPressureCurveChange: (curve: string) => void
  ): void {
    if (!elements) return;

    // Brush hardness
    const brushHardness = document.getElementById('brushHardness') as HTMLInputElement;
    if (brushHardness) {
      brushHardness.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const hardness = parseInt(target.value) || 100;
        if (state) {
          state.brushHardness = hardness;
        }
        onHardnessChange(hardness);
        const hardnessValue = document.getElementById('hardnessValue');
        if (hardnessValue) {
          hardnessValue.textContent = hardness + '%';
        }
      });
    }

    // Brush opacity
    const brushOpacity = document.getElementById('brushOpacity') as HTMLInputElement;
    if (brushOpacity) {
      brushOpacity.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const opacity = parseInt(target.value) || 100;
        if (state) {
          state.brushOpacity = opacity;
        }
        onOpacityChange(opacity);
        const opacityValue = document.getElementById('opacityValue');
        if (opacityValue) {
          opacityValue.textContent = opacity + '%';
        }
      });
    }

    // Brush flow
    const brushFlow = document.getElementById('brushFlow') as HTMLInputElement;
    if (brushFlow) {
      brushFlow.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const flow = parseInt(target.value) || 100;
        if (state) {
          state.brushFlow = flow;
        }
        onFlowChange(flow);
        const flowValue = document.getElementById('flowValue');
        if (flowValue) {
          flowValue.textContent = flow + '%';
        }
      });
    }

    // Brush spacing
    const brushSpacing = document.getElementById('brushSpacing') as HTMLInputElement;
    if (brushSpacing) {
      brushSpacing.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const spacing = parseInt(target.value) || 25;
        if (state) {
          state.brushSpacing = spacing;
        }
        onSpacingChange(spacing);
        const spacingValue = document.getElementById('spacingValue');
        if (spacingValue) {
          spacingValue.textContent = spacing + '%';
        }
      });
    }

    // Brush jitter
    const brushJitter = document.getElementById('brushJitter') as HTMLInputElement;
    if (brushJitter) {
      brushJitter.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const jitter = parseInt(target.value) || 0;
        if (state) {
          state.brushJitter = jitter;
        }
        onJitterChange(jitter);
        const jitterValue = document.getElementById('jitterValue');
        if (jitterValue) {
          jitterValue.textContent = jitter + '%';
        }
      });
    }

    // Stabilizer strength
    const stabilizerStrength = document.getElementById('stabilizerStrength') as HTMLInputElement;
    if (stabilizerStrength) {
      stabilizerStrength.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const strength = parseInt(target.value) || 30;
        if (state) {
          state.stabilizerStrength = strength;
        }
        onStabilizerChange(strength);
        const stabilizerValue = document.getElementById('stabilizerValue');
        if (stabilizerValue) {
          stabilizerValue.textContent = strength + '%';
        }
      });
    }

    // Pressure enabled
    const pressureEnabled = document.getElementById('pressureEnabled') as HTMLInputElement;
    if (pressureEnabled) {
      pressureEnabled.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const enabled = target.checked;
        if (state) {
          state.pressureEnabled = enabled;
        }
        onPressureEnabledChange(enabled);
      });
    }

    // Pressure size
    const pressureSize = document.getElementById('pressureSize') as HTMLInputElement;
    if (pressureSize) {
      pressureSize.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const enabled = target.checked;
        if (state) {
          state.pressureSize = enabled;
        }
        onPressureSizeChange(enabled);
      });
    }

    // Pressure opacity
    const pressureOpacity = document.getElementById('pressureOpacity') as HTMLInputElement;
    if (pressureOpacity) {
      pressureOpacity.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const enabled = target.checked;
        if (state) {
          state.pressureOpacity = enabled;
        }
        onPressureOpacityChange(enabled);
      });
    }

    // Pressure flow
    const pressureFlow = document.getElementById('pressureFlow') as HTMLInputElement;
    if (pressureFlow) {
      pressureFlow.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const enabled = target.checked;
        if (state) {
          state.pressureFlow = enabled;
        }
        onPressureFlowChange(enabled);
      });
    }

    // Pressure curve
    const pressureCurve = document.getElementById('pressureCurve') as HTMLSelectElement;
    if (pressureCurve) {
      pressureCurve.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const curve = target.value;
        if (state) {
          state.pressureCurve = curve as PressureCurveType;
        }
        onPressureCurveChange(curve);
      });
    }
  }

  /**
   * Setup keyboard shortcuts
   */
  function setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Don't capture when typing in inputs
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      const key = e.key.toLowerCase();

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          History.redo();
        } else {
          History.undo();
        }
        return;
      }

      // Tool shortcuts
      switch (key) {
        case 'b':
          PixelStudio.selectTool('pencil');
          break;
        case 'e':
          PixelStudio.selectTool('eraser');
          break;
        case 'g':
          PixelStudio.selectTool('bucket');
          break;
        case 'i':
          PixelStudio.selectTool('picker');
          break;
        case 'w':
          PixelStudio.selectTool('wand');
          break;
        case 'r':
          PixelStudio.selectTool('colorRange');
          break;
        case 'm':
          PixelStudio.selectTool('selection');
          break;
        case 'l':
          PixelStudio.selectTool('lasso');
          break;
        case 'p':
          PixelStudio.selectTool('polygon');
          break;
        case 'u':
          PixelStudio.selectTool('magnetic');
          break;
        case 'c':
          PixelStudio.selectTool('clone');
          break;
        case 's':
          if (!e.shiftKey) {
            PixelStudio.selectTool('smudge');
          }
          break;
        case 'v':
          PixelStudio.selectTool('move');
          break;
        case 'escape':
          PixelStudio.clearSelection();
          break;
        case 'delete':
        case 'backspace':
          handleDelete();
          break;
        case 'x':
          if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
            e.preventDefault();
            handleExtractToLayer();
          }
          break;
        case '[':
          if (state) {
            state.brushSize = Math.max(1, state.brushSize - 1);
            if (elements?.brushSize) {
              elements.brushSize.value = state.brushSize.toString();
            }
            const sizeValue = document.getElementById('sizeValue');
            if (sizeValue) {
              sizeValue.textContent = state.brushSize + 'px';
            }
          }
          break;
        case ']':
          if (state) {
            state.brushSize = Math.min(100, state.brushSize + 1);
            if (elements?.brushSize) {
              elements.brushSize.value = state.brushSize.toString();
            }
            const sizeValue = document.getElementById('sizeValue');
            if (sizeValue) {
              sizeValue.textContent = state.brushSize + 'px';
            }
          }
          break;
      }
    });
  }

  /**
   * Handle delete key for selections
   */
  function handleDelete(): void {
    SelectionActions.deleteSelection();
  }

  /**
   * Handle extract to layer action
   */
  function handleExtractToLayer(): void {
    SelectionActions.extractSelectionToLayer();
  }

  /**
   * Apply zoom level
   */
  function applyZoom(zoom: number): void {
    if (elements?.canvasWrapper) {
      elements.canvasWrapper.style.transform = `scale(${zoom})`;
    }
    if (elements?.zoomLevel) {
      elements.zoomLevel.textContent = Math.round(zoom * 100) + '%';
    }
  }

  /**
   * Show selection overlay
   */
  function showSelection(selection: Selection): void {
    if (!elements?.selectionOverlay || !elements.canvas || !elements.canvasWrapper) return;

    const canvas = elements.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    elements.selectionOverlay.style.display = 'block';
    // Account for zoom in positioning
    elements.selectionOverlay.style.left = selection.x * scaleX + 'px';
    elements.selectionOverlay.style.top = selection.y * scaleY + 'px';
    elements.selectionOverlay.style.width = selection.width * scaleX + 'px';
    elements.selectionOverlay.style.height = selection.height * scaleY + 'px';
  }

  /**
   * Show color range selection overlay on canvas
   * Displays precise pixel selection on selection canvas
   */
  function showColorRangeOverlay(selected: Uint8Array): void {
    const ctx = Canvas.getSelectionContext();
    if (!ctx) return;

    const width = Canvas.getWidth();
    const height = Canvas.getHeight();

    ctx.clearRect(0, 0, width, height);

    const overlayData = ctx.createImageData(width, height);
    const data = overlayData.data;

    for (let i = 0; i < selected.length; i++) {
      // Handle both binary (0/1 or 0/255) and feathered (0-255) selection masks
      if (selected[i]! > 0) {
        const idx = i * 4;
        // Selection mask: binary uses 1, feathered uses 0-255
        // Normalize to 0-1: if value is 1 (binary), treat as 1.0; otherwise normalize 0-255 to 0-1
        const selectionStrength = selected[i]! === 1 ? 1.0 : selected[i]! / 255;
        // More prominent color: bright cyan/blue with higher opacity
        data[idx] = 0; // R - no red
        data[idx + 1] = 150; // G - bright cyan
        data[idx + 2] = 255; // B - bright blue
        // Scale opacity by selection strength to handle feathering properly
        // Base opacity of 180 (~70%), scaled by selection strength
        data[idx + 3] = Math.round(180 * Math.min(1, selectionStrength)); // A - higher opacity (~70%) for better visibility
      }
    }

    ctx.putImageData(overlayData, 0, 0);

    // Hide rectangular selection overlay when showing pixel-based selection
    if (elements?.selectionOverlay) {
      elements.selectionOverlay.style.display = 'none';
    }
  }

  /**
   * Update cursor position display
   */
  function updateCursorPos(x: number, y: number): void {
    if (elements?.cursorPos) {
      elements.cursorPos.textContent = `X: ${Math.floor(x)} Y: ${Math.floor(y)}`;
    }
  }

  /**
   * Update canvas size display
   */
  function updateCanvasSize(width: number, height: number): void {
    if (elements?.canvasSize) {
      elements.canvasSize.textContent = `${width} × ${height}`;
    }
  }

  /**
   * Update tool info display
   */
  function updateToolInfo(toolName: string): void {
    if (elements?.toolInfo) {
      elements.toolInfo.textContent = toolName.charAt(0).toUpperCase() + toolName.slice(1);
    }
  }

  /**
   * Show brush preview cursor
   */
  function showBrushPreview(x: number, y: number, size: number): void {
    if (!elements?.canvas) return;
    const preview = document.getElementById('brushPreview');
    if (!preview) return;

    const canvas = elements.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    const radius = (size / 2) * scaleX;

    preview.style.display = 'block';
    preview.style.left = x * scaleX - radius + 'px';
    preview.style.top = y * scaleY - radius + 'px';
    preview.style.width = size * scaleX + 'px';
    preview.style.height = size * scaleY + 'px';
  }

  /**
   * Hide brush preview cursor
   */
  function hideBrushPreview(): void {
    const preview = document.getElementById('brushPreview');
    if (preview) {
      preview.style.display = 'none';
    }
  }

  // Public API
  return {
    init,
    setupColorControls,
    setupSliders,
    setupAdvancedBrushControls,
    setupKeyboardShortcuts,
    applyZoom,
    showSelection,
    showColorRangeOverlay,
    updateCursorPos,
    updateCanvasSize,
    updateToolInfo,
    showBrushPreview,
    hideBrushPreview,
    handleDelete,
    handleExtractToLayer,
  };
})();

export default UI;
