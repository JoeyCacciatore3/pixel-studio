'use client';

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  memo,
  useOptimistic,
  startTransition,
} from 'react';
import type { Layer } from '@/lib/types';
import Canvas from '@/lib/canvas';
import { useAppState } from '@/hooks/useAppState';
import { logger } from '@/lib/utils/logger';

export default function LayerPanel() {
  const state = useAppState();
  const layers = state.layers;
  const activeLayerId = state.activeLayerId;
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [visibleLayerIds, setVisibleLayerIds] = useState<Set<string>>(new Set());

  // React 19: Use useOptimistic for optimistic UI updates on layer operations
  // This provides immediate feedback while operations complete
  const [optimisticLayers, addOptimisticLayer] = useOptimistic(
    layers,
    (
      currentLayers: Layer[],
      action: { type: 'add' | 'delete' | 'duplicate'; layer?: Layer; id?: string }
    ) => {
      switch (action.type) {
        case 'add':
          return action.layer ? [...currentLayers, action.layer] : currentLayers;
        case 'delete':
          return action.id ? currentLayers.filter((l) => l.id !== action.id) : currentLayers;
        case 'duplicate':
          return action.layer ? [...currentLayers, action.layer] : currentLayers;
        default:
          return currentLayers;
      }
    }
  );

  // Use optimistic layers for rendering, fallback to actual layers
  const displayLayers = optimisticLayers.length > 0 ? optimisticLayers : layers;

  // Memoize layers module access
  const layersModule = useMemo(() => Canvas.getLayers(), []);

  // Check if layer limit is reached
  const maxLayers = useMemo(
    () => (layersModule ? layersModule.getMaxLayers() : 10),
    [layersModule]
  );
  const isLayerLimitReached = layers.length >= maxLayers;

  // IntersectionObserver for viewport-based thumbnail rendering
  useEffect(() => {
    if (layers.length === 0) return;

    // Wait for DOM to be ready
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleLayerIds((prevVisibleIds) => {
          const newVisibleIds = new Set(prevVisibleIds);
          entries.forEach((entry) => {
            const layerId = entry.target.getAttribute('data-layer-id');
            if (layerId) {
              if (entry.isIntersecting) {
                newVisibleIds.add(layerId);
              } else {
                newVisibleIds.delete(layerId);
              }
            }
          });
          return newVisibleIds;
        });
      },
      {
        root: null,
        rootMargin: '50px', // Start loading slightly before visible
        threshold: 0.1,
      }
    );

    // Use setTimeout to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      const layerItems = document.querySelectorAll('[data-layer-id]');
      if (layerItems.length > 0) {
        layerItems.forEach((item) => observer.observe(item));
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [layers]); // Only recreate when layers array changes, not on visibility changes

  const handleAddLayer = useCallback(() => {
    if (layersModule) {
      // Check layer limit before creating (production requirement)
      const maxLayers = layersModule.getMaxLayers();
      if (layers.length >= maxLayers) {
        // Layer limit reached - show user-friendly message
        logger.warn(
          `Maximum layer limit reached (${maxLayers} layers). Please delete a layer before creating a new one.`
        );
        // Could show toast notification here in the future
        return;
      }

      // Optimistic update: create temporary layer for immediate UI feedback
      const tempId = `temp-${Date.now()}`;
      const tempLayer: Layer = {
        id: tempId,
        name: `Layer ${layers.length + 1}`,
        canvas: document.createElement('canvas'),
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
      };

      startTransition(() => {
        addOptimisticLayer({ type: 'add', layer: tempLayer });
      });

      // Perform actual operation (will throw error if limit reached, but we already checked)
      try {
        layersModule.createLayer(`Layer ${layers.length + 1}`);
        // State automatically updated via StateManager, which will sync optimistic state
      } catch (error) {
        // Handle error gracefully (shouldn't happen due to check above, but safety net)
        logger.error('Failed to create layer:', error);
        // Remove optimistic update on error
        startTransition(() => {
          addOptimisticLayer({ type: 'delete', id: tempId });
        });
      }
    }
  }, [layersModule, layers.length, addOptimisticLayer]);

  const handleDeleteLayer = useCallback(
    (id: string) => {
      if (layersModule) {
        // Optimistic update: remove layer immediately for instant feedback
        startTransition(() => {
          addOptimisticLayer({ type: 'delete', id });
        });

        // Perform actual operation
        layersModule.deleteLayer(id);
        // State automatically updated via StateManager, which will sync optimistic state
      }
    },
    [layersModule, addOptimisticLayer]
  );

  const handleDuplicateLayer = useCallback(
    (id: string) => {
      if (layersModule) {
        const layer = layersModule.getLayer(id);
        if (layer) {
          // Optimistic update: add duplicate immediately for instant feedback
          const tempId = `temp-${Date.now()}`;
          const tempLayer: Layer = {
            ...layer,
            id: tempId,
            name: `${layer.name} copy`,
          };
          startTransition(() => {
            addOptimisticLayer({ type: 'duplicate', layer: tempLayer });
          });
        }

        // Perform actual operation
        layersModule.duplicateLayer(id);
        // State automatically updated via StateManager, which will sync optimistic state
      }
    },
    [layersModule, addOptimisticLayer]
  );

  const handleSetActiveLayer = useCallback(
    (id: string) => {
      if (layersModule) {
        layersModule.setActiveLayer(id);
        // State automatically updated via StateManager
      }
    },
    [layersModule]
  );

  const handleToggleVisibility = useCallback(
    (id: string) => {
      if (layersModule) {
        const layer = layersModule.getLayer(id);
        if (layer) {
          layersModule.updateLayer(id, { visible: !layer.visible });
          // State automatically updated via StateManager
        }
      }
    },
    [layersModule]
  );

  const handleToggleLock = useCallback(
    (id: string) => {
      if (layersModule) {
        const layer = layersModule.getLayer(id);
        if (layer) {
          layersModule.updateLayer(id, { locked: !layer.locked });
          // State automatically updated via StateManager
        }
      }
    },
    [layersModule]
  );

  const handleStartEditName = useCallback((layer: Layer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  }, []);

  const handleSaveName = useCallback(
    (id: string) => {
      if (layersModule && editingName.trim()) {
        layersModule.updateLayer(id, { name: editingName.trim() });
        // State automatically updated via StateManager
      }
      setEditingLayerId(null);
      setEditingName('');
    },
    [layersModule, editingName]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingLayerId(null);
    setEditingName('');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      if (e.key === 'Enter') {
        handleSaveName(id);
      } else if (e.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [handleSaveName, handleCancelEdit]
  );

  const handleBackgroundColorChange = useCallback(
    (id: string, color: string) => {
      if (layersModule) {
        // If color is empty or transparent, set to undefined
        const backgroundColor = color && color !== 'transparent' ? color : undefined;
        layersModule.updateLayer(id, { backgroundColor });
        // Re-render to show background color
        layersModule.renderSync().catch((error) => {
          logger.error('Failed to render after background color change:', error);
        });
      }
    },
    [layersModule]
  );

  // Memoize thumbnail generation to avoid recreating on every render
  const getLayerThumbnail = useCallback((layer: Layer): string => {
    try {
      // Create a small thumbnail from the layer canvas
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 32;
      thumbCanvas.height = 32;
      const thumbCtx = thumbCanvas.getContext('2d');
      if (thumbCtx && layer.canvas) {
        // Draw background: use layer backgroundColor if set, otherwise checkerboard pattern
        if (layer.backgroundColor) {
          thumbCtx.fillStyle = layer.backgroundColor;
          thumbCtx.fillRect(0, 0, 32, 32);
        } else {
          // Draw checkerboard pattern matching the canvas display
          // Use 4x4 pixel squares for 32x32 thumbnail (8 squares per side)
          const squareSize = 4;
          const color1 = '#222';
          const color2 = '#1a1a1a';
          for (let y = 0; y < 32; y += squareSize) {
            for (let x = 0; x < 32; x += squareSize) {
              const isEven = (x / squareSize + y / squareSize) % 2 === 0;
              thumbCtx.fillStyle = isEven ? color1 : color2;
              thumbCtx.fillRect(x, y, squareSize, squareSize);
            }
          }
        }

        // Draw layer canvas content on top
        thumbCtx.drawImage(
          layer.canvas,
          0,
          0,
          layer.canvas.width,
          layer.canvas.height,
          0,
          0,
          32,
          32
        );
        return thumbCanvas.toDataURL();
      }
    } catch (error) {
      logger.error('Error generating thumbnail:', error);
    }
    return '';
  }, []);

  // Memoized layer item component
  const LayerItem = memo(function LayerItem({
    layer,
    isActive,
    isEditing,
    editingName,
    isVisible,
    canDelete,
    onSelect,
    onToggleVisibility,
    onToggleLock,
    onDuplicate,
    onDelete,
    onStartEdit,
    onSaveName,
    onKeyDown,
    onNameChange,
    onBackgroundColorChange,
    getThumbnail,
  }: {
    layer: Layer;
    isActive: boolean;
    isEditing: boolean;
    editingName: string;
    isVisible: boolean;
    canDelete: boolean;
    onSelect: () => void;
    onToggleVisibility: () => void;
    onToggleLock: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onStartEdit: () => void;
    onSaveName: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onNameChange: (value: string) => void;
    onBackgroundColorChange: (id: string, color: string) => void;
    getThumbnail: (layer: Layer) => string;
  }) {
    const thumbnail = useMemo(
      () => (isVisible || isActive ? getThumbnail(layer) : ''),
      [layer, isVisible, isActive, getThumbnail]
    );

    return (
      <div
        data-layer-id={layer.id}
        data-testid={`testid-layer-item-${layer.id}`}
        className={`layer-item ${isActive ? 'active' : ''} ${layer.locked ? 'locked' : ''}`}
        onClick={() => !layer.locked && onSelect()}
        role="listitem"
        aria-label={`Layer: ${layer.name}`}
        aria-selected={isActive}
      >
        <div
          className="layer-thumb"
          style={{
            backgroundImage: thumbnail ? `url(${thumbnail})` : 'none',
          }}
          aria-hidden="true"
        ></div>
        <div className="layer-info">
          {isEditing ? (
            <input
              type="text"
              className="layer-name-input"
              value={editingName}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={onSaveName}
              onKeyDown={onKeyDown}
              autoFocus
            />
          ) : (
            <div className="layer-name" onDoubleClick={onStartEdit}>
              {layer.name}
            </div>
          )}
          <div className="layer-type">{layer.visible ? 'Visible' : 'Hidden'}</div>
        </div>
        <div className="layer-controls">
          <button
            className="layer-control-btn"
            data-testid={`testid-layer-toggle-visibility-${layer.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility();
            }}
            title={layer.visible ? 'Hide Layer' : 'Show Layer'}
            aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
          >
            {layer.visible ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                <path d="M1 1l22 22" />
              </svg>
            )}
          </button>
          <button
            className="layer-control-btn"
            data-testid={`testid-layer-toggle-lock-${layer.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock();
            }}
            title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
            aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}
          >
            {layer.locked ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
                <path d="M12 15v2" />
              </svg>
            )}
          </button>
          <button
            className="layer-control-btn"
            data-testid={`testid-layer-duplicate-${layer.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            title="Duplicate Layer"
            aria-label="Duplicate layer"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
          <input
            type="color"
            className="layer-control-btn layer-bg-color"
            value={layer.backgroundColor || '#FFFFFF'}
            onChange={(e) => {
              e.stopPropagation();
              onBackgroundColorChange(layer.id, e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            title="Background Color"
            aria-label="Change layer background color"
            style={{
              width: '28px',
              height: '28px',
              padding: '2px',
              cursor: 'pointer',
            }}
          />
          {canDelete && (
            <button
              className="layer-control-btn"
              data-testid={`testid-layer-delete-${layer.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete Layer"
              aria-label="Delete layer"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  });

  if (layers.length === 0) {
    return (
      <div className="panel-section">
        <div className="panel-title">Layers</div>
        <button
          className="layer-add-btn"
          data-testid="testid-layer-add"
          onClick={handleAddLayer}
          disabled={isLayerLimitReached}
          aria-label="Add new layer"
          title={
            isLayerLimitReached
              ? `Maximum layer limit reached (${maxLayers} layers)`
              : 'Add new layer'
          }
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Layer
        </button>
        {isLayerLimitReached && (
          <div className="layer-limit-message" role="alert" aria-live="polite">
            Maximum layer limit reached ({maxLayers} layers). Please delete a layer before creating
            a new one.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="panel-section">
      <h2 className="panel-title">
        Layers
        <button
          className="layer-add-btn-small"
          data-testid="testid-layer-add-small"
          onClick={handleAddLayer}
          disabled={isLayerLimitReached}
          title={
            isLayerLimitReached
              ? `Maximum layer limit reached (${maxLayers} layers)`
              : 'Add New Layer'
          }
          aria-label="Add new layer"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </h2>
      {isLayerLimitReached && (
        <div className="layer-limit-message" role="alert" aria-live="polite">
          Maximum layer limit reached ({maxLayers} layers). Please delete a layer before creating a
          new one.
        </div>
      )}
      <div className="layer-list" role="list" aria-label="Layers">
        {displayLayers.map((layer) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            isActive={activeLayerId === layer.id}
            isEditing={editingLayerId === layer.id}
            editingName={editingName}
            isVisible={visibleLayerIds.has(layer.id) || activeLayerId === layer.id}
            canDelete={layers.length > 1}
            onSelect={() => handleSetActiveLayer(layer.id)}
            onToggleVisibility={() => handleToggleVisibility(layer.id)}
            onToggleLock={() => handleToggleLock(layer.id)}
            onDuplicate={() => handleDuplicateLayer(layer.id)}
            onDelete={() => handleDeleteLayer(layer.id)}
            onStartEdit={() => handleStartEditName(layer)}
            onSaveName={() => handleSaveName(layer.id)}
            onKeyDown={(e) => handleKeyDown(e, layer.id)}
            onNameChange={setEditingName}
            onBackgroundColorChange={handleBackgroundColorChange}
            getThumbnail={getLayerThumbnail}
          />
        ))}
      </div>
    </div>
  );
}
