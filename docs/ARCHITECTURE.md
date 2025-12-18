# Architecture Documentation

This document provides a comprehensive overview of Pixel Studio's architecture, design patterns, and system organization.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Module Pattern](#module-pattern)
- [State Management](#state-management)
- [Tool System](#tool-system)
- [Layers System](#layers-system)
- [Rendering Pipeline](#rendering-pipeline)
- [Event System](#event-system)

## Architecture Overview

Pixel Studio uses a modular architecture with clear separation of concerns:

- **Core Modules**: IIFE-based modules for encapsulation
- **React Components**: UI rendering and user interactions
- **Tool System**: Self-registering tools with standard interface
- **State Management**: Centralized StateManager pattern
- **Event System**: Decoupled communication via EventEmitter

## Module Pattern

### IIFE (Immediately Invoked Function Expression)

Core logic modules use the IIFE pattern for encapsulation:

```typescript
const ModuleName = (function () {
  let privateState: StateType;

  function privateFunction(): void {
    // Private implementation
  }

  return {
    publicMethod: privateFunction,
  };
})();

export default ModuleName;
```

### Benefits

- **Encapsulation**: Private state and functions
- **No Global Pollution**: Module-scoped variables
- **Clear Public API**: Explicit exports
- **Singleton Pattern**: Single instance per module

### Core Modules

- `src/lib/app.ts` - Application initialization and coordination
- `src/lib/canvas.ts` - Canvas management and rendering
- `src/lib/layers.ts` - Multi-layer system
- `src/lib/history.ts` - Undo/redo functionality
- `src/lib/stateManager.ts` - State management
- `src/lib/ui.ts` - UI event handling

## State Management

### StateManager Pattern

StateManager serves as the single source of truth:

```typescript
// Get current state
const state = StateManager.getState();

// Subscribe to changes
const unsubscribe = StateManager.subscribe((newState) => {
  // Handle state change
});

// Update state (immutable)
StateManager.setColor('#ff0000');
```

### Features

- **Immutable Updates**: All updates create new state objects
- **Event Emission**: State changes emit events
- **React Integration**: Hooks for React components
- **Type Safety**: Full TypeScript support

### State Structure

- Application state (tools, colors, brush settings)
- Layer state (layers array, active layer)
- Selection state (current selection)
- History state (undo/redo stack)

## Tool System

### Tool Interface

All tools implement the `Tool` interface:

```typescript
interface Tool {
  name: string;
  init(state: AppState, elements: CanvasElements): void;
  onPointerDown(coords: { x: number; y: number }, e: PointerEvent): void;
  onPointerMove(coords: { x: number; y: number }, e: PointerEvent): void;
  onPointerUp(e: PointerEvent): void;
}
```

### Registration

Tools are auto-registered via side-effect imports:

```typescript
// src/lib/tools/index.ts
import './pencil';
import './eraser';
// ... other tools

// Tools register themselves:
PixelStudio.registerTool('pencil', PencilTool);
```

### Tool Types

- **Drawing Tools**: Pencil, Eraser, Bucket, Clone, Smudge, Blur, Sharpen
- **Selection Tools**: Magic Wand, Color Range, Rectangular, Lasso, Polygon, Magnetic
- **Utility Tools**: Color Picker, Move, Gradient
- **Cleanup Tools**: Professional cleanup and edge perfection tools:
  - Stray Pixel Eliminator - Connected component analysis for removing isolated pixels
  - Color Noise Reducer - Color quantization, palette enforcement, auto-clean
  - Edge Crispener - Alpha threshold, erosion, decontamination
  - Edge Smoother - Pattern detection and anti-aliasing
  - Line Thickness Normalizer - Morphological operations for consistent line width
  - Outline Perfecter - Gap closing, line straightening, curve smoothing, corner sharpening
  - One-Click Logo Cleaner - Combined cleanup pipeline with presets
  - Pixel-Perfect Inspector - Visualization and problem highlighting

## Layers System

### Architecture

Multi-layer canvas system with:

- **Independent Layers**: Each layer has its own canvas
- **Layer Properties**: Opacity, blend modes, visibility, locking
- **Layer Management**: Add, delete, duplicate, reorder
- **OffscreenCanvas**: Used for layer rendering (required)

### Layer Structure

```typescript
interface Layer {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: string;
}
```

### Rendering

Layers are composited in order:

1. Bottom layer rendered first
2. Each subsequent layer composited on top
3. Blend modes applied via Web Workers
4. Final result rendered to main canvas

See [LAYER_SYSTEM.md](./LAYER_SYSTEM.md) for complete details.

## Rendering Pipeline

### Canvas Rendering

1. **Clear Canvas**: Clear main canvas
2. **Render Layers**: Render each visible layer in order
3. **Apply Blend Modes**: Composite layers with blend modes
4. **Render Selection**: Draw selection overlay if active
5. **Update Display**: Trigger React re-render if needed

### Performance Optimizations

- Viewport culling (skip invisible layers)
- Context caching (reuse contexts)
- RequestAnimationFrame (smooth updates)
- Web Workers (blend mode calculations)

## Event System

### EventEmitter Pattern

Decoupled communication via events:

```typescript
// Emit event
EventEmitter.emit('layers:create', { layer });

// Listen to event
EventEmitter.on('layers:create', (data) => {
  // Handle event
});
```

### Event Types

- `layers:*` - Layer operations
- `history:*` - History operations
- `tool:*` - Tool changes
- `selection:*` - Selection changes

## File Organization

```
src/
├── app/              # Next.js App Router pages
├── components/       # React client components
├── lib/             # Core application logic
│   ├── cleanup/     # Cleanup algorithms and utilities
│   │   ├── utils/   # Cleanup utility functions (connected components, morphology, color distance, contour tracing)
│   │   └── index.ts # Cleanup module exports
│   ├── tools/       # Tool implementations
│   │   └── cleanup-*.ts # Cleanup tool wrappers
│   ├── workers/     # Web Workers
│   │   └── cleanupWorker.ts # Cleanup operations worker
│   └── utils/       # Utility functions
└── hooks/           # React hooks
```

## Dependencies

### Core Dependencies

- **React 19**: UI framework
- **Next.js 16**: Framework and routing
- **TypeScript 5.9**: Type safety

### Browser Requirements

- **OffscreenCanvas**: Required for layers
- **Web Workers**: Required for blend modes and cleanup operations
- **IndexedDB**: Required for history persistence
- **PerformanceObserver**: Required for monitoring

## Cleanup Tools System

### Architecture

The cleanup tools system provides professional-grade image cleanup capabilities:

- **Core Algorithms**: Implemented in `src/lib/cleanup/` with utility functions in `src/lib/cleanup/utils/`
- **Web Worker Support**: CPU-intensive operations (K-means, edge detection, morphology) run in Web Workers
- **Tool Wrappers**: Each cleanup algorithm has a tool wrapper in `src/lib/tools/cleanup-*.ts`
- **UI Integration**: CleanupPanel component provides options UI in RightPanel

### Cleanup Worker

The cleanup worker (`src/lib/workers/cleanupWorker.ts`) handles:

- Connected component analysis for stray pixel removal
- K-means clustering for color quantization
- Edge detection (Sobel operator)
- Morphological operations (erosion, dilation)

### Tool Categories

Cleanup tools are categorized as:

- **Action Tools**: Execute immediately on click (stray pixels, color reducer, edge crispener, logo cleaner)
- **Interactive Tools**: Use pointer events for preview/application (edge smoother, line normalizer, outline perfecter)
- **Inspector Tool**: Visualization overlay tool (pixel-perfect zoom)

### Integration Points

- **History**: All cleanup operations save to history via `History.saveImmediate()`
- **Layers**: Operations work on active layer when layers enabled, respect layer locking
- **Selection**: Operations can work on selection if active, otherwise entire canvas/layer

## Design Principles

1. **Encapsulation**: Private state and functions
2. **Immutability**: State updates create new objects
3. **Type Safety**: Full TypeScript coverage
4. **Performance**: Optimized rendering and memory usage
5. **Modularity**: Clear module boundaries
6. **Event-Driven**: Decoupled communication

## References

- [LAYER_SYSTEM.md](./LAYER_SYSTEM.md)
- [STYLE_GUIDE.md](./STYLE_GUIDE.md)
- [RESEARCH_FINDINGS.md](./RESEARCH_FINDINGS.md)
