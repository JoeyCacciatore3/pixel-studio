# Cleanup Tools Documentation

Professional cleanup and edge perfection tools for transforming rough artwork into logo-ready, print-perfect assets.

## Overview

The cleanup tools system provides 8 specialized tools designed to eliminate noise, smooth jagged edges, and produce crisp, professional output suitable for logos, icons, game assets, and print media.

## Tools

### 1. Stray Pixel Eliminator

**Purpose**: Automatically detects and removes isolated pixels that don't belong to the main artwork.

**Algorithm**: Connected Component Analysis (CCA) with size filtering
- Uses flood-fill algorithm to find connected regions
- Counts pixels per region
- Removes regions smaller than threshold (1-10 pixels)
- Optional: Merge small regions into nearest neighbor color

**Options**:
- `minSize`: Minimum cluster size (1-10 pixels)
- `merge`: Merge small regions instead of deleting

**Usage**: Action tool - executes on click

**File**: `src/lib/cleanup/strayPixels.ts`, `src/lib/tools/cleanup-stray-pixels.ts`

### 2. Color Noise Reducer

**Purpose**: Eliminates unwanted color variations and forces artwork to use only specified palette colors.

**Modes**:
- **Auto-clean**: Merge similar colors within threshold (perceptual LAB distance)
- **Palette Lock**: Force every pixel to nearest palette color
- **Quantize**: K-means clustering to reduce to N colors

**Options**:
- `mode`: 'auto-clean' | 'palette-lock' | 'quantize'
- `threshold`: Similarity threshold for auto-clean (0-255)
- `nColors`: Target number of colors for quantize (2-256)
- `palette`: Target palette array for palette-lock mode
- `useLab`: Use LAB color space for perceptual accuracy (default: true)

**Usage**: Action tool with options panel

**File**: `src/lib/cleanup/colorReducer.ts`, `src/lib/tools/cleanup-color-reduce.ts`

### 3. Edge Crispener

**Purpose**: Removes fuzzy halos and semi-transparent edge pixels that appear when extracting sprites from backgrounds.

**Methods**:
- **Threshold**: Simple alpha threshold (pixels below threshold become transparent)
- **Erode**: Morphological erosion of alpha channel
- **Decontaminate**: Remove background color bleeding into edges

**Options**:
- `method`: 'threshold' | 'erode' | 'decontaminate'
- `threshold`: Alpha threshold (0-255, default: 200)
- `erodePixels`: Number of pixels to erode (1-5)
- `backgroundColor`: Background color for decontamination

**Usage**: Action tool

**File**: `src/lib/cleanup/edgeCrispener.ts`, `src/lib/tools/cleanup-edge-crisp.ts`

### 4. Edge Smoother

**Purpose**: Detects jagged staircase patterns on edges and smooths them with proper anti-aliasing while maintaining crisp pixel art aesthetic.

**Algorithm**: Pattern detection + anti-aliasing
- Detects edge pixels using Sobel edge detection
- Identifies staircase patterns (2+ pixel steps)
- Adds intermediate-value pixels for smooth transitions
- Preserves intentional hard edges

**Modes**:
- **Subtle**: Single intermediate shade (1-color AA)
- **Standard**: Two intermediate shades (2-color AA)
- **Smooth**: Three shades, very smooth (3-color AA)
- **Pixel-Perfect**: Only fixes obvious jaggies

**Options**:
- `mode`: 'subtle' | 'standard' | 'smooth' | 'pixel-perfect'
- `strength`: Smoothing strength (0-100, default: 50)
- `preserveCorners`: Preserve hard corners (default: true)

**Usage**: Interactive tool with real-time preview

**File**: `src/lib/cleanup/edgeSmoother.ts`, `src/lib/tools/cleanup-edge-smooth.ts`

### 5. Line Thickness Normalizer

**Purpose**: Detects inconsistent line thickness and normalizes it to a uniform width throughout the artwork.

**Algorithm**: Morphological operations + skeletonization
- Skeletonize to find line centers
- Calculate distance transform (thickness at each point)
- Erode thick sections, dilate thin sections
- Preserve intentional thick areas

**Options**:
- `targetWidth`: Target line width in pixels (1, 2, 3, etc.)

**Usage**: Interactive tool

**File**: `src/lib/cleanup/lineNormalizer.ts`, `src/lib/tools/cleanup-line-normalize.ts`

### 6. Outline Perfecter

**Purpose**: Detects the outline/lineart of artwork and perfects it - closing gaps, smoothing curves, and ensuring consistent clean edges.

**Features**:
- **Gap Closer**: Closes gaps up to N pixels wide
- **Line Straightener**: Snaps nearly-straight lines to perfect angles (horizontal, vertical, 45°)
- **Curve Smoother**: Smooths curves using moving average
- **Corner Sharpener**: Detects and sharpens rounded corners

**Options**:
- `closeGaps`: Enable gap closing (default: true)
- `maxGapSize`: Maximum gap size to close (1-5 pixels, default: 3)
- `straightenLines`: Snap to angles (default: false)
- `snapAngles`: Angles to snap to (default: [0, 45, 90, 135])
- `smoothCurves`: Enable curve smoothing (default: false)
- `smoothStrength`: Smoothing strength (0-100, default: 50)
- `sharpenCorners`: Enable corner sharpening (default: false)
- `cornerThreshold`: Angle threshold for corner detection in degrees (default: 120)

**Usage**: Interactive tool with options

