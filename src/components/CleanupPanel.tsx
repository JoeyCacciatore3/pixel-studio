'use client';

import { useState } from 'react';
import { useAppState } from '@/hooks/useAppState';
import PixelStudio from '@/lib/app';
import type {
  CleanupMode,
  CleanupMethod,
  EdgeSmootherMode,
  LogoCleanerPreset,
} from '@/types/cleanup';

export default function CleanupPanel() {
  const state = useAppState();
  const activeTool = state.currentTool || '';

  // Only show panel for cleanup tools
  if (!activeTool.startsWith('cleanup-')) {
    return null;
  }

  return (
    <div className="panel-section">
      <h2 className="panel-title">Cleanup Options</h2>
      {activeTool === 'cleanup-stray-pixels' && <StrayPixelOptions />}
      {activeTool === 'cleanup-color-reduce' && <ColorReducerOptions />}
      {activeTool === 'cleanup-edge-crisp' && <EdgeCrispenerOptions />}
      {activeTool === 'cleanup-edge-smooth' && <EdgeSmootherOptions />}
      {activeTool === 'cleanup-line-normalize' && <LineNormalizerOptions />}
      {activeTool === 'cleanup-outline' && <OutlinePerfecterOptions />}
      {activeTool === 'cleanup-logo' && <LogoCleanerOptions />}
      {activeTool === 'cleanup-inspector' && <InspectorOptions />}
    </div>
  );
}

function StrayPixelOptions() {
  const [minSize, setMinSize] = useState(3);
  const [merge, setMerge] = useState(false);

  const handleApply = async () => {
    const tool = PixelStudio.getTool('cleanup-stray-pixels');
    if (tool && 'execute' in tool && typeof tool.execute === 'function') {
      await tool.execute({ minSize, merge, useWorker: true });
    }
  };

  return (
    <div className="cleanup-options">
      <div className="slider-group">
        <div className="slider-header">
          <span className="slider-label">Min Size</span>
          <span className="slider-value">{minSize}px</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={minSize}
          onChange={(e) => setMinSize(Number(e.target.value))}
        />
      </div>
      <div className="checkbox-group">
        <label>
          <input type="checkbox" checked={merge} onChange={(e) => setMerge(e.target.checked)} />
          Merge instead of delete
        </label>
      </div>
      <button className="btn-primary" onClick={handleApply}>
        Apply
      </button>
    </div>
  );
}

function ColorReducerOptions() {
  const [mode, setMode] = useState<CleanupMode>('auto-clean');
  const [threshold, setThreshold] = useState(15);
  const [nColors, setNColors] = useState(16);

  const handleApply = async () => {
    const tool = PixelStudio.getTool('cleanup-color-reduce');
    if (tool && 'execute' in tool && typeof tool.execute === 'function') {
      await tool.execute({
        mode,
        threshold,
        nColors,
        useWorker: true,
        useLab: true,
      });
    }
  };

  return (
    <div className="cleanup-options">
      <div className="slider-group">
        <label>Mode</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as CleanupMode)}
        >
          <option value="auto-clean">Auto-clean</option>
          <option value="palette-lock">Palette Lock</option>
          <option value="quantize">Quantize</option>
        </select>
      </div>
      {mode === 'auto-clean' && (
        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">Threshold</span>
            <span className="slider-value">{threshold}</span>
          </div>
          <input
            type="range"
            min={0}
            max={255}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
        </div>
      )}
      {mode === 'quantize' && (
        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">Colors</span>
            <span className="slider-value">{nColors}</span>
          </div>
          <input
            type="range"
            min={2}
            max={256}
            value={nColors}
            onChange={(e) => setNColors(Number(e.target.value))}
          />
        </div>
      )}
      <button className="btn-primary" onClick={handleApply}>
        Apply
      </button>
    </div>
  );
}

function EdgeCrispenerOptions() {
  const [method, setMethod] = useState<CleanupMethod>('threshold');
  const [threshold, setThreshold] = useState(200);
  const [erodePixels, setErodePixels] = useState(1);

  const handleApply = async () => {
    const tool = PixelStudio.getTool('cleanup-edge-crisp');
    if (tool && 'execute' in tool && typeof tool.execute === 'function') {
      await tool.execute({
        method,
        threshold,
        erodePixels,
        useWorker: true,
      });
    }
  };

  return (
    <div className="cleanup-options">
      <div className="slider-group">
        <label>Method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as CleanupMethod)}
        >
          <option value="threshold">Threshold</option>
          <option value="erode">Erode</option>
          <option value="decontaminate">Decontaminate</option>
        </select>
      </div>
      {method === 'threshold' && (
        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">Threshold</span>
            <span className="slider-value">{threshold}</span>
          </div>
          <input
            type="range"
            min={0}
            max={255}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
        </div>
      )}
      {method === 'erode' && (
        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">Pixels</span>
            <span className="slider-value">{erodePixels}</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={erodePixels}
            onChange={(e) => setErodePixels(Number(e.target.value))}
          />
        </div>
      )}
      <button className="btn-primary" onClick={handleApply}>
        Apply
      </button>
    </div>
  );
}

