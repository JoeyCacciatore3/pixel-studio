# Pixel Studio - Multi-Device Browser Testing Guide

## Overview

This guide provides comprehensive instructions for testing Pixel Studio across multiple browsers, devices, and viewport sizes to ensure highest standards of multi-device compatibility.

## Quick Start

### 1. Install Dependencies

```bash
npm install
npx playwright install
```

### 2. Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`

### 3. Run Tests

```bash
# Run all tests
npm run test:e2e

# Run specific test suite
npm run test:e2e:mobile
npm run test:e2e:browser

# Run on specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

## Test Structure

### Test Files

- `tests/e2e/browser-compatibility.spec.ts` - Cross-browser compatibility tests
- `tests/e2e/mobile-touch.spec.ts` - Mobile touch interaction tests
- `tests/e2e/playwright.config.ts` - Playwright configuration

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

## Writing New Tests

### Test File Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.element')).toBeVisible();
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

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Generator](https://playwright.dev/docs/codegen)
- [Debugging Guide](https://playwright.dev/docs/debug)

## Support

For issues or questions:

1. Check test logs
2. Review HTML report
3. Check Playwright documentation
4. Review test code comments

---

**Last Updated**: $(date)
**Test Suite Version**: 1.0.0
