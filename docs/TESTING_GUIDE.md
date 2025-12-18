# Pixel Studio - Multi-Device Browser Testing Guide

## Overview

This guide provides comprehensive instructions for testing Pixel Studio across multiple browsers, devices, and viewport sizes to ensure highest standards of multi-device compatibility.

## Quick Start

### Step 1: Install Dependencies

```bash
npm install
npx playwright install
```

### Step 2: Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`

### Step 3: Run Tests

In a new terminal:

```bash
# Run all tests
npm run test:e2e

# Or use the shell script
./scripts/run-browser-tests.sh
```

### View Results

```bash
npm run test:e2e:report
```

### Quick Commands Reference

```bash
# All tests
npm run test:e2e

# Browser compatibility only
npm run test:e2e:browser

# Mobile touch tests only
npm run test:e2e:mobile

# Specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Interactive UI mode
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# MCP-Enhanced Testing
npm run test:e2e:mcp              # Run tests with MCP integration
npm run test:e2e:mcp:affected     # Run only affected tests
npm run test:e2e:generate         # Generate test from description
npm run test:e2e:report:mcp       # Generate enhanced report
```

### Verify MCP Agents

Before running MCP-enhanced tests, verify MCP agent availability:

```bash
npx tsx scripts/verify-mcp-agents.ts
```

This will:
- Test all MCP agents (Context7, Memory, Sequential-Thinking, Coding-Agent, Firecrawl)
- Report which agents are available
- Show latency for each agent
- Provide recommendations

**Note**: All MCP features work with functional fallbacks if agents are unavailable. Tests will still run successfully.

## Test Structure

### Test Files

**Core Test Suites:**
- `tests/e2e/browser-compatibility.spec.ts` - Cross-browser compatibility tests
- `tests/e2e/mobile-touch.spec.ts` - Mobile touch interaction tests
- `tests/e2e/canvas-functions.spec.ts` - Canvas operations (clear, undo, redo, upload)
- `tests/e2e/layer-system-verification.spec.ts` - Layer system functionality and checkerboard transparency
- `tests/e2e/tools.spec.ts` - Tool functionality tests

**Comprehensive Test Suites (State Management & Error Handling):**
- `tests/e2e/initialization.spec.ts` - App initialization, error recovery, retry mechanisms, error boundaries
- `tests/e2e/state-management.spec.ts` - State updates, persistence, concurrent modifications, invalid transitions
- `tests/e2e/canvas-operations.spec.ts` - Canvas resize during operations, context loss, locked layers, invalid coordinates
- `tests/e2e/layer-edge-cases.spec.ts` - Layer deletion during operations, lock/unlock, rendering failures, bounds tracking
- `tests/e2e/history-failures.spec.ts` - Storage failures, corrupted data, worker failures, recovery mechanisms
- `tests/e2e/tool-errors.spec.ts` - Tool operations with invalid state, null contexts, locked layers, error cleanup
- `tests/e2e/browser-edge-cases.spec.ts` - Missing browser features (OffscreenCanvas, Workers, IndexedDB), storage limitations
- `tests/e2e/concurrent-operations.spec.ts` - Simultaneous operations, race conditions, event handler conflicts
- `tests/e2e/storage-persistence.spec.ts` - Quota exceeded, storage disabled, corrupted data recovery, migration failures
- `tests/e2e/performance-memory.spec.ts` - Large canvas operations, memory pressure, leaks, performance regression detection
- `tests/e2e/mobile-edge-cases.spec.ts` - Touch failures, orientation changes, mobile browser limitations, crash recovery
- `tests/e2e/integration-scenarios.spec.ts` - Complete workflows with errors, recovery scenarios, browser navigation

**MCP-Enhanced Test Suites:**
- `tests/e2e/visual-regression.spec.ts` - Automated visual regression testing
- `tests/e2e/performance-monitoring.spec.ts` - Continuous performance monitoring

**Test Helpers:**
- `tests/e2e/helpers/canvas-helpers.ts` - Canvas operations, drawing, state management utilities
- `tests/e2e/helpers/state-helpers.ts` - State management testing utilities
- `tests/e2e/helpers/error-helpers.ts` - Error injection and detection utilities
- `tests/e2e/helpers/browser-helpers.ts` - Browser feature detection and manipulation
- `tests/e2e/helpers/performance-helpers.ts` - Performance and memory monitoring utilities (MCP-enhanced)
- `tests/e2e/helpers/fail-safes.ts` - Retry, timeout, and recovery mechanisms
- `tests/e2e/helpers/test-constants.ts` - Shared constants (APP_URL, timeouts, delays)

