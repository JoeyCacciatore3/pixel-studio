'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="app-error">
      <div className="app-error-content">
        <h2>Application Error</h2>
        <p>Something went wrong. Please try again.</p>
        {process.env.NODE_ENV === 'development' && (
          <details className="error-details">
            <summary>Error Details</summary>
            <pre>{error.message}</pre>
            {error.stack && <pre>{error.stack}</pre>}
            {error.digest && (
              <p>
                <strong>Error ID:</strong> {error.digest}
              </p>
            )}
          </details>
        )}
        <button onClick={reset} className="error-reset-button">
          Try Again
        </button>
      </div>
    </div>
  );
}