function EdgeSmootherOptions() {
  const [mode, setMode] = useState<EdgeSmootherMode>('standard');
  const [strength, setStrength] = useState(50);

  const handleApply = async () => {
    const tool = PixelStudio.getTool('cleanup-edge-smooth');
    if (tool && 'execute' in tool && typeof tool.execute === 'function') {
      await tool.execute({
        mode,
        strength,
        preserveCorners: true,
        useWorker: true,
      });
    }
  };

  return (
    <div className="cleanup-options">
      <div className="slider-group">
        <label>Mode</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as EdgeSmootherMode)}
        >
          <option value="subtle">Subtle</option>
          <option value="standard">Standard</option>
          <option value="smooth">Smooth</option>
          <option value="pixel-perfect">Pixel-Perfect</option>
        </select>
      </div>
      <div className="slider-group">
        <div className="slider-header">
          <span className="slider-label">Strength</span>
          <span className="slider-value">{strength}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={strength}
          onChange={(e) => setStrength(Number(e.target.value))}
        />
      </div>
      <button className="btn-primary" onClick={handleApply}>
        Apply
      </button>
    </div>
  );
}

function LineNormalizerOptions() {
  const [targetWidth, setTargetWidth] = useState(1);

  const handleApply = async () => {
    const tool = PixelStudio.getTool('cleanup-line-normalize');
    if (tool && 'execute' in tool && typeof tool.execute === 'function') {
      await tool.execute({
        targetWidth,
        useWorker: true,
      });
    }
  };

  return (
    <div className="cleanup-options">
      <div className="slider-group">
        <div className="slider-header">
          <span className="slider-label">Target Width</span>
          <span className="slider-value">{targetWidth}px</span>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          value={targetWidth}
          onChange={(e) => setTargetWidth(Number(e.target.value))}
        />
      </div>
      <button className="btn-primary" onClick={handleApply}>
        Apply
      </button>
    </div>
  );
}

function OutlinePerfecterOptions() {
  const [closeGaps, setCloseGaps] = useState(true);
  const [maxGapSize, setMaxGapSize] = useState(3);
  const [straightenLines, setStraightenLines] = useState(false);
  const [smoothCurves, setSmoothCurves] = useState(false);

  const handleApply = async () => {
    const tool = PixelStudio.getTool('cleanup-outline');
    if (tool && 'execute' in tool && typeof tool.execute === 'function') {
      await tool.execute({
        closeGaps,
        maxGapSize,
        straightenLines,
        smoothCurves,
        sharpenCorners: false,
      });
    }
  };

  return (
    <div className="cleanup-options">
      <div className="checkbox-group">
        <label>
          <input type="checkbox" checked={closeGaps} onChange={(e) => setCloseGaps(e.target.checked)} />
          Close Gaps
        </label>
      </div>
      {closeGaps && (
        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">Max Gap Size</span>
            <span className="slider-value">{maxGapSize}px</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={maxGapSize}
            onChange={(e) => setMaxGapSize(Number(e.target.value))}
          />
        </div>
      )}
      <div className="checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={straightenLines}
            onChange={(e) => setStraightenLines(e.target.checked)}
          />
          Straighten Lines
        </label>
      </div>
      <div className="checkbox-group">
        <label>
          <input type="checkbox" checked={smoothCurves} onChange={(e) => setSmoothCurves(e.target.checked)} />
          Smooth Curves
        </label>
      </div>
      <button className="btn-primary" onClick={handleApply}>
        Apply
      </button>
    </div>
  );
}

function LogoCleanerOptions() {
  const [preset, setPreset] = useState<LogoCleanerPreset>('logo-standard');

  const handleApply = async () => {
    const tool = PixelStudio.getTool('cleanup-logo');
    if (tool && 'execute' in tool && typeof tool.execute === 'function') {
      await tool.execute({ preset });
    }
  };

  return (
    <div className="cleanup-options">
      <div className="slider-group">
        <label>Preset</label>
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value as LogoCleanerPreset)}
        >
          <option value="logo-minimal">Logo - Minimal</option>
          <option value="logo-standard">Logo - Standard</option>
          <option value="logo-aggressive">Logo - Aggressive</option>
          <option value="icon-app-store">Icon - App Store</option>
          <option value="game-asset">Game Asset</option>
          <option value="print-ready">Print Ready</option>
        </select>
      </div>
      <button className="btn-primary" onClick={handleApply}>
        Apply
      </button>
    </div>
  );
}

function InspectorOptions() {
  return (
    <div className="cleanup-options">
      <p>Click to cycle highlight modes: Stray pixels, Jaggies, Color noise, Fuzzy edges, Thickness</p>
      <p>Use keyboard shortcuts to toggle grid and comparison view.</p>
    </div>
  );
}
