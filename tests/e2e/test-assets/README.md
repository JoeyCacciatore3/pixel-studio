# Test Assets

This directory contains test images for cleanup tool testing.

## Test Image Types

- **stray-pixels-\*.png**: Images with known stray pixels for testing Stray Pixel Eliminator
- **color-noise-\*.png**: Images with color variations for testing Color Noise Reducer
- **jagged-edges-\*.png**: Images with jagged edges for testing Edge Smoother
- **fuzzy-edges-\*.png**: Images with semi-transparent edges for testing Edge Crispener
- **inconsistent-lines-\*.png**: Images with varying line thickness for testing Line Thickness Normalizer
- **gaps-\*.png**: Images with gaps in outlines for testing Outline Perfecter
- **complex-artwork-\*.png**: Complex artwork for testing Logo Cleaner

## Sizes

Test images are available in multiple sizes:

- 64x64 (small)
- 256x256 (medium)
- 512x512 (large)
- 1024x1024 (very large)

## Generation

Test images are generated programmatically using helper functions in `cleanup-helpers.ts` during test execution.
