'use client';

import { useEffect, useState } from 'react';
import PixelStudio from '@/lib/app';
import UI from '@/lib/ui';
import LayerPanel from '@/components/LayerPanel';
import type { PressureCurveType } from '@/lib/types';

const swatches = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1',
  '#a855f7', '#ec4899', '#ffffff', '#94a3b8', '#475569', '#000000',
];

export default function RightPanel() {
  const [color, setColor] = useState('#6366f1');
  const [alpha, setAlpha] = useState(100);
  const [brushSize, setBrushSize] = useState(4);
  const [brushHardness, setBrushHardness] = useState(100);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [brushFlow, setBrushFlow] = useState(100);
  const [brushSpacing, setBrushSpacing] = useState(25);
  const [brushJitter, setBrushJitter] = useState(0);
  const [stabilizerStrength, setStabilizerStrength] = useState(30);
  const [pressureEnabled, setPressureEnabled] = useState(false);
  const [pressureSize, setPressureSize] = useState(true);
  const [pressureOpacity, setPressureOpacity] = useState(true);
  const [pressureFlow, setPressureFlow] = useState(false);
  const [pressureCurve, setPressureCurve] = useState<PressureCurveType>('linear');
  const [tolerance, setTolerance] = useState(32);

  useEffect(() => {
    // Wait for PixelStudio to be initialized
    const initPanel = () => {
      try {
        const state = PixelStudio.getState();
        if (state) {
          setColor(state.currentColor);
          setAlpha(state.currentAlpha * 100);
          setBrushSize(state.brushSize);
          setBrushHardness(state.brushHardness ?? 100);
          setBrushOpacity(state.brushOpacity ?? 100);
          setBrushFlow(state.brushFlow ?? 100);
          setBrushSpacing(state.brushSpacing ?? 25);
          setBrushJitter(state.brushJitter ?? 0);
          setStabilizerStrength(state.stabilizerStrength ?? 30);
          setPressureEnabled(state.pressureEnabled ?? false);
          setPressureSize(state.pressureSize ?? true);
          setPressureOpacity(state.pressureOpacity ?? true);
          setPressureFlow(state.pressureFlow ?? false);
          setPressureCurve(state.pressureCurve ?? 'linear');
          setTolerance(state.tolerance);

          UI.setupColorControls(
            (newColor) => setColor(newColor),
            (newAlpha) => setAlpha(newAlpha * 100)
          );
          UI.setupSliders(
            (newSize) => setBrushSize(newSize),
            (newTolerance) => setTolerance(newTolerance)
          );
          UI.setupAdvancedBrushControls(
            (hardness) => setBrushHardness(hardness),
            (opacity) => setBrushOpacity(opacity),
            (flow) => setBrushFlow(flow),
            (spacing) => setBrushSpacing(spacing),
            (jitter) => setBrushJitter(jitter),
            (strength) => setStabilizerStrength(strength),
            (enabled) => setPressureEnabled(enabled),
            (size) => setPressureSize(size),
            (opacity) => setPressureOpacity(opacity),
            (flow) => setPressureFlow(flow),
            (curve) => setPressureCurve(curve as PressureCurveType)
          );
        }
      } catch (error) {
        // PixelStudio not initialized yet, retry
        setTimeout(initPanel, 100);
      }
    };

    const timer = setTimeout(initPanel, 200);
    return () => clearTimeout(timer);
  }, []);

  const handleSwatchClick = (swatchColor: string) => {
    PixelStudio.setColor(swatchColor);
    setColor(swatchColor);
  };

  return (
    <aside className="right-panel">
      <div className="panel-section">
        <div className="panel-title">Color</div>
        <div className="color-preview-large">
          <div className="color-preview-inner" id="colorPreview" style={{ background: `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${alpha / 100})` }}></div>
        </div>
        <div className="color-inputs">
          <div className="color-input-group full">
            <label>Picker</label>
            <input type="color" id="colorPicker" defaultValue={color} />
          </div>
          <div className="color-input-group">
            <label>Hex</label>
            <input type="text" id="hexInput" defaultValue={color} maxLength={7} />
          </div>
          <div className="color-input-group">
            <label>Alpha</label>
            <input type="number" id="alphaInput" defaultValue={alpha} min={0} max={100} />
          </div>
        </div>
        <div className="swatches">
          {swatches.map((swatch) => (
            <div
              key={swatch}
              className="swatch"
              style={{ background: swatch }}
              data-color={swatch}
              onClick={() => handleSwatchClick(swatch)}
            ></div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-title">Brush</div>
        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">Size</span>
            <span className="slider-value" id="sizeValue">{brushSize}px</span>
          </div>
          <input type="range" id="brushSize" min={1} max={100} defaultValue={brushSize} />
        </div>
        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">Hardness</span>
            <span className="slider-value" id="hardnessValue">{brushHardness}%</span>
          </div>
          <input type="range" id="brushHardness" min={0} max={100} defaultValue={brushHardness} />
        </div>
        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">Opacity</span>
            <span className="slider-value" id="opacityValue">{brushOpacity}%</span>
          </div>
          <input type="range" id="brushOpacity" min={0} max={100} defaultValue={brushOpacity} />
        </div>
        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">Flow</span>
            <span className="slider-value" id="flowValue">{brushFlow}%</span>
          </div>
          <input type="range" id="brushFlow" min={0} max={100} defaultValue={brushFlow} />
        </div>
        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">Spacing</span>
            <span className="slider-value" id="spacingValue">{brushSpacing}%</span>
          </div>
          <input type="range" id="brushSpacing" min={1} max={1000} defaultValue={brushSpacing} />
        </div>
        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">Jitter</span>
            <span className="slider-value" id="jitterValue">{brushJitter}%</span>
          </div>
          <input type="range" id="brushJitter" min={0} max={100} defaultValue={brushJitter} />
        </div>
        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">Stabilizer</span>
            <span className="slider-value" id="stabilizerValue">{stabilizerStrength}%</span>
          </div>
          <input type="range" id="stabilizerStrength" min={0} max={100} defaultValue={stabilizerStrength} />
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-title">Pressure</div>
        <div className="checkbox-group">
          <label>
            <input type="checkbox" id="pressureEnabled" checked={pressureEnabled} onChange={(e) => {
              const state = PixelStudio.getState();
              if (state) {
                state.pressureEnabled = e.target.checked;
                setPressureEnabled(e.target.checked);
              }
            }} />
            Enable Pressure
          </label>
        </div>
        {pressureEnabled && (
          <>
            <div className="checkbox-group">
              <label>
                <input type="checkbox" id="pressureSize" checked={pressureSize} onChange={(e) => {
                  const state = PixelStudio.getState();
                  if (state) {
                    state.pressureSize = e.target.checked;
                    setPressureSize(e.target.checked);
                  }
                }} />
                Size
              </label>
            </div>
            <div className="checkbox-group">
              <label>
                <input type="checkbox" id="pressureOpacity" checked={pressureOpacity} onChange={(e) => {
                  const state = PixelStudio.getState();
                  if (state) {
                    state.pressureOpacity = e.target.checked;
                    setPressureOpacity(e.target.checked);
                  }
                }} />
                Opacity
              </label>
            </div>
            <div className="checkbox-group">
              <label>
                <input type="checkbox" id="pressureFlow" checked={pressureFlow} onChange={(e) => {
                  const state = PixelStudio.getState();
                  if (state) {
                    state.pressureFlow = e.target.checked;
                    setPressureFlow(e.target.checked);
                  }
                }} />
                Flow
              </label>
            </div>
            <div className="slider-group">
              <div className="slider-header">
                <span className="slider-label">Curve</span>
              </div>
              <select id="pressureCurve" value={pressureCurve} onChange={(e) => {
                const state = PixelStudio.getState();
                if (state) {
                  state.pressureCurve = e.target.value as typeof pressureCurve;
                  setPressureCurve(e.target.value as typeof pressureCurve);
                }
              }}>
                <option value="linear">Linear</option>
                <option value="ease-in">Ease In</option>
                <option value="ease-out">Ease Out</option>
                <option value="ease-in-out">Ease In-Out</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="panel-section">
        <div className="panel-title">Selection</div>
        <div className="slider-group">
          <div className="slider-header">
            <span className="slider-label">Tolerance</span>
            <span className="slider-value" id="toleranceValue">{tolerance}</span>
          </div>
          <input type="range" id="tolerance" min={0} max={255} defaultValue={tolerance} />
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-title">Canvas</div>
        <div className="color-inputs">
          <div className="color-input-group">
            <label>Width</label>
            <input type="number" id="canvasWidth" defaultValue={512} min={1} max={4096} />
          </div>
          <div className="color-input-group">
            <label>Height</label>
            <input type="number" id="canvasHeight" defaultValue={512} min={1} max={4096} />
          </div>
        </div>
      </div>

      <LayerPanel />
    </aside>
  );
}
