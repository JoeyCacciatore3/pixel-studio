#!/usr/bin/env tsx
/**
 * Run All E2E Tests and Generate Detailed Report
 * Orchestrates test execution and comprehensive report generation
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { spawn } from 'child_process';

const execAsync = promisify(exec);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

interface TestExecutionResult {
  success: boolean;
  duration: number;
  output: string;
  error?: string;
  exitCode?: number;
}

/**
 * Check if dev server is running
 */
async function checkDevServer(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3000', {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if Playwright browsers are installed
 */
async function checkPlaywrightBrowsers(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('npx playwright --version', {
      cwd: process.cwd(),
    });
    return stdout.includes('Version');
  } catch {
    return false;
  }
}

/**
 * Ensure reports directory exists
 */
async function ensureReportsDirectory(): Promise<void> {
  const reportsDir = path.join(process.cwd(), 'tests/reports');
  try {
    await stat(reportsDir);
  } catch {
    await execAsync(`mkdir -p "${reportsDir}"`);
  }
}

/**
 * Pre-flight checks
 */
async function checkPrerequisites(): Promise<void> {
  console.log('🔍 Running pre-flight checks...\n');

  // Check Playwright
  console.log('  Checking Playwright installation...');
  const playwrightInstalled = await checkPlaywrightBrowsers();
  if (!playwrightInstalled) {
    console.error('  ❌ Playwright not found. Please install: npx playwright install');
    process.exit(1);
  }
  console.log('  ✅ Playwright installed\n');

  // Check dev server
  console.log('  Checking dev server...');
  const serverRunning = await checkDevServer();
  if (!serverRunning) {
    console.log('  ⚠️  Dev server not running. Starting dev server...');
    console.log('  ℹ️  Please start dev server manually: npm run dev');
    console.log('  ℹ️  Or wait for Playwright to start it automatically\n');
  } else {
    console.log('  ✅ Dev server is running\n');
  }

  // Ensure reports directory
  console.log('  Ensuring reports directory exists...');
  await ensureReportsDirectory();
  console.log('  ✅ Reports directory ready\n');
}

/**
 * Validate test discovery before execution
 */
async function validateTestDiscovery(): Promise<{ success: boolean; testCount: number; error?: string }> {
  console.log('🔍 Validating test discovery...\n');

  try {
    const { stdout } = await execAsync('npx playwright test --list', {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
    });

    // Count tests from output
    const testLines = stdout.split('\n').filter(line => line.trim() && !line.includes('Listing tests'));
    const testCount = testLines.length;

    if (testCount === 0) {
      return {
        success: false,
        testCount: 0,
        error: 'No tests discovered. Check testMatch patterns and testIgnore settings.',
      };
    }

    console.log(`  ✅ Found ${testCount} tests\n`);
    return { success: true, testCount };
  } catch (error: any) {
    const errorMessage = error.stderr || error.stdout || error.message;
    return {
      success: false,
      testCount: 0,
      error: `Test discovery failed: ${errorMessage}`,
    };
  }
}

/**
 * Execute all tests with proper configuration
 */
async function executeAllTests(options: {
  workers?: number;
  timeout?: number;
  cleanReports?: boolean;
} = {}): Promise<TestExecutionResult> {
  const {
    workers = 1,
    timeout = 2 * 60 * 60 * 1000, // 2 hours default
    cleanReports = false,
  } = options;

  // Validate test discovery first
  const discovery = await validateTestDiscovery();
  if (!discovery.success) {
    console.error(`  ❌ ${discovery.error}\n`);
    return {
      success: false,
      duration: 0,
      output: discovery.error || '',
      error: discovery.error,
    };
  }

  console.log('🚀 Starting test execution...\n');
  console.log(`  Configuration:`);
  console.log(`    Workers: ${workers}`);
  console.log(`    Timeout: ${timeout / 1000 / 60} minutes`);
  console.log(`    Clean reports: ${cleanReports}\n`);

  // Clean old reports if requested
  if (cleanReports) {
    console.log('  Cleaning old reports...');
    try {
      const reportsDir = path.join(process.cwd(), 'tests/reports');
      await execAsync(`rm -rf "${reportsDir}"/*`);
      console.log('  ✅ Old reports cleaned\n');
    } catch (error) {
      console.warn('  ⚠️  Could not clean old reports:', error);
    }
  }

  const startTime = Date.now();
  const configPath = path.join(process.cwd(), 'tests', 'e2e', 'playwright.config.ts');
  const testCommand = `npx playwright test --config=${configPath} --workers=${workers} --reporter=json --reporter=html --reporter=junit`;

  console.log(`  Executing: ${testCommand}\n`);
  console.log('  This may take a while. Please wait...\n');

  return new Promise((resolve) => {
    const childProcess = spawn('npx', [
      'playwright',
      'test',
      `--config=${configPath}`,
      `--workers=${workers}`,
      '--reporter=json',
      '--reporter=html',
      '--reporter=junit'
    ], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    childProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      // Show progress in real-time
      process.stdout.write(output);
    });

    childProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      // Show errors in real-time
      process.stderr.write(output);
    });

    // Set timeout
    const timeoutId = setTimeout(() => {
      console.error('\n⏱️  Test execution timed out');
      childProcess.kill();
      resolve({
        success: false,
        duration: Date.now() - startTime,
        output: stdout + stderr,
        error: 'Test execution timed out',
      });
    }, timeout);

    childProcess.on('close', (code) => {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      resolve({
        success: code === 0,
        duration,
        output: stdout + stderr,
        error: stderr || undefined,
        exitCode: code || undefined,
      });
    });

    childProcess.on('error', (error) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        duration: Date.now() - startTime,
        output: stdout + stderr,
        error: error.message,
      });
    });
  });
}

