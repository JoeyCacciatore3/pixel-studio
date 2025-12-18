'use client';

import { useState } from 'react';

interface LoadingStateProps {
  isInitialized: boolean;
  error: Error | null;
  onRetry?: () => void;
}

export default function LoadingState({ isInitialized, error, onRetry }: LoadingStateProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (isInitialized && !error) {
    return null;
  }

  return (
    <div
      className="loading-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--bg-dark, #0d0d0f)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        color: 'var(--text-primary, #e8e8ed)',
        fontFamily: 'var(--font-sora), sans-serif',
      }}
    >
      {error ? (
        <div
          className="error-display"
          style={{
            maxWidth: '600px',
            padding: '32px',
            background: 'var(--bg-panel, #16161a)',
            borderRadius: '12px',
            border: '1px solid var(--border, #2a2a32)',
            textAlign: 'center',
          }}
        >
          <h2 style={{ marginBottom: '16px', color: 'var(--danger, #ef4444)' }}>
            Initialization Failed
          </h2>
          <p style={{ marginBottom: '24px', color: 'var(--text-secondary, #7a7a85)' }}>
            The application failed to initialize. Please check the browser console for details.
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
                  <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Error Message:</div>
                  <div style={{ marginBottom: '16px', color: 'var(--danger, #ef4444)' }}>
                    {error.message}
                  </div>
                  {error.stack && (
                    <>
                      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Stack Trace:</div>
                      <pre
                        style={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          color: 'var(--text-secondary, #7a7a85)',
                        }}
                      >
                        {error.stack}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {onRetry && (
              <button
                onClick={onRetry}
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
                Retry
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'var(--bg-input, #0a0a0c)',
                border: '1px solid var(--border, #2a2a32)',
                color: 'var(--text-primary, #e8e8ed)',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      ) : (
        <div
          className="loading-display"
          style={{
            textAlign: 'center',
          }}
        >
          <div
            className="loading-spinner"
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid var(--border, #2a2a32)',
              borderTop: '4px solid var(--accent, #6366f1)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 24px',
            }}
          />
          <h2 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>
            Loading Pixel Studio
          </h2>
          <p style={{ color: 'var(--text-secondary, #7a7a85)', fontSize: '14px' }}>
            Initializing application...
          </p>
        </div>
      )}
    </div>
  );
}