**MCP Integration Helpers:**
- `tests/e2e/helpers/mcp-playwright-helpers.ts` - Playwright MCP integration for test execution and debugging
- `tests/e2e/helpers/mcp-context7-helpers.ts` - Context7 integration for documentation and best practices
- `tests/e2e/helpers/mcp-memory-helpers.ts` - Memory MCP integration for test pattern learning
- `tests/e2e/helpers/visual-regression-helpers.ts` - Visual regression testing utilities

**MCP Scripts:**
- `scripts/mcp-test-runner.ts` - MCP-powered test execution with smart selection
- `scripts/mcp-test-generator.ts` - AI-powered test generation from descriptions
- `scripts/mcp-report-generator.ts` - Enhanced test reporting with insights

**Configuration:**
- `tests/e2e/playwright.config.ts` - Playwright configuration (MCP-enhanced)
- `tests/e2e/mcp-config.json` - MCP tool configuration and settings

### Test Categories

#### 1. Application Load & Initialization

- Application loads correctly
- Canvas initializes
- All components render
- Meta tags are present

#### 2. Responsive Layout Tests

- Mobile layout (< 768px)
- Tablet layout (768px - 1023px)
- Desktop layout (>= 1024px)
- Orientation changes

#### 3. Canvas Functionality

- Canvas initialization
- Drawing capabilities
- Touch drawing on mobile
- Clear, undo, and redo operations
- Image upload functionality

#### 4. Layer System Verification

- Image loading into layers
- Layer bounds tracking
- Layer operations (visibility, opacity, reorder, delete)
- Checkerboard transparency display
- Erased areas showing checkerboard pattern

#### 4. Mobile Touch Interactions

- Mobile toolbar display
- Tool selection via touch
- Single touch drawing
- Pinch-to-zoom gestures
- Touch behavior prevention

#### 5. Browser-Specific Features

- Safari/iOS viewport fixes
- Chrome hardware acceleration
- Firefox canvas optimizations

#### 6. Performance Metrics

- Load time
- First Contentful Paint (FCP)
- Time to Interactive (TTI)
- Core Web Vitals

#### 7. Accessibility Tests

- ARIA labels
- Semantic HTML
- Keyboard navigation
- Screen reader support

#### 8. PWA Tests

- Manifest validation
- Service worker registration
- Icon availability

## Running Tests

### Using npm Scripts

```bash
# All tests
npm run test:e2e

# Browser compatibility only
npm run test:e2e:browser

# Mobile touch tests only
npm run test:e2e:mobile

# Specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Mobile devices
npm run test:e2e:mobile-safari
npm run test:e2e:mobile-chrome

# UI Mode (interactive)
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

### Using Playwright Directly

```bash
# Run all tests
npx playwright test

# Run specific file
npx playwright test browser-compatibility

# Run with UI
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific project
npx playwright test --project=chromium
```

### Using the Test Script

```bash
# Run all tests
./scripts/run-browser-tests.sh

# Run specific suite
./scripts/run-browser-tests.sh browser
./scripts/run-browser-tests.sh mobile
```

## Test Configuration

### Browsers Tested

- **Chromium** (Chrome, Edge)
- **Firefox**
- **WebKit** (Safari)

### Devices/Viewports Tested

**Mobile:**

- iPhone SE (375x667)
- iPhone 12 (390x844)
- iPhone 14 Pro Max (428x926)
- Pixel 5 (393x851)

**Tablet:**

- iPad (768x1024)
- iPad Pro (834x1194)
- iPad Pro 12.9" (1024x1366)

**Desktop:**

- 1280x720
- 1920x1080
- 2560x1440

## Viewing Results

### HTML Report

After running tests, view the interactive HTML report:

```bash
npx playwright show-report
```

The report shows:

- Test results with pass/fail status
- Screenshots on failure
- Video recordings
- Performance traces
- Timeline visualization

### Screenshots

Screenshots are saved to `tests/screenshots/` for visual regression testing.

### Test Reports

Test reports are generated in `tests/reports/`:

- HTML report: `tests/reports/html/index.html`
- JSON report: `tests/reports/results.json`
- JUnit XML: `tests/reports/junit.xml`

## Debugging Tests

### Debug Mode

Run tests in debug mode to step through execution:

```bash
npm run test:e2e:debug
# or
npx playwright test --debug
```

### Trace Viewer

View execution traces for failed tests:

```bash
npx playwright show-trace trace.zip
```

### Console Output

Add console logging in tests:

```typescript
test('my test', async ({ page }) => {
  await page.goto('/');
  console.log('Page loaded');
  // Test code...
});
```

## Continuous Integration

Tests are designed to work in CI environments. Example GitHub Actions workflow:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          CI: true
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: tests/reports/html
```