/**
 * Validate that reports were generated
 */
async function validateReports(): Promise<{
  jsonReport: boolean;
  htmlReport: boolean;
  junitReport: boolean;
  jsonReportPath: string;
  htmlReportPath: string;
}> {
  console.log('\n📋 Validating generated reports...\n');

  const reportsDir = path.join(process.cwd(), 'tests/reports');
  const jsonReportPath = path.join(reportsDir, 'results.json');
  const htmlReportPath = path.join(reportsDir, 'html', 'index.html');
  const junitReportPath = path.join(reportsDir, 'junit.xml');

  let jsonReport = false;
  let htmlReport = false;
  let junitReport = false;

  // Check JSON report
  try {
    const stats = await stat(jsonReportPath);
    if (stats.size > 0) {
      const content = await readFile(jsonReportPath, 'utf-8');
      const report = JSON.parse(content);
      if (report.stats && (report.stats.total > 0 || report.suites?.length > 0)) {
        jsonReport = true;
        console.log(`  ✅ JSON report: ${jsonReportPath} (${report.stats?.total || 0} tests)`);
      } else {
        console.log(`  ⚠️  JSON report exists but is empty`);
      }
    }
  } catch (error) {
    console.log(`  ❌ JSON report not found or invalid: ${error}`);
  }

  // Check HTML report
  try {
    await stat(htmlReportPath);
    htmlReport = true;
    console.log(`  ✅ HTML report: ${htmlReportPath}`);
  } catch {
    console.log(`  ⚠️  HTML report not found`);
  }

  // Check JUnit report
  try {
    await stat(junitReportPath);
    junitReport = true;
    console.log(`  ✅ JUnit report: ${junitReportPath}`);
  } catch {
    console.log(`  ⚠️  JUnit report not found`);
  }

  console.log('');

  return {
    jsonReport,
    htmlReport,
    junitReport,
    jsonReportPath,
    htmlReportPath,
  };
}

/**
 * Generate detailed report using the report generator
 */
async function generateDetailedReport(): Promise<void> {
  console.log('📊 Generating detailed failure report...\n');

  try {
    const { stdout, stderr } = await execAsync('npx tsx scripts/generate-failure-report.ts', {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.error(stderr);
    }
  } catch (error: any) {
    console.error('Error generating report:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
  }
}

/**
 * Print summary and next steps
 */
function printSummary(testResult: TestExecutionResult, reports: {
  jsonReport: boolean;
  htmlReport: boolean;
  junitReport: boolean;
  jsonReportPath: string;
  htmlReportPath: string;
}): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Execution Summary');
  console.log('='.repeat(60) + '\n');

  console.log(`Execution Time: ${(testResult.duration / 1000 / 60).toFixed(2)} minutes`);
  console.log(`Exit Code: ${testResult.exitCode ?? 'N/A'}`);
  console.log(`Success: ${testResult.success ? '✅' : '❌'}\n`);

  console.log('Generated Reports:');
  console.log(`  JSON: ${reports.jsonReport ? '✅' : '❌'} ${reports.jsonReportPath}`);
  console.log(`  HTML: ${reports.htmlReport ? '✅' : '❌'} ${reports.htmlReportPath}`);
  console.log(`  JUnit: ${reports.junitReport ? '✅' : '❌'}\n`);

  if (reports.htmlReport) {
    console.log('📄 View HTML Report:');
    console.log(`   npm run test:e2e:report`);
    console.log(`   Or open: ${reports.htmlReportPath}\n`);
  }

  console.log('📝 Detailed Failure Report:');
  console.log(`   docs/TEST_FAILURE_REPORT.md\n`);

  if (!testResult.success) {
    console.log('⚠️  Some tests failed. Review the detailed report for more information.\n');
  } else {
    console.log('✅ All tests passed!\n');
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const cleanReports = args.includes('--clean');
  const workers = args.includes('--workers')
    ? parseInt(args[args.indexOf('--workers') + 1]) || 1
    : 1;

  console.log('🧪 E2E Test Execution and Report Generation\n');
  console.log('='.repeat(60) + '\n');

  try {
    // 1. Pre-flight checks
    await checkPrerequisites();

    // 2. Run tests
    const testResult = await executeAllTests({
      workers,
      cleanReports,
    });

    // 3. Validate reports
    const reports = await validateReports();

    // 4. Generate detailed report
    if (reports.jsonReport) {
      await generateDetailedReport();
    } else {
      console.log('⚠️  JSON report not available. Skipping detailed report generation.\n');
    }

    // 5. Summary
    printSummary(testResult, reports);

    // Exit with appropriate code
    process.exit(testResult.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export functions for potential reuse
export { checkPrerequisites, executeAllTests, validateReports };
