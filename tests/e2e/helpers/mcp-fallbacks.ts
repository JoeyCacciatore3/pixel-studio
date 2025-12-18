/**
 * MCP Fallback Implementations
 * Functional alternatives that produce real data when MCP agents are unavailable
 * These are NOT placeholders - they provide actual useful functionality
 */

import { readFile, writeFile, readdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * Enhanced file-based pattern storage with full-text search
 */
export class EnhancedPatternStorage {
  private patternsPath: string
  private index: Map<string, Set<string>> = new Map()

  constructor(patternsPath: string) {
    this.patternsPath = patternsPath
  }

  /**
   * Load patterns from file
   */
  async loadPatterns(): Promise<any[]> {
    try {
      if (!existsSync(this.patternsPath)) {
        return []
      }
      const data = await readFile(this.patternsPath, 'utf-8')
      const patterns = JSON.parse(data)
      this.buildIndex(patterns)
      return patterns
    } catch {
      return []
    }
  }

  /**
   * Build full-text search index
   */
  private buildIndex(patterns: any[]): void {
    this.index.clear()
    for (const pattern of patterns) {
      const text = `${pattern.name} ${pattern.description} ${pattern.code} ${pattern.tags.join(' ')}`.toLowerCase()
      const words = text.split(/\s+/).filter(w => w.length > 2)
      for (const word of words) {
        if (!this.index.has(word)) {
          this.index.set(word, new Set())
        }
        this.index.get(word)!.add(pattern.id)
      }
    }
  }

  /**
   * Search patterns using full-text search
   */
  async searchPatterns(query: string, filters?: {
    category?: string
    tags?: string[]
    minSuccessRate?: number
  }): Promise<any[]> {
    const patterns = await this.loadPatterns()
    let results = patterns

    // Full-text search
    if (query) {
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      const matchingIds = new Set<string>()

      for (const word of queryWords) {
        const ids = this.index.get(word)
        if (ids) {
          ids.forEach(id => matchingIds.add(id))
        }
      }

      if (matchingIds.size > 0) {
        results = results.filter(p => matchingIds.has(p.id))
      } else {
        // Fallback to substring matching
        const queryLower = query.toLowerCase()
        results = results.filter(p =>
          p.name.toLowerCase().includes(queryLower) ||
          p.description.toLowerCase().includes(queryLower) ||
          p.tags.some((tag: string) => tag.toLowerCase().includes(queryLower))
        )
      }
    }

    // Apply filters
    if (filters) {
      if (filters.category) {
        results = results.filter(p => p.category === filters.category)
      }
      if (filters.tags && filters.tags.length > 0) {
        results = results.filter(p =>
          filters.tags!.some(tag => p.tags.includes(tag))
        )
      }
      if (filters.minSuccessRate !== undefined) {
        results = results.filter(p => p.successRate >= filters.minSuccessRate!)
      }
    }

    // Sort by relevance (usage count and success rate)
    results.sort((a, b) => {
      if (a.usageCount !== b.usageCount) {
        return b.usageCount - a.usageCount
      }
      return b.successRate - a.successRate
    })

    return results
  }

  /**
   * Save patterns to file
   */
  async savePatterns(patterns: any[]): Promise<void> {
    this.buildIndex(patterns)
    await writeFile(this.patternsPath, JSON.stringify(patterns, null, 2), 'utf-8')
  }

  /**
   * Calculate similarity between two patterns using Jaccard similarity
   */
  calculateSimilarity(pattern1: any, pattern2: any): number {
    const text1 = `${pattern1.name} ${pattern1.description} ${pattern1.tags.join(' ')}`.toLowerCase()
    const text2 = `${pattern2.name} ${pattern2.description} ${pattern2.tags.join(' ')}`.toLowerCase()

    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2))
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2))

    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])

    return union.size > 0 ? intersection.size / union.size : 0
  }
}

/**
 * Cached documentation storage for Context7 fallback
 */