## Test Helper System

All test files use a centralized helper system to ensure consistency and reduce duplication.

### Using Helpers

```typescript
import { test, expect } from '@playwright/test';
import {
  waitForCanvasReady,
  selectTool,
  drawStroke,
  getCanvasDataURL,
  APP_URL,
} from './helpers/canvas-helpers';
import { waitForStateManagerReady, checkStateConsistency } from './helpers/state-helpers';
import { captureConsoleErrors, expectNoCriticalErrors } from './helpers/error-helpers';
import { APP_URL } from './helpers/test-constants';

test('example test', async ({ page }) => {
  await page.goto(APP_URL);
  await waitForCanvasReady(page);
  await selectTool(page, 'pencil');
  await drawStroke(page, { x: 50, y: 50 }, { x: 100, y: 100 });
  // ...
});
```

### Available Helpers

**Canvas Helpers** (`canvas-helpers.ts`):
- `waitForCanvasReady()` - Wait for canvas to be initialized
- `selectTool()` - Select a tool with retry logic
- `drawStroke()` - Draw a stroke on the canvas
- `getCanvasDataURL()` - Get canvas state as data URL
- `getCanvasPixelData()` - Get pixel data at coordinates
- `canvasHasContent()` - Check if canvas has non-transparent content
- `clearCanvas()` - Clear the canvas
- `getCanvas()` - Get canvas locator
- `isCanvasInitialized()` - Check if canvas is initialized
- `resizeCanvas()` - Resize canvas dimensions

**State Helpers** (`state-helpers.ts`):
- `waitForStateManagerReady()` - Wait for StateManager to be initialized
- `getStateProperty()` - Get a state property value
- `waitForStateChange()` - Wait for state property to change
- `checkStateConsistency()` - Verify state consistency

**Error Helpers** (`error-helpers.ts`):
- `captureConsoleErrors()` - Capture browser console errors
- `expectNoCriticalErrors()` - Assert no critical errors occurred
- `expectErrorToContain()` - Assert error contains substring
- `collectConsoleErrors()` - Collect console errors with filtering

**Browser Helpers** (`browser-helpers.ts`):
- `setOfflineMode()` - Set browser offline/online mode
- `simulateStorageQuotaExceeded()` - Simulate storage quota errors
- `clearAllStorage()` - Clear all browser storage
- `reloadPageAndWaitForCanvas()` - Reload page and wait for canvas

**Performance Helpers** (`performance-helpers.ts`):
- `measureLoadTime()` - Measure page load time
- `measureFCP()` - Measure First Contentful Paint
- `measureMemoryUsage()` - Measure memory usage
- `expectNoMemoryLeaks()` - Assert no memory leaks

**Fail-Safes** (`fail-safes.ts`):
- `withRetry()` - Retry operation with exponential backoff
- `withTimeout()` - Execute operation with timeout
- `verifyErrorRecovery()` - Verify error recovery mechanisms
- `checkStateConsistency()` - Check state consistency after operations

**Test Constants** (`test-constants.ts`):
- `APP_URL` - Application URL (from env or default)
- `TEST_TIMEOUTS` - Common timeout values
- `WAIT_DELAYS` - Common wait delay values

## Writing New Tests

### Test File Structure

```typescript
import { test, expect } from '@playwright/test';
import {
  waitForCanvasReady,
  selectTool,
  drawStroke,
  APP_URL,
} from './helpers/canvas-helpers';
import { waitForStateManagerReady } from './helpers/state-helpers';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await waitForCanvasReady(page);
  });

  test('should do something', async ({ page }) => {
    await selectTool(page, 'pencil');
    await drawStroke(page, { x: 50, y: 50 }, { x: 100, y: 100 });
    // ...
  });
});
```

