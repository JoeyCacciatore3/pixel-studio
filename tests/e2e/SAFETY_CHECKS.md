# Test Safety Checks - Preventing Infinite Loops and Hanging

## Overview

This document summarizes all safeguards implemented to prevent tests from getting stuck in infinite loops or hanging operations.

## Safeguards Implemented

### 1. Loop Safety

All while loops have been enhanced with:
- **Maximum iteration limits**: Calculated from timeout duration
- **Timeout checks**: Both time elapsed and iteration count
- **Error handling**: Try-catch blocks that break on errors
- **Maximum total time limits**: For retry operations

#### Functions Enhanced:

1. **`waitForStateManagerReady`** (`state-helpers.ts`)
   - ✅ Max iterations: `(maxWait / 100) + 10`
   - ✅ Timeout check: `Date.now() - startTime < maxWait`
   - ✅ Error handling: Breaks on evaluation errors

2. **`waitForStableState`** (`fail-safes.ts`)
   - ✅ Max iterations: `(maxWait / checkInterval) + 10`
   - ✅ Timeout check: `Date.now() - startTime < maxWait`
   - ✅ Error handling: Breaks on evaluation errors

3. **`trackPerformanceMetrics`** (`performance-helpers.ts`)
   - ✅ Max duration: Capped at 60 seconds
   - ✅ Max iterations: `(duration / interval) + 1`
   - ✅ Error handling: Breaks on measurement errors

4. **`selectTool`** (`canvas-helpers.ts`)
   - ✅ Max retries: Configurable (default 3)
   - ✅ Max total time: 30 seconds across all retries
   - ✅ Error handling: Throws after max retries or timeout

5. **`triggerRapidStateUpdates`** (`state-helpers.ts`)
   - ✅ Promise.race with timeout
   - ✅ Max time: `Math.max(count * delay * 2, 10000)`
   - ✅ clearInterval cleanup in all code paths

### 2. Timeout Configuration

- **Default test timeout**: 60 seconds (playwright.config.ts)
- **Individual test timeouts**: Can override per test
- **Helper function timeouts**: All have configurable maxWait parameters
- **Retry timeouts**: Maximum total time limits

### 3. Error Recovery

All loops and async operations:
- ✅ Wrap operations in try-catch
- ✅ Break/exit on errors instead of continuing
- ✅ Log warnings for debugging
- ✅ Throw descriptive errors after timeout

### 4. Cleanup Mechanisms

- ✅ All `setInterval` calls have `clearInterval` in all code paths
- ✅ All `setTimeout` calls are bounded by timeouts
- ✅ Promise.race used for critical operations

## Test Configuration

### Playwright Config
```typescript
timeout: 60 * 1000, // 60 seconds default
expect: {
  timeout: 10000, // 10 seconds for assertions
}
```

### Individual Test Timeouts
Tests can override with:
```typescript
test.setTimeout(90000); // 90 seconds for complex tests
```

## Verification Checklist

- [x] All while loops have iteration limits
- [x] All while loops have timeout checks
- [x] All setInterval calls have clearInterval
- [x] All async operations have timeouts
- [x] All retry operations have max total time
- [x] All error paths break/exit loops
- [x] All Promise operations use Promise.race where needed

## Best Practices

1. **Always set timeouts**: Never use infinite timeouts
2. **Always limit iterations**: Calculate max iterations from timeout
3. **Always handle errors**: Break loops on errors, don't continue
4. **Always cleanup**: Clear intervals and timeouts
5. **Always test edge cases**: Network failures, slow responses

## Monitoring

To verify tests don't hang:
1. Run tests with timeout: `timeout 300 npm run test:e2e`
2. Check for long-running tests in reports
3. Monitor test execution times
4. Review logs for timeout warnings

## Files Modified

- `tests/e2e/helpers/canvas-helpers.ts` - Added timeout to selectTool
- `tests/e2e/helpers/state-helpers.ts` - Added safeguards to waitForStateManagerReady and triggerRapidStateUpdates
- `tests/e2e/helpers/fail-safes.ts` - Added safeguards to waitForStableState
- `tests/e2e/helpers/performance-helpers.ts` - Added safeguards to trackPerformanceMetrics

## Summary

All potential infinite loop and hanging scenarios have been addressed:
- ✅ Maximum iteration limits on all loops
- ✅ Timeout checks on all loops
- ✅ Error handling that breaks loops
- ✅ Maximum total time limits on retries
- ✅ Proper cleanup of intervals
- ✅ Promise.race for critical operations

Tests are now safe from infinite loops and hanging operations.
