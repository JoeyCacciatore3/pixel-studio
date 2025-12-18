/**
 * Playwright MCP Integration Helpers
 * Provides enhanced test execution, debugging, and automation capabilities via MCP
 */

import { Page, TestInfo } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

/**
 * MCP Configuration
 */
export interface MCPConfig {
  enabled: boolean;
  playwrightMCPEnabled: boolean;
  debugMode: boolean;
  traceEnabled: boolean;
  screenshotOnFailure: boolean;
  videoOnFailure: boolean;
}

/**
 * Test Execution Result
 */
export interface TestExecutionResult {
  success: boolean;
  duration: number;
  output: string;
  errors: string[];
  warnings: string[];
  screenshots?: string[];
  video?: string;
  trace?: string;
}

/**
 * Debug Session Configuration
 */
export interface DebugSessionConfig {
  captureScreenshots: boolean;
  captureVideo: boolean;
  analyzeNetwork: boolean;
  profilePerformance: boolean;
  captureTrace: boolean;
  consoleLogs: boolean;
}

/**
 * Default MCP configuration
 */
export const defaultMCPConfig: MCPConfig = {
  enabled: process.env.MCP_ENABLED === 'true',
  playwrightMCPEnabled: process.env.PLAYWRIGHT_MCP_ENABLED === 'true',
  debugMode: process.env.DEBUG_MODE === 'true',
  traceEnabled: true,
  screenshotOnFailure: true,
  videoOnFailure: true,
};

/**
 * Execute tests via Playwright MCP (if available) or fallback to standard execution
 */
export async function executeTestsViaMCP(
  testPattern?: string,
  project?: string,
  options: { headed?: boolean; debug?: boolean; workers?: number } = {}
): Promise<TestExecutionResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    let command = 'npx playwright test';

    // Use config from tests/e2e directory
    const configPath = join(process.cwd(), 'tests', 'e2e', 'playwright.config.ts');
    command += ` --config=${configPath}`;

    if (testPattern) {
      command += ` ${testPattern}`;
    }

    if (project) {
      command += ` --project=${project}`;
    }

    if (options.headed) {
      command += ' --headed';
    }

    if (options.debug) {
      command += ' --debug';
    }

    if (options.workers !== undefined) {
      command += ` --workers=${options.workers}`;
    }

    // Add MCP-specific flags if MCP is enabled
    if (defaultMCPConfig.playwrightMCPEnabled) {
      command += ' --reporter=html,json,junit';
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    const duration = Date.now() - startTime;
    const output = stdout + stderr;

    // Parse output for errors and warnings
    if (stderr) {
      const errorLines = stderr
        .split('\n')
        .filter(
          (line) => line.includes('Error') || line.includes('FAILED') || line.includes('failed')
        );
      errors.push(...errorLines);
    }

    if (stdout) {
      const warningLines = stdout
        .split('\n')
        .filter(
          (line) => line.includes('Warning') || line.includes('warning') || line.includes('WARN')
        );
      warnings.push(...warningLines);
    }

    return {
      success: !output.includes('failed') && !output.includes('FAILED'),
      duration,
      output,
      errors,
      warnings,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);

    return {
      success: false,
      duration,
      output: errorMessage,
      errors,
      warnings,
    };
  }
}

/**
 * Capture enhanced debugging information for a test
 */
