#!/usr/bin/env tsx
/**
 * MCP-Powered Test Runner
 * Executes tests with smart selection, monitoring, and MCP integration
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { selectAffectedTests, executeTestsViaMCP, getTestStatistics } from '../tests/e2e/helpers/mcp-playwright-helpers';

const execAsync = promisify(exec);

interface TestRunnerOptions {
  pattern?: string;
  project?: string;
  headed?: boolean;
  debug?: boolean;
  workers?: number;
  affected?: boolean;
  changedFiles?: string[];
  watch?: boolean;
}

/**
 * Main test runner function
 */
async function runTests(options: TestRunnerOptions = {}): Promise<void> {
  console.log('🚀 MCP-Powered Test Runner');
  console.log('==========================\n');

  let testPattern = options.pattern;

  // Smart test selection based on changed files
  if (options.affected && options.changedFiles && options.changedFiles.length > 0) {
    console.log('📋 Analyzing changed files for affected tests...');
    const affectedTests = await selectAffectedTests(options.changedFiles);

    if (affectedTests.length > 0) {
      console.log(`✅ Found ${affectedTests.length} affected test files:`);
      affectedTests.forEach(test => console.log(`   - ${test}`));
      testPattern = affectedTests.join('|');
    } else {
      console.log('ℹ️  No affected tests found. Running all tests.');
    }
    console.log('');
  }

  // Validate test discovery
  console.log('🔍 Validating test discovery...\n');
  try {
    const listCommand = testPattern
      ? `npx playwright test --list ${testPattern}`
      : 'npx playwright test --list';
    const { stdout } = await execAsync(listCommand, {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
    });

    const testLines = stdout.split('\n').filter(line =>
      line.trim() &&
      !line.includes('Listing tests') &&
      !line.includes('Total:') &&
      line.includes('.spec.ts')
    );
    const testCount = testLines.length;

    if (testCount === 0 && !testPattern) {
      console.error('  ❌ No tests discovered. Check testMatch patterns and testIgnore settings.\n');
      process.exit(1);
    } else if (testCount === 0 && testPattern) {
      console.warn(`  ⚠️  No tests found matching pattern: ${testPattern}\n`);
    } else {
      console.log(`  ✅ Found ${testCount} test(s)\n`);
    }
  } catch (error: any) {
    const errorMessage = error.stderr || error.stdout || error.message;
    if (errorMessage.includes('No tests found')) {
      console.error(`  ❌ Test discovery failed: ${errorMessage}\n`);
      process.exit(1);
    }
    // Continue if it's just a pattern matching issue
    console.warn(`  ⚠️  Test discovery warning: ${errorMessage}\n`);
  }

  // Display test statistics
  try {
    const stats = await getTestStatistics();
    if (stats.totalTests > 0) {
      console.log('📊 Previous Test Statistics:');
      console.log(`   Total: ${stats.totalTests}`);
      console.log(`   Passed: ${stats.passedTests}`);
      console.log(`   Failed: ${stats.failedTests}`);
      console.log(`   Skipped: ${stats.skippedTests}`);
      console.log(`   Average Duration: ${stats.averageDuration.toFixed(2)}ms`);
      if (stats.flakyTests.length > 0) {
        console.log(`   ⚠️  Flaky Tests: ${stats.flakyTests.length}`);
        stats.flakyTests.slice(0, 5).forEach(test => console.log(`      - ${test}`));
      }
      console.log('');
    }
  } catch (error) {
    // Statistics not available, continue
  }

  // Execute tests
  console.log('🧪 Executing tests...\n');
  const startTime = Date.now();

  const result = await executeTestsViaMCP(testPattern, options.project, {
    headed: options.headed,
    debug: options.debug,
    workers: options.workers,
  });

  const duration = Date.now() - startTime;

  // Display results
  console.log('\n📈 Test Execution Results:');
  console.log('==========================');
  console.log(`Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log(`Errors: ${result.errors.length}`);
  console.log(`Warnings: ${result.warnings.length}`);

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.slice(0, 10).forEach(error => console.log(`   ${error}`));
    if (result.errors.length > 10) {
      console.log(`   ... and ${result.errors.length - 10} more`);
    }
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.slice(0, 5).forEach(warning => console.log(`   ${warning}`));
  }

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

/**
 * Parse command line arguments
 */
function parseArgs(): TestRunnerOptions {
  const args = process.argv.slice(2);
  const options: TestRunnerOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--pattern' || arg === '-p') {
      options.pattern = args[++i];
    } else if (arg === '--project' || arg === '-j') {
      options.project = args[++i];
    } else if (arg === '--headed' || arg === '-h') {
      options.headed = true;
    } else if (arg === '--debug' || arg === '-d') {
      options.debug = true;
    } else if (arg === '--workers' || arg === '-w') {
      options.workers = parseInt(args[++i], 10);
    } else if (arg === '--affected' || arg === '-a') {
      options.affected = true;
    } else if (arg === '--watch' || arg === '-W') {
      options.watch = true;
    } else if (arg === '--changed-files') {
      const files = args[++i].split(',').map(f => f.trim());
      options.changedFiles = files;
    }
  }

  return options;
}

/**
 * Get changed files from git
 */
async function getChangedFiles(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('git diff --name-only HEAD');
    const files = stdout.split('\n').filter(f => f.trim());
    return files;
  } catch (error) {
    console.warn('Could not get changed files from git:', error);
    return [];
  }
}

// Main execution
(async () => {
  try {
    const options = parseArgs();

    // Get changed files if affected mode is enabled
    if (options.affected && !options.changedFiles) {
      options.changedFiles = await getChangedFiles();
    }

    await runTests(options);
  } catch (error) {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  }
})();
