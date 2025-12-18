# Test Patterns and Best Practices

This document outlines the test patterns and best practices used in Pixel Studio's E2E test suite. These patterns ensure reliable, maintainable, and consistent tests.

## Table of Contents

1. [App Readiness Pattern](#app-readiness-pattern)
2. [Data-TestID Usage](#data-testid-usage)
3. [Canvas Comparison Patterns](#canvas-comparison-patterns)
4. [Element Interactivity Waits](#element-interactivity-waits)
5. [Test Structure](#test-structure)
6. [Common Patterns](#common-patterns)

## App Readiness Pattern

### Overview

Always wait for the application to be fully ready before interacting with it. The app has async initialization (canvas context, state manager, UI components) that must complete before tests can reliably interact.

### Usage

```typescript
import { waitForAppReady } from './helpers/app-readiness';

test.beforeEach(async ({ page }) => {
  await page.goto(APP_URL);
  await waitForAppReady(page, { maxWait: 30000 });
});
```

### What It Checks

- Canvas initialized (dimensions > 0, context available)
- State manager ready (`PixelStudio.getState() !== null`)
- UI components mounted (toolbar, panels visible)
- Network idle (no pending requests)

### Options

```typescript
await waitForAppReady(page, {
  maxWait: 30000, // Maximum wait time (default: 30000ms)
  waitForCanvas: true, // Wait for canvas (default: true)
  waitForStateManager: true, // Wait for state manager (default: true)
  waitForUI: true, // Wait for UI components (default: true)
  waitForNetworkIdle: true, // Wait for network idle (default: true)
});
```

## Data-TestID Usage

### Overview

Use `data-testid` attributes for reliable element selection. These attributes are stable and don't break when CSS classes change.

### Naming Convention

Format: `testid-{component}-{element}`

Examples:

- `testid-toolbar-pencil` - Pencil tool button in toolbar
- `testid-history-undo` - Undo button in history controls
- `testid-layer-toggle-visibility-{layerId}` - Layer visibility toggle
- `testid-mobile-toolbar-pencil` - Pencil tool in mobile toolbar

### Usage

```typescript
import { getByTestId, waitForElementInteractive } from './helpers/element-helpers';

// Get element by testid
const undoButton = await getByTestId(page, 'testid-history-undo', { maxWait: 10000 });

// Wait for element to be interactive before clicking
await waitForElementInteractive(undoButton);
await undoButton.click();
```

### Fallback Pattern

When data-testid might not be available, use CSS selectors as fallback:

```typescript
const element = page
  .locator('[data-testid="testid-toolbar-pencil"]')
  .or(page.locator('.tool-btn[data-tool="pencil"]').first());
```

## Canvas Comparison Patterns

### Overview

Use tolerance-based pixel comparison instead of strict string equality for canvas states. Canvas rendering can have slight pixel differences that don't affect functionality.

### Usage

```typescript
import { compareCanvasStatesWithTolerance } from './helpers/canvas-helpers';

// Compare with default tolerance (1%)
const result = await compareCanvasStatesWithTolerance(page, state1, state2);
expect(result.match).toBe(true);

// Compare with custom tolerance (5% for rendering variations)
const result = await compareCanvasStatesWithTolerance(page, state1, state2, {
  tolerance: 0.05,
  maxDiffPixels: 1000, // Optional: max absolute pixel difference
});
```

### Options

```typescript
{
  tolerance: 0.01,      // Maximum percentage of pixels that can differ (default: 0.01 = 1%)
  maxDiffPixels: 100,   // Optional: Maximum absolute pixel difference
  region: {             // Optional: Compare specific region
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  },
  detailed: false,      // Return detailed diff information
}
```

### When to Use

- **Strict comparison (tolerance: 0.01)**: For exact state checks (undo/redo, clear operations)
- **Loose comparison (tolerance: 0.05)**: For operations with rendering variations (drawing, image upload)

## Element Interactivity Waits

### Overview

Always wait for elements to be in an interactive state before clicking or interacting. Elements may be visible but not yet enabled or ready for interaction.

### Usage

```typescript
import { waitForElementInteractive } from './helpers/element-helpers';

const button = page.locator('#myButton');
await waitForElementInteractive(button, {
  maxWait: 10000,
  waitForVisible: true, // Wait for visible (default: true)
  waitForEnabled: true, // Wait for enabled (default: true)
  waitForNotAnimating: true, // Wait for animations to complete (default: true)
  waitForInViewport: true, // Wait for in viewport (default: true)
});
await button.click();
```

### What It Checks

1. Element is visible
2. Element is enabled (not disabled)
3. Element is not animating (CSS transitions/animations complete)
4. Element is in viewport (scrollable into view if needed)

### Shorthand

```typescript
import { getByTestId } from './helpers/element-helpers';

// Get element and wait for interactivity in one call
const button = await getByTestId(page, 'testid-history-undo', {
  maxWait: 10000,
  waitForEnabled: true,
});
```

## Test Structure

### Standard Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers/app-readiness';
import { getByTestId, waitForElementInteractive } from './helpers/element-helpers';
import { APP_URL } from './helpers/test-constants';

test.describe('Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);
  });

  test('should do something', async ({ page }) => {
    // 1. Get elements using data-testid
    const button = await getByTestId(page, 'testid-my-button');

    // 2. Wait for interactivity
    await waitForElementInteractive(button);

    // 3. Interact
    await button.click();

    // 4. Assert
    await expect(page.locator('#result')).toBeVisible();
  });
});
```

## Common Patterns

### Pattern 1: Tool Selection

```typescript
import { getByTestId, waitForElementInteractive } from './helpers/element-helpers';

// Select a tool
const pencilTool = await getByTestId(page, 'testid-toolbar-pencil', { maxWait: 10000 });
await waitForElementInteractive(pencilTool);
await pencilTool.click({ timeout: 10000 });
```

### Pattern 2: History Operations

```typescript
import { getByTestId, waitForElementInteractive } from './helpers/element-helpers';

// Undo operation
const undoButton = await getByTestId(page, 'testid-history-undo', { maxWait: 10000 });
await waitForElementInteractive(undoButton, { maxWait: 10000 });
await undoButton.click({ timeout: 10000 });
await page.waitForTimeout(500); // Wait for operation to complete
```

### Pattern 3: Canvas State Comparison

```typescript
import { getCanvasDataURL, compareCanvasStatesWithTolerance } from './helpers/canvas-helpers';

// Get initial state
const initialState = await getCanvasDataURL(page);

// Perform operation
await drawStroke(page, { x: 50, y: 50 }, { x: 150, y: 150 });

// Get state after operation
const afterDraw = await getCanvasDataURL(page);

// Compare with tolerance
const result = await compareCanvasStatesWithTolerance(page, initialState, afterDraw, {
  tolerance: 0.01,
});
expect(result.match).toBe(false); // States should differ after drawing
```

### Pattern 4: Mobile vs Desktop Detection

```typescript
const isMobile = await page.evaluate(() => window.innerWidth < 768);

if (isMobile) {
  const toolbar = page.locator('[data-testid="mobile-toolbar"]');
  await expect(toolbar).toBeVisible();
} else {
  const toolbar = page.locator('.toolbar, .extended-toolbar').first();
  await expect(toolbar).toBeVisible();
}
```

### Pattern 5: Handling Navigation

```typescript
// Wait for navigation to complete before evaluating
await page.reload();
await waitForAppReady(page);

// Or wait for specific load state
await page.waitForLoadState('domcontentloaded');

// Then safely evaluate
try {
  const result = await page.evaluate(() => {
    // Safe to evaluate now
    return window.someValue;
  });
} catch (error: any) {
  if (error.message?.includes('Execution context was destroyed')) {
    // Wait and retry
    await page.waitForLoadState('domcontentloaded');
    // Retry evaluation
  }
}
```

## Best Practices Summary

1. **Always use `waitForAppReady()`** in `beforeEach` hooks
2. **Prefer `data-testid` selectors** over CSS classes
3. **Use `waitForElementInteractive()`** before clicking/interacting
4. **Use tolerance-based canvas comparison** for state checks
5. **Wait for navigation** before `page.evaluate()`
6. **Use explicit timeouts** for critical operations
7. **Handle mobile/desktop differences** conditionally
8. **Add stability waits** after operations (100-500ms)

## Migration Guide

### Migrating from CSS Selectors

**Before:**

```typescript
const button = page.locator('.tool-btn[data-tool="pencil"]').first();
await button.click();
```

**After:**

```typescript
const button = await getByTestId(page, 'testid-toolbar-pencil');
await waitForElementInteractive(button);
await button.click();
```

### Migrating from Strict Canvas Comparison

**Before:**

```typescript
const match = await compareCanvasStates(page, state1, state2);
expect(match).toBe(true);
```

**After:**

```typescript
const result = await compareCanvasStatesWithTolerance(page, state1, state2, {
  tolerance: 0.01,
});
expect(result.match).toBe(true);
```

## References

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Helpers](../tests/e2e/helpers/)
- [App Readiness Helper](../tests/e2e/helpers/app-readiness.ts)
- [Element Helpers](../tests/e2e/helpers/element-helpers.ts)
- [Canvas Helpers](../tests/e2e/helpers/canvas-helpers.ts)
