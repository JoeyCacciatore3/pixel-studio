# Pixel Studio E2E Test Suite

This directory contains end-to-end tests for Pixel Studio using Playwright.

## Test Structure

```
tests/
├── e2e/
│   ├── browser-compatibility.spec.ts  # Cross-browser compatibility tests
│   ├── mobile-touch.spec.ts           # Mobile touch interaction tests
│   ├── canvas-functions.spec.ts       # Canvas operations (clear, undo, redo, upload)
│   ├── layer-system-verification.spec.ts  # Layer system functionality and checkerboard
│   ├── tools.spec.ts                  # Tool functionality tests
│   └── playwright.config.ts           # Playwright configuration
├── screenshots/                        # Test screenshots (generated)
└── reports/                           # Test reports (generated)
```

## Running Tests

### Prerequisites

1. Install dependencies:

```bash
npm install
```

2. Install Playwright browsers:

```bash
npx playwright install
```

### Running All Tests

```bash
# Run all tests
npx playwright test

# Run tests in UI mode
npx playwright test --ui

# Run tests in headed mode (see browser)
npx playwright test --headed
```

### Running Specific Test Suites

```bash
# Browser compatibility tests only
npx playwright test browser-compatibility

# Mobile touch tests only
npx playwright test mobile-touch

# Canvas functions tests
npx playwright test canvas-functions

# Layer system verification tests
npx playwright test layer-system-verification

# Tools tests
npx playwright test tools

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=webkit
npx playwright test --project=firefox
```

### Running on Specific Devices

```bash
# Mobile Safari (iPhone)
npx playwright test --project="Mobile Safari"

# Mobile Chrome (Android)
npx playwright test --project="Mobile Chrome"

# Tablet
npx playwright test --project="Tablet"
```

## Test Configuration

Tests are configured in `playwright.config.ts`. Key settings:

- **Base URL**: `http://localhost:3000` (or set `APP_URL` env variable)
- **Timeout**: 30 seconds per test
- **Retries**: 2 retries on CI, 0 locally
- **Parallel**: Tests run in parallel locally

## Viewing Test Results

After running tests, view the HTML report:

```bash
npx playwright show-report
```

This opens an interactive HTML report showing:

- Test results
- Screenshots on failure
- Videos on failure
- Traces for debugging

## Test Coverage

### Browser Compatibility Tests

- Application load and initialization
- Responsive layouts (mobile, tablet, desktop)
- Canvas functionality
- Browser-specific features (Safari, Chrome, Firefox)
- Performance metrics
- Accessibility checks
- PWA validation

### Mobile Touch Tests

- Mobile toolbar display
- Touch tool selection
- Single touch drawing
- Pinch-to-zoom gestures
- Mobile UI components
- Orientation changes
- Mobile performance
- Touch gesture recognition

### Canvas Functions Tests

- Clear canvas functionality
- Undo/redo operations
- Image upload and loading
- Canvas state management

### Layer System Verification Tests

- Image loading into layers
- Layer bounds tracking
- Layer operations (visibility, opacity, reorder, delete)
- Checkerboard transparency display
- Erased areas showing checkerboard pattern

## Continuous Integration

Tests are designed to run in CI environments. Set the `CI` environment variable:

```bash
CI=true npx playwright test
```

In CI mode:

- Tests retry twice on failure
- Workers are limited to 1 (no parallel)
- Test server is always started fresh

## Debugging Tests

### Debug Mode

Run tests in debug mode:

```bash
npx playwright test --debug
```

This opens Playwright Inspector where you can:

- Step through tests
- Inspect page state
- View console logs
- Modify test code

### Trace Viewer

When tests fail, traces are saved. View them:

```bash
npx playwright show-trace trace.zip
```

### Screenshots and Videos

Failed tests automatically capture:

- Screenshots (in `tests/screenshots/`)
- Videos (in `test-results/`)

## Writing New Tests

When adding new tests:

1. Create test file in `tests/e2e/` directory
2. Use `.spec.ts` extension
3. Import from `@playwright/test`
4. Use descriptive test names
5. Add proper assertions
6. Handle async operations properly

Example:

```typescript
import { test, expect } from '@playwright/test';

test('my feature test', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.my-element')).toBeVisible();
});
```

## Environment Variables

- `APP_URL`: Base URL for the application (default: `http://localhost:3000`)
- `CI`: Set to `true` in CI environments

## Troubleshooting

### Tests timeout

Increase timeout in `playwright.config.ts`:

```typescript
timeout: 60 * 1000, // 60 seconds
```

### Tests fail to connect

Ensure the dev server is running:

```bash
npm run dev
```

Or let Playwright start it automatically (configured in `playwright.config.ts`).

### Browser not found

Install Playwright browsers:

```bash
npx playwright install
```

### Mobile emulation issues

Ensure device profiles are correct in `playwright.config.ts`. Playwright includes many device profiles - check available devices:

```bash
npx playwright show-trace --help
```

## Best Practices

1. **Use data-testid attributes** for reliable selectors
2. **Wait for elements** using `waitForLoadState` and `waitFor`
3. **Use specific assertions** rather than generic ones
4. **Clean up after tests** if needed
5. **Keep tests independent** - don't rely on test execution order
6. **Use page object pattern** for complex pages
7. **Test user flows** not implementation details
