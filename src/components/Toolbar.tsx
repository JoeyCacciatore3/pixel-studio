'use client';

import { memo, useCallback } from 'react';
import { useAppState } from '@/hooks/useAppState';
import PixelStudio from '@/lib/app';

interface ToolConfig {
  name: string;
  key: string;
  icon: string;
  strokeDasharray?: string;
}

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
  {
    name: 'clone',
    key: 'C',
    icon: 'M8 3v3m8-3v3M3 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    name: 'smudge',
    key: 'S',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z',
  },
  {
    name: 'blur',
    key: '',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
  },
  {
    name: 'sharpen',
    key: '',
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
  {
    name: 'gradient',
    key: '',
    icon: 'M3 3h18v18H3V3zm2 2v14h14V5H5z',
  },
  {
    name: 'rotate',
    key: '',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86l-1.77 4.69 4.69-1.77-1.77-4.69-1.15 1.77z',
  },
  {
    name: 'scale',
    key: '',
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  },
  {
    name: 'crop',
    key: '',
    icon: 'M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z',
  },
  {
    name: 'intelligent-scissors',
    key: '',
    icon: 'M9.5 2C8.12 2 7 3.12 7 4.5S8.12 7 9.5 7 12 5.88 12 4.5 10.88 2 9.5 2zM19 2c-1.38 0-2.5 1.12-2.5 2.5S17.62 7 19 7s2.5-1.12 2.5-2.5S20.38 2 19 2zM9.5 17c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5zM19 17c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5zM12 10.04C9.47 10.15 7.4 11.84 7 14h10c-.4-2.16-2.47-3.85-5-3.96zM5 20h14v-2H5v2z',
  },
  {
    name: 'heal',
    key: '',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  },
  {
    name: 'paths',
    key: '',
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  },
  // Cleanup tools
  {
    name: 'cleanup-stray-pixels',
    key: '',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  },
  {
    name: 'cleanup-color-reduce',
    key: '',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
  },
  {
    name: 'cleanup-edge-crisp',
    key: '',
    icon: 'M3 3h18v18H3V3zm2 2v14h14V5H5z',
  },
  {
    name: 'cleanup-edge-smooth',
    key: '',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
  },
  {
    name: 'cleanup-line-normalize',
    key: '',
    icon: 'M3 12h18M12 3v18M5 5l14 14M5 19l14-14',
  },
  {
    name: 'cleanup-outline',
    key: '',
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
  {
    name: 'cleanup-logo',
    key: '',
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
  {
    name: 'cleanup-inspector',
    key: '',
    icon: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 11.8L11 13M12.2 6.2L11 5M3 21l9-9',
  },
] as const satisfies readonly ToolConfig[];

// Memoized tool button component
const ToolButton = memo(function ToolButton({
  tool,
  isActive,
  onSelect,
}: {
  tool: (typeof tools)[number];
  isActive: boolean;
  onSelect: (toolName: string) => void;
}) {
  const handleClick = useCallback(() => {
    onSelect(tool.name);
  }, [tool.name, onSelect]);

  return (
    <button
      key={tool.name}
      className={`tool-btn ${isActive ? 'active' : ''}`}
      data-tool={tool.name}
      data-testid={`testid-toolbar-${tool.name}`}
      data-tooltip={`${tool.name.charAt(0).toUpperCase() + tool.name.slice(1)} (${tool.key})`}
      onClick={handleClick}
      aria-label={`${tool.name} tool`}
      aria-pressed={isActive}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        {...('strokeDasharray' in tool && { strokeDasharray: tool.strokeDasharray })}
        aria-hidden="true"
      >
        <path d={tool.icon} />
      </svg>
    </button>
  );
});

function Toolbar() {
  const state = useAppState();
  const activeTool = state.currentTool || 'pencil';

  const handleToolSelect = useCallback((toolName: string) => {
    PixelStudio.selectTool(toolName);
  }, []);

  return (
    <aside className="toolbar" role="toolbar" aria-label="Drawing tools">
      {tools.map((tool) => (
        <ToolButton
          key={tool.name}
          tool={tool}
          isActive={activeTool === tool.name}
          onSelect={handleToolSelect}
        />
      ))}
    </aside>
  );
}

// Memoize toolbar to prevent re-renders when state hasn't changed
export default memo(Toolbar);