export class CachedDocumentation {
  private cachePath: string
  private cache: Map<string, { data: string; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  constructor(cachePath: string) {
    this.cachePath = cachePath
  }

  /**
   * Load cache from file
   */
  async loadCache(): Promise<void> {
    try {
      if (existsSync(this.cachePath)) {
        const data = await readFile(this.cachePath, 'utf-8')
        const cacheData = JSON.parse(data)
        for (const [key, value] of Object.entries(cacheData)) {
          this.cache.set(key, value as any)
        }
      }
    } catch {
      // Cache file doesn't exist or is invalid
    }
  }

  /**
   * Get cached documentation
   */
  get(key: string): string | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const age = Date.now() - cached.timestamp
    if (age > this.CACHE_DURATION) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  /**
   * Set cached documentation
   */
  async set(key: string, data: string): Promise<void> {
    this.cache.set(key, { data, timestamp: Date.now() })
    await this.saveCache()
  }

  /**
   * Save cache to file
   */
  private async saveCache(): Promise<void> {
    const cacheData: Record<string, any> = {}
    for (const [key, value] of this.cache.entries()) {
      cacheData[key] = value
    }
    await writeFile(this.cachePath, JSON.stringify(cacheData, null, 2), 'utf-8')
  }

  /**
   * Get enhanced best practices (real data, not placeholders)
   */
  getEnhancedBestPractices(topic: string): string {
    const enhancedPractices: Record<string, string> = {
      'timeouts': `Use explicit waits instead of fixed timeouts:
- page.waitForSelector() for element visibility
- page.waitForLoadState() for page load states
- page.waitForResponse() for network requests
- Increase timeout in playwright.config.ts if needed: timeout: 60 * 1000
- Use expect() assertions which auto-wait`,

      'selectors': `Use reliable selectors:
- Prefer data-testid attributes: page.getByTestId('element-id')
- Use getByRole, getByLabel, getByText when possible
- Avoid CSS selectors that depend on styling
- Ensure elements are visible before interacting: await expect(element).toBeVisible()
- Use locator() for complex selectors with auto-waiting`,

      'assertions': `Use Playwright's built-in assertions:
- expect() automatically waits for conditions
- Use toBeVisible(), toBeEnabled(), toHaveText() for element state
- Use toHaveScreenshot() for visual regression
- Check element state before asserting: await expect(element).toBeVisible()`,

      'network': `Handle network requests properly:
- Wait for network to be idle: await page.waitForLoadState('networkidle')
- Use page.waitForResponse() for specific API calls
- Check server is running before tests
- Mock network requests when needed: await page.route('**/api/**', route => route.fulfill({...}))`,

      'canvas': `Test canvas operations:
- Wait for canvas to be ready: await page.waitForSelector('#mainCanvas')
- Use requestAnimationFrame for canvas operations
- Check canvas context initialization
- Use boundingBox() to get canvas coordinates
- Test drawing operations with explicit coordinates`,

      'state-management': `Test application state:
- Ensure state is initialized before tests
- Use fixtures for state setup: test.use({ storageState: 'state.json' })
- Wait for state changes to complete
- Test state by interacting with UI, not directly accessing state
- Verify state consistency after operations`,

      'configuration': `Fix test configuration:
- Move test.use() outside describe blocks
- Ensure proper test file structure
- Check Playwright configuration in playwright.config.ts
- Verify imports are correct
- Check for circular dependencies`,
    }

    return enhancedPractices[topic.toLowerCase()] ||
      `Best practices for ${topic}:
- Review error messages carefully
- Check test isolation (tests should be independent)
- Ensure proper cleanup between tests
- Use fixtures for shared setup
- Add proper error handling`
  }
}

/**
 * Rule-based analysis for Sequential-Thinking fallback
 */
export class RuleBasedAnalyzer {
  /**
   * Analyze failures and create prioritized action plan
   */
  analyzeFailures(failures: Array<{
    testName: string
    errorCategory: string
    errorMessage: string
  }>): Array<{ priority: string; action: string; reason: string }> {
    const actionPlan: Array<{ priority: string; action: string; reason: string }> = []

    // Group failures by category
    const failuresByCategory = new Map<string, typeof failures>()
    for (const failure of failures) {
      if (!failuresByCategory.has(failure.errorCategory)) {
        failuresByCategory.set(failure.errorCategory, [])
      }
      failuresByCategory.get(failure.errorCategory)!.push(failure)
    }

    // Priority order: Configuration > State > Timeout > Selector > Others
    const priorityOrder: Record<string, number> = {
      'Configuration': 1,
      'State': 2,
      'Timeout': 3,
      'Selector': 4,
      'Assertion': 5,
      'Network': 6,
      'Canvas': 7,
      'Visual': 8,
      'Other': 9,
    }

    const sortedCategories = Array.from(failuresByCategory.entries())
      .sort((a, b) => {
        const priorityA = priorityOrder[a[0]] || 10
        const priorityB = priorityOrder[b[0]] || 10
        if (priorityA !== priorityB) return priorityA - priorityB
        return b[1].length - a[1].length // More failures first
      })

    for (const [category, categoryFailures] of sortedCategories) {
      const priority = priorityOrder[category] <= 3 ? 'High' :
                      priorityOrder[category] <= 6 ? 'Medium' : 'Low'

      let action = ''
      let reason = ''

      switch (category) {
        case 'Configuration':
          action = 'Fix test configuration issues:\n' +
            '1. Move test.use() outside describe blocks\n' +
            '2. Check imports and file structure\n' +
            '3. Verify Playwright configuration\n' +
            '4. Ensure no circular dependencies'
          reason = `${categoryFailures.length} tests blocked by configuration errors`
          break

        case 'State':
          action = 'Ensure application state is properly initialized:\n' +
            '1. Wait for state manager to be ready\n' +
            '2. Use fixtures for state setup\n' +
            '3. Wait for state changes to complete\n' +
            '4. Verify state consistency after operations'
          reason = `${categoryFailures.length} tests failing due to state management issues`
          break

        case 'Timeout':
          action = 'Address timeout issues:\n' +
            '1. Increase timeout values in playwright.config.ts\n' +
            '2. Use explicit waits instead of fixed delays\n' +
            '3. Wait for elements to be visible before interacting\n' +
            '4. Check if operations are too slow'
          reason = `${categoryFailures.length} tests timing out`
          break

        case 'Selector':
          action = 'Fix selector issues:\n' +
            '1. Use data-testid attributes for reliable selectors\n' +
            '2. Ensure elements exist and are visible\n' +
            '3. Use getByRole, getByLabel when possible\n' +
            '4. Wait for elements before interacting'
          reason = `${categoryFailures.length} tests failing due to selector issues`
          break

        default:
          action = `Address ${category} errors:\n` +
            '1. Review error messages carefully\n' +
            '2. Check test isolation\n' +
            '3. Ensure proper cleanup\n' +
            '4. Verify test data and fixtures'
          reason = `${categoryFailures.length} tests failing with ${category} errors`
      }

      actionPlan.push({ priority, action, reason })
    }

    return actionPlan
  }
}

/**
 * Pattern matcher for Coding-Agent fallback
 */
export class PatternMatcher {
  /**
   * Find similar code patterns in codebase
   */
  async findSimilarPatterns(
    errorMessage: string,
    testDirectory: string = 'tests/e2e'
  ): Promise<Array<{ file: string; line: number; code: string; similarity: number }>> {
    const results: Array<{ file: string; line: number; code: string; similarity: number }> = []

    try {
      const files = await this.getTestFiles(testDirectory)
      const errorKeywords = this.extractKeywords(errorMessage)

      for (const file of files) {
        try {
          const content = await readFile(file, 'utf-8')
          const lines = content.split('\n')

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const similarity = this.calculateSimilarity(line, errorKeywords)

            if (similarity > 0.3) {
              results.push({
                file,
                line: i + 1,
                code: line.trim(),
                similarity,
              })
            }
          }
        } catch {
          // Skip files that can't be read
        }
      }

      // Sort by similarity
      results.sort((a, b) => b.similarity - a.similarity)
      return results.slice(0, 10) // Return top 10 matches
    } catch {
      return []
    }
  }

