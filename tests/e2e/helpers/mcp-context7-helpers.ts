/**
 * Context7 MCP Integration Helpers
 * Provides documentation lookup and best practices integration for testing
 */

import { CachedDocumentation } from './mcp-fallbacks'
import { join } from 'path'

// Initialize cached documentation
const cachedDocs = new CachedDocumentation(
  join(process.cwd(), 'tests/e2e/.context7-cache.json')
)

// Load cache on module load
cachedDocs.loadCache().catch(() => {
  // Cache load failed, will use fallback
})

/**
 * Lookup Playwright best practices from Context7
 */
export async function lookupPlaywrightBestPractices(topic: string): Promise<string | null> {
  try {
    // Try Context7 MCP first
    try {
      // Check cache first
      const cacheKey = `playwright-${topic}`
      const cached = cachedDocs.get(cacheKey)
      if (cached) {
        return cached
      }

      // MCP functions are accessed dynamically at runtime via MCP server
      // Using type assertion as MCP functions are injected at runtime
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mcpContext7 = (globalThis as any)

      if (mcpContext7.mcp_context7_resolve_library_id && mcpContext7.mcp_context7_get_library_docs) {
        const libraryIdResult = (await Promise.race([
          mcpContext7.mcp_context7_resolve_library_id({ libraryName: 'playwright' }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          ),
        ])) as { libraries?: Array<{ id: string }> }

        const libraryId = libraryIdResult?.libraries?.[0]?.id || '/playwright/playwright'

        const docsResult = (await Promise.race([
          mcpContext7.mcp_context7_get_library_docs({
            context7CompatibleLibraryID: libraryId,
            topic: topic,
            mode: 'code',
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          ),
        ])) as { content?: string } | string

        const docs = typeof docsResult === 'string' ? docsResult : docsResult?.content
        if (docs && typeof docs === 'string' && docs.length > 0) {
          // Cache the result
          await cachedDocs.set(cacheKey, docs)
          return docs
        }
      }
    } catch (error: any) {
      // Context7 unavailable or timed out, use fallback
      if (error.message !== 'Timeout') {
        console.warn('Context7 MCP unavailable, using fallback:', error.message)
      }
    }

    // Use enhanced fallback (real data, not placeholder)
    const fallback = cachedDocs.getEnhancedBestPractices(topic)
    return fallback || null
  } catch (error) {
    console.error('Error looking up best practices:', error)
    // Return enhanced fallback even on error
    return cachedDocs.getEnhancedBestPractices(topic)
  }
}

/**
 * Get React/Next.js testing patterns from Context7
 */
export async function getReactTestingPatterns(pattern: string): Promise<string | null> {
  try {
    // Try Context7 MCP first
    try {
      const cacheKey = `react-${pattern}`
      const cached = cachedDocs.get(cacheKey)
      if (cached) {
        return cached
      }

      // MCP functions are accessed dynamically at runtime via MCP server
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mcpContext7 = (globalThis as any)

      if (mcpContext7.mcp_context7_resolve_library_id && mcpContext7.mcp_context7_get_library_docs) {
        const libraryIdResult = (await Promise.race([
          mcpContext7.mcp_context7_resolve_library_id({ libraryName: 'react' }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          ),
        ])) as { libraries?: Array<{ id: string }> }

        const libraryId = libraryIdResult?.libraries?.[0]?.id || '/facebook/react'

        const docsResult = (await Promise.race([
          mcpContext7.mcp_context7_get_library_docs({
            context7CompatibleLibraryID: libraryId,
            topic: pattern,
            mode: 'code',
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          ),
        ])) as { content?: string } | string

        const docs = typeof docsResult === 'string' ? docsResult : docsResult?.content
        if (docs && typeof docs === 'string' && docs.length > 0) {
          await cachedDocs.set(cacheKey, docs)
          return docs
        }
      }
    } catch (error: any) {
      if (error.message !== 'Timeout') {
        console.warn('Context7 MCP unavailable for React patterns, using fallback')
      }
    }

    // Enhanced fallback patterns (real data)
    const enhancedPatterns: Record<string, string> = {
      'component-testing': `Test React components in isolation:
- Use React Testing Library patterns
- Test user behavior, not implementation
- Use getByRole, getByLabel for queries
- Test accessibility by default
- Mock external dependencies`,

      'async-operations': `Handle async operations in tests:
- Wait for async operations: await waitFor(() => {...})
- Use findBy queries which auto-wait
- Wait for network requests: await waitFor(() => expect(mockFn).toHaveBeenCalled())
- Handle loading states properly`,

      'state-management': `Test state management:
- Test state changes by interacting with UI
- Don't directly access state in tests
- Verify state through rendered output
- Test state transitions and side effects
- Use fixtures for initial state`,

      'routing': `Test Next.js routing:
- Mock router when needed: const router = useRouter()
- Test navigation: await page.click('a[href="/page"]')
- Verify route changes: expect(page.url()).toContain('/page')
- Test dynamic routes with different params`,

      'api-mocking': `Mock API calls in tests:
- Mock at network level: await page.route('**/api/**', route => route.fulfill({...}))
- Use MSW (Mock Service Worker) for comprehensive mocking
- Mock responses match real API structure
- Test error scenarios with failed requests`,
    }

    return enhancedPatterns[pattern.toLowerCase()] ||
      `React/Next.js testing pattern for ${pattern}:
- Follow React Testing Library best practices
- Test user interactions, not implementation
- Use proper async handling
- Mock external dependencies appropriately`
  } catch (error) {
    console.error('Error getting React testing patterns:', error)
    return null
  }
}

/**
 * Validate test against best practices
 */
export async function validateTestAgainstBestPractices(
  testCode: string
): Promise<{
  isValid: boolean;
  issues: Array<{ line: number; message: string; suggestion: string }>;
  suggestions: string[];
}> {
  const issues: Array<{ line: number; message: string; suggestion: string }> = [];
  const suggestions: string[] = [];

  const lines = testCode.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check for hardcoded timeouts
    if (line.includes('waitForTimeout') && line.includes('5000')) {
      issues.push({
        line: lineNum,
        message: 'Hardcoded timeout detected',
        suggestion: 'Use explicit waits or page.waitForLoadState() instead',
      });
    }

    // Check for CSS selectors that might be fragile
    if (line.match(/\.locator\(['"](\.|#)[^'"]+['"]\)/)) {
      issues.push({
        line: lineNum,
        message: 'CSS selector may be fragile',
        suggestion: 'Consider using data-testid attributes for more reliable selectors',
      });
    }

    // Check for missing error handling
    if (line.includes('page.goto') && !testCode.includes('catch') && !testCode.includes('try')) {
      suggestions.push('Consider adding error handling for navigation failures');
    }

    // Check for proper waiting
    if (line.includes('page.click') && !testCode.includes('waitFor') && !testCode.includes('toBeVisible')) {
      suggestions.push('Ensure element is visible before clicking');
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
    suggestions: [...new Set(suggestions)],
  };
}

/**
 * Get testing anti-patterns to avoid
 */
export async function getTestingAntiPatterns(): Promise<string[]> {
  return [
    'Using fixed timeouts instead of explicit waits',
    'Testing implementation details instead of user behavior',
    'Not cleaning up test state between tests',
    'Writing tests that depend on execution order',
    'Using brittle selectors that depend on CSS classes',
    'Not handling async operations properly',
    'Testing multiple things in a single test',
    'Not using page objects for complex pages',
    'Ignoring flaky tests instead of fixing them',
    'Not capturing debugging information on failures',
  ];
}

/**
 * Get recommended test patterns for common scenarios
 */
export async function getRecommendedPatterns(scenario: string): Promise<string | null> {
  const patterns: Record<string, string> = {
    'canvas-testing': `
// Recommended pattern for canvas testing:
test('should draw on canvas', async ({ page }) => {
  await page.goto('/');
  await waitForCanvasReady(page);

  const canvas = page.locator('#mainCanvas');
  await expect(canvas).toBeVisible();

  // Use explicit coordinates relative to canvas
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 50, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.up();
  }
});
    `,
    'state-management-testing': `
// Recommended pattern for state management testing:
test('should update state correctly', async ({ page }) => {
  await page.goto('/');
  await waitForStateManagerReady(page);

  // Interact with UI
  await selectTool(page, 'pencil');

  // Verify state change
  const tool = await getStateProperty(page, 'currentTool');
  expect(tool).toBe('pencil');
});
    `,
    'error-handling-testing': `
// Recommended pattern for error handling:
test('should handle errors gracefully', async ({ page }) => {
  const errors = captureConsoleErrors(page);

  // Trigger error condition
  await performActionThatMightFail(page);

  // Verify error handling
  expectNoCriticalErrors(errors);
  await checkStateConsistency(page, 'after error');
});
    `,
  };

  return patterns[scenario.toLowerCase()]?.trim() || null;
}

/**
 * Get API reference for Playwright methods
 */
export async function getPlaywrightAPIReference(method: string): Promise<string | null> {
  try {
    // Try Context7 MCP first
    try {
      const cacheKey = `playwright-api-${method}`
      const cached = cachedDocs.get(cacheKey)
      if (cached) {
        return cached
      }

      // MCP functions are accessed dynamically at runtime via MCP server
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mcpContext7 = (globalThis as any)

      if (mcpContext7.mcp_context7_resolve_library_id && mcpContext7.mcp_context7_get_library_docs) {
        const libraryIdResult = (await Promise.race([
          mcpContext7.mcp_context7_resolve_library_id({ libraryName: 'playwright' }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          ),
        ])) as { libraries?: Array<{ id: string }> }

        const libraryId = libraryIdResult?.libraries?.[0]?.id || '/playwright/playwright'

        const docsResult = (await Promise.race([
          mcpContext7.mcp_context7_get_library_docs({
            context7CompatibleLibraryID: libraryId,
            topic: method,
            mode: 'code',
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          ),
        ])) as { content?: string } | string

        const docs = typeof docsResult === 'string' ? docsResult : docsResult?.content
        if (docs && typeof docs === 'string' && docs.length > 0) {
          await cachedDocs.set(cacheKey, docs)
          return docs
        }
      }
    } catch (error: any) {
      if (error.message !== 'Timeout') {
        console.warn('Context7 MCP unavailable for API reference, using fallback')
      }
    }

    // Enhanced fallback API docs (real data)
    const enhancedApiDocs: Record<string, string> = {
      'page.goto': `page.goto(url, options?)
Navigates to a URL. Use waitUntil option to control when navigation is considered complete.
Options:
- waitUntil: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'
- timeout: Maximum navigation time in milliseconds
Example: await page.goto('https://example.com', { waitUntil: 'networkidle' })`,

      'page.locator': `page.locator(selector)
Creates a locator for an element. Locators auto-wait and are retry-safe.
Use data-testid for reliable selectors: page.locator('[data-testid="button"]')
Locators are lazy - they don't search until action is called.`,

      'page.click': `page.click(selector, options?)
Clicks an element. Automatically waits for element to be actionable.
Options:
- timeout: Maximum time to wait
- force: Click even if element is not actionable
Example: await page.click('[data-testid="submit"]')`,

      'page.fill': `page.fill(selector, value, options?)
Fills an input field. Clears the field first and types the value.
Options:
- timeout: Maximum time to wait
Example: await page.fill('input[name="email"]', 'user@example.com')`,

      'page.waitForLoadState': `page.waitForLoadState(state?, options?)
Waits for page to reach a specific load state.
States: 'load' | 'domcontentloaded' | 'networkidle'
Example: await page.waitForLoadState('networkidle')`,

      'expect.toBeVisible': `expect(locator).toBeVisible(options?)
Asserts element is visible. Auto-waits for element to appear.
Options:
- timeout: Maximum time to wait
Example: await expect(page.getByTestId('element')).toBeVisible()`,

      'page.screenshot': `page.screenshot(options?)
Takes a screenshot. Useful for debugging and visual regression testing.
Options:
- path: Save path
- fullPage: Capture full page
Example: await page.screenshot({ path: 'screenshot.png' })`,
    }

    return enhancedApiDocs[method] ||
      `Playwright API reference for ${method}:
- Check Playwright documentation: https://playwright.dev/docs/api
- Use auto-waiting features when available
- Set appropriate timeouts for operations`
  } catch (error) {
    console.error('Error getting API reference:', error)
    return null
  }
}
