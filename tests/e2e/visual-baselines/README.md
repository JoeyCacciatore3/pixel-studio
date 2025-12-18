# Visual Regression Baselines

This directory contains visual regression test baselines (reference screenshots) for Pixel Studio.

## Structure

Baselines are organized by test name and variant:
- `empty-canvas.png` - Baseline for empty canvas state
- `canvas-with-drawing.png` - Baseline for canvas with drawing
- `toolbar.png` - Baseline for toolbar element
- `responsive-layout-mobile.png` - Baseline for mobile viewport
- `responsive-layout-desktop.png` - Baseline for desktop viewport

## Managing Baselines

### Creating Baselines

Baselines are automatically created on first test run. You can also create them manually:

```typescript
import { captureVisualBaseline } from './helpers/visual-regression-helpers';

await captureVisualBaseline(page, 'test-name');
```

### Updating Baselines

When visual changes are intentional, update the baseline:

```typescript
import { updateVisualBaseline } from './helpers/visual-regression-helpers';

await updateVisualBaseline('test-name');
```

Or manually:
1. Run the test to generate the actual screenshot
2. Copy the actual screenshot from `tests/screenshots/` to this directory
3. Rename it to match the baseline name

### Reviewing Changes

When visual regression tests fail:
1. Check the diff image in `tests/screenshots/`
2. Review the changes
3. If intentional, update the baseline
4. If unintentional, fix the code

## Best Practices

1. **Commit Baselines**: Always commit baseline images with your code changes
2. **Review Diffs**: Always review visual diffs before updating baselines
3. **Version Control**: Use Git LFS for large baseline images if needed
4. **Documentation**: Document intentional visual changes in commit messages

## Configuration

Visual regression settings are configured in:
- `tests/e2e/mcp-config.json` - Visual regression configuration
- `tests/e2e/playwright.config.ts` - Playwright screenshot settings
