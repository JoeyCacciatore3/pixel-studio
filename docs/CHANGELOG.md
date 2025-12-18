# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2025-01

### Security
- **CRITICAL**: Updated Next.js from 16.0.7 to 16.0.9 to fix security vulnerabilities (GHSA-w37m-7fhw-fmv9, GHSA-mwv6-3258-q52c)
- Updated `@next/bundle-analyzer` and `eslint-config-next` to match Next.js version

### Fixed
- Fixed all TypeScript errors in scripts and test helpers (35 errors resolved)
- Replaced all `any` types with proper types:
  - Created `WindowWithPixelStudio` interface for window extensions
  - Created cleanup tool type definitions (`CleanupMode`, `CleanupMethod`, `EdgeSmootherMode`, `LogoCleanerPreset`)
  - Added type guards for Playwright window extensions
- Fixed unused variable warnings in scripts
- Fixed MCP function call syntax errors in test helpers

### Changed
- Updated dependencies:
  - `@testing-library/react`: 16.3.0 → 16.3.1
  - `@types/node`: 24.10.1 → 24.10.4
  - `@typescript-eslint/*`: 8.48.1 → 8.50.0

### Documentation
- Consolidated testing documentation: merged `TEST_RUNNING_GUIDE.md` into `TESTING_GUIDE.md`
- Consolidated MCP documentation: merged `MCP_IMPLEMENTATION_SUMMARY.md` into `MCP_AGENT_INTEGRATION.md`
- Created comprehensive documentation index in `docs/README.md`
- Archived outdated reports to `docs/archive/`:
  - `MCP_CHROMIUM_ONLY_TEST_REPORT.md`
  - `STATE_MANAGEMENT_AUDIT.md`
  - `IMPLEMENTATION_SUMMARY.md`

### Removed
- Removed duplicate assets from `assets/` directory (kept only in `public/` per Next.js convention)
- Deleted redundant documentation files after consolidation

### Code Quality
- Created type definition files:
  - `src/types/window.d.ts` - Window interface extensions
  - `src/types/cleanup.d.ts` - Cleanup tool type definitions
- Improved type safety across the codebase
- All TypeScript compilation errors resolved (0 errors)

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Professional Cleanup & Edge Perfection Tools** (January 2025):
  - Stray Pixel Eliminator - Automatically detects and removes isolated pixels using connected component analysis
  - Color Noise Reducer - Three modes: auto-clean (merge similar colors), palette lock (force to palette), quantize (K-means to N colors)
  - Edge Crispener - Removes fuzzy halos with threshold, erosion, or decontamination methods
  - Edge Smoother - Intelligent pattern detection and anti-aliasing with multiple smoothing modes
  - Line Thickness Normalizer - Normalizes inconsistent line widths using morphological operations
  - Outline Perfecter - Closes gaps, straightens lines, smooths curves, and sharpens corners
  - One-Click Logo Cleaner - Complete cleanup pipeline with 6 presets (Logo-Minimal, Logo-Standard, Logo-Aggressive, Icon-App Store, Game Asset, Print Ready)
  - Pixel-Perfect Inspector - Visualization tool with problem highlighting, grid overlay, and comparison view
- Cleanup Web Worker for CPU-intensive operations (K-means, edge detection, morphology)
- CleanupPanel component for tool options UI
- Core cleanup utilities: connected components, morphology, color distance (LAB), contour tracing
- Layer system verification tests for image loading, operations, and checkerboard transparency
- Comprehensive E2E test suite for layer system functionality

### Fixed

#### Layer System Improvements (January 2025)

- **Image Loading Fixes**:
  - Fixed layer bounds tracking when images are loaded into layers
  - Images now properly visible after loading into new layers
  - Layer bounds correctly initialized for image content

- **Layer Rendering Fixes**:
  - Fixed viewport culling to render all visible layers even when bounds tracking is incomplete
  - Added fallback to render all visible layers when viewport culling filters them out
  - Improved layer visibility detection for layers with undefined bounds

- **Checkerboard Transparency**:
  - Fixed canvas background to be transparent, allowing checkerboard pattern to show through
  - Changed first layer initialization from white background to transparent (standard image editor behavior)
  - Erased areas now properly show checkerboard pattern behind transparent pixels
  - Matches professional image editor behavior (GIMP, Photoshop, Procreate)

- **Layer Bounds Tracking**:
  - Fixed `createLayer()` to properly initialize bounds for imageData and backgroundColor
  - Fixed `putImageData()` to update layer bounds after drawing operations
  - Fixed `extractSelectionToLayer()` to update bounds for both new and original layers

### Changed

