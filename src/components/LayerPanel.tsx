'use client';

import { useEffect, useState } from 'react';
import type { Layer } from '@/lib/types';
import PixelStudio from '@/lib/app';
import Canvas from '@/lib/canvas';

export default function LayerPanel() {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    const updateLayers = () => {
      try {
        const state = PixelStudio.getState();
        if (state) {
          setLayers(state.layers || []);
          setActiveLayerId(state.activeLayerId);
        }
      } catch (error) {
        // PixelStudio not initialized yet
      }
    };

    updateLayers();
    const interval = setInterval(updateLayers, 200);
    return () => clearInterval(interval);
  }, []);

  const getLayersModule = () => {
    return Canvas.getLayers();
  };

  const handleAddLayer = () => {
    const layersModule = getLayersModule();
    if (layersModule) {
      const newLayer = layersModule.createLayer(`Layer ${layers.length + 1}`);
      const state = PixelStudio.getState();
      if (state) {
        state.layers = layersModule.getAllLayers();
        state.activeLayerId = newLayer.id;
        setLayers([...state.layers]);
        setActiveLayerId(newLayer.id);
      }
    }
  };

  const handleDeleteLayer = (id: string) => {
    const layersModule = getLayersModule();
    if (layersModule) {
      if (layersModule.deleteLayer(id)) {
        const state = PixelStudio.getState();
        if (state) {
          state.layers = layersModule.getAllLayers();
          state.activeLayerId = layersModule.getActiveLayer()?.id || null;
          setLayers([...state.layers]);
          setActiveLayerId(state.activeLayerId);
        }
      }
    }
  };

  const handleDuplicateLayer = (id: string) => {
    const layersModule = getLayersModule();
    if (layersModule) {
      const newLayer = layersModule.duplicateLayer(id);
      if (newLayer) {
        const state = PixelStudio.getState();
        if (state) {
          state.layers = layersModule.getAllLayers();
          setLayers([...state.layers]);
        }
      }
    }
  };

  const handleSetActiveLayer = (id: string) => {
    const layersModule = getLayersModule();
    if (layersModule) {
      if (layersModule.setActiveLayer(id)) {
        const state = PixelStudio.getState();
        if (state) {
          state.activeLayerId = id;
          setActiveLayerId(id);
        }
      }
    }
  };

  const handleToggleVisibility = (id: string) => {
    const layersModule = getLayersModule();
    if (layersModule) {
      const layer = layersModule.getLayer(id);
      if (layer) {
        layersModule.updateLayer(id, { visible: !layer.visible });
        const state = PixelStudio.getState();
        if (state) {
          state.layers = layersModule.getAllLayers();
          setLayers([...state.layers]);
        }
      }
    }
  };

  const handleToggleLock = (id: string) => {
    const layersModule = getLayersModule();
    if (layersModule) {
      const layer = layersModule.getLayer(id);
      if (layer) {
        layersModule.updateLayer(id, { locked: !layer.locked });
        const state = PixelStudio.getState();
        if (state) {
          state.layers = layersModule.getAllLayers();
          setLayers([...state.layers]);
        }
      }
    }
  };

  const handleStartEditName = (layer: Layer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };

  const handleSaveName = (id: string) => {
    const layersModule = getLayersModule();
    if (layersModule && editingName.trim()) {
      layersModule.updateLayer(id, { name: editingName.trim() });
      const state = PixelStudio.getState();
      if (state) {
        state.layers = layersModule.getAllLayers();
        setLayers([...state.layers]);
      }
    }
    setEditingLayerId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingLayerId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleSaveName(id);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const getLayerThumbnail = (layer: Layer): string => {
    try {
      // Create a small thumbnail from the layer canvas
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 32;
      thumbCanvas.height = 32;
      const thumbCtx = thumbCanvas.getContext('2d');
      if (thumbCtx && layer.canvas) {
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
      console.error('Error generating thumbnail:', error);
    }
    return '';
  };

  if (layers.length === 0) {
    return (
      <div className="panel-section">
        <div className="panel-title">Layers</div>
        <button className="layer-add-btn" onClick={handleAddLayer}>
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
      </div>
    );
  }

  return (
    <div className="panel-section">
      <div className="panel-title">
        Layers
        <button className="layer-add-btn-small" onClick={handleAddLayer} title="Add New Layer">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      <div className="layer-list">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`layer-item ${activeLayerId === layer.id ? 'active' : ''} ${layer.locked ? 'locked' : ''}`}
            onClick={() => !layer.locked && handleSetActiveLayer(layer.id)}
          >
            <div
              className="layer-thumb"
              style={{ backgroundImage: `url(${getLayerThumbnail(layer)})` }}
            ></div>
            <div className="layer-info">
              {editingLayerId === layer.id ? (
                <input
                  type="text"
                  className="layer-name-input"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleSaveName(layer.id)}
                  onKeyDown={(e) => handleKeyDown(e, layer.id)}
                  autoFocus
                />
              ) : (
                <div className="layer-name" onDoubleClick={() => handleStartEditName(layer)}>
                  {layer.name}
                </div>
              )}
              <div className="layer-type">{layer.visible ? 'Visible' : 'Hidden'}</div>
            </div>
            <div className="layer-controls">
              <button
                className="layer-control-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleVisibility(layer.id);
                }}
                title={layer.visible ? 'Hide Layer' : 'Show Layer'}
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleLock(layer.id);
                }}
                title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicateLayer(layer.id);
                }}
                title="Duplicate Layer"
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
              {layers.length > 1 && (
                <button
                  className="layer-control-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteLayer(layer.id);
                  }}
                  title="Delete Layer"
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
        ))}
      </div>
    </div>
  );
}
