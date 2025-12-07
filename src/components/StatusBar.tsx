'use client';

export default function StatusBar() {
  return (
    <footer className="status-bar" role="status" aria-live="polite" aria-atomic="true">
      <div className="status-left">
        <div className="status-item" aria-label="Application status">
          <span className="status-dot" aria-hidden="true"></span>
          <span>Ready</span>
        </div>
        <div className="status-item" id="cursorPos" aria-label="Cursor position">
          X: 0 Y: 0
        </div>
      </div>
      <div className="status-right">
        <div className="status-item" id="canvasSize" aria-label="Canvas size">
          512 × 512
        </div>
        <div className="status-item" id="toolInfo" aria-label="Current tool">
          Pencil
        </div>
      </div>
    </footer>
  );
}
