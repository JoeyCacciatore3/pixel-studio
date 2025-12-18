/**
 * Memory MCP Integration Helpers
 * Stores test patterns, learns from results, and provides test pattern library
 */

import { EnhancedPatternStorage } from './mcp-fallbacks';
import { join } from 'path';

// Initialize enhanced pattern storage as fallback
const patternsPath = join(process.cwd(), 'tests/e2e/.test-patterns.json');
const enhancedStorage = new EnhancedPatternStorage(patternsPath);

/**
 * Test Pattern
 */
export interface TestPattern {
  id: string;
  name: string;
  description: string;
  code: string;
  category: string;
  tags: string[];
  usageCount: number;
  successRate: number;
  lastUsed: Date;
}

/**
 * Test Result
 */
export interface TestResult {
  testName: string;
  testFile: string;
  success: boolean;
  duration: number;
  error?: string;
  patterns: string[];
  timestamp: Date;
}

/**
 * Store a test pattern in memory
 */
export async function storeTestPattern(
  pattern: Omit<TestPattern, 'usageCount' | 'successRate' | 'lastUsed'>
): Promise<void> {
  try {
    // Try Memory MCP first
    try {
      // MCP functions are accessed dynamically at runtime via MCP server
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mcpMemory = globalThis as any;
      if (mcpMemory.mcp_memory_create_entities) {
        await Promise.race([
          mcpMemory.mcp_memory_create_entities({
            entities: [
              {
                name: pattern.name,
                entityType: 'TestPattern',
                observations: [
                  pattern.description,
                  pattern.code,
                  `Category: ${pattern.category}`,
                  `Tags: ${pattern.tags.join(', ')}`,
                  `ID: ${pattern.id}`,
                ],
              },
            ],
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000)),
        ]);

        // Also sync to local storage for fallback
        const patterns = await enhancedStorage.loadPatterns();
        const newPattern: TestPattern = {
          ...pattern,
          usageCount: 0,
          successRate: 1.0,
          lastUsed: new Date(),
        };
        patterns.push(newPattern);
        await enhancedStorage.savePatterns(patterns);
        return;
      }
    } catch (error: any) {
      // Memory MCP unavailable or timed out, use enhanced fallback
      if (error.message !== 'Timeout') {
        console.warn('Memory MCP unavailable, using enhanced file-based storage');
      }
    }

    // Use enhanced file-based storage (real functionality, not placeholder)
    const patterns = await enhancedStorage.loadPatterns();
    const newPattern: TestPattern = {
      ...pattern,
      usageCount: 0,
      successRate: 1.0,
      lastUsed: new Date(),
    };
    patterns.push(newPattern);
    await enhancedStorage.savePatterns(patterns);
  } catch (error) {
    console.error('Error storing test pattern:', error);
  }
}

/**
 * Retrieve test patterns from memory
 */
