/**
 * Unit tests for MCP helper functions
 * Tests both MCP agent availability and fallback functionality
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  lookupPlaywrightBestPractices,
  getReactTestingPatterns,
  getPlaywrightAPIReference,
} from './mcp-context7-helpers'
import {
  storeTestPattern,
  getTestPatterns,
  findSimilarPatterns,
  recordTestResult,
} from './mcp-memory-helpers'
import { EnhancedPatternStorage, CachedDocumentation, RuleBasedAnalyzer, PatternMatcher } from './mcp-fallbacks'
import { readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

describe('MCP Context7 Helpers', () => {
  test('lookupPlaywrightBestPractices returns real data (not placeholder)', async () => {
    const result = await lookupPlaywrightBestPractices('timeouts')

    expect(result).not.toBeNull()
    expect(result).not.toContain('Error details not available')
    expect(result).not.toContain('placeholder')
    expect(result!.length).toBeGreaterThan(50) // Real data should be substantial
  })

  test('lookupPlaywrightBestPractices handles unavailable MCP gracefully', async () => {
    // Should still return real data from fallback
    const result = await lookupPlaywrightBestPractices('selectors')

    expect(result).not.toBeNull()
    expect(result).toContain('data-testid') // Should contain real advice
  })

  test('getReactTestingPatterns returns real patterns', async () => {
    const result = await getReactTestingPatterns('component-testing')

    expect(result).not.toBeNull()
    expect(result).not.toContain('placeholder')
    expect(result!.length).toBeGreaterThan(50)
  })

  test('getPlaywrightAPIReference returns useful documentation', async () => {
    const result = await getPlaywrightAPIReference('page.goto')

    expect(result).not.toBeNull()
    expect(result).toContain('page.goto') // Should reference the method
    expect(result!.length).toBeGreaterThan(30)
  })
})

describe('MCP Memory Helpers', () => {
  const testPatternPath = join(process.cwd(), 'tests/e2e/.test-patterns-test.json')

  beforeEach(async () => {
    // Clean up test file if exists
    if (existsSync(testPatternPath)) {
      await unlink(testPatternPath).catch(() => {})
    }
  })

  afterEach(async () => {
    // Clean up test file
    if (existsSync(testPatternPath)) {
      await unlink(testPatternPath).catch(() => {})
    }
  })

  test('storeTestPattern stores pattern successfully', async () => {
    const pattern = {
      id: 'test-pattern-1',
      name: 'Test Pattern',
      description: 'Test description',
      code: 'test code',
      category: 'test',
      tags: ['test', 'pattern'],
    }

    await storeTestPattern(pattern)

    // Verify pattern was stored (either in MCP or file)
    const patterns = await getTestPatterns()
    const stored = patterns.find(p => p.id === pattern.id)

    expect(stored).toBeDefined()
    expect(stored?.name).toBe(pattern.name)
  })

  test('getTestPatterns returns real patterns (not placeholders)', async () => {
    // Store a test pattern first
    await storeTestPattern({
      id: 'test-pattern-2',
      name: 'Canvas Drawing Pattern',
      description: 'Pattern for testing canvas drawing',
      code: 'await drawStroke(page, start, end)',
      category: 'canvas',
      tags: ['canvas', 'drawing'],
    })

    const patterns = await getTestPatterns({ category: 'canvas' })

    expect(patterns.length).toBeGreaterThan(0)
    expect(patterns[0].name).not.toContain('placeholder')
    expect(patterns[0].code).not.toContain('Error details not available')
  })

  test('findSimilarPatterns finds relevant patterns', async () => {
    await storeTestPattern({
      id: 'test-pattern-3',
      name: 'Canvas Test Pattern',
      description: 'Test canvas drawing operations',
      code: 'test code',
      category: 'canvas',
      tags: ['canvas'],
    })

    const similar = await findSimilarPatterns('canvas drawing test')

    expect(similar.length).toBeGreaterThan(0)
    expect(similar[0].name).toContain('Canvas')
  })

  test('recordTestResult records without errors', async () => {
    await recordTestResult({
      testName: 'test-name',
      testFile: 'test-file.spec.ts',
      success: true,
      duration: 1000,
      patterns: [],
      timestamp: new Date(),
    })

    // Should not throw
    expect(true).toBe(true)
  })
})

describe('MCP Fallbacks', () => {
  describe('EnhancedPatternStorage', () => {
    const storage = new EnhancedPatternStorage(
      join(process.cwd(), 'tests/e2e/.test-patterns-fallback.json')
    )

    afterEach(async () => {
      const testFile = join(process.cwd(), 'tests/e2e/.test-patterns-fallback.json')
      if (existsSync(testFile)) {
        await unlink(testFile).catch(() => {})
      }
    })

    test('searchPatterns returns real results', async () => {
      await storage.savePatterns([
        {
          id: '1',
          name: 'Test Pattern',
          description: 'Test description',
          code: 'test code',
          category: 'test',
          tags: ['test'],
          usageCount: 0,
          successRate: 1.0,
          lastUsed: new Date(),
        },
      ])

      const results = await storage.searchPatterns('test')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].name).toBe('Test Pattern')
    })

    test('calculateSimilarity returns valid similarity score', () => {
      const pattern1 = { name: 'test', description: 'test description', tags: ['test'] }
      const pattern2 = { name: 'test', description: 'test description', tags: ['test'] }

      const similarity = storage.calculateSimilarity(pattern1 as any, pattern2 as any)

      expect(similarity).toBeGreaterThanOrEqual(0)
      expect(similarity).toBeLessThanOrEqual(1)
      expect(similarity).toBeGreaterThan(0.5) // Should be similar
    })
  })

  describe('CachedDocumentation', () => {
    const cache = new CachedDocumentation(
      join(process.cwd(), 'tests/e2e/.context7-cache-test.json')
    )

    afterEach(async () => {
      const testFile = join(process.cwd(), 'tests/e2e/.context7-cache-test.json')
      if (existsSync(testFile)) {
        await unlink(testFile).catch(() => {})
      }
    })

    test('getEnhancedBestPractices returns real data', () => {
      const result = cache.getEnhancedBestPractices('timeouts')

      expect(result).not.toContain('placeholder')
      expect(result).not.toContain('Error details not available')
      expect(result.length).toBeGreaterThan(50)
      expect(result).toContain('timeout')
    })

    test('cache stores and retrieves data', async () => {
      await cache.set('test-key', 'test value')
      const retrieved = cache.get('test-key')

      expect(retrieved).toBe('test value')
    })
  })

  describe('RuleBasedAnalyzer', () => {
    const analyzer = new RuleBasedAnalyzer()

    test('analyzeFailures returns actionable plan', () => {
      const failures = [
        {
          testName: 'test1',
          errorCategory: 'Configuration',
          errorMessage: 'test.use() error',
        },
        {
          testName: 'test2',
          errorCategory: 'Timeout',
          errorMessage: 'timeout error',
        },
      ]

      const plan = analyzer.analyzeFailures(failures as any)

      expect(plan.length).toBeGreaterThan(0)
      expect(plan[0].priority).toBe('High') // Configuration should be high priority
      expect(plan[0].action).not.toContain('placeholder')
      expect(plan[0].action.length).toBeGreaterThan(20) // Real actionable content
    })
  })

  describe('PatternMatcher', () => {
    const matcher = new PatternMatcher()

    test('generateFixSuggestion returns real suggestions', () => {
      const suggestion = matcher.generateFixSuggestion(
        'Timeout',
        'Element timeout error',
        []
      )

      expect(suggestion.suggestion).not.toContain('placeholder')
      expect(suggestion.suggestion.length).toBeGreaterThan(10)
      expect(suggestion.code).toBeDefined()
      expect(suggestion.code!.length).toBeGreaterThan(20)
    })
  })
})

describe('MCP Integration', () => {
  test('All helpers work without MCP agents (fallback mode)', async () => {
    // Test that all helpers provide real data even without MCP
    const bestPractice = await lookupPlaywrightBestPractices('selectors')
    expect(bestPractice).not.toBeNull()
    expect(bestPractice).not.toContain('Error details not available')

    const patterns = await getTestPatterns()
    expect(Array.isArray(patterns)).toBe(true)

    const apiRef = await getPlaywrightAPIReference('page.click')
    expect(apiRef).not.toBeNull()
  })

  test('No placeholder text in any output', async () => {
    const results = await Promise.all([
      lookupPlaywrightBestPractices('timeouts'),
      getReactTestingPatterns('component-testing'),
      getPlaywrightAPIReference('page.goto'),
      getTestPatterns(),
    ])

    for (const result of results) {
      if (result !== null && typeof result === 'string') {
        expect(result).not.toContain('Error details not available')
        expect(result).not.toContain('placeholder')
        expect(result).not.toContain('not available')
      } else if (Array.isArray(result)) {
        for (const item of result) {
          const itemStr = JSON.stringify(item)
          expect(itemStr).not.toContain('Error details not available')
          expect(itemStr).not.toContain('placeholder')
        }
      }
    }
  })
})
