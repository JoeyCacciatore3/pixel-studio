/**
 * Paths Tool
 * Bézier curve creation and editing tool
 * Based on GIMP's Paths tool implementation
 */

import type { Tool, BaseToolState } from '../types';
import Canvas from '../canvas';
import PixelStudio from '../app';
import { logger } from '../utils/logger';

(function () {
  let toolState: BaseToolState | null = null;

  // Path state
  let currentPath: Path | null = null;
  let selectedAnchorIndex = -1;
  let selectedHandleIndex = -1;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  // Path data structure
  interface Path {
    id: string;
    anchors: Anchor[];
    closed: boolean;
  }

  interface Anchor {
    x: number;
    y: number;
    inHandle?: { x: number; y: number };
    outHandle?: { x: number; y: number };
  }

  const PathsTool: Tool = {
    name: 'paths',

    init(state, elements) {
      toolState = {
        state,
        elements,
      };

      // Reset path state
      currentPath = null;
      selectedAnchorIndex = -1;
      selectedHandleIndex = -1;
      isDragging = false;
    },

    onPointerDown(coords, _e) {
      if (!toolState) return;

      const x = coords.x;
      const y = coords.y;

      // Check if clicking on existing anchor or handle
      const hit = getHitTarget(x, y);

      if (hit.type === 'anchor') {
        selectedAnchorIndex = hit.index;
        selectedHandleIndex = -1;
        isDragging = true;
        dragOffset = { x: x - hit.target.x, y: y - hit.target.y };
      } else if (hit.type === 'handle') {
        selectedHandleIndex = hit.index;
        selectedAnchorIndex = -1;
        isDragging = true;
        dragOffset = { x: x - hit.target.x, y: y - hit.target.y };
      } else {
        // Create new anchor point
        addAnchorPoint(x, y);
      }
    },

    onPointerMove(coords, _e) {
      if (!toolState || !isDragging) return;

      const x = coords.x - dragOffset.x;
      const y = coords.y - dragOffset.y;

      if (selectedAnchorIndex >= 0 && currentPath) {
        // Move anchor point
        currentPath.anchors[selectedAnchorIndex]!.x = x;
        currentPath.anchors[selectedAnchorIndex]!.y = y;

        // Update connected handles to maintain smooth curves
        updateHandlesForAnchor(selectedAnchorIndex);
      } else if (selectedHandleIndex >= 0 && currentPath) {
        // Move handle point
        const anchorIndex = Math.floor(selectedHandleIndex / 2);
        const isInHandle = selectedHandleIndex % 2 === 0;

        if (isInHandle) {
          currentPath.anchors[anchorIndex]!.inHandle = { x, y };
        } else {
          currentPath.anchors[anchorIndex]!.outHandle = { x, y };
        }

        // Maintain handle symmetry for smooth curves
        maintainHandleSymmetry(anchorIndex, isInHandle);
      }

      Canvas.triggerRender();
    },

    onPointerUp(_e) {
      isDragging = false;
    },
  };

  /**
   * Add new anchor point to current path
   */
  function addAnchorPoint(x: number, y: number): void {
    if (!currentPath) {
      // Create new path
      currentPath = {
        id: generatePathId(),
        anchors: [],
        closed: false,
      };
    }

    // Add new anchor
    const newAnchor: Anchor = { x, y };

    // If this is the second point or later, create handles for smooth curve
    if (currentPath.anchors.length >= 1) {
      // Add handles to current and previous anchors
      const prevAnchor = currentPath.anchors[currentPath.anchors.length - 1]!;

      // Calculate handle positions based on direction to new point
      const dx = x - prevAnchor.x;
      const dy = y - prevAnchor.y;
      const handleLength = Math.sqrt(dx * dx + dy * dy) * 0.3;

      // Previous anchor gets out handle
      const angle = Math.atan2(dy, dx);
      prevAnchor.outHandle = {
        x: prevAnchor.x + Math.cos(angle) * handleLength,
        y: prevAnchor.y + Math.sin(angle) * handleLength,
      };

      // New anchor gets in handle (opposite direction)
      newAnchor.inHandle = {
        x: x - Math.cos(angle) * handleLength,
        y: y - Math.sin(angle) * handleLength,
      };
    }

    currentPath.anchors.push(newAnchor);
    selectedAnchorIndex = currentPath.anchors.length - 1;
    selectedHandleIndex = -1;

    logger.log('Added anchor point at:', x, y);
    Canvas.triggerRender();
  }

  /**
   * Update handles when anchor is moved to maintain curve continuity
   */
  function updateHandlesForAnchor(anchorIndex: number): void {
    if (!currentPath) return;

    const anchor = currentPath.anchors[anchorIndex];
    if (!anchor) return;

    // If anchor has both handles, maintain symmetry
    if (anchor.inHandle && anchor.outHandle) {
      const dx = anchor.outHandle.x - anchor.x;
      const dy = anchor.outHandle.y - anchor.y;

      anchor.inHandle.x = anchor.x - dx;
      anchor.inHandle.y = anchor.y - dy;
    }
  }

  /**
   * Maintain handle symmetry for smooth curves
   */
  function maintainHandleSymmetry(anchorIndex: number, movedInHandle: boolean): void {
    if (!currentPath) return;

    const anchor = currentPath.anchors[anchorIndex];
    if (!anchor) return;

    if (movedInHandle && anchor.outHandle) {
      // Mirror in handle to out handle
      const dx = anchor.x - anchor.inHandle!.x;
      const dy = anchor.y - anchor.inHandle!.y;
      anchor.outHandle.x = anchor.x + dx;
      anchor.outHandle.y = anchor.y + dy;
    } else if (!movedInHandle && anchor.inHandle) {
      // Mirror out handle to in handle
      const dx = anchor.x - anchor.outHandle!.x;
      const dy = anchor.y - anchor.outHandle!.y;
      anchor.inHandle.x = anchor.x + dx;
      anchor.inHandle.y = anchor.y + dy;
    }
  }

  /**
   * Check what element was clicked (anchor, handle, or empty space)
   */
  function getHitTarget(
    x: number,
    y: number
  ): { type: 'anchor' | 'handle' | 'none'; index: number; target: { x: number; y: number } } {
    if (!currentPath) {
      return { type: 'none', index: -1, target: { x, y } };
    }

    const hitTolerance = 8;

    // Check handles first (higher priority)
    for (let i = 0; i < currentPath.anchors.length; i++) {
      const anchor = currentPath.anchors[i]!;

      // Check in handle
      if (anchor.inHandle) {
        const distance = Math.sqrt(
          Math.pow(x - anchor.inHandle.x, 2) + Math.pow(y - anchor.inHandle.y, 2)
        );
        if (distance <= hitTolerance) {
          return { type: 'handle', index: i * 2, target: anchor.inHandle };
        }
      }

      // Check out handle
      if (anchor.outHandle) {
        const distance = Math.sqrt(
          Math.pow(x - anchor.outHandle.x, 2) + Math.pow(y - anchor.outHandle.y, 2)
        );
        if (distance <= hitTolerance) {
          return { type: 'handle', index: i * 2 + 1, target: anchor.outHandle };
        }
      }
    }

    // Check anchors
    for (let i = 0; i < currentPath.anchors.length; i++) {
      const anchor = currentPath.anchors[i]!;
      const distance = Math.sqrt(Math.pow(x - anchor.x, 2) + Math.pow(y - anchor.y, 2));
      if (distance <= hitTolerance) {
        return { type: 'anchor', index: i, target: anchor };
      }
    }

    return { type: 'none', index: -1, target: { x, y } };
  }

  /**
   * Generate unique path ID
   */
  function generatePathId(): string {
    return `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Register the tool
  PixelStudio.registerTool('paths', PathsTool);
})();
