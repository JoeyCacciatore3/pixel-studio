'use client';

import { useState, useEffect } from 'react';
import PixelStudio from '@/lib/app';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

const tools = [
  { name: 'pencil', key: 'B', icon: 'M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z' },
  {
    name: 'eraser',
    key: 'E',
    icon: 'M16.24 3.56l4.95 4.94c2.34 2.34 2.34 6.14 0 8.49l-5.66 5.66-8.49-8.49 5.66-5.66c2.34-2.34 6.14-2.34 8.49 0zm-5.66 5.66l-2.83 2.83M2.81 21.19l5.66-5.66',
  },
  {
    name: 'bucket',
    key: 'G',
    icon: 'M19 11l-8-8-8.6 8.6a2 2 0 000 2.8l5.2 5.2a2 2 0 002.8 0L19 11zM5 2l5 5M21 16c0 2-2 4-2 4s-2-2-2-4 2-4 2-4 2 2 2 4z',
  },
  {
    name: 'wand',
    key: 'W',
    icon: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 11.8L11 13M12.2 6.2L11 5M3 21l9-9',
  },
  {
    name: 'picker',
    key: 'I',
    icon: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
  },
  { name: 'selection', key: 'M', icon: 'M3 3h18v18H3z', strokeDasharray: '3 3' },
  {
    name: 'move',
    key: 'V',
    icon: 'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
  },
  // Cleanup tools
  { name: 'cleanup-logo', key: '', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  { name: 'cleanup-inspector', key: '', icon: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 11.8L11 13M12.2 6.2L11 5M3 21l9-9' },
];

export default function MobileToolbar() {
  const { isMobile } = useDeviceDetection();
  const [activeTool, setActiveTool] = useState('pencil');
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const checkState = () => {
      try {
        const state = PixelStudio.getState();
        if (state && state.currentTool) {
          setActiveTool(state.currentTool);
        }
      } catch (error) {
        setActiveTool('pencil');
      }
    };

    checkState();
    const timer = setTimeout(checkState, 200);
    return () => clearTimeout(timer);
  }, []);

  const handleToolSelect = (toolName: string) => {
    PixelStudio.selectTool(toolName);
    setActiveTool(toolName);
    setShowMore(false);
  };

  if (!isMobile) {
    return null;
  }

  const primaryTools = tools.slice(0, 5);
  const moreTools = tools.slice(5);

  return (
    <>
      <div className="mobile-toolbar" data-testid="mobile-toolbar">
        {primaryTools.map((tool) => (
          <button
            key={tool.name}
            className={`mobile-tool-btn ${activeTool === tool.name ? 'active' : ''}`}
            data-tool={tool.name}
            data-testid={`testid-mobile-toolbar-${tool.name}`}
            onClick={() => handleToolSelect(tool.name)}
            aria-label={`${tool.name} tool`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...('strokeDasharray' in tool && tool.strokeDasharray && { strokeDasharray: tool.strokeDasharray })}>
              <path d={tool.icon} />
            </svg>
          </button>
        ))}
        {moreTools.length > 0 && (
          <button
            className={`mobile-tool-btn more-btn ${showMore ? 'active' : ''}`}
            onClick={() => setShowMore(!showMore)}
            aria-label="More tools"
            aria-expanded={showMore}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        )}
      </div>

      {showMore && moreTools.length > 0 && (
        <div className="mobile-toolbar-expanded">
          {moreTools.map((tool) => (
            <button
              key={tool.name}
              className={`mobile-tool-btn ${activeTool === tool.name ? 'active' : ''}`}
              data-tool={tool.name}
              data-testid={`testid-mobile-toolbar-${tool.name}`}
              onClick={() => handleToolSelect(tool.name)}
              aria-label={`${tool.name} tool`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={tool.icon} />
              </svg>
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .mobile-toolbar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-around;
          align-items: center;
          background: var(--bg-panel);
          border-top: 1px solid var(--border);
          padding: 8px;
          z-index: 1000;
          box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.2);
        }

        .mobile-tool-btn {
          width: 48px;
          height: 48px;
          min-width: 48px;
          min-height: 48px;
          background: transparent;
          border: none;
          border-radius: 12px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          transition: all 0.15s ease;
          position: relative;
        }

        .mobile-tool-btn:active {
          transform: scale(0.95);
        }

        .mobile-tool-btn.active {
          background: var(--accent);
          color: white;
          box-shadow: 0 0 12px var(--accent-glow);
        }

        .mobile-tool-btn svg {
          width: 24px;
          height: 24px;
        }

        .mobile-toolbar-expanded {
          position: fixed;
          bottom: 72px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px;
          background: var(--bg-panel);
          border-top: 1px solid var(--border);
          padding: 12px;
          z-index: 999;
          box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.2);
          animation: slideUp 0.2s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (min-width: 768px) {
          .mobile-toolbar,
          .mobile-toolbar-expanded {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