export async function getTestPatterns(filters?: {
  category?: string;
  tags?: string[];
  minSuccessRate?: number;
}): Promise<TestPattern[]> {
  try {
    // Try Memory MCP first
    try {
      // Build search query from filters
      let query = '';
      if (filters?.category) {
        query += `category:${filters.category} `;
      }
      if (filters?.tags && filters.tags.length > 0) {
        query += filters.tags.join(' ');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mcpMemory = globalThis as any;
      if (mcpMemory.mcp_memory_search_nodes) {
        const searchResult = (await Promise.race([
          mcpMemory.mcp_memory_search_nodes({ query: query || 'TestPattern' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000)),
        ])) as { nodes?: Array<{ name: string }> };

        const nodes = searchResult?.nodes || [];
        if (nodes.length > 0) {
          // Convert Memory MCP nodes to TestPattern format
          const patterns: TestPattern[] = [];
          for (const node of nodes) {
            try {
              if (mcpMemory.mcp_memory_open_nodes) {
                const nodeData = (await mcpMemory.mcp_memory_open_nodes({
                  names: [node.name],
                })) as { nodes?: Array<{ observations?: string[] }> };
                const observations = nodeData?.nodes?.[0]?.observations || [];

                // Extract pattern data from observations
                const description =
                  observations.find(
                    (obs: string) =>
                      obs &&
                      !obs.startsWith('Category:') &&
                      !obs.startsWith('Tags:') &&
                      !obs.startsWith('ID:')
                  ) || '';
                const code =
                  observations.find(
                    (obs: string) => (obs && obs.includes('test(')) || obs.includes('async')
                  ) || '';
                const category =
                  observations
                    .find((obs: string) => obs?.startsWith('Category:'))
                    ?.replace('Category: ', '') || 'general';
                const tags =
                  observations
                    .find((obs: string) => obs?.startsWith('Tags:'))
                    ?.replace('Tags: ', '')
                    .split(', ') || [];
                const id =
                  observations.find((obs: string) => obs?.startsWith('ID:'))?.replace('ID: ', '') ||
                  node.name;

                patterns.push({
                  id,
                  name: node.name,
                  description,
                  code,
                  category,
                  tags,
                  usageCount: 0,
                  successRate: 1.0,
                  lastUsed: new Date(),
                });
              }
            } catch {
              // Skip nodes that can't be opened
            }
          }

          // Apply filters
          let filtered = patterns;
          if (filters) {
            if (filters.category) {
              filtered = filtered.filter((p) => p.category === filters.category);
            }
            if (filters.tags && filters.tags.length > 0) {
              filtered = filtered.filter((p) => filters.tags!.some((tag) => p.tags.includes(tag)));
            }
            if (filters.minSuccessRate !== undefined) {
              filtered = filtered.filter((p) => p.successRate >= filters.minSuccessRate!);
            }
          }

          // Also sync to local storage
          const localPatterns = await enhancedStorage.loadPatterns();
          for (const pattern of filtered) {
            const existing = localPatterns.find((p) => p.id === pattern.id);
            if (!existing) {
              localPatterns.push(pattern);
            }
          }
          await enhancedStorage.savePatterns(localPatterns);

          return filtered;
        }
      }
    } catch (error: any) {
      // Memory MCP unavailable or timed out, use enhanced fallback
      if (error.message !== 'Timeout') {
        console.warn('Memory MCP unavailable, using enhanced file-based storage');
      }
    }

    // Use enhanced file-based storage with full-text search
    const query = filters?.tags?.join(' ') || '';
    const patterns = await enhancedStorage.searchPatterns(query, filters);
    return patterns;
  } catch (error) {
    console.error('Error retrieving test patterns:', error);
    return [];
  }
}

/**
 * Record test result for pattern learning
 */
export async function recordTestResult(result: TestResult): Promise<void> {
  try {
    // Try Memory MCP first
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mcpMemory = globalThis as any;
      if (mcpMemory.mcp_memory_add_observations) {
        await Promise.race([
          mcpMemory.mcp_memory_add_observations({
            observations: [
              {
                entityName: result.testName,
                contents: [
                  `Test Result: ${result.success ? 'PASSED' : 'FAILED'}`,
                  `Duration: ${result.duration}ms`,
                  `File: ${result.testFile}`,
                  result.error ? `Error: ${result.error}` : 'No errors',
                  `Patterns used: ${result.patterns.join(', ')}`,
                  `Timestamp: ${result.timestamp.toISOString()}`,
                ],
              },
            ],
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000)),
        ]);
      }
    } catch (error: any) {
      // Memory MCP unavailable, use file-based storage
      if (error.message !== 'Timeout') {
        console.warn('Memory MCP unavailable for recording results, using file-based storage');
      }
    }

    // Always save to file for fallback and local access
    const fs = await import('fs/promises');
    const resultsPath = join(process.cwd(), 'tests/e2e/.test-results.json');

    let results: TestResult[] = [];
    try {
      const data = await fs.readFile(resultsPath, 'utf-8');
      results = JSON.parse(data);
    } catch {
      // File doesn't exist, start fresh
    }

    results.push(result);

    // Keep only last 1000 results
    if (results.length > 1000) {
      results = results.slice(-1000);
    }

    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2), 'utf-8');

    // Update pattern success rates
    await updatePatternSuccessRates(result.patterns, result.success);
  } catch (error) {
    console.error('Error recording test result:', error);
  }
}

/**
 * Update pattern success rates based on test results
 */
async function updatePatternSuccessRates(patternIds: string[], success: boolean): Promise<void> {
  try {
    // Try Memory MCP first
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mcpMemory = globalThis as any;
      if (mcpMemory.mcp_memory_add_observations) {
        for (const patternId of patternIds) {
          await Promise.race([
            mcpMemory.mcp_memory_add_observations({
              observations: [
                {
                  entityName: patternId,
                  contents: [
                    `Test result: ${success ? 'PASSED' : 'FAILED'}`,
                    `Updated: ${new Date().toISOString()}`,
                  ],
                },
              ],
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000)),
          ]);
        }
      }
    } catch (error: any) {
      // Memory MCP unavailable, use file-based storage
      if (error.message !== 'Timeout') {
        console.warn('Memory MCP unavailable for updating success rates, using file-based storage');
      }
    }

    // Always update local storage
    const patterns = await enhancedStorage.loadPatterns();

    patternIds.forEach((patternId) => {
      const pattern = patterns.find((p) => p.id === patternId);
      if (pattern) {
        pattern.usageCount++;
        pattern.lastUsed = new Date();

        // Update success rate (exponential moving average)
        const alpha = 0.1;
        pattern.successRate = alpha * (success ? 1 : 0) + (1 - alpha) * pattern.successRate;
      }
    });

    await enhancedStorage.savePatterns(patterns);
  } catch (error) {
    console.error('Error updating pattern success rates:', error);
  }
}

