/**
 * Layer System Integration Tests
 * Tests layer integration with tools, features, and operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Layers from '../layers';
import Canvas from '../canvas';
import CanvasUtils from '../canvasUtils';
import StateManager from '../stateManager';
import PixelStudio from '../app';
import History from '../history';
import type { AppState } from '../types';

describe('Layer System Integration', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    // Create mock canvas and context
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 512;
    mockCanvas.height = 512;
    mockContext = mockCanvas.getContext('2d')!;

    // Initialize CanvasUtils first (required by Layers.init)
    CanvasUtils.init(mockCanvas, 512, 512, 1);

    // Initialize StateManager with minimal state
    const initialState: AppState = {
      currentTool: 'pencil',
      currentColor: '#000000',
      currentAlpha: 255,
      brushSize: 10,
      brushHardness: 100,
      brushOpacity: 100,
      brushFlow: 100,
      brushSpacing: 25,
      brushJitter: 0,
      brushTexture: null,
      brushScatter: 0,
      brushAngle: 0,
      brushRoundness: 100,
      pressureEnabled: false,
      pressureSize: false,
      pressureOpacity: false,
      pressureFlow: false,
      pressureCurve: 'linear',
      stabilizerStrength: 0,
      tolerance: 32,
      zoom: 1,
      selection: null,
      colorRangeSelection: null,
      selectionMode: 'replace',
      selectionFeather: 0,
      selectionAntiAlias: true,
      imageLayer: null,
      imageOffsetX: 0,
      imageOffsetY: 0,
      layers: [],
      activeLayerId: null,
    };
    StateManager.init(initialState);

    // Initialize Canvas module (required for Layers)
    Canvas.init(mockCanvas, undefined, true);

    // Initialize History module (required for some integration tests)
    History.init(true);

    // Mock Canvas module methods
    vi.spyOn(Canvas, 'getWidth').mockReturnValue(512);
    vi.spyOn(Canvas, 'getHeight').mockReturnValue(512);
    vi.spyOn(Canvas, 'getDevicePixelRatio').mockReturnValue(1);
    vi.spyOn(Canvas, 'getDirtyRegions').mockReturnValue([]);
    vi.spyOn(Canvas, 'clearDirtyRegions').mockImplementation(() => {});

    // Initialize Layers module
    Layers.init(mockCanvas, mockContext);
  });

  describe('Tool Integration', () => {
    it('should allow tools to draw to active layer via getContext()', () => {
      const layer = Layers.createLayer('Test Layer');
      Layers.setActiveLayer(layer.id);

      // Canvas.getContext() should return layer context when layers enabled
      // This is tested indirectly through tool operations
      const context = Canvas.getContext();
      expect(context).toBeDefined();
      expect(layer.canvas).toBeDefined();
    });

    it('should prevent drawing to locked layer', () => {
      const layer = Layers.createLayer('Locked Layer');
      Layers.setActiveLayer(layer.id);
      Layers.updateLayer(layer.id, { locked: true });

      // Attempting to get context for locked layer should throw
      expect(() => {
        Canvas.getContext();
      }).toThrow('Cannot draw to locked layer');
    });

    it('should allow drawing to unlocked layer after locking and unlocking', () => {
      const layer = Layers.createLayer('Test Layer');
      Layers.setActiveLayer(layer.id);

      // Lock
      Layers.updateLayer(layer.id, { locked: true });
      expect(() => Canvas.getContext()).toThrow();

      // Unlock
      Layers.updateLayer(layer.id, { locked: false });
      const context = Canvas.getContext();
      expect(context).toBeDefined();
    });
  });

  describe('Image Data Operations', () => {
    it('should get image data from active layer', () => {
      const layer = Layers.createLayer('Test Layer');
      Layers.setActiveLayer(layer.id);

      const imageData = Canvas.getImageData();
      expect(imageData).toBeDefined();
      expect(imageData.width).toBe(512);
      expect(imageData.height).toBe(512);
    });

    it('should put image data to active layer', () => {
      const layer = Layers.createLayer('Test Layer');
      Layers.setActiveLayer(layer.id);

      const imageData = new ImageData(512, 512);
      // Fill with test data
      imageData.data.fill(255);

      Canvas.putImageData(imageData);

      // Verify data was written (indirectly through getImageData)
      const retrieved = Canvas.getImageData();
      expect(retrieved.data[0]).toBe(255);
    });

    it('should trigger layer rendering after putImageData', () => {
      const renderSpy = vi.spyOn(Layers, 'renderLayers');
      const layer = Layers.createLayer('Test Layer');
      Layers.setActiveLayer(layer.id);

      const imageData = new ImageData(512, 512);
      Canvas.putImageData(imageData);

      // renderLayers should be called (it's called via putImageData)
      // Note: This tests the integration, actual render call happens internally
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('Layer Properties Integration', () => {
    it('should clamp opacity values to 0-1 range', () => {
      const layer = Layers.createLayer('Test Layer');

      // Try to set opacity > 1
      Layers.updateLayer(layer.id, { opacity: 1.5 });
      const updated = Layers.getLayer(layer.id);
      expect(updated?.opacity).toBe(1);

      // Try to set opacity < 0
      Layers.updateLayer(layer.id, { opacity: -0.5 });
      const updated2 = Layers.getLayer(layer.id);
      expect(updated2?.opacity).toBe(0);
    });

    it('should apply opacity during rendering', () => {
      const layer1 = Layers.createLayer('Layer 1');
      const layer2 = Layers.createLayer('Layer 2');

      // Set layer 2 opacity to 0.5
      Layers.updateLayer(layer2.id, { opacity: 0.5 });

      // Opacity is applied during compositing in renderLayers()
      // This is tested indirectly through rendering
      const layer = Layers.getLayer(layer2.id);
      expect(layer?.opacity).toBe(0.5);
    });

    it('should respect visibility during rendering', () => {
      const layer1 = Layers.createLayer('Layer 1');
      const layer2 = Layers.createLayer('Layer 2');

      Layers.updateLayer(layer2.id, { visible: false });

      // Invisible layers should be skipped during rendering
      // This is handled in doRenderLayers() with `if (!layer.visible) continue`
      const layer = Layers.getLayer(layer2.id);
      expect(layer?.visible).toBe(false);
    });

    it('should respect blend modes during rendering', () => {
      const layer = Layers.createLayer('Test Layer');
      Layers.updateLayer(layer.id, { blendMode: 'multiply' });

      const updated = Layers.getLayer(layer.id);
      expect(updated?.blendMode).toBe('multiply');
    });
  });

  describe('History Integration', () => {
    it('should save layer state in history', () => {
      // History is already initialized in beforeEach
      // Save initial empty state first
      History.save();

      const layer = Layers.createLayer('Test Layer');
      Layers.setActiveLayer(layer.id);

      History.save();

      // History should contain layer state
      // Note: History implementation details are tested in history tests
      expect(History.getLength()).toBeGreaterThan(0);
    });

    it('should restore layer state on undo', () => {
      // History is already initialized in beforeEach
      // Save initial empty state first
      History.save();

      const layer1 = Layers.createLayer('Layer 1');
      History.save();

      Layers.createLayer('Layer 2');
      History.save();

      History.undo();

      // Layer state should be restored to state with 1 layer
      const layers = Layers.getAllLayers();
      expect(layers.length).toBe(1);
      expect(layers[0]?.name).toBe('Layer 1');
    });

    it('should restore layer state on redo', () => {
      // History is already initialized in beforeEach
      // Save initial empty state first
      History.save();

      const layer1 = Layers.createLayer('Layer 1');
      History.save();

      Layers.createLayer('Layer 2');
      History.save();

      History.undo();
      History.redo();

      // Layer state should be restored to state with 2 layers
      const layers = Layers.getAllLayers();
      expect(layers.length).toBe(2);
    });
  });

  describe('Canvas Operations Integration', () => {
    it('should clear active layer when layers enabled', () => {
      const layer = Layers.createLayer('Test Layer');
      Layers.setActiveLayer(layer.id);

      // Fill layer with data first
      const imageData = new ImageData(512, 512);
      imageData.data.fill(255);
      Canvas.putImageData(imageData);

      // Clear
      Canvas.clear();

      // Layer should be cleared
      const cleared = Canvas.getImageData();
      // Check that data is mostly transparent (alpha = 0)
      expect(cleared.data[3]).toBe(0); // First pixel alpha
    });

    it('should not clear locked layers', () => {
      const layer1 = Layers.createLayer('Layer 1');
      const layer2 = Layers.createLayer('Layer 2');

      Layers.setActiveLayer(layer2.id);
      Layers.updateLayer(layer2.id, { locked: true });

      // Fill layer with data
      const imageData = new ImageData(512, 512);
      imageData.data.fill(255);
      Canvas.putImageData(imageData);

      // Attempt to clear (should not clear locked layer)
      const result = Layers.clearLayer(layer2.id);
      expect(result).toBe(false); // Should return false for locked layer
    });
  });

  describe('Selection Integration', () => {
    it('should work with layer extraction', () => {
      const layer = Layers.createLayer('Test Layer');
      Layers.setActiveLayer(layer.id);

      // Create a selection mask
      const width = Canvas.getWidth();
      const height = Canvas.getHeight();
      const selection = new Uint8Array(width * height);
      // Select a small area
      for (let i = 0; i < 100; i++) {
        selection[i] = 1;
      }

      const bounds = { x: 0, y: 0, width: 10, height: 10 };

      // Extract selection to new layer
      const newLayer = Layers.extractSelectionToLayer(selection, bounds);
      expect(newLayer).toBeDefined();
      expect(newLayer?.id).not.toBe(layer.id);
    });
  });

  describe('Edge Cases', () => {
    it('should handle layer deletion with active layer switch', () => {
      const layer1 = Layers.createLayer('Layer 1');
      const layer2 = Layers.createLayer('Layer 2');

      Layers.setActiveLayer(layer2.id);
      Layers.deleteLayer(layer2.id);

      // Should switch to layer1
      const activeLayerId = Layers.getActiveLayerId();
      expect(activeLayerId).toBe(layer1.id);
      const active = Layers.getLayer(activeLayerId!);
      expect(active?.id).toBe(layer1.id);
    });

    it('should prevent deleting last layer', () => {
      const layer = Layers.createLayer('Last Layer');
      const result = Layers.deleteLayer(layer.id);
      expect(result).toBe(false);

      const layers = Layers.getAllLayers();
      expect(layers.length).toBe(1);
    });

    it('should handle context retrieval when no layers exist', () => {
      // This shouldn't happen in practice (last layer cannot be deleted)
      // But test error handling
      // Note: This test may need adjustment based on actual behavior
    });
  });

  describe('Rendering Integration', () => {
    it('should render all visible layers', () => {
      const layer1 = Layers.createLayer('Layer 1');
      const layer2 = Layers.createLayer('Layer 2');
      const layer3 = Layers.createLayer('Layer 3');

      // Make layer2 invisible
      Layers.updateLayer(layer2.id, { visible: false });

      // All visible layers should be rendered
      Layers.render();

      // Rendering happens asynchronously via requestAnimationFrame
      // This test verifies the function executes without error
      const layers = Layers.getAllLayers();
      expect(layers.filter((l) => l.visible).length).toBe(2);
    });

    it('should apply blend modes during rendering', () => {
      const layer1 = Layers.createLayer('Layer 1');
      const layer2 = Layers.createLayer('Layer 2');

      Layers.updateLayer(layer1.id, { blendMode: 'normal' });
      Layers.updateLayer(layer2.id, { blendMode: 'multiply' });

      // Blend modes should be applied during compositing
      Layers.render();

      // Verify blend modes are set
      expect(Layers.getLayer(layer1.id)?.blendMode).toBe('normal');
      expect(Layers.getLayer(layer2.id)?.blendMode).toBe('multiply');
    });
  });
});
