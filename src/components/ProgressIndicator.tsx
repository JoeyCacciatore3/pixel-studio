'use client';

import { useEffect, useState } from 'react';

export interface ProgressIndicatorProps {
  isVisible: boolean;
  progress: number; // 0-100
  operationName?: string;
  onCancel?: () => void;
}

/**
 * Progress Indicator Component
 * Shows progress for long-running cleanup operations
 * Matches Procreate-style non-blocking overlay design
 */
export default function ProgressIndicator({
  isVisible,
  progress,
  operationName = 'Processing...',
  onCancel,
}: ProgressIndicatorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setMounted(true);
    } else {
      // Delay unmount for smooth fade-out
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isVisible]);

  if (!mounted) return null;

  return (
    <div
      className="progress-indicator-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(13, 13, 15, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        pointerEvents: 'auto',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
      }}
    >
      <div
        className="progress-indicator-panel"
        style={{
          background: 'var(--bg-panel, #16161a)',
          borderRadius: '12px',
          border: '1px solid var(--border, #2a2a32)',
          padding: '24px 32px',
          minWidth: '320px',
          maxWidth: '480px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary, #e8e8ed)',
          }}
        >
          {operationName}
        </div>

        <div
          className="progress-bar-container"
          style={{
            width: '100%',
            height: '8px',
            background: 'var(--bg-input, #0a0a0c)',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '12px',
          }}
        >
          <div
            className="progress-bar-fill"
            style={{
              width: `${Math.max(0, Math.min(100, progress))}%`,
              height: '100%',
              background: 'var(--accent, #6366f1)',
              borderRadius: '4px',
              transition: 'width 0.2s ease-out',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: 'var(--text-secondary, #7a7a85)',
          }}
        >
          <span>{Math.round(progress)}%</span>
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                background: 'transparent',
                border: '1px solid var(--border, #2a2a32)',
                color: 'var(--text-secondary, #7a7a85)',
                padding: '4px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-input, #0a0a0c)';
                e.currentTarget.style.color = 'var(--text-primary, #e8e8ed)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary, #7a7a85)';
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
