#!/usr/bin/env tsx
/**
 * MCP Integration Test Script
 * Tests full MCP integration end-to-end
 */

import { verifyMCPAgents } from './verify-mcp-agents';
import {
  lookupPlaywrightBestPractices,
  getReactTestingPatterns,
} from '../tests/e2e/helpers/mcp-context7-helpers';
import { storeTestPattern, getTestPatterns } from '../tests/e2e/helpers/mcp-memory-helpers';
import { RuleBasedAnalyzer, PatternMatcher } from '../tests/e2e/helpers/mcp-fallbacks';

interface IntegrationTestResult {
  test: string;
  passed: boolean;
  error?: string;
  duration: number;
}

/**
 * Test Context7 integration
 */
async function testContext7Integration(): Promise<IntegrationTestResult> {
  const start = Date.now();
  try {
    const result = await lookupPlaywrightBestPractices('timeouts');
    const duration = Date.now() - start;

    if (!result || result.includes('Error details not available')) {
      return {
        test: 'Context7 Integration',
        passed: false,
        error: 'Returned placeholder or null',
        duration,
      };
    }

    return {
      test: 'Context7 Integration',
      passed: true,
      duration,
    };
  } catch (error: any) {
    return {
      test: 'Context7 Integration',
      passed: false,
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

/**
 * Test Memory MCP integration
 */
async function testMemoryIntegration(): Promise<IntegrationTestResult> {
  const start = Date.now();
  try {
    // Store a test pattern
    await storeTestPattern({
      id: `integration-test-${Date.now()}`,
      name: 'Integration Test Pattern',
      description: 'Pattern for integration testing',
      code: 'test code',
      category: 'integration',
      tags: ['test', 'integration'],
    });

    // Retrieve patterns
    const patterns = await getTestPatterns({ category: 'integration' });
    const duration = Date.now() - start;

    if (patterns.length === 0) {
      return {
        test: 'Memory MCP Integration',
        passed: false,
        error: 'No patterns retrieved',
        duration,
      };
    }

    return {
      test: 'Memory MCP Integration',
      passed: true,
      duration,
    };
  } catch (error: any) {
    return {
      test: 'Memory MCP Integration',
      passed: false,
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

/**
 * Test fallback functionality
 */
async function testFallbacks(): Promise<IntegrationTestResult> {
  const start = Date.now();
  try {
    const analyzer = new RuleBasedAnalyzer();
    const matcher = new PatternMatcher();

    const failures = [
      {
        testName: 'test1',
        errorCategory: 'Timeout',
        errorMessage: 'Element timeout',
      },
    ];

    const plan = analyzer.analyzeFailures(failures as any);
    const suggestion = matcher.generateFixSuggestion('Timeout', 'timeout error', []);

    const duration = Date.now() - start;

    if (plan.length === 0 || !suggestion.suggestion) {
      return {
        test: 'Fallback Functionality',
        passed: false,
        error: 'Fallbacks not producing data',
        duration,
      };
    }

    // Verify no placeholders
    if (
      suggestion.suggestion.includes('Error details not available') ||
      suggestion.suggestion.includes('placeholder')
    ) {
      return {
        test: 'Fallback Functionality',
        passed: false,
        error: 'Fallback contains placeholder text',
        duration,
      };
    }

    return {
      test: 'Fallback Functionality',
      passed: true,
      duration,
    };
  } catch (error: any) {
    return {
      test: 'Fallback Functionality',
      passed: false,
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

/**
 * Test performance
 */
async function testPerformance(): Promise<IntegrationTestResult> {
  const start = Date.now();
  try {
    // Test multiple operations
    await Promise.all([
      lookupPlaywrightBestPractices('selectors'),
      getReactTestingPatterns('component-testing'),
      getTestPatterns(),
    ]);

    const duration = Date.now() - start;

    // Fallbacks should be fast (< 100ms for multiple operations)
    if (duration > 500) {
      return {
        test: 'Performance',
        passed: false,
        error: `Operations too slow: ${duration}ms`,
        duration,
      };
    }

    return {
      test: 'Performance',
      passed: true,
      duration,
    };
  } catch (error: any) {
    return {
      test: 'Performance',
      passed: false,
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

/**
 * Run all integration tests
 */
async function runIntegrationTests(): Promise<void> {
  console.log('🧪 Running MCP Integration Tests...\n');
  console.log('='.repeat(60) + '\n');

  // First verify MCP agents
  console.log('Step 1: Verifying MCP Agent Availability...\n');
  const verification = await verifyMCPAgents();
  console.log(`Available: ${verification.summary.available}/${verification.summary.total}\n`);

  // Run integration tests
  const tests = [testContext7Integration, testMemoryIntegration, testFallbacks, testPerformance];

  const results: IntegrationTestResult[] = [];
  for (const testFn of tests) {
    const result = await testFn();
    results.push(result);
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.test} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Integration Test Summary');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`Average Duration: ${avgDuration.toFixed(2)}ms\n`);

  if (failed > 0) {
    console.log('Failed Tests:');
    for (const result of results.filter((r) => !r.passed)) {
      console.log(`  - ${result.test}: ${result.error}`);
    }
    console.log('');
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
  runIntegrationTests().catch(console.error);
}

export {
  runIntegrationTests,
  testContext7Integration,
  testMemoryIntegration,
  testFallbacks,
  testPerformance,
};
