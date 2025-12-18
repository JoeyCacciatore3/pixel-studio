'use client';

import { memo, useCallback } from 'react';
import { useAppState } from '@/hooks/useAppState';
import PixelStudio from '@/lib/app';

interface ToolConfig {
  name: string;
  key: string;
  icon: string;
  iconPosition?: string;
  strokeDasharray?: string;
  category?: string;
}

// All 22 tools organized by category
const allTools: readonly ToolConfig[] = [
  // Drawing Tools
  { name: 'pencil', key: 'B', icon: '/icons.jpg', iconPosition: '0px 0px', category: 'drawing' },
  {
    name: 'eraser',
    key: 'E',
    icon: '/icons.jpg',
    iconPosition: '-44px 0px',
    category: 'drawing',
  },
  {
    name: 'clone',
    key: 'C',
    icon: '/icons.jpg',
    iconPosition: '-88px 0px',
    category: 'drawing',
  },
  {
    name: 'smudge',
    key: 'S',
    icon: '/icons.jpg',
    iconPosition: '-132px 0px',
    category: 'drawing',
  },
  {
    name: 'blur',
    key: '',
    icon: '/icons.jpg',
    iconPosition: '-176px 0px',
    category: 'drawing',
  },
  {
    name: 'sharpen',
    key: '',
    icon: '/icons.jpg',
    iconPosition: '-220px 0px',
    category: 'drawing',
  },
  // Selection Tools
  {
    name: 'selection',
    key: 'M',
    icon: '/icons.jpg',
    iconPosition: '0px -44px',
    category: 'selection',
  },
  {
    name: 'lasso',
    key: 'L',
    icon: '/icons.jpg',
    iconPosition: '-44px -44px',
    category: 'selection',
  },
  {
    name: 'polygon',
    key: 'P',
    icon: '/icons.jpg',
    iconPosition: '-88px -44px',
    category: 'selection',
  },
  {
    name: 'magnetic',
    key: 'U',
    icon: '/icons.jpg',
    iconPosition: '-132px -44px',
    category: 'selection',
  },
  {
    name: 'wand',
    key: 'W',
    icon: '/icons.jpg',
    iconPosition: '-176px -44px',
    category: 'selection',
  },
  {
    name: 'colorRange',
    key: 'R',
    icon: '/icons.jpg',
    iconPosition: '-220px -44px',
    category: 'selection',
  },
  // Fill Tools
  {
    name: 'bucket',
    key: 'G',
    icon: '/icons.jpg',
    iconPosition: '0px -88px',
    category: 'fill',
  },
  {
    name: 'gradient',
    key: '',
    icon: '/icons.jpg',
    iconPosition: '-44px -88px',
    category: 'fill',
  },
  // Transform Tools
  {
    name: 'move',
    key: 'V',
    icon: '/icons.jpg',
    iconPosition: '-88px -88px',
    category: 'transform',
  },
  {
    name: 'rotate',
    key: '',
    icon: '/icons.jpg',
    iconPosition: '-132px -88px',
    category: 'transform',
  },
  {
    name: 'scale',
    key: '',
    icon: '/icons.jpg',
    iconPosition: '-176px -88px',
    category: 'transform',
  },
  {
    name: 'crop',
    key: '',
    icon: '/icons.jpg',
    iconPosition: '-220px -88px',
    category: 'transform',
  },
  // Special Tools
  {
    name: 'picker',
    key: 'I',
    icon: '/colorpallete.png',
    iconPosition: '0px 0px',
    category: 'special',
  },
  {
    name: 'intelligent-scissors',
    key: '',
    icon: '/icons.jpg',
    iconPosition: '-44px -132px',
    category: 'special',
  },
  {
    name: 'heal',
    key: '',
    icon: '/icons.jpg',
    iconPosition: '-88px -132px',
    category: 'special',
  },
  {
    name: 'paths',
    key: '',
    icon: '/icons.jpg',
    iconPosition: '-132px -132px',
    category: 'special',
  },
  // Cleanup Tools
  {
    name: 'cleanup-stray-pixels',
    key: '',
    icon: '/icons.jpg',
    iconPosition: '-176px -132px',
    category: 'cleanup',
  },
  {
    name: 'cleanup-color-reduce',
    key: '',
    icon: '/icons.jpg',
    iconPosition: '-220px -132px',
    category: 'cleanup',
  },
  {
    name: 'cleanup-edge-crisp',
    key: '',
    icon: '/icons.jpg',
    iconPosition: '0px -176px',
    category: 'cleanup',
  },
  {
    name: 'cleanup-edge-smooth',
    key: '',
    icon: '/icons.jpg',
    iconPosition: '-44px -176px',
    category: 'cleanup',
  },
  {
    name: 'cleanup-line-normalize',
    key: '',
    icon: '/icons.jpg',
    iconPosition: '-88px -176px',
    category: 'cleanup',
  },
  {
    name: 'cleanup-outline',
    key: '',
    icon: '/icons.jpg',
    iconPosition: '-132px -176px',
    category: 'cleanup',
  },
  {
    name: 'cleanup-logo',
    key: '',
    icon: '/icons.jpg',
    iconPosition: '-176px -176px',
    category: 'cleanup',
  },
  {
    name: 'cleanup-inspector',
    key: '',
    icon: '/icons.jpg',
    iconPosition: '-220px -176px',
    category: 'cleanup',
  },
] as const satisfies readonly ToolConfig[];

