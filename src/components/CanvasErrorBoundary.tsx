'use client';

import { useState } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { logger } from '@/lib/utils/logger';

interface CanvasErrorBoundaryProps {
  children: React.ReactNode;
}

export default function CanvasErrorBoundary({ children }: CanvasErrorBoundaryProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <ErrorBoundary
      fallback={
        <div
          className="canvas-error-boundary"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--bg-dark, #0d0d0f)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            color: 'var(--text-primary, #e8e8ed)',
            fontFamily: 'var(--font-sora), sans-serif',
          }}
        >
          <div
            className="canvas-error-content"
            style={{
              maxWidth: '600px',
              padding: '32px',
              background: 'var(--bg-panel, #16161a)',
              borderRadius: '12px',
              border: '1px solid var(--border, #2a2a32)',
              textAlign: 'center',
            }}
          >
            <h2 style={{ marginBottom: '16px', color: 'var(--danger, #ef4444)' }}>Canvas Error</h2>
            <p style={{ marginBottom: '24px', color: 'var(--text-secondary, #7a7a85)' }}>
              The canvas encountered an error and could not be displayed. Please check the browser
              console for details.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div style={{ marginBottom: '24px' }}>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  style={{
                    background: 'var(--bg-input, #0a0a0c)',
                    border: '1px solid var(--border, #2a2a32)',
                    color: 'var(--text-primary, #e8e8ed)',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginBottom: '16px',
                  }}
                >
                  {showDetails ? 'Hide' : 'Show'} Error Details
                </button>
                {showDetails && (
                  <div
                    style={{
                      background: 'var(--bg-input, #0a0a0c)',
                      padding: '16px',
                      borderRadius: '6px',
                      textAlign: 'left',
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                      fontSize: '12px',
                      overflow: 'auto',
                      maxHeight: '300px',
                    }}
                  >
                    <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                      Check the browser console for detailed error information.
                    </div>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: 'var(--accent, #6366f1)',
                  border: 'none',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        logger.error('[CanvasErrorBoundary] Canvas error:', error);
        logger.error('[CanvasErrorBoundary] Error info:', errorInfo);
        logger.error('[CanvasErrorBoundary] Component stack:', errorInfo.componentStack);
        // Note: Error reporting service integration is planned for future implementation.
        // When implemented, add error reporting service call here.
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
