'use client';

import { useEffect, useState } from 'react';
import PixelStudio from '@/lib/app';

const tools = [
  { name: 'pencil', key: 'B', icon: 'M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z' },
  { name: 'eraser', key: 'E', icon: 'M20 20H7L2 15l10-10 8 8-5 5M18 13L9 4' },
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
    name: 'colorRange',
    key: 'R',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  },
  { name: 'selection', key: 'M', icon: 'M3 3h18v18H3z', strokeDasharray: '3 3' },
  {
    name: 'lasso',
    key: 'L',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
  },
  {
    name: 'polygon',
    key: 'P',
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
  {
    name: 'magnetic',
    key: 'U',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
  },
  {
    name: 'move',
    key: 'V',
    icon: 'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
  },
  {
    name: 'picker',
    key: 'I',
    icon: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
  },
];

export default function Toolbar() {
  const [activeTool, setActiveTool] = useState('pencil');

  useEffect(() => {
    // Wait for PixelStudio to be initialized
    const checkState = () => {
      try {
        const state = PixelStudio.getState();
        if (state && state.currentTool) {
          setActiveTool(state.currentTool);
        }
      } catch (error) {
        // PixelStudio not initialized yet, use default
        setActiveTool('pencil');
      }
    };

    // Check immediately and also after a short delay
    checkState();
    const timer = setTimeout(checkState, 200);
    return () => clearTimeout(timer);
  }, []);

  const handleToolSelect = (toolName: string) => {
    PixelStudio.selectTool(toolName);
    setActiveTool(toolName);
  };

  return (
    <aside className="toolbar">
      {tools.map((tool) => (
        <button
          key={tool.name}
          className={`tool-btn ${activeTool === tool.name ? 'active' : ''}`}
          data-tool={tool.name}
          data-tooltip={`${tool.name.charAt(0).toUpperCase() + tool.name.slice(1)} (${tool.key})`}
          onClick={() => handleToolSelect(tool.name)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={tool.strokeDasharray}
          >
            <path d={tool.icon} />
          </svg>
        </button>
      ))}
    </aside>
  );
}
