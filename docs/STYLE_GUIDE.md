# Pixel Studio Style Guide

This document outlines the coding standards and conventions for the Pixel Studio project.

## Table of Contents

- [TypeScript Conventions](#typescript-conventions)
- [React Component Patterns](#react-component-patterns)
- [File Naming Conventions](#file-naming-conventions)
- [Import Organization](#import-organization)
- [Comment and Documentation Standards](#comment-and-documentation-standards)
- [Testing Patterns](#testing-patterns)
- [Module Pattern Guidelines](#module-pattern-guidelines)
- [Tool System Guidelines](#tool-system-guidelines)

## TypeScript Conventions

### Type Definitions

- **Prefer interfaces over types** for object shapes
- Use `type` only for unions, intersections, or utility types
- Avoid enums; use const objects or maps instead
- Always use explicit return types for exported functions
- Use `unknown` instead of `any` when type is truly unknown

### Example:

```typescript
// Good
interface ToolConfig {
  name: string;
  icon: string;
}

function createTool(config: ToolConfig): Tool {
  // Implementation
}

// Avoid
type ToolConfig = {
  name: string;
  icon: string;
};
```

### Type Guards

Use type guards for runtime type checking:

```typescript
function isTool(obj: unknown): obj is Tool {
  return typeof obj === 'object' && obj !== null && 'name' in obj && 'init' in obj;
}
```

## React Component Patterns

### Component Structure

1. Imports (external, internal, types, relative)
2. Type/interface definitions
3. Component function
4. Subcomponents (if any)
5. Helper functions
6. Static content

### Example:

```typescript
import { useEffect, useRef } from 'react';
import type { AppState } from '@/lib/types';
import Canvas from '@/lib/canvas';

interface ComponentProps {
  state: AppState;
  onStateChange?: (state: AppState) => void;
}

export default function Component({ state, onStateChange }: ComponentProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Effect logic
  }, []);

  return (
    <div ref={ref}>
      {/* Component content */}
    </div>
  );
}
```

### Hooks Usage

- Minimize `useEffect`; prefer React Server Components
- Always include dependency arrays
- Use `useCallback` and `useMemo` only when profiling shows benefit
- Extract complex logic into custom hooks

### Client Components

- Use `'use client'` only when necessary (DOM access, event handlers, browser APIs)
- Prefer Server Components when possible
- Keep client components small and focused

## File Naming Conventions

### Files and Directories

- **Directories**: lowercase with dashes (`components/auth-wizard`)
- **Component files**: PascalCase (`Canvas.tsx`, `Toolbar.tsx`)
- **Utility files**: camelCase (`colorUtils.ts`, `toolHelpers.ts`)
- **Config files**: kebab-case (`next.config.js`, `eslint.config.mjs`)
- **Type files**: camelCase with `.ts` extension (`types.ts`)

### Variables and Functions

- **Variables and functions**: camelCase (`getCanvasCoords`, `currentTool`)
- **Components and types**: PascalCase (`CanvasComponent`, `ToolConfig`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_BRUSH_SIZE`, `DEFAULT_CANVAS_WIDTH`)
- **Booleans**: prefix with `is`, `has`, `should`, `can` (`isLoading`, `hasError`)

## Import Organization

### Import Order

1. External dependencies (React, Next.js, etc.)
2. Internal modules (`@/lib/*`, `@/components/*`)
3. Type imports (`import type`)
4. Relative imports
5. CSS/stylesheet imports

### Example:

```typescript
import { useEffect, useRef } from 'react';
import type { AppState, CanvasElements } from '@/lib/types';
import Canvas from '@/lib/canvas';
import PixelStudio from '@/lib/app';
import './styles.css';
```

### Type Imports

Use `import type` for type-only imports:

```typescript
import type { Tool, AppState } from '@/lib/types';
import { Canvas } from '@/lib/canvas'; // Value import
```

## Comment and Documentation Standards

### JSDoc Comments

Add JSDoc comments for exported functions and complex logic:

```typescript
/**
 * Initialize the canvas with the given dimensions
 * @param canvas - The canvas element to initialize
 * @param selectionCanvas - Optional selection overlay canvas
 * @throws {Error} If canvas element is invalid
 */
function init(canvas: HTMLCanvasElement, selectionCanvas?: HTMLCanvasElement): void {
  // Implementation
}
```

### Inline Comments

- Explain "why" not "what"
- Keep comments up-to-date with code
- Remove commented-out code before committing
- Use comments for complex business logic

### Example:

```typescript
// Good: Explains why
// Use requestAnimationFrame to sync with browser repaint cycle
requestAnimationFrame(() => {
  drawCanvas();
});

// Avoid: Explains what (obvious from code)
// Call the drawCanvas function
drawCanvas();
```

## Testing Patterns

### Test Structure

- Use Vitest for unit and integration tests
- Use React Testing Library for component tests
- Group related tests with `describe` blocks
- Use descriptive test names

### Example:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Component from './Component';

describe('Component', () => {
  beforeEach(() => {
    // Setup
  });

  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle error cases', () => {
    // Error test
  });
});
```

### Test Coverage

- Aim for >80% code coverage
- Test edge cases and error conditions
- Test user interactions
- Test accessibility features

## Module Pattern Guidelines

### IIFE Module Structure

Core application logic uses IIFE (Immediately Invoked Function Expression) modules:

```typescript
const ModuleName = (function () {
  // Private state
  let privateState: StateType;

  // Private functions
  function privateFunction(): void {
    // Implementation
  }

  // Public API
  return {
    publicMethod: privateFunction,
    getState: () => privateState,
  };
})();

export default ModuleName;
```

### Module Guidelines

- Keep modules focused and single-purpose
- Use private state for encapsulation
- Export only necessary public API
- Document public methods with JSDoc

## Tool System Guidelines

### Tool Interface

All tools must implement the `Tool` interface:

```typescript
interface Tool {
  name: string;
  init(state: AppState, elements: CanvasElements): void;
  onPointerDown(coords: { x: number; y: number }, e: PointerEvent): void;
  onPointerMove(coords: { x: number; y: number }, e: PointerEvent): void;
  onPointerUp(e: PointerEvent): void;
}
```

### Tool Implementation Pattern

```typescript
const toolName: Tool = {
  name: 'tool-name',

  init(state: AppState, elements: CanvasElements): void {
    // Initialize tool with state and elements
  },

  onPointerDown(coords: { x: number; y: number }, e: PointerEvent): void {
    // Handle pointer down
  },

  onPointerMove(coords: { x: number; y: number }, e: PointerEvent): void {
    // Handle pointer move
  },

  onPointerUp(e: PointerEvent): void {
    // Handle pointer up
  },
};

export default toolName;
```

### Tool Registration

Tools are auto-registered when imported in `src/lib/tools/index.ts`:

```typescript
import toolName from './toolName';
import PixelStudio from '../app';

PixelStudio.registerTool(toolName.name, toolName);
```

## Code Organization

### Function Guidelines

- Keep functions focused and small (< 50 lines when possible)
- Extract complex logic into separate functions
- Use early returns for error conditions
- Place happy path last in functions

### Error Handling

- Always handle errors and edge cases
- Use try-catch for async operations
- Provide user-friendly error messages
- Log errors appropriately (use `console.error`, not `console.log`)

### Performance

- Profile before optimizing
- Use React DevTools Profiler
- Monitor bundle size
- Lazy load non-critical components
- Optimize canvas operations

## Accessibility

### Semantic HTML

- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`, etc.)
- Include proper ARIA labels where needed
- Ensure keyboard navigation works
- Maintain proper focus management

### ARIA Guidelines

- Use ARIA labels for icon-only buttons
- Provide alt text for images
- Use ARIA roles appropriately
- Test with screen readers

## Additional Best Practices

### Code Clarity

- Write code that your future self will understand
- Prioritize clarity over cleverness
- Use meaningful variable and function names
- Keep functions focused and single-purpose

### Type Safety

- Never use `any` type
- Use type guards for runtime type checking
- Leverage TypeScript's strict mode features
- Use discriminated unions for state management

### Git Practices

- Write clear, descriptive commit messages
- Use conventional commit format
- Keep commits focused and atomic
- Review code before committing

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React Documentation](https://react.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
