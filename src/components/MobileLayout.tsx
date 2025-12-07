'use client';

import { useEffect, ReactNode } from 'react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useMobilePanel } from '@/contexts/MobilePanelContext';

interface MobileLayoutProps {
  children: ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const { isMobile, isTablet } = useDeviceDetection();
  const { isOpen: rightPanelOpen, setIsOpen: setRightPanelOpen, toggle } = useMobilePanel();

  // Prevent body scroll when panel is open on mobile
  useEffect(() => {
    if (isMobile && rightPanelOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, rightPanelOpen]);

  if (!isMobile && !isTablet) {
    // Desktop layout - no wrapper needed
    return <>{children}</>;
  }

  return (
    <>
      {isMobile && rightPanelOpen && (
        <div
          className="mobile-panel-overlay active"
          onClick={() => setRightPanelOpen(false)}
          aria-label="Close panel"
        />
      )}
      <div className={`mobile-layout ${isMobile ? 'mobile' : 'tablet'}`}>
        {children}
        {/* Mobile panel toggle button */}
        {isMobile && (
          <button
            className="mobile-panel-toggle"
            onClick={toggle}
            aria-label={rightPanelOpen ? 'Close panel' : 'Open panel'}
            aria-expanded={rightPanelOpen}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {rightPanelOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        )}
      </div>
      <style jsx>{`
        .mobile-layout {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .mobile-panel-toggle {
          position: fixed;
          top: 12px;
          right: 12px;
          width: 44px;
          height: 44px;
          background: var(--bg-panel);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 1500;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          transition: all 0.15s ease;
        }

        .mobile-panel-toggle:hover,
        .mobile-panel-toggle:active {
          background: var(--bg-panel-hover);
          border-color: var(--accent);
        }

        .mobile-panel-toggle:focus {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        @media (min-width: 768px) {
          .mobile-panel-toggle {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
