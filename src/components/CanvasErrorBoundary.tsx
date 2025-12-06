'use client';

import ErrorBoundary from './ErrorBoundary';

interface CanvasErrorBoundaryProps {
  children: React.ReactNode;
}

export default function CanvasErrorBoundary({ children }: CanvasErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="canvas-error-boundary">
          <div className="canvas-error-content">
            <h2>Canvas Error</h2>
            <p>
              The canvas encountered an error and could not be displayed. Please refresh the page to
              try again.
            </p>
            <button onClick={() => window.location.reload()} className="canvas-error-button">
              Refresh Page
            </button>
          </div>
        </div>
      }
      onError={(error) => {
        console.error('Canvas error:', error);
        // Could send to error reporting service here
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