  /**
   * Get all test files in directory
   */
  private async getTestFiles(directory: string): Promise<string[]> {
    const files: string[] = []

    try {
      const entries = await readdir(directory, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(directory, entry.name)
        if (entry.isDirectory()) {
          const subFiles = await this.getTestFiles(fullPath)
          files.push(...subFiles)
        } else if (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.test.ts')) {
          files.push(fullPath)
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    return files
  }

  /**
   * Extract keywords from error message
   */
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word))
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'this', 'that', 'with', 'from', 'have', 'been', 'were', 'will', 'error', 'failed']
    return stopWords.includes(word)
  }

  /**
   * Calculate similarity between code line and keywords
   */
  private calculateSimilarity(line: string, keywords: string[]): number {
    const lineLower = line.toLowerCase()
    const matches = keywords.filter(keyword => lineLower.includes(keyword)).length
    return keywords.length > 0 ? matches / keywords.length : 0
  }

  /**
   * Generate fix suggestion based on error category and patterns
   */
  generateFixSuggestion(
    errorCategory: string,
    errorMessage: string,
    similarPatterns: Array<{ file: string; code: string }>
  ): { suggestion: string; code?: string } {
    let suggestion = ''
    let code = ''

    switch (errorCategory) {
      case 'Timeout':
        suggestion = 'Add explicit wait before assertion'
        code = `// Wait for element to be visible
await page.waitForSelector('[data-testid="element"]')
// Or use expect which auto-waits
await expect(page.getByTestId('element')).toBeVisible()`
        break

      case 'Selector':
        suggestion = 'Use data-testid or ensure element is visible'
        code = `// Use reliable selector
const element = page.getByTestId('element-name')
await expect(element).toBeVisible()
await element.click()`
        break

      case 'State':
        suggestion = 'Wait for state initialization'
        code = `// Wait for application state to be ready
await page.waitForFunction(() => window.PixelStudio?.initialized)
// Or wait for specific state property
await page.waitForFunction(() => window.PixelStudio?.state?.currentTool !== undefined)`
        break

      case 'Configuration':
        suggestion = 'Move test.use() outside describe block'
        code = `// Move to top of file, outside describe()
import { test } from '@playwright/test'

test.use({
  // configuration here
})

test.describe('Test Suite', () => {
  // tests here
})`
        break

      default:
        suggestion = `Review error: ${errorMessage.substring(0, 100)}`
        if (similarPatterns.length > 0) {
          code = `// Similar pattern found in ${similarPatterns[0].file}:\n${similarPatterns[0].code}`
        }
    }

    return { suggestion, code: code || undefined }
  }
}