/**
 * Find similar test patterns
 */
export async function findSimilarPatterns(description: string): Promise<TestPattern[]> {
  try {
    // Try Memory MCP search first
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mcpMemory = globalThis as any;
      if (mcpMemory.mcp_memory_search_nodes) {
        const searchResult = (await Promise.race([
          mcpMemory.mcp_memory_search_nodes({ query: description }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000)),
        ])) as { nodes?: Array<{ name: string }> };

        const nodes = searchResult?.nodes || [];
        if (nodes.length > 0) {
          // Convert to TestPattern format
          const patterns = await getTestPatterns();
          const matchingPatterns: TestPattern[] = [];

          for (const node of nodes) {
            const pattern = patterns.find((p) => p.name === node.name || p.id === node.name);
            if (pattern) {
              matchingPatterns.push(pattern);
            }
          }

          if (matchingPatterns.length > 0) {
            return matchingPatterns;
          }
        }
      }
    } catch (error: any) {
      // Memory MCP unavailable, use enhanced fallback
      if (error.message !== 'Timeout') {
        console.warn('Memory MCP unavailable for pattern search, using enhanced file-based search');
      }
    }

    // Use enhanced file-based search with similarity matching
    const patterns = await enhancedStorage.searchPatterns(description);

    // Calculate similarity scores using enhanced storage
    const patternsWithScores = patterns.map((pattern) => {
      const similarity = enhancedStorage.calculateSimilarity(
        { name: description, description, tags: [] },
        pattern
      );
      return { pattern, similarity };
    });

    return patternsWithScores
      .filter(({ similarity }) => similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .map(({ pattern }) => pattern);
  } catch (error) {
    console.error('Error finding similar patterns:', error);
    return [];
  }
}

/**
 * Learn from test failures
 */
export async function learnFromFailure(testName: string, error: string): Promise<void> {
  try {
    // Extract error patterns
    const errorPatterns: string[] = [];

    if (error.includes('timeout')) {
      errorPatterns.push('timeout-error');
    }
    if (error.includes('selector')) {
      errorPatterns.push('selector-error');
    }
    if (error.includes('network')) {
      errorPatterns.push('network-error');
    }

    // Store failure pattern for future reference
    await storeTestPattern({
      id: `failure-${Date.now()}`,
      name: `Failure Pattern: ${testName}`,
      description: `Pattern that led to failure: ${error}`,
      code: `// Failure pattern for: ${testName}\n// Error: ${error}`,
      category: 'failure-pattern',
      tags: ['failure', ...errorPatterns],
    });
  } catch (error) {
    console.error('Error learning from failure:', error);
  }
}

/**
 * Get test optimization recommendations
 */
export async function getOptimizationRecommendations(): Promise<string[]> {
  const patterns = await getTestPatterns();
  const recommendations: string[] = [];

  // Find patterns with low success rates
  const lowSuccessPatterns = patterns.filter((p) => p.successRate < 0.7);
  if (lowSuccessPatterns.length > 0) {
    recommendations.push(
      `Found ${lowSuccessPatterns.length} patterns with low success rates. Consider reviewing and updating them.`
    );
  }

  // Find unused patterns
  const unusedPatterns = patterns.filter((p) => p.usageCount === 0);
  if (unusedPatterns.length > 0) {
    recommendations.push(
      `Found ${unusedPatterns.length} unused patterns. Consider removing or updating them.`
    );
  }

  // Find duplicate patterns
  const codeHashes = new Map<string, string[]>();
  patterns.forEach((p) => {
    const hash = p.code.substring(0, 100); // Simple hash
    if (!codeHashes.has(hash)) {
      codeHashes.set(hash, []);
    }
    codeHashes.get(hash)!.push(p.id);
  });

  const duplicates = Array.from(codeHashes.values()).filter((ids) => ids.length > 1);
  if (duplicates.length > 0) {
    recommendations.push(
      `Found ${duplicates.length} duplicate patterns. Consider consolidating them.`
    );
  }

  return recommendations;
}
