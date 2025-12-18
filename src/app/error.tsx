'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/utils/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    logger.error('[App Error] Application error:', error);
    logger.error('[App Error] Error stack:', error.stack);
    if (error.digest) {
      logger.error('[App Error] Error ID:', error.digest);
    }
  }, [error]);

  return (
    <div
      className="app-error"
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
        className="app-error-content"
        style={{
          maxWidth: '600px',
          padding: '32px',
          background: 'var(--bg-panel, #16161a)',
          borderRadius: '12px',
          border: '1px solid var(--border, #2a2a32)',
          textAlign: 'center',
        }}
      >
        <h2 style={{ marginBottom: '16px', color: 'var(--danger, #ef4444)' }}>Application Error</h2>
        <p style={{ marginBottom: '24px', color: 'var(--text-secondary, #7a7a85)' }}>
          Something went wrong. Please check the browser console for details.
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
                {error.digest && (
                  <div style={{ marginTop: '16px' }}>
                    <strong>Error ID:</strong> {error.digest}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={reset}
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
            Try Again
          </button>
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
    </div>
  );
}
