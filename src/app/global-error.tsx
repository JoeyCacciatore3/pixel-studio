'use client';

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="global-error">
          <div className="global-error-content">
            <h1>Something went wrong!</h1>
            <p>
              A critical error occurred. Please refresh the page or contact
              support if the problem persists.
            </p>
            <button onClick={reset} className="error-reset-button">
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