### Best Practices

1. **Use descriptive test names** - Clearly state what is being tested
2. **Wait for elements** - Use `waitForLoadState` and `waitFor`
3. **Use data-testid** - For reliable selectors
4. **Keep tests independent** - Don't rely on test execution order
5. **Clean up after tests** - Reset state if needed
6. **Use page objects** - For complex pages

### Example Test

```typescript
test('should allow drawing on canvas', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const canvas = page.locator('#mainCanvas');
  await expect(canvas).toBeVisible();

  const canvasBox = await canvas.boundingBox();
  if (canvasBox) {
    await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 150, canvasBox.y + 150);
    await page.mouse.up();

    await expect(canvas).toBeVisible();
  }
});
```

## Performance Testing

### Core Web Vitals

Tests include performance metrics collection:

```typescript
test('should measure Core Web Vitals', async ({ page }) => {
  await page.goto('/');

  // Measure FCP
  const fcp = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            resolve(entry.startTime);
          }
        }
      }).observe({ entryTypes: ['paint'] });
      setTimeout(() => resolve(null), 5000);
    });
  });

  expect(fcp).toBeLessThan(2000);
});
```

### Load Time Testing

```typescript
test('should load within acceptable time', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;

  expect(loadTime).toBeLessThan(5000);
});
```

## Accessibility Testing

### ARIA Labels

```typescript
test('should have ARIA labels', async ({ page }) => {
  await page.goto('/');
  const button = page.locator('#myButton');
  await expect(button).toHaveAttribute('aria-label');
});
```

### Keyboard Navigation

```typescript
test('should be keyboard navigable', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const focusedElement = page.locator(':focus');
  await expect(focusedElement).toBeVisible();
});
```

## Troubleshooting

### Tests Timeout

Increase timeout in `playwright.config.ts`:

```typescript
timeout: 60 * 1000, // 60 seconds
```

### Tests Fail to Connect

Ensure dev server is running:

```bash
npm run dev
```

Or let Playwright start it automatically (configured in `playwright.config.ts`).

### Browser Not Found

Install Playwright browsers:

```bash
npx playwright install
```

### Mobile Emulation Issues

Check device profiles in `playwright.config.ts`. Available devices:

```bash
npx playwright show-trace --help
```

### Flaky Tests

1. Add explicit waits
2. Use `waitForLoadState`
3. Increase timeouts
4. Check for race conditions

## Test Maintenance

### Regular Updates

- Update Playwright version regularly
- Update browser versions
- Review and update test selectors
- Update device profiles

### Test Coverage

Monitor test coverage and add tests for:

- New features
- Bug fixes
- Edge cases
- User flows

## MCP-Enhanced Testing

Pixel Studio includes comprehensive MCP (Model Context Protocol) integration for enhanced testing capabilities:

### Features

- **AI-Powered Test Generation**: Generate tests from natural language descriptions
- **Visual Regression Testing**: Automated screenshot comparison and visual change detection
- **Performance Monitoring**: Continuous performance tracking with budgets and baselines
- **Enhanced Debugging**: Comprehensive debugging tools with failure analysis
- **Test Pattern Learning**: Store and reuse successful test patterns
- **Smart Test Selection**: Automatically run only affected tests
- **Enhanced Reporting**: Reports with insights, recommendations, and analytics

### Quick Start with MCP

```bash
# Generate a test from description
tsx scripts/mcp-test-generator.ts "Test that pencil tool draws on canvas"

# Run tests with smart selection
tsx scripts/mcp-test-runner.ts --affected

# Generate enhanced report
tsx scripts/mcp-report-generator.ts
```

For comprehensive MCP testing documentation, see [MCP_TESTING_GUIDE.md](./MCP_TESTING_GUIDE.md).

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Generator](https://playwright.dev/docs/codegen)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [MCP Testing Guide](./MCP_TESTING_GUIDE.md) - Comprehensive MCP integration guide

## Support

For issues or questions:

1. Check test logs
2. Review HTML report
3. Check Playwright documentation
4. Review test code comments

---

**Last Updated**: December 2025
**Test Suite Version**: 1.0.0
