# MCP-Enhanced E2E Testing Guide

## Overview

This guide documents the comprehensive MCP (Model Context Protocol) integration for Pixel Studio's E2E testing infrastructure. The MCP integration enhances testing with AI-powered test generation, advanced debugging, visual regression testing, performance monitoring, and intelligent test pattern learning.

## Table of Contents

- [MCP Tools Overview](#mcp-tools-overview)
- [Getting Started](#getting-started)
- [MCP Helpers](#mcp-helpers)
- [Test Execution](#test-execution)
- [Test Generation](#test-generation)
- [Visual Regression Testing](#visual-regression-testing)
- [Performance Monitoring](#performance-monitoring)
- [Debugging](#debugging)
- [Reporting](#reporting)
- [Best Practices](#best-practices)

## MCP Tools Overview

### Available MCP Tools

1. **Playwright MCP**: Browser automation, test execution, debugging
2. **Context7**: Documentation and best practices lookup
3. **Memory MCP**: Test pattern storage and learning
4. **Coding-Agent**: Code generation and refactoring
5. **Firecrawl**: Web scraping for test data
6. **Sequential-Thinking**: Complex test scenario planning

### Configuration

MCP tools are configured in `tests/e2e/mcp-config.json`. Enable or disable specific features as needed.

## Getting Started

### Prerequisites

1. MCP servers configured in `~/.cursor/mcp.json`
2. Environment variables set (if required):
   - `CONTEXT7_API_KEY` (for Context7)
   - `FIRECRAWL_API_KEY` (for Firecrawl)
   - `MCP_ENABLED=true` (to enable MCP features)

### Installation

No additional installation required. MCP tools are accessed via the configured MCP servers.

## MCP Helpers

### Playwright MCP Helpers

Located in `tests/e2e/helpers/mcp-playwright-helpers.ts`:

- `executeTestsViaMCP()` - Execute tests with MCP integration
- `captureDebugInfo()` - Capture comprehensive debugging information
- `analyzeTestFailure()` - Analyze failures and provide insights
- `startDebugSession()` - Start interactive debugging session
- `monitorTestExecution()` - Monitor test execution in real-time
- `getTestStatistics()` - Get test execution statistics
- `selectAffectedTests()` - Smart test selection based on changed files

### Context7 Helpers

Located in `tests/e2e/helpers/mcp-context7-helpers.ts`:

- `lookupPlaywrightBestPractices()` - Look up Playwright best practices
- `getReactTestingPatterns()` - Get React/Next.js testing patterns
- `validateTestAgainstBestPractices()` - Validate test code quality
- `getTestingAntiPatterns()` - Get anti-patterns to avoid
- `getRecommendedPatterns()` - Get recommended patterns for scenarios
- `getPlaywrightAPIReference()` - Get API documentation

### Memory MCP Helpers

Located in `tests/e2e/helpers/mcp-memory-helpers.ts`:

- `storeTestPattern()` - Store successful test patterns
- `getTestPatterns()` - Retrieve test patterns with filters
- `recordTestResult()` - Record test results for learning
- `findSimilarPatterns()` - Find similar patterns for reuse
- `learnFromFailure()` - Learn from test failures
- `getOptimizationRecommendations()` - Get optimization suggestions

### Visual Regression Helpers

Located in `tests/e2e/helpers/visual-regression-helpers.ts`:

- `captureVisualBaseline()` - Capture visual baseline
- `compareVisualState()` - Compare current state with baseline
- `updateVisualBaseline()` - Update baseline (approve changes)
- `captureElementScreenshot()` - Capture element screenshot
- `compareElementVisualState()` - Compare element visual state
- `captureResponsiveVisualStates()` - Capture multiple viewport states
- `generateVisualTestReport()` - Generate visual test report

## Test Execution

### Using MCP Test Runner

```bash
# Run all tests with MCP integration
tsx scripts/mcp-test-runner.ts

# Run affected tests only
tsx scripts/mcp-test-runner.ts --affected

# Run specific test pattern
tsx scripts/mcp-test-runner.ts --pattern "canvas-functions"

# Run on specific browser
tsx scripts/mcp-test-runner.ts --project chromium

# Run in debug mode
tsx scripts/mcp-test-runner.ts --debug
```

### Smart Test Selection

The MCP test runner automatically selects affected tests based on changed files:

```bash
# Automatically detects changed files from git
tsx scripts/mcp-test-runner.ts --affected

# Or specify changed files manually
tsx scripts/mcp-test-runner.ts --affected --changed-files "src/lib/canvas.ts,src/components/Canvas.tsx"
```

## Test Generation

### AI-Powered Test Generation

Generate tests from natural language descriptions:

```bash
# Generate test from description
tsx scripts/mcp-test-generator.ts "Test that pencil tool draws on canvas when user clicks and drags"

# Generate and save to file
tsx scripts/mcp-test-generator.ts "Test canvas clear functionality" --file canvas-clear.spec.ts --save

# Use similar patterns
tsx scripts/mcp-test-generator.ts "Test layer creation" --use-patterns --category "layer-testing"
```

### Example Usage

```typescript
// Generate test code
const testCode = await generateTestFromDescription({
  description: "Test that eraser tool removes drawing from canvas",
  testFile: "eraser-tests.spec.ts",
  category: "tool-testing",
  tags: ["eraser", "canvas"],
  usePatterns: true,
});
```

## Visual Regression Testing

### Basic Visual Testing

```typescript
import { compareVisualState } from './helpers/visual-regression-helpers';

test('should match canvas visual baseline', async ({ page }) => {
  await waitForCanvasReady(page);
  await selectTool(page, 'pencil');
  await drawStroke(page, { x: 50, y: 50 }, { x: 100, y: 100 });

  const result = await compareVisualState(page, 'canvas-with-drawing');
  expect(result.match).toBe(true);
});
```

### Element-Level Visual Testing

```typescript
import { compareElementVisualState } from './helpers/visual-regression-helpers';

test('should match toolbar visual baseline', async ({ page }) => {
  const result = await compareElementVisualState(
    page,
    '.extended-toolbar',
    'toolbar'
  );
  expect(result.match).toBe(true);
});
```

### Responsive Visual Testing

```typescript
import { compareResponsiveVisualStates } from './helpers/visual-regression-helpers';

test('should match baselines across viewports', async ({ page }) => {
  const viewports = [
    { width: 375, height: 667, name: 'mobile' },
    { width: 1920, height: 1080, name: 'desktop' },
  ];

  const results = await compareResponsiveVisualStates(
    page,
    'responsive-layout',
    viewports
  );

  results.forEach(result => {
    expect(result.match).toBe(true);
  });
});
```

### Updating Baselines

When visual changes are intentional, update the baseline:

```typescript
import { updateVisualBaseline } from './helpers/visual-regression-helpers';

// After making intentional visual changes
await updateVisualBaseline('canvas-with-drawing');
```

## Performance Monitoring

### Performance Budgets

Performance budgets are defined in `tests/e2e/mcp-config.json`:

```json
{
  "performance": {
    "budgets": {
      "loadTime": 5000,
      "fcp": 2000,
      "lcp": 2500,
      "memory": 104857600,
      "canvasOperationDuration": 2000
    }
  }
}
```

### Using Performance Helpers

```typescript
import {
  assertPerformanceBudget,
  measureCoreWebVitals,
  trackPerformanceMetrics,
} from './helpers/performance-helpers';

test('should meet performance budget', async ({ page }) => {
  await page.goto(APP_URL);

  const budgetResult = await assertPerformanceBudget(page);
  expect(budgetResult.passed).toBe(true);

  if (budgetResult.violations.length > 0) {
    console.log('Performance violations:', budgetResult.violations);
  }
});

test('should measure Core Web Vitals', async ({ page }) => {
  await page.goto(APP_URL);

  const vitals = await measureCoreWebVitals(page);
  expect(vitals.fcp).toBeLessThan(2000);
  expect(vitals.lcp).toBeLessThan(2500);
  expect(vitals.cls).toBeLessThan(0.1);
});
```

### Performance Baselines

Save and compare against performance baselines:

```typescript
import {
  savePerformanceBaseline,
  getPerformanceBaseline,
  checkPerformanceRegression,
} from './helpers/performance-helpers';

// Save baseline
await savePerformanceBaseline('canvas-drawing', {
  loadTime: 3000,
  fcp: 1500,
  lcp: 2000,
  memory: 50 * 1024 * 1024,
  canvasOperationDuration: 1000,
});

// Check for regression
const baseline = await getPerformanceBaseline('canvas-drawing');
if (baseline) {
  const regression = await checkPerformanceRegression(page, baseline);
  expect(regression.regressed).toBe(false);
}
```

## Debugging

### Enhanced Debugging

Use MCP debugging tools for comprehensive failure analysis:

```typescript
import {
  captureDebugInfo,
  analyzeTestFailure,
} from './helpers/mcp-playwright-helpers';

test('debug test failure', async ({ page, testInfo }) => {
  try {
    // Test code that might fail
    await performOperation(page);
  } catch (error) {
    // Capture debug information
    const debugInfo = await captureDebugInfo(page, testInfo, {
      captureScreenshots: true,
      captureVideo: true,
      analyzeNetwork: true,
      profilePerformance: true,
      captureTrace: true,
      consoleLogs: true,
    });

    // Analyze failure
    const analysis = await analyzeTestFailure(
      testInfo.title,
      error as Error,
      debugInfo
    );

    console.log('Possible causes:', analysis.possibleCauses);
    console.log('Suggestions:', analysis.suggestions);
    console.log('Related tests:', analysis.relatedTests);

    throw error;
  }
});
```

### Interactive Debugging

Start an interactive debugging session:

```typescript
import { startDebugSession } from './helpers/mcp-playwright-helpers';

// Start debug session for a specific test
await startDebugSession(
  'canvas-operations.spec.ts',
  'should handle resize',
  {
    captureScreenshots: true,
    captureVideo: true,
    analyzeNetwork: true,
    profilePerformance: true,
  }
);
```

## Reporting

### Enhanced Test Reports

Generate comprehensive test reports with insights:

```bash
# Generate enhanced report
tsx scripts/mcp-report-generator.ts
```

The report includes:
- Test execution summary
- Failure analysis
- Flaky test detection
- Performance metrics
- Optimization recommendations
- Test pattern insights

### Report Features

- **Interactive HTML Report**: Visual report with charts and insights
- **Failure Analysis**: Detailed analysis of test failures
- **Performance Trends**: Track performance over time
- **Pattern Recommendations**: Suggestions based on learned patterns
- **Optimization Tips**: Actionable recommendations

## Best Practices

### 1. Use MCP Helpers

Always use MCP helpers instead of duplicating functionality:

```typescript
// ✅ Good
import { waitForCanvasReady, selectTool } from './helpers/canvas-helpers';
import { captureDebugInfo } from './helpers/mcp-playwright-helpers';

// ❌ Bad
// Duplicating helper functions in test files
```

### 2. Store Successful Patterns

Store successful test patterns for reuse:

```typescript
import { storeTestPattern } from './helpers/mcp-memory-helpers';

await storeTestPattern({
  id: 'canvas-drawing-pattern',
  name: 'Canvas Drawing Pattern',
  description: 'Pattern for testing canvas drawing operations',
  code: testCode,
  category: 'canvas',
  tags: ['drawing', 'canvas', 'pencil'],
});
```

### 3. Learn from Failures

Record test results to learn from patterns:

```typescript
import { recordTestResult } from './helpers/mcp-memory-helpers';

await recordTestResult({
  testName: 'should draw on canvas',
  testFile: 'canvas-functions.spec.ts',
  success: true,
  duration: 1500,
  patterns: ['canvas-drawing-pattern'],
  timestamp: new Date(),
});
```

### 4. Validate Against Best Practices

Validate tests before committing:

```typescript
import { validateTestAgainstBestPractices } from './helpers/mcp-context7-helpers';

const validation = await validateTestAgainstBestPractices(testCode);
if (!validation.isValid) {
  console.log('Issues found:', validation.issues);
  console.log('Suggestions:', validation.suggestions);
}
```

### 5. Use Visual Regression for UI Changes

Always use visual regression testing for UI changes:

```typescript
// Before making UI changes, capture baseline
await captureVisualBaseline(page, 'toolbar-before-change');

// After changes, compare
const result = await compareVisualState(page, 'toolbar-before-change');
if (!result.match) {
  // Review changes and update baseline if intentional
  await updateVisualBaseline('toolbar-before-change');
}
```

### 6. Monitor Performance Continuously

Set up performance monitoring for critical paths:

```typescript
import { assertPerformanceBudget } from './helpers/performance-helpers';

test('critical path performance', async ({ page }) => {
  // Perform critical operation
  await performCriticalOperation(page);

  // Assert performance budget
  const budgetResult = await assertPerformanceBudget(page);
  expect(budgetResult.passed).toBe(true);
});
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: MCP-Enhanced E2E Tests

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

      # Run MCP-enhanced tests
      - run: tsx scripts/mcp-test-runner.ts --affected
        env:
          CI: true
          MCP_ENABLED: true

      # Generate enhanced report
      - run: tsx scripts/mcp-report-generator.ts

      # Upload reports
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-reports
          path: tests/reports/
```

## Troubleshooting

### MCP Tools Not Available

If MCP tools are not available, the helpers will fall back to standard Playwright functionality. Check:

1. MCP servers are configured in `~/.cursor/mcp.json`
2. Environment variables are set correctly
3. MCP servers are running

### Visual Regression Failures

If visual regression tests fail:

1. Review the diff images in `tests/screenshots/`
2. If changes are intentional, update the baseline:
   ```bash
   # Update baseline manually or via helper
   await updateVisualBaseline('test-name');
   ```
3. Commit updated baselines with your changes

### Performance Budget Violations

If performance budgets are violated:

1. Review the performance metrics in the report
2. Identify the bottleneck
3. Optimize the code
4. Update performance baselines if the change is acceptable

## Advanced Usage

### Custom MCP Integration

Extend MCP helpers for custom needs:

```typescript
import { defaultMCPConfig } from './helpers/mcp-playwright-helpers';

// Custom MCP configuration
const customConfig = {
  ...defaultMCPConfig,
  debugMode: true,
  traceEnabled: true,
};

// Use custom config in tests
```

### Pattern Learning

Build a library of test patterns:

```typescript
import {
  storeTestPattern,
  getTestPatterns,
  findSimilarPatterns,
} from './helpers/mcp-memory-helpers';

// Store pattern
await storeTestPattern({ /* ... */ });

// Find similar patterns
const similar = await findSimilarPatterns('test description');

// Get patterns by category
const patterns = await getTestPatterns({ category: 'canvas' });
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [Context7 Documentation](https://context7.com/)
- [Visual Regression Testing Best Practices](https://playwright.dev/docs/test-screenshots)

## Support

For issues or questions:
1. Check test logs and reports
2. Review MCP configuration
3. Consult the troubleshooting section
4. Check MCP server status

---

**Last Updated**: January 2025
**MCP Integration Version**: 1.0.0
