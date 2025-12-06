'use client';

export default function StatusBar() {
  return (
    <footer className="status-bar">
      <div className="status-left">
        <div className="status-item">
          <span className="status-dot"></span>
          <span>Ready</span>
        </div>
        <div className="status-item" id="cursorPos">X: 0 Y: 0</div>
      </div>
      <div className="status-right">
        <div className="status-item" id="canvasSize">512 × 512</div>
        <div className="status-item" id="toolInfo">Pencil</div>
      </div>
    </footer>
  );
}
