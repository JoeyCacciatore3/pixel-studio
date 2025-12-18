#!/usr/bin/env tsx
/**
 * Enhanced Test Report Generator
 * Generates comprehensive test reports with insights and analytics
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  getTestStatistics,
} from '../tests/e2e/helpers/mcp-playwright-helpers'
import {
  getOptimizationRecommendations,
  getTestPatterns,
} from '../tests/e2e/helpers/mcp-memory-helpers'
// MCP helpers imported but used conditionally via fallbacks

interface TestReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    timestamp: string;
  };
  statistics: {
    averageDuration: number;
    flakyTests: string[];
    slowestTests: Array<{ name: string; duration: number }>;
    fastestTests: Array<{ name: string; duration: number }>;
  };
  insights: {
    recommendations: string[];
    patterns: any[];
    trends: any;
  };
  failures: Array<{
    test: string;
    file: string;
    error: string;
    duration: number;
  }>;
}

/**
 * Generate comprehensive test report
 */
async function generateReport(): Promise<TestReport> {
  console.log('📊 Generating Enhanced Test Report...\n');

  // Get test statistics
  const stats = await getTestStatistics();

  // Get optimization recommendations
  const recommendations = await getOptimizationRecommendations();

  // Get test patterns
  const patterns = await getTestPatterns();

  // Read test results
  const resultsPath = join(process.cwd(), 'tests/reports/results.json');
  let testResults: any = null;
  try {
    const resultsData = await readFile(resultsPath, 'utf-8');
    testResults = JSON.parse(resultsData);
  } catch (error) {
    console.warn('Could not read test results file:', error);
  }

  // Extract failures
  const failures: Array<{ test: string; file: string; error: string; duration: number }> = [];
  if (testResults?.suites) {
    const extractFailures = (suite: any) => {
      if (suite.specs) {
        suite.specs.forEach((spec: any) => {
          if (spec.tests) {
            spec.tests.forEach((test: any) => {
              const result = test.results?.[0];
              if (result && result.status === 'failed') {
                failures.push({
                  test: test.title,
                  file: spec.file || 'unknown',
                  error: result.error?.message || 'Unknown error',
                  duration: result.duration || 0,
                });
              }
            });
          }
        });
      }
      if (suite.suites) {
        suite.suites.forEach(extractFailures);
      }
    };
    testResults.suites.forEach(extractFailures);
  }

  // Extract test durations
  const testDurations: Array<{ name: string; duration: number }> = [];
  if (testResults?.suites) {
    const extractDurations = (suite: any) => {
      if (suite.specs) {
        suite.specs.forEach((spec: any) => {
          if (spec.tests) {
            spec.tests.forEach((test: any) => {
              const result = test.results?.[0];
              if (result && result.duration) {
                testDurations.push({
                  name: `${spec.title}: ${test.title}`,
                  duration: result.duration,
                });
              }
            });
          }
        });
      }
      if (suite.suites) {
        suite.suites.forEach(extractDurations);
      }
    };
    testResults.suites.forEach(extractDurations);
  }

  testDurations.sort((a, b) => b.duration - a.duration);
  const slowestTests = testDurations.slice(0, 10);
  const fastestTests = testDurations.slice(-10).reverse();

  const report: TestReport = {
    summary: {
      total: stats.totalTests,
      passed: stats.passedTests,
      failed: stats.failedTests,
      skipped: stats.skippedTests,
      duration: 0, // Would calculate from results
      timestamp: new Date().toISOString(),
    },
    statistics: {
      averageDuration: stats.averageDuration,
      flakyTests: stats.flakyTests,
      slowestTests,
      fastestTests,
    },
    insights: {
      recommendations: recommendations, // bestPractices would come from MCP if available
      patterns: patterns.slice(0, 10), // Top 10 patterns
      trends: {
        // Would calculate trends from historical data
        passRate: stats.totalTests > 0 ? (stats.passedTests / stats.totalTests) * 100 : 0,
      },
    },
    failures,
  };

  return report;
}

/**
 * Generate HTML report
 */
