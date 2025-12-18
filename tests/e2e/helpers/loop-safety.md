# Loop Safety Documentation

This document describes the safeguards in place to prevent infinite loops and hanging operations in test helpers.

## Safeguards Implemented

### 1. Maximum Iteration Limits

All while loops have maximum iteration limits based on their timeout duration:

- `waitForStateManagerReady`: Max iterations = `(maxWait / 100) + 10`
- `waitForStableState`: Max iterations = `(maxWait / checkInterval) + 10`
- `trackPerformanceMetrics`: Max iterations = `(duration / interval) + 1`

### 2. Timeout Checks

All loops check both:

- Time elapsed: `Date.now() - startTime < maxWait`
- Iteration count: `iterations < maxIterations`

### 3. Error Handling

All loops wrap operations in try-catch blocks to prevent hanging on errors:

- If evaluation fails, the loop breaks immediately
- Errors are logged as warnings
- Functions throw descriptive errors after timeout

### 4. Maximum Total Time Limits

Functions with retries have maximum total time limits:

- `selectTool`: Maximum 30 seconds total across all retries
- Prevents infinite retry loops even if individual operations are fast

## Functions with Safeguards

1. **`waitForStateManagerReady`**
   - Timeout: Configurable (default 10s)
   - Max iterations: Calculated from timeout
   - Error handling: Breaks on evaluation errors

2. **`waitForStableState`**
   - Timeout: Configurable (default 5s)
   - Max iterations: Calculated from timeout and interval
   - Error handling: Breaks on evaluation errors

3. **`trackPerformanceMetrics`**
   - Duration: Configurable (default 10s, max 60s)
   - Max iterations: Calculated from duration
   - Error handling: Breaks on measurement errors

4. **`selectTool`**
   - Max retries: Configurable (default 3)
   - Max total time: 30 seconds
   - Error handling: Throws after max retries or timeout

## Testing for Loops

To verify loops don't hang:

1. All loops have explicit exit conditions
2. All loops have timeout checks
3. All loops have maximum iteration limits
4. All loops handle errors gracefully

## Best Practices

1. Always set reasonable timeouts
2. Always include iteration limits
3. Always handle errors in loops
4. Always test with edge cases (network failures, slow responses)
5. Use `Promise.race` for critical operations if needed
