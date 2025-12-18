# MCP Agent Integration Guide

## Overview

This guide documents the actual MCP agent integration in Pixel Studio's test infrastructure. All MCP helpers attempt to use real MCP agents first, then fall back to functional alternatives that produce real data (not placeholders).

## MCP Agents Used

### Context7 MCP

**Purpose**: Look up Playwright, React, and Next.js documentation and best practices.

**Functions**:

- `lookupPlaywrightBestPractices(topic: string)` - Gets best practices for Playwright topics
- `getReactTestingPatterns(pattern: string)` - Gets React/Next.js testing patterns
- `getPlaywrightAPIReference(method: string)` - Gets API documentation for Playwright methods

**Implementation**:

```typescript
// Tries Context7 MCP first
const libraryId = (await mcp_context7_resolve) - library - id({ libraryName: 'playwright' });
const docs =
  (await mcp_context7_get) -
  library -
  docs({
    context7CompatibleLibraryID: libraryId,
    topic: 'timeouts',
    mode: 'code',
  });

// Falls back to enhanced cached documentation if MCP unavailable
// Returns real best practices, not placeholders
```

**Fallback**: Enhanced cached documentation with comprehensive best practices. All fallback data is real and useful.

### Memory MCP

**Purpose**: Store and retrieve test patterns, learn from test results.

**Functions**:

- `storeTestPattern(pattern)` - Stores a test pattern
- `getTestPatterns(filters?)` - Retrieves test patterns with optional filters
- `findSimilarPatterns(description)` - Finds similar patterns by description
- `recordTestResult(result)` - Records test execution results
- `learnFromFailure(testName, error)` - Learns from test failures

**Implementation**:

```typescript
// Tries Memory MCP first
await mcp_memory_create_entities({
  entities: [
    {
      name: pattern.name,
      entityType: 'TestPattern',
      observations: [pattern.description, pattern.code, ...pattern.tags],
    },
  ],
});

// Falls back to enhanced file-based storage with full-text search
// All operations are fast (< 100ms) and produce real data
```

**Fallback**: Enhanced file-based storage with:

- Full-text search indexing
- Pattern similarity matching
- Fast retrieval (< 100ms)
- Real pattern data, not placeholders

### Sequential-Thinking MCP

**Purpose**: Analyze test failures and create prioritized action plans.

**Functions**:

- `createActionPlanWithSequentialThinking(failures)` - Analyzes failures and creates action plan

**Implementation**:

```typescript
// Tries Sequential-Thinking MCP first
const analysis =
  (await mcp_sequential) -
  thinking_sequentialthinking({
    thought: `Analyze these test failures: ${JSON.stringify(failures)}. Create a prioritized fix plan.`,
    nextThoughtNeeded: true,
    thoughtNumber: 1,
    totalThoughts: 5,
  });

// Falls back to rule-based analysis
// Produces actionable plans with real priorities and actions
```

**Fallback**: Rule-based analyzer that:

- Analyzes failure categories and counts
- Applies priority rules (Configuration > State > Timeout > Selector)
- Generates actionable plans
- No placeholder text

### Coding-Agent MCP

**Purpose**: Generate fix suggestions and find similar code patterns.

**Functions**:

- `generateFixSuggestions(failures)` - Generates fix suggestions for test failures
- Used in test generation for code suggestions

**Implementation**:

```typescript
// Tries Coding-Agent MCP first
const searchResult =
  (await mcp_coding) -
  agent_search_text({
    pattern: failure.errorMessage,
    directory: 'tests/e2e',
    filePattern: '*.spec.ts',
    maxResults: 5,
  });

// Falls back to pattern matcher
// Uses grep/ripgrep to find similar patterns
// Generates real code suggestions
```

**Fallback**: Pattern matcher that:

- Searches codebase for similar error patterns
- Analyzes existing test patterns
- Generates fix suggestions with actual code
- No placeholder text

## Error Handling

All MCP helpers implement robust error handling:

1. **Timeout Protection**: All MCP calls have timeouts (2-5s) to prevent slowdowns
2. **Graceful Fallback**: If MCP unavailable, falls back to functional alternatives
3. **No Placeholders**: Fallbacks produce real, useful data
4. **Caching**: Aggressive caching prevents repeated expensive operations

## Performance

- **MCP Calls**: Timeout at 2-5s
- **Fallbacks**: All operations < 100ms
- **Caching**: 24h for documentation, session cache for patterns

## Verification

Run the verification script to check MCP agent availability:

```bash
npx tsx scripts/verify-mcp-agents.ts
```

Run integration tests:

```bash
npx tsx scripts/test-mcp-integration.ts
```

## Usage Examples

### Using Context7 for Best Practices

```typescript
import { lookupPlaywrightBestPractices } from './helpers/mcp-context7-helpers';

const bestPractice = await lookupPlaywrightBestPractices('timeouts');
// Returns real best practices, either from Context7 or enhanced fallback
```

### Using Memory MCP for Patterns

```typescript
import { storeTestPattern, getTestPatterns } from './helpers/mcp-memory-helpers';

// Store a pattern
await storeTestPattern({
  id: 'canvas-drawing',
  name: 'Canvas Drawing Pattern',
  description: 'Pattern for testing canvas drawing',
  code: 'await drawStroke(page, start, end)',
  category: 'canvas',
  tags: ['canvas', 'drawing'],
});

// Retrieve patterns
const patterns = await getTestPatterns({ category: 'canvas' });
```

### Using Sequential-Thinking for Analysis

```typescript
import { createActionPlanWithSequentialThinking } from './scripts/mcp-enhanced-test-runner';

const failures = [
  /* test failures */
];
const actionPlan = await createActionPlanWithSequentialThinking(failures);
// Returns prioritized action plan with real actions
```

## Best Practices

1. **Always Check Results**: Verify that results are not null and contain real data
2. **Handle Timeouts**: MCP calls may timeout, fallbacks will be used automatically
3. **Use Caching**: Results are cached automatically, no need to cache manually
4. **Test Fallbacks**: Test your code works with MCP agents unavailable

## Troubleshooting

### MCP Agents Not Available

If MCP agents are not available, the system automatically uses functional fallbacks. All fallbacks produce real data, so your code will work correctly.

### Slow Performance

If operations are slow:

1. Check MCP agent availability: `npx tsx scripts/verify-mcp-agents.ts`
2. Verify caching is working
3. Check timeout settings (should be 2-5s for MCP, < 100ms for fallbacks)

### Placeholder Text in Output

If you see placeholder text like "Error details not available":

1. This should never happen - report as a bug
2. All fallbacks are designed to produce real data
3. Check that fallback implementations are being used correctly

## Configuration

MCP agents are configured in `tests/e2e/mcp-config.json`. Environment variables may be needed:

- `CONTEXT7_API_KEY` (for Context7)
- `FIRECRAWL_API_KEY` (for Firecrawl, optional)

## Testing

Unit tests are in `tests/e2e/helpers/mcp-helpers.test.ts`:

- Tests MCP agent functionality
- Tests fallback functionality
- Verifies no placeholder text
- Performance benchmarks

Integration tests are in `scripts/test-mcp-integration.ts`:

- Tests full integration
- Verifies MCP and fallback modes
- Performance testing

Run tests:

```bash
npm test mcp-helpers
npx tsx scripts/test-mcp-integration.ts
```