**File**: `src/lib/cleanup/outlinePerfecter.ts`, `src/lib/tools/cleanup-outline.ts`

### 7. One-Click Logo Cleaner

**Purpose**: Combines multiple cleanup operations into a single intelligent pass optimized for logo/icon preparation.

**Pipeline Order**:
1. Stray removal
2. Color reduction
3. Edge crispening
4. Edge smoothing
5. Outline perfecting

**Presets**:
- **Logo - Minimal**: Light cleanup, preserve style
- **Logo - Standard**: Balanced cleanup (default)
- **Logo - Aggressive**: Maximum cleanup for rough sources
- **Icon - App Store**: Optimized for small sizes
- **Game Asset**: Preserve pixel art aesthetic
- **Print Ready**: Highest quality, no artifacts

**Options**:
- `preset`: Preset name or custom options
- Fine-tune sliders for each operation

**Usage**: Action tool with preset selector

**File**: `src/lib/cleanup/logoCleaner.ts`, `src/lib/tools/cleanup-logo.ts`

### 8. Pixel-Perfect Inspector

**Purpose**: Provides precision tools for manual cleanup with helpful visualization overlays.

**Features**:
- **Problem Highlighter**: Overlay modes that highlight issues:
  - Stray pixels (isolated) - Red
  - Jaggy edges (staircases) - Yellow
  - Color noise (similar colors) - Green
  - Fuzzy edges (semi-transparent) - Blue
  - Thickness variation - Magenta
- **Grid Overlay**: Show pixel grid at any zoom level
- **Comparison View**: Side-by-side before/after comparison
- **Cleanup Brush**: Intelligent brush for manual fixes (future feature)

**Usage**: Interactive visualization tool

**File**: `src/lib/tools/cleanup-inspector.ts`

## Architecture

### Core Utilities

Located in `src/lib/cleanup/utils/`:

- **connectedComponents.ts**: Connected component analysis, flood-fill, component removal
- **morphology.ts**: Erosion, dilation, opening, closing, skeletonization, distance transform
- **colorDistance.ts**: LAB color space conversion, Delta E calculation, palette matching
- **contourTrace.ts**: Sobel edge detection, contour tracing, edge detection

### Web Worker

The cleanup worker (`src/lib/workers/cleanupWorker.ts`) handles CPU-intensive operations:
- Connected component analysis
- K-means clustering
- Edge detection (Sobel)
- Morphological operations

Operations automatically use the worker for large images (>500x500px) or when explicitly requested.

### Tool Integration

All cleanup tools:
- Integrate with History system (undo/redo support)
- Work with layer system (active layer, respect locking)
- Support selection (apply to selection if active, otherwise entire canvas/layer)
- Use Web Workers for performance
- Fall back to main thread if workers unavailable

## Usage Examples

### Basic Usage

```typescript
// Remove stray pixels
const tool = PixelStudio.getTool('cleanup-stray-pixels');
await tool.execute({ minSize: 3, merge: false, useWorker: true });

// Reduce colors
const colorTool = PixelStudio.getTool('cleanup-color-reduce');
await colorTool.execute({
  mode: 'quantize',
  nColors: 16,
  useWorker: true,
  useLab: true,
});

// One-click logo cleanup
const logoTool = PixelStudio.getTool('cleanup-logo');
await logoTool.execute({ preset: 'logo-standard' });
```

### Programmatic Usage

```typescript
import { removeStrayPixels, reduceColorNoise, cleanLogo } from '@/lib/cleanup';

// Direct algorithm usage
const imageData = Canvas.getImageData();
const cleaned = await removeStrayPixels(imageData, {
  minSize: 3,
  merge: false,
  useWorker: true,
});
Canvas.putImageData(cleaned, 0, 0);

// Logo cleanup with custom options
const logoCleaned = await cleanLogo(imageData, {
  preset: 'logo-aggressive',
  // Or custom options:
  strayRemoval: { minSize: 5, merge: true },
  colorReduction: { mode: 'quantize', nColors: 8 },
});
```

## Performance Considerations

### Web Worker Usage

- Automatic for large images (>500x500px)
- Manual override via `useWorker` option
- Falls back to main thread if worker unavailable
- Zero-copy ImageData transfer for efficiency

### Optimization Tips

- Use preview mode before applying to large images
- Process in chunks for very large images (future enhancement)
- Cache intermediate results where possible
- Use appropriate preset for your use case

## Best Practices

1. **Start with Logo Cleaner**: Use the one-click logo cleaner first, then fine-tune individual tools if needed
2. **Preview Before Apply**: Use preview mode to see results before committing
3. **Work on Copies**: Always work on layer copies when experimenting
4. **Use Appropriate Presets**: Choose presets that match your output target (logo, icon, game asset, print)
5. **Combine Tools**: Use multiple tools in sequence for best results (Logo Cleaner does this automatically)

## Technical Details

### Color Space

- Uses LAB color space for perceptual accuracy in color distance calculations
- RGB distance available as faster alternative
- Delta E (CIE76) for perceptual color difference

### Morphological Operations

- Square structuring elements for erosion/dilation
- Zhang-Suen algorithm for skeletonization
- Distance transform for thickness calculation

### Edge Detection

- Sobel operator for edge magnitude
- Alpha-based edge detection for transparency
- Contour tracing using Moore neighborhood algorithm

## Future Enhancements

- Batch processing for sprite sheets
- Advanced matting algorithms
- Vectorization for outline perfecter
- Real-time preview for all tools
- Custom palette import/export
- Dithering support for color reduction