async function generateHTMLReport(report: TestReport): Promise<string> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Enhanced Test Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      border-bottom: 3px solid #4CAF50;
      padding-bottom: 10px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
      border-left: 4px solid #4CAF50;
    }
    .stat-card.failed {
      border-left-color: #f44336;
    }
    .stat-card h3 {
      margin: 0 0 10px 0;
      color: #666;
      font-size: 14px;
      text-transform: uppercase;
    }
    .stat-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }
    .section {
      margin: 40px 0;
    }
    .section h2 {
      color: #333;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 10px;
    }
    .failure-item {
      background: #fff3f3;
      border-left: 4px solid #f44336;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .failure-item h4 {
      margin: 0 0 5px 0;
      color: #d32f2f;
    }
    .failure-item .error {
      color: #666;
      font-family: monospace;
      font-size: 12px;
      margin-top: 5px;
    }
    .recommendation {
      background: #e3f2fd;
      border-left: 4px solid #2196F3;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .pattern-item {
      background: #f8f9fa;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .pattern-item h4 {
      margin: 0 0 5px 0;
    }
    .pattern-item .meta {
      color: #666;
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #333;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge.success {
      background: #4CAF50;
      color: white;
    }
    .badge.failure {
      background: #f44336;
      color: white;
    }
    .badge.warning {
      background: #ff9800;
      color: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Enhanced Test Report</h1>
    <p>Generated: ${new Date(report.summary.timestamp).toLocaleString()}</p>

    <div class="summary">
      <div class="stat-card">
        <h3>Total Tests</h3>
        <div class="value">${report.summary.total}</div>
      </div>
      <div class="stat-card">
        <h3>Passed</h3>
        <div class="value" style="color: #4CAF50">${report.summary.passed}</div>
      </div>
      <div class="stat-card failed">
        <h3>Failed</h3>
        <div class="value" style="color: #f44336">${report.summary.failed}</div>
      </div>
      <div class="stat-card">
        <h3>Skipped</h3>
        <div class="value" style="color: #ff9800">${report.summary.skipped}</div>
      </div>
      <div class="stat-card">
        <h3>Average Duration</h3>
        <div class="value">${report.statistics.averageDuration.toFixed(2)}ms</div>
      </div>
    </div>

    ${report.failures.length > 0 ? `
    <div class="section">
      <h2>❌ Failures (${report.failures.length})</h2>
      ${report.failures.map(failure => `
        <div class="failure-item">
          <h4>${failure.test}</h4>
          <p><strong>File:</strong> ${failure.file}</p>
          <p><strong>Duration:</strong> ${failure.duration.toFixed(2)}ms</p>
          <div class="error">${failure.error}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${report.statistics.flakyTests.length > 0 ? `
    <div class="section">
      <h2>⚠️ Flaky Tests (${report.statistics.flakyTests.length})</h2>
      <ul>
        ${report.statistics.flakyTests.map(test => `<li>${test}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${report.statistics.slowestTests.length > 0 ? `
    <div class="section">
      <h2>🐌 Slowest Tests</h2>
      <table>
        <thead>
          <tr>
            <th>Test</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${report.statistics.slowestTests.map(test => `
            <tr>
              <td>${test.name}</td>
              <td>${test.duration.toFixed(2)}ms</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${report.insights.recommendations.length > 0 ? `
    <div class="section">
      <h2>💡 Optimization Recommendations</h2>
      ${report.insights.recommendations.map(rec => `
        <div class="recommendation">
          ${rec}
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${report.insights.patterns.length > 0 ? `
    <div class="section">
      <h2>📚 Test Patterns</h2>
      ${report.insights.patterns.map(pattern => `
        <div class="pattern-item">
          <h4>${pattern.name}</h4>
          <p>${pattern.description}</p>
          <div class="meta">
            Category: ${pattern.category} |
            Usage: ${pattern.usageCount} |
            Success Rate: ${(pattern.successRate * 100).toFixed(1)}%
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}
  </div>
</body>
</html>
  `;

  const reportPath = join(process.cwd(), 'tests/reports/enhanced-report.html');
  await writeFile(reportPath, html);
  return reportPath;
}

// Main execution
(async () => {
  try {
    const report = await generateReport();
    const htmlPath = await generateHTMLReport(report);

    console.log('✅ Report generated successfully!');
    console.log(`📄 HTML Report: ${htmlPath}`);
    console.log('\n📊 Summary:');
    console.log(`   Total: ${report.summary.total}`);
    console.log(`   Passed: ${report.summary.passed}`);
    console.log(`   Failed: ${report.summary.failed}`);
    console.log(`   Skipped: ${report.summary.skipped}`);
    console.log(`   Flaky Tests: ${report.statistics.flakyTests.length}`);
    console.log(`   Recommendations: ${report.insights.recommendations.length}`);
  } catch (error) {
    console.error('❌ Error generating report:', error);
    process.exit(1);
  }
})();