export async function captureDebugInfo(
  page: Page,
  testInfo: TestInfo,
  config: DebugSessionConfig = {
    captureScreenshots: true,
    captureVideo: true,
    analyzeNetwork: false,
    profilePerformance: false,
    captureTrace: true,
    consoleLogs: true,
  }
): Promise<{
  screenshots: string[];
  video?: string;
  trace?: string;
  networkLogs?: any[];
  consoleLogs?: string[];
  performanceMetrics?: any;
}> {
  const debugInfo: {
    screenshots: string[];
    video?: string;
    trace?: string;
    networkLogs?: any[];
    consoleLogs?: string[];
    performanceMetrics?: any;
  } = {
    screenshots: [],
  };

  try {
    // Capture screenshot
    if (config.captureScreenshots) {
      const screenshotPath = join(testInfo.outputDir, `debug-screenshot-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      debugInfo.screenshots.push(screenshotPath);
    }

    // Capture console logs
    if (config.consoleLogs) {
      const consoleLogs: string[] = [];
      page.on('console', (msg) => {
        consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      });
      debugInfo.consoleLogs = consoleLogs;
    }

    // Analyze network requests
    if (config.analyzeNetwork) {
      const networkLogs: any[] = [];
      page.on('request', (request) => {
        networkLogs.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
        });
      });
      page.on('response', (response) => {
        const log = networkLogs.find((l) => l.url === response.url());
        if (log) {
          log.status = response.status();
          log.statusText = response.statusText();
        }
      });
      debugInfo.networkLogs = networkLogs;
    }

    // Profile performance
    if (config.profilePerformance) {
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');

        return {
          domContentLoaded:
            navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: paint.find((p) => p.name === 'first-paint')?.startTime,
          firstContentfulPaint: paint.find((p) => p.name === 'first-contentful-paint')?.startTime,
          domInteractive: navigation.domInteractive - (navigation as any).navigationStart || 0,
        };
      });
      debugInfo.performanceMetrics = performanceMetrics;
    }

    // Note: Trace and video are handled by Playwright config
    // They're automatically saved on failure if configured
  } catch (error) {
    console.error('Error capturing debug info:', error);
  }

  return debugInfo;
}

/**
 * Analyze test failure and provide insights
 */
export async function analyzeTestFailure(
  testName: string,
  error: Error,
  debugInfo: ReturnType<typeof captureDebugInfo> extends Promise<infer T> ? T : never
): Promise<{
  possibleCauses: string[];
  suggestions: string[];
  relatedTests: string[];
}> {
  const possibleCauses: string[] = [];
  const suggestions: string[] = [];
  const relatedTests: string[] = [];

  const errorMessage = error.message.toLowerCase();

  // Analyze error patterns
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    possibleCauses.push('Test timeout - element not found or operation too slow');
    suggestions.push('Increase timeout or check if element selector is correct');
    suggestions.push('Verify the application is loading correctly');
  }

  if (errorMessage.includes('selector') || errorMessage.includes('locator')) {
    possibleCauses.push('Element selector issue - element not found');
    suggestions.push('Verify the selector is correct and element exists');
    suggestions.push('Check if element is visible and not hidden');
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    possibleCauses.push('Network request failure');
    suggestions.push('Check if the server is running');
    suggestions.push('Verify network connectivity');
  }

  if (errorMessage.includes('canvas') || errorMessage.includes('context')) {
    possibleCauses.push('Canvas context issue');
    suggestions.push('Check if canvas is initialized');
    suggestions.push('Verify canvas element exists and is ready');
  }

  // Analyze debug info
  if (debugInfo.consoleLogs && debugInfo.consoleLogs.some((log) => log.includes('error'))) {
    possibleCauses.push('JavaScript errors in console');
    suggestions.push('Check browser console for errors');
  }

  if (
    debugInfo.networkLogs &&
    debugInfo.networkLogs.some((log) => log.status && log.status >= 400)
  ) {
    possibleCauses.push('Failed network requests');
    suggestions.push('Check network tab for failed requests');
  }

  // Find related tests (simple pattern matching)
  if (testName.includes('canvas')) {
    relatedTests.push('canvas-functions.spec.ts');
    relatedTests.push('canvas-operations.spec.ts');
  }
  if (testName.includes('layer')) {
    relatedTests.push('layer-system-verification.spec.ts');
    relatedTests.push('layer-edge-cases.spec.ts');
  }
  if (testName.includes('tool')) {
    relatedTests.push('tools.spec.ts');
    relatedTests.push('tool-errors.spec.ts');
  }

  return {
    possibleCauses,
    suggestions,
    relatedTests,
  };
}

/**
 * Start an interactive debugging session
 */
export async function startDebugSession(
  testFile: string,
  testName: string,
  options: DebugSessionConfig = {
    captureScreenshots: true,
    captureVideo: true,
    analyzeNetwork: true,
    profilePerformance: true,
    captureTrace: true,
    consoleLogs: true,
  }
): Promise<void> {
  console.log(`Starting debug session for ${testFile}:${testName}`);
  console.log('Debug configuration:', options);

  // Execute test in debug mode
  const command = `npx playwright test ${testFile} --grep "${testName}" --debug`;

  console.log(`Running: ${command}`);
  console.log('Playwright will open in debug mode. Use the debugger to step through the test.');

  // Note: In a real implementation, this would use Playwright MCP to start the debug session
  // For now, we'll log the command that should be run
}

/**
 * Monitor test execution in real-time
 */
export async function monitorTestExecution(testPattern: string): Promise<TestExecutionResult> {
  // This would integrate with Playwright MCP to get real-time updates
  // For now, we'll use standard execution with progress tracking
  return executeTestsViaMCP(testPattern);
}

/**
 * Get test execution statistics
 */
export async function getTestStatistics(): Promise<{
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  averageDuration: number;
  flakyTests: string[];
}> {
  try {
    // Try to read the last test results
    const resultsPath = join(process.cwd(), 'tests/reports/results.json');
    const results = JSON.parse(await readFile(resultsPath, 'utf-8'));

    const stats = {
      totalTests: results.stats?.total || 0,
      passedTests: results.stats?.passed || 0,
      failedTests: results.stats?.failed || 0,
      skippedTests: results.stats?.skipped || 0,
      averageDuration: 0,
      flakyTests: [] as string[],
    };

    // Calculate average duration
    if (results.suites) {
      let totalDuration = 0;
      let testCount = 0;

      const processSuite = (suite: any) => {
        if (suite.specs) {
          suite.specs.forEach((spec: any) => {
            if (spec.tests) {
              spec.tests.forEach((test: any) => {
                if (test.results && test.results[0]) {
                  totalDuration += test.results[0].duration || 0;
                  testCount++;

                  // Detect flaky tests (passed and failed in different runs)
                  if (test.results.length > 1) {
                    const outcomes = test.results.map((r: any) => r.status);
                    if (outcomes.includes('passed') && outcomes.includes('failed')) {
                      stats.flakyTests.push(`${spec.title}: ${test.title}`);
                    }
                  }
                }
              });
            }
          });
        }
        if (suite.suites) {
          suite.suites.forEach(processSuite);
        }
      };

      results.suites.forEach(processSuite);
      stats.averageDuration = testCount > 0 ? totalDuration / testCount : 0;
    }

    return stats;
  } catch (error) {
    // If results file doesn't exist, return defaults
    return {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      averageDuration: 0,
      flakyTests: [],
    };
  }
}

/**
 * Smart test selection based on changed files
 */
export async function selectAffectedTests(changedFiles: string[]): Promise<string[]> {
  const testFiles: string[] = [];

  // Map source files to test files
  const fileToTestMap: Record<string, string[]> = {
    'src/lib/canvas.ts': ['canvas-functions.spec.ts', 'canvas-operations.spec.ts'],
    'src/lib/layers.ts': ['layer-system-verification.spec.ts', 'layer-edge-cases.spec.ts'],
    'src/lib/tools/': ['tools.spec.ts', 'tool-errors.spec.ts'],
    'src/lib/stateManager.ts': ['state-management.spec.ts', 'initialization.spec.ts'],
    'src/lib/history.ts': ['history-failures.spec.ts'],
    'src/components/Canvas.tsx': ['canvas-functions.spec.ts', 'canvas-operations.spec.ts'],
  };

  changedFiles.forEach((file) => {
    // Check direct matches
    Object.entries(fileToTestMap).forEach(([sourcePattern, tests]) => {
      if (file.includes(sourcePattern)) {
        testFiles.push(...tests);
      }
    });

    // Check for component changes
    if (file.includes('src/components/')) {
      testFiles.push('browser-compatibility.spec.ts');
    }

    // Check for mobile-specific changes
    if (file.includes('mobile') || file.includes('touch')) {
      testFiles.push('mobile-touch.spec.ts', 'mobile-edge-cases.spec.ts');
    }
  });

  // Remove duplicates
  return [...new Set(testFiles)];
}
