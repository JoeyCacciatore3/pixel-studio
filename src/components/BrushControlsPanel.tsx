'use client';

import { useState, useEffect } from 'react';
import UI from '@/lib/ui';
import { useAppState } from '@/hooks/useAppState';
import StateManager from '@/lib/stateManager';
import type { PressureCurveType } from '@/lib/types';

export default function BrushControlsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const state = useAppState();

  const brushSize = state.brushSize;
  const brushHardness = state.brushHardness;
  const brushOpacity = state.brushOpacity;
  const brushFlow = state.brushFlow;
  const brushSpacing = state.brushSpacing;
  const brushJitter = state.brushJitter;
  const stabilizerStrength = state.stabilizerStrength;
  const pressureEnabled = state.pressureEnabled;
  const pressureSize = state.pressureSize;
  const pressureOpacity = state.pressureOpacity;
  const pressureFlow = state.pressureFlow;
  const pressureCurve = state.pressureCurve;
  const tolerance = state.tolerance;

  useEffect(() => {
    // Setup UI controls once
    UI.setupSliders(
      (newSize) => {
        StateManager.setBrushSize(newSize);
      },
      (newTolerance) => {
        StateManager.setTolerance(newTolerance);
      }
    );
    UI.setupAdvancedBrushControls(
      (hardness) => StateManager.setBrushHardness(hardness),
      (opacity) => StateManager.setBrushOpacity(opacity),
      (flow) => StateManager.setBrushFlow(flow),
      (spacing) => StateManager.setBrushSpacing(spacing),
      (jitter) => StateManager.setBrushJitter(jitter),
      (strength) => StateManager.setStabilizerStrength(strength),
      (enabled) => StateManager.setPressureEnabled(enabled),
      (size) => StateManager.setPressureSize(size),
      (opacity) => StateManager.setPressureOpacity(opacity),
      (flow) => StateManager.setPressureFlow(flow),
      (curve) => StateManager.setPressureCurve(curve as PressureCurveType)
    );
  }, []);

  return (
    <div className="brush-controls-panel">
      <button
        className="brush-controls-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle brush controls"
        aria-expanded={isOpen}
        data-testid="testid-brush-toggle"
      >
        BRUSH+
      </button>
      {isOpen && (
        <div className="brush-controls-content">
          <div className="panel-section">
            <h2 className="panel-title">Brush</h2>
            <div className="slider-group">
              <div className="slider-header">
                <span className="slider-label">Size</span>
                <span className="slider-value" id="sizeValue">
                  {brushSize}px
                </span>
              </div>
              <input type="range" id="brushSize" min={1} max={100} defaultValue={brushSize} />
            </div>
            <div className="slider-group">
              <div className="slider-header">
                <span className="slider-label">Hardness</span>
                <span className="slider-value" id="hardnessValue">
                  {brushHardness}%
                </span>
              </div>
              <input
                type="range"
                id="brushHardness"
                min={0}
                max={100}
                defaultValue={brushHardness}
              />
            </div>
            <div className="slider-group">
              <div className="slider-header">
                <span className="slider-label">Opacity</span>
                <span className="slider-value" id="opacityValue">
                  {brushOpacity}%
                </span>
              </div>
              <input type="range" id="brushOpacity" min={0} max={100} defaultValue={brushOpacity} />
            </div>
            <div className="slider-group">
              <div className="slider-header">
                <span className="slider-label">Flow</span>
                <span className="slider-value" id="flowValue">
                  {brushFlow}%
                </span>
              </div>
              <input type="range" id="brushFlow" min={0} max={100} defaultValue={brushFlow} />
            </div>
            <div className="slider-group">
              <div className="slider-header">
                <span className="slider-label">Spacing</span>
                <span className="slider-value" id="spacingValue">
                  {brushSpacing}%
                </span>
              </div>
              <input
                type="range"
                id="brushSpacing"
                min={1}
                max={1000}
                defaultValue={brushSpacing}
              />
            </div>
            <div className="slider-group">
              <div className="slider-header">
                <span className="slider-label">Jitter</span>
                <span className="slider-value" id="jitterValue">
                  {brushJitter}%
                </span>
              </div>
              <input type="range" id="brushJitter" min={0} max={100} defaultValue={brushJitter} />
            </div>
            <div className="slider-group">
              <div className="slider-header">
                <span className="slider-label">Stabilizer</span>
                <span className="slider-value" id="stabilizerValue">
                  {stabilizerStrength}%
                </span>
              </div>
              <input
                type="range"
                id="stabilizerStrength"
                min={0}
                max={100}
                defaultValue={stabilizerStrength}
              />
            </div>
          </div>

          <div className="panel-section">
            <h2 className="panel-title">Pressure</h2>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  id="pressureEnabled"
                  checked={pressureEnabled}
                  onChange={(e) => {
                    StateManager.setPressureEnabled(e.target.checked);
                  }}
                />
                Enable Pressure
              </label>
            </div>
            {pressureEnabled && (
              <>
                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      id="pressureSize"
                      checked={pressureSize}
                      onChange={(e) => {
                        StateManager.setPressureSize(e.target.checked);
                      }}
                    />
                    Size
                  </label>
                </div>
                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      id="pressureOpacity"
                      checked={pressureOpacity}
                      onChange={(e) => {
                        StateManager.setPressureOpacity(e.target.checked);
                      }}
                    />
                    Opacity
                  </label>
                </div>
                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      id="pressureFlow"
                      checked={pressureFlow}
                      onChange={(e) => {
                        StateManager.setPressureFlow(e.target.checked);
                      }}
                    />
                    Flow
                  </label>
                </div>
                <div className="slider-group">
                  <div className="slider-header">
                    <span className="slider-label">Curve</span>
                  </div>
                  <select
                    id="pressureCurve"
                    value={pressureCurve}
                    onChange={(e) => {
                      StateManager.setPressureCurve(e.target.value as PressureCurveType);
                    }}
                  >
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
            <h2 className="panel-title">Selection</h2>
            <div className="slider-group">
              <div className="slider-header">
                <span className="slider-label">Tolerance</span>
                <span className="slider-value" id="toleranceValue">
                  {tolerance}
                </span>
              </div>
              <input type="range" id="tolerance" min={0} max={255} defaultValue={tolerance} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