// Memoized tool button component
const ToolButton = memo(function ToolButton({
  tool,
  isActive,
  onSelect,
}: {
  tool: (typeof allTools)[number];
  isActive: boolean;
  onSelect: (toolName: string) => void;
}) {
  const handleClick = useCallback(() => {
    onSelect(tool.name);
  }, [tool.name, onSelect]);

  const tooltipText = tool.key
    ? `${tool.name.charAt(0).toUpperCase() + tool.name.slice(1).replace(/-/g, ' ')} (${tool.key})`
    : tool.name.charAt(0).toUpperCase() + tool.name.slice(1).replace(/-/g, ' ');

  return (
    <button
      key={tool.name}
      className={`tool-btn ${isActive ? 'active' : ''}`}
      data-tool={tool.name}
      data-testid={`testid-extended-toolbar-${tool.name}`}
      data-tooltip={tooltipText}
      onClick={handleClick}
      aria-label={`${tool.name} tool`}
      aria-pressed={isActive}
    >
      <div
        className="tool-icon"
        style={{
          backgroundImage: `url(${tool.icon})`,
          backgroundPosition: tool.iconPosition || '0px 0px',
          backgroundSize: tool.icon === '/colorpallete.png' ? 'auto' : '1024px 559px',
          width: '24px',
          height: '24px',
        }}
        aria-hidden="true"
      />
    </button>
  );
});

function ExtendedToolbar() {
  const state = useAppState();
  const activeTool = state.currentTool || 'pencil';

  const handleToolSelect = useCallback((toolName: string) => {
    PixelStudio.selectTool(toolName);
  }, []);

  // Group tools by category
  const toolsByCategory = {
    drawing: allTools.filter((t) => t.category === 'drawing'),
    selection: allTools.filter((t) => t.category === 'selection'),
    fill: allTools.filter((t) => t.category === 'fill'),
    transform: allTools.filter((t) => t.category === 'transform'),
    special: allTools.filter((t) => t.category === 'special'),
    cleanup: allTools.filter((t) => t.category === 'cleanup'),
  };

  return (
    <aside
      className="extended-toolbar"
      role="toolbar"
      aria-label="Extended drawing tools"
      data-testid="extended-toolbar"
    >
      <div className="extended-toolbar-content">
        {Object.entries(toolsByCategory).map(([category, tools]) => (
          <div key={category} className="tool-category">
            <div className="tool-category-title">
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </div>
            <div className="tool-category-buttons">
              {tools.map((tool) => (
                <ToolButton
                  key={tool.name}
                  tool={tool}
                  isActive={activeTool === tool.name}
                  onSelect={handleToolSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

// Memoize toolbar to prevent re-renders when state hasn't changed
export default memo(ExtendedToolbar);