- First layer now created with transparent background instead of white (`#FFFFFF`)
- Canvas element CSS updated with explicit `background: transparent` for checkerboard visibility

### Added

- Initial project setup with Next.js 16 and React 19
- TypeScript strict mode configuration
- ESLint and Prettier for code quality
- Husky git hooks for pre-commit and pre-push checks
- GitHub Actions CI/CD workflow
- Dependabot for automated dependency updates
- Vitest testing framework with coverage support
- Comprehensive error boundaries
- Security headers in Next.js configuration
- Professional project documentation (CONTRIBUTING.md, LICENSE)

### Changed

- Enhanced metadata configuration with Open Graph and Twitter cards
- Improved TypeScript strictness settings
- Enhanced Next.js configuration with security and performance optimizations

### Refactored

#### Codebase Cleanup (December 2025)

- **Type Safety Improvements**:
  - Replaced `any` type with proper `AppState` type in `src/lib/tools/pencil.ts`
  - Added proper type imports throughout codebase
  - Fixed type casting issues in brush texture handling

- **Unused Code Removal**:
  - Commented out unused functions reserved for future use in intelligent-scissors and paths tools
  - Removed unused imports (`StateManager` from rotate/scale tools)
  - Fixed all unused variable warnings (prefixed with `_` or commented out)

- **Import Organization**:
  - Fixed import order in `src/app/page.tsx` to match style guide
  - Ensured consistent import patterns across codebase

- **Architecture Compliance**:
  - Fixed incorrect method calls (`Canvas.getCanvasWrapper()` → `elements.canvasWrapper`)
  - Verified all modules follow IIFE pattern
  - Verified all tools properly registered

- **File Cleanup**:
  - Removed duplicate `public/workers/workers/` directory
  - Cleaned up redundant worker files

### Fixed

#### Critical Bugs (5 fixes)

- Canvas module now throws explicit errors instead of silently returning wrong canvas data when layers are enabled but activeLayerId is null
- Canvas `putImageData()` now logs warnings and handles errors explicitly instead of failing silently when no active layer exists
- History module now includes try-catch error handling for canvas operations to prevent silent failures
- History undo/redo operations now validate array indices before access to prevent crashes from corrupted history state
- History module improved error handling for async IndexedDB caching to prevent data loss

#### High Priority Bugs (7 fixes)

- Canvas module now uses cached contexts from Layers module for better performance and consistency
- Canvas `getImageDataRegion()` now uses cached context instead of creating new ones
- Canvas component now explicitly sets initialization state to false on error to prevent broken states
- Initialization now uses Canvas module's context consistently instead of creating duplicate contexts
- Tool state (pencil) now includes error handling for canvas context retrieval
- LayerPanel fixed memory leak by removing `visibleLayerIds` from IntersectionObserver dependencies
- StateManager `setLayers()` now validates layer structure to prevent crashes from invalid data

#### Medium Priority Bugs (3 fixes)

- Canvas resize now validates image data dimensions and handles mismatches correctly to prevent layer content loss
- Coordinate validation now checks for zero canvas dimensions before division to prevent NaN coordinates
- IndexedDB storage operations now degrade gracefully instead of throwing errors when storage is unavailable
  - **Note**: This was later changed - IndexedDB is now required (see December 2025 audit)

#### Error Handling Improvements

- Added comprehensive error handling with try-catch blocks around StateManager.getState() calls in critical paths
- Canvas, Layers, Tools, and UI modules now have defensive error handling with safe fallbacks
  - **Note**: Fallbacks were later removed - modern browser features are now required (see December 2025 audit)
- All IndexedDB operations now return safe defaults (null, empty arrays) instead of throwing errors
  - **Note**: This was later changed - IndexedDB is now required (see December 2025 audit)
- Improved graceful degradation when state management or storage is unavailable
  - **Note**: Graceful degradation was later removed (see December 2025 audit)

#### Code Quality Improvements (December 2025)

- Fixed 15+ TypeScript errors including unused variables, missing types, and incorrect method calls
- Improved type safety by eliminating all `any` types in production code
- Standardized import organization across all files
- Verified architecture compliance (IIFE pattern, tool registration)
- Removed all unused code and properly commented functions reserved for future use

## [0.1.0] - 2025-12-15

### Added

- Pixel art editor core functionality
- Drawing tools (Pencil, Paint Bucket)
- Selection tools (Magic Wand, Color Range, Rectangular Selection)
- Utility tools (Color Picker, Move Tool)
- Undo/Redo system
- Zoom controls
- Canvas resize functionality
- Image upload support
- Export to PNG
- Keyboard shortcuts

[Unreleased]: https://github.com/your-username/pixel-studio/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/your-username/pixel-studio/releases/tag/v0.1.0
