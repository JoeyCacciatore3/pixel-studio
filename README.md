# Pixel Studio

A professional pixel art editor built with Next.js, TypeScript, and React.

## Features

- **Drawing Tools**: Pencil, Paint Bucket, Clone, Smudge, Blur, Sharpen, Gradient
- **Selection Tools**: Magic Wand, Color Range, Rectangular Selection, Lasso, Polygon, Magnetic Selection
- **Utility Tools**: Color Picker, Move Tool
- **Cleanup Tools**: Professional-grade cleanup and edge perfection tools for logo-ready output:
  - Stray Pixel Eliminator - Removes isolated pixels automatically
  - Color Noise Reducer - Merges similar colors, enforces palettes, quantizes to N colors
  - Edge Crispener - Removes fuzzy halos and semi-transparent edge pixels
  - Edge Smoother - Detects and smooths jagged edges with anti-aliasing
  - Line Thickness Normalizer - Normalizes inconsistent line widths
  - Outline Perfecter - Closes gaps, straightens lines, smooths curves, sharpens corners
  - One-Click Logo Cleaner - Complete cleanup pipeline with 6 presets
  - Pixel-Perfect Inspector - Visualization tool with problem highlighting and grid overlay
- **Layers System**:
  - Multiple independent layers
  - Layer properties: opacity, blend modes, visibility, locking
  - Layer management: add, delete, duplicate, reorder
  - Full integration with all drawing tools
- **Advanced Brush Features**:
  - Pressure sensitivity support
  - Brush stabilizer for smooth strokes
  - Advanced brush settings: hardness, opacity, flow, spacing, jitter
  - Brush texture support
- **Performance Optimizations**:
  - Web Workers for off-main-thread blend mode calculations and image processing
  - Cleanup operations run in Web Workers for CPU-intensive tasks (K-means, edge detection, morphology)
  - Viewport culling for efficient rendering
  - React.memo optimizations for component performance
  - Code splitting for reduced initial bundle size
  - Canvas context caching and GPU acceleration
- **Core Features**:
  - Undo/Redo system with IndexedDB persistence
  - Zoom controls with pinch-to-zoom support
  - Canvas resize functionality
  - Image upload and export to PNG
  - Comprehensive keyboard shortcuts
- **Mobile & Tablet Support**:
  - Responsive design (mobile, tablet, desktop)
  - Touch-optimized interface
  - Pinch-to-zoom gestures
  - Mobile-specific toolbar
  - Orientation detection
- **PWA (Progressive Web App)**:
  - Installable on mobile and desktop
  - Offline support
  - App-like experience
- **Cross-Browser Compatibility**:
  - Works on Chrome, Firefox, Safari, Edge
  - Mobile browser support (iOS Safari, Chrome Android)
  - Comprehensive browser compatibility testing

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Scripts

### Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Code Quality

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

### Testing

#### E2E Tests with MCP Integration

Pixel Studio includes comprehensive E2E tests with MCP (Model Context Protocol) agent integration for enhanced testing capabilities.

**Quick Start:**
```bash
# Verify MCP agents are available
npx tsx scripts/verify-mcp-agents.ts

# Run all tests with MCP enhancement
npm run test:e2e:mcp

# Generate MCP-enhanced report
npm run test:e2e:report:mcp
```

**MCP Setup:**
1. MCP servers should be configured in `~/.cursor/mcp.json`
2. Optional environment variables:
   - `CONTEXT7_API_KEY` - For Context7 documentation lookup
   - `FIRECRAWL_API_KEY` - For web scraping (optional)
   - `MCP_ENABLED=true` - Enable MCP features

**Note**: All MCP features work with functional fallbacks if MCP agents are unavailable. Tests will run successfully with or without MCP agents.

**Documentation:**
- [MCP Agent Integration Guide](docs/MCP_AGENT_INTEGRATION.md) - Detailed MCP integration documentation
- [Test Running Guide](docs/TEST_RUNNING_GUIDE.md) - Step-by-step test execution guide
- [MCP Testing Guide](docs/MCP_TESTING_GUIDE.md) - Comprehensive MCP testing documentation

#### Testing

- `npm run test` - Run unit tests (Vitest)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end browser tests (Playwright)
- `npm run test:e2e:ui` - Run E2E tests in interactive UI mode
- `npm run test:e2e:debug` - Run E2E tests in debug mode
- `npm run test:e2e:browser` - Run browser compatibility tests
- `npm run test:e2e:mobile` - Run mobile touch interaction tests
- `npm run test:e2e:report` - View E2E test report

## Keyboard Shortcuts

### Tool Selection

- `B` - Pencil tool
- `G` - Paint Bucket
- `I` - Color Picker
- `W` - Magic Wand
- `R` - Color Range
- `M` - Rectangular Selection tool
- `L` - Lasso tool
- `P` - Polygon tool
- `U` - Magnetic Selection tool
- `V` - Move tool
- `C` - Clone tool
- `S` - Smudge tool

### History

- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Shift + Z` - Redo
- `Ctrl/Cmd + Y` - Redo (alternative shortcut)

### Brush Controls

- `[` - Decrease brush size
- `]` - Increase brush size

### Selection

- `Delete/Backspace` - Delete selection
- `Escape` - Clear selection
- `Ctrl/Cmd + Shift + X` - Extract selection to new layer

## Architecture

The application uses a modular architecture with:

- **Module Pattern (IIFE)**: Core logic modules (Canvas, Layers, History, StateManager, UI, App) with proper encapsulation and private state
- **State Management**: Centralized StateManager pattern serving as single source of truth with immutable updates and event-driven reactivity
- **Layers System**: Multi-layer canvas architecture supporting opacity, blend modes, visibility, and locking with OffscreenCanvas (required, no fallback)
- **React Components**: UI rendering and user interactions with React 19 features (`useOptimistic`), React.memo optimizations, and proper hook usage
- **Tool System**: Self-registering tools with standard interface, auto-registered via side-effect imports
- **Web Workers**: Off-main-thread processing for blend mode calculations (required, no fallback)
- **Performance Optimizations**:
  - Viewport culling to skip rendering layers outside visible area
  - Canvas context caching with WeakMap for efficient context reuse
  - GPU acceleration enabled via `willReadFrequently: false` for drawing contexts
  - Code splitting with dynamic imports for mobile components
  - RequestAnimationFrame for smooth canvas updates
- **TypeScript**: Full type safety with strict mode, TypeScript 5.9 features (`satisfies`, `as const`), and comprehensive type definitions
- **Modern Browser Requirements**: Requires OffscreenCanvas, Web Workers, IndexedDB, and PerformanceObserver (no backward compatibility)

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Code Quality

This project includes:

- **TypeScript** with strict mode and zero `any` types in production code
- **ESLint** for code linting (Note: Known circular reference issue in ESLint 9.39.1 - upstream bug, does not affect code quality)
- **Prettier** for code formatting
- **Husky** for git hooks
- **lint-staged** for pre-commit checks
- **GitHub Actions** for CI/CD
- **Vitest** for testing
- **EditorConfig** for consistent editor behavior
- **.cursorrules** for AI-assisted development guidance

**Recent Improvements** (December 2025):

- Comprehensive codebase cleanup removing all unused code
- Improved type safety (eliminated all `any` types)
- Consistent import organization across all files
- Architecture compliance verification (IIFE pattern, tool registration)
- All TypeScript errors resolved (0 errors in type-check)
- **Layer System Enhancements**:
  - Fixed image loading to properly track layer bounds
  - Improved layer rendering with viewport culling fallback
  - Transparent first layer initialization (standard image editor behavior)
  - Checkerboard transparency pattern visible through erased areas
  - Enhanced layer bounds tracking for accurate rendering

## Development Tools

### Cursor IDE Integration

This project includes a `.cursorrules` file that provides comprehensive guidance for AI-assisted development in Cursor IDE. The rules cover:

- TypeScript/React/Next.js best practices
- Project-specific architecture patterns
- Code organization and file structure
- Error handling patterns
- Testing requirements
- Performance optimization
- Accessibility standards

When using Cursor IDE, the AI assistant will automatically follow these rules to ensure consistent, high-quality code generation.

### MCP Agent Integration

The project is configured to work with Model Context Protocol (MCP) agents for enhanced development assistance:

- **Context7**: Library documentation and best practices
- **Brave Search**: Finding examples and solutions
- **Firecrawl**: Scraping documentation
- **Sentry**: Error tracking and monitoring (if configured)

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for more details on using MCP agents.

### Node Version Management

This project uses Node.js 20. Use `nvm` to ensure you're using the correct version:

```bash
nvm use
```

Or install the version specified in `.nvmrc`:

```bash
nvm install
```

## Additional Scripts

- `npm run validate` - Run all quality checks (type-check, lint, format, test)
- `npm run check` - Run validation and build
- `npm run audit` - Check for security vulnerabilities
- `npm run clean` - Remove build artifacts and cache
- `npm run analyze` - Analyze bundle size

## Testing

Pixel Studio includes comprehensive testing infrastructure:

- **Unit Tests**: Vitest for component and utility testing
- **E2E Tests**: Playwright for cross-browser and device testing
- **Browser Compatibility**: Automated testing across Chrome, Firefox, Safari, Edge
- **Mobile Testing**: Touch interaction and responsive design validation

See [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md) for complete testing documentation.

## Documentation

### Getting Started

- [Contributing Guide](docs/CONTRIBUTING.md) - How to contribute
- [Style Guide](docs/STYLE_GUIDE.md) - Code style and conventions
- [Testing Guide](docs/TESTING_GUIDE.md) - Testing documentation

### Architecture & Development

- [Architecture](docs/ARCHITECTURE.md) - System architecture and design patterns
- [Layer System](docs/LAYER_SYSTEM.md) - Complete layer system documentation
- [Performance Guide](docs/PERFORMANCE.md) - Performance optimizations and best practices
- [Build Configuration](docs/BUILD_CONFIG.md) - Build system and troubleshooting

### Deployment & Operations

- [Deployment Guide](docs/DEPLOYMENT.md) - Deployment instructions
- [Security Policy](docs/SECURITY.md) - Security guidelines
- [Browser Compatibility](docs/BROWSER_COMPATIBILITY.md) - Browser support matrix
- [PWA Icons](docs/PWA_ICONS.md) - PWA icon generation guide

### Project Information

- [Changelog](docs/CHANGELOG.md) - Project changelog
- [Audit 2025](docs/AUDIT_2025.md) - Comprehensive code audit summary
- [Research Findings](docs/RESEARCH_FINDINGS.md) - Alternative systems evaluation

## License

ISC
