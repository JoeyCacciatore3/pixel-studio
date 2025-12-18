# Performance Baselines

This directory contains performance baseline configurations for Pixel Studio tests.

## Structure

Performance baselines are stored as JSON files:

- `canvas-drawing.json` - Baseline for canvas drawing operations
- `page-load.json` - Baseline for page load performance
- `layer-rendering.json` - Baseline for layer rendering performance

## Baseline Format

```json
{
  "loadTime": 3000,
  "fcp": 1500,
  "lcp": 2000,
  "memory": 52428800,
  "canvasOperationDuration": 1000
}
```

## Managing Baselines

### Creating Baselines

```typescript
import { savePerformanceBaseline } from './helpers/performance-helpers';

await savePerformanceBaseline('canvas-drawing', {
  loadTime: 3000,
  fcp: 1500,
  lcp: 2000,
  memory: 50 * 1024 * 1024,
  canvasOperationDuration: 1000,
});
```

### Using Baselines

```typescript
import { getPerformanceBaseline, checkPerformanceRegression } from './helpers/performance-helpers';

const baseline = await getPerformanceBaseline('canvas-drawing');
if (baseline) {
  const regression = await checkPerformanceRegression(page, baseline);
  expect(regression.regressed).toBe(false);
}
```

### Updating Baselines

When performance changes are acceptable:

1. Measure new performance
2. Update the baseline file
3. Commit the updated baseline

## Performance Budgets

Default performance budgets are defined in `tests/e2e/mcp-config.json`:

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

## Best Practices

1. **Set Realistic Baselines**: Baselines should reflect acceptable performance, not ideal performance
2. **Monitor Trends**: Track performance over time to detect gradual degradation
3. **Update Carefully**: Only update baselines when performance changes are intentional and acceptable
4. **Document Changes**: Document why baselines were updated
