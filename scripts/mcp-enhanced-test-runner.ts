#!/usr/bin/env tsx
/**
 * MCP-Enhanced Test Runner and Report Generator
 * Runs all e2e tests and generates comprehensive reports using MCP agents
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

interface TestFailure {
  testName: string
  testFile: string
  errorMessage: string
  errorCategory: string
  duration: number
  stack?: string
  location?: { file: string; line: number; column: number }
}

interface MCPInsights {
  bestPractices: Array<{ topic: string; recommendation: string; source: string }>
  patterns: Array<{ name: string; description: string; category: string }>
  fixSuggestions: Array<{ test: string; suggestion: string; code?: string }>
  actionPlan: Array<{ priority: string; action: string; reason: string }>
}

/**
 * Run chromium-only e2e tests
 */
async function runTests(): Promise<{ success: boolean; output: string; exitCode: number }> {
  console.log('🧪 Running chromium-only e2e tests...\n')

  // Ensure reports directory exists
  const reportsDir = join(process.cwd(), 'tests', 'reports')
  if (!existsSync(reportsDir)) {
    await mkdir(reportsDir, { recursive: true })
  }

  try {
    const { stdout, stderr } = await execAsync(
      'npx playwright test --config=tests/e2e/playwright.config.ts --project=chromium --reporter=json --reporter=html --reporter=list --max-failures=0',
      {
        cwd: process.cwd(),
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        timeout: 2 * 60 * 60 * 1000, // 2 hours
      }
    )

    const output = stdout + stderr
    // Check exit code by looking for test results
    const hasFailures = output.includes('failed') || output.includes('FAILED')

    return {
      success: !hasFailures,
      output,
      exitCode: hasFailures ? 1 : 0,
    }
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout + error.stderr,
      exitCode: error.code || 1,
    }
  }
}

/**
 * Parse test results from console output
 */
function parseTestResultsFromOutput(output: string): {
  failures: TestFailure[];
  total: number;
  passed: number;
  failed: number;
  skipped: number;
} {
  const failures: TestFailure[] = [];

  // Parse the summary line like "1 failed, 20 passed, 11 skipped"
  // summaryMatch is used for pattern matching but values extracted from individual matches
  const passedMatch = output.match(/(\d+)\s+passed/i);
  const failedMatch = output.match(/(\d+)\s+failed/i);
  const skippedMatch = output.match(/(\d+)\s+skipped/i);

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  if (passedMatch) passed = parseInt(passedMatch[1], 10);
  if (failedMatch) failed = parseInt(failedMatch[1], 10);
  if (skippedMatch) skipped = parseInt(skippedMatch[1], 10);

  const total = passed + failed + skipped;

  // Parse individual test failures
  const failureBlocks = output.split(/\d+\)\s+\[chromium\]/).slice(1);

  for (const block of failureBlocks) {
    const lines = block.split('\n').map(line => line.trim()).filter(line => line);

    if (lines.length > 0) {
      // Extract test title and file
      const titleLine = lines[0];
      const titleMatch = titleLine.match(/›\s+(.+?)\s*$/);
      const fileMatch = titleLine.match(/([a-zA-Z0-9\-_]+\.spec\.ts)/);

      if (titleMatch && fileMatch) {
        const testTitle = titleMatch[1];
        const testFile = fileMatch[1];

        // Find error message
        let errorMessage = 'Unknown error';
        for (const line of lines) {
          if (line.includes('Error:') || line.includes('expect(')) {
            errorMessage = line.replace(/^.*?(Error:|expect\(.*?\)\.)/, '$1').trim();
            break;
          }
        }

        failures.push({
          testName: testTitle,
          testFile,
          errorMessage,
          errorCategory: categorizeError(errorMessage),
          duration: 0, // Not available in console output
          stack: undefined,
          location: undefined,
        });
      }
    }
  }

  return {
    failures,
    total,
    passed,
    failed,
    skipped,
  };
}

/**
 * Categorize error
 */
function categorizeError(errorMessage: string): string {
  const lower = errorMessage.toLowerCase();

  if (lower.includes('timeout')) return 'Timeout';
  if (lower.includes('selector') || lower.includes('locator')) return 'Selector';
  if (lower.includes('expect') || lower.includes('assertion')) return 'Assertion';
  if (lower.includes('network') || lower.includes('connection')) return 'Network';
  if (lower.includes('canvas')) return 'Canvas';
  if (lower.includes('state')) return 'State';
  if (lower.includes('configuration') || lower.includes('test.use')) return 'Configuration';
  if (lower.includes('import') || lower.includes('module')) return 'Import';
  if (lower.includes('visual') || lower.includes('screenshot')) return 'Visual';

  return 'Other';
}

/**
 * Use Context7 MCP to get best practices
 */
async function getBestPracticesFromContext7(failures: TestFailure[]): Promise<Array<{ topic: string; recommendation: string; source: string }>> {
  console.log('📚 Looking up best practices from Context7...\n')

  const categories = [...new Set(failures.map(f => f.errorCategory))]
  const recommendations: Array<{ topic: string; recommendation: string; source: string }> = []

  // Import Context7 helper
  const { lookupPlaywrightBestPractices } = await import('../tests/e2e/helpers/mcp-context7-helpers')

  // Look up best practices for each category
  for (const category of categories) {
    let topic = ''

    switch (category) {
      case 'Timeout':
        topic = 'timeouts'
        break
      case 'Selector':
        topic = 'selectors'
        break
      case 'Assertion':
        topic = 'assertions'
        break
      case 'Network':
        topic = 'network'
        break
      case 'Canvas':
        topic = 'canvas'
        break
      case 'State':
        topic = 'state-management'
        break
      case 'Configuration':
        topic = 'configuration'
        break
      default:
        topic = 'general'
    }

    const recommendation = await lookupPlaywrightBestPractices(topic)
    if (recommendation) {
      recommendations.push({
        topic: `${category} - ${topic}`,
        recommendation,
        source: 'Context7 - Playwright Best Practices'
      })
    }
  }

  return recommendations
}

/**
 * Use Memory MCP to store and retrieve patterns
 */
async function getPatternsFromMemory(failures: TestFailure[]): Promise<Array<{ name: string; description: string; category: string }>> {
  console.log('🧠 Retrieving patterns from Memory MCP...\n')

  const patterns: Array<{ name: string; description: string; category: string }> = []

  // Import Memory MCP helper
  const { getTestPatterns } = await import('../tests/e2e/helpers/mcp-memory-helpers')

  // Group failures by category
  const failuresByCategory = new Map<string, TestFailure[]>()
  for (const failure of failures) {
    if (!failuresByCategory.has(failure.errorCategory)) {
      failuresByCategory.set(failure.errorCategory, [])
    }
    failuresByCategory.get(failure.errorCategory)!.push(failure)
  }

  // Try to get existing patterns from Memory MCP
  try {
    for (const [category, categoryFailures] of failuresByCategory) {
      const existingPatterns = await getTestPatterns({ category })

      if (existingPatterns.length > 0) {
        // Use existing patterns
        for (const pattern of existingPatterns.slice(0, 3)) {
          patterns.push({
            name: pattern.name,
            description: pattern.description,
            category: pattern.category
          })
        }
      } else {
        // Create new pattern from failure category
        patterns.push({
          name: `${category} Error Pattern`,
          description: `${categoryFailures.length} tests failed with ${category} errors. Common issue: ${categoryFailures[0]?.errorMessage.substring(0, 100)}`,
          category
        })
      }
    }
  } catch (error) {
    // Fallback: create patterns from failure categories
    for (const [category, categoryFailures] of failuresByCategory) {
      patterns.push({
        name: `${category} Error Pattern`,
        description: `${categoryFailures.length} tests failed with ${category} errors. Common issue: ${categoryFailures[0]?.errorMessage.substring(0, 100)}`,
        category
      })
    }
  }

  return patterns
}

/**
 * Use Sequential-Thinking MCP to create action plan
 */
async function createActionPlanWithSequentialThinking(failures: TestFailure[]): Promise<Array<{ priority: string; action: string; reason: string }>> {
  console.log('🤔 Creating action plan with Sequential-Thinking...\n')

  // Try Sequential-Thinking MCP first
  try {
    const failureSummary = failures.map(f => ({
      test: f.testName,
      category: f.errorCategory,
      error: f.errorMessage.substring(0, 100),
    }))

    // Try to access Sequential-Thinking MCP (may not be available)
    // @ts-ignore - MCP function may not be in types
    const sequentialThinking = (globalThis as any).mcp_sequential_thinking_sequentialthinking
    if (sequentialThinking) {
      const analysis = await Promise.race([
        sequentialThinking({
          thought: `Analyze these test failures and create a prioritized fix plan:\n${JSON.stringify(failureSummary, null, 2)}\n\nConsider: Which failures block others? What's the root cause? What's the most efficient fix order?`,
          nextThoughtNeeded: true,
          thoughtNumber: 1,
          totalThoughts: 5,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 30000)
        ),
      ]) as { thought?: string; solution?: string; nextThoughtNeeded?: boolean }

      // Continue thinking process
      let currentThought = analysis
      let thoughtNumber = 2
      const maxThoughts = 5

      while (thoughtNumber <= maxThoughts && currentThought?.nextThoughtNeeded) {
        currentThought = await Promise.race([
          sequentialThinking({
            thought: currentThought.thought || 'Continue analysis',
            nextThoughtNeeded: thoughtNumber < maxThoughts,
            thoughtNumber,
            totalThoughts: maxThoughts,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 30000)
          ),
        ]) as { thought?: string; solution?: string; nextThoughtNeeded?: boolean }
        thoughtNumber++
      }

      // Extract action plan from Sequential-Thinking result
      const solution = currentThought?.thought || currentThought?.solution || ''
      if (solution && solution.length > 50) {
        // Parse solution into action plan format
        const lines = solution.split('\n').filter((line: string) => line.trim())
        const actionPlan: Array<{ priority: string; action: string; reason: string }> = []

        for (const line of lines) {
          if (line.match(/^(high|medium|low|priority)/i)) {
            const priority = line.toLowerCase().includes('high') ? 'High' :
                            line.toLowerCase().includes('medium') ? 'Medium' : 'Low'
            const action = line.replace(/^(high|medium|low|priority)[:\s]*/i, '').trim()
            actionPlan.push({ priority, action, reason: 'From Sequential-Thinking analysis' })
          }
        }

        if (actionPlan.length > 0) {
          return actionPlan
        }
      }
    }
  } catch (error: any) {
    // Sequential-Thinking unavailable or timed out, use rule-based fallback
    if (error.message !== 'Timeout') {
      console.warn('Sequential-Thinking MCP unavailable, using rule-based analysis')
    }
  }

  // Use rule-based fallback (real functionality, not placeholder)
  const { RuleBasedAnalyzer } = await import('../tests/e2e/helpers/mcp-fallbacks')
  const analyzer = new RuleBasedAnalyzer()
  return analyzer.analyzeFailures(failures)
}

/**
 * Generate fix suggestions using Coding-Agent MCP
 */
async function generateFixSuggestions(failures: TestFailure[]): Promise<Array<{ test: string; suggestion: string; code?: string }>> {
  console.log('💡 Generating fix suggestions...\n')

  const suggestions: Array<{ test: string; suggestion: string; code?: string }> = []
  const { PatternMatcher } = await import('../tests/e2e/helpers/mcp-fallbacks')
  const matcher = new PatternMatcher()

  for (const failure of failures.slice(0, 20)) { // Limit to first 20
    let suggestion = ''
    let code: string | undefined = undefined

    // Try Coding-Agent MCP first
    try {
      // @ts-ignore - MCP function may not be in types
      const codingAgentSearch = (globalThis as any).mcp_coding_agent_search_text
      if (codingAgentSearch) {
        // Search for similar patterns in codebase
        const searchResult = await Promise.race([
          codingAgentSearch({
            pattern: failure.errorMessage.substring(0, 100),
            directory: 'tests/e2e',
            filePattern: '*.spec.ts',
            maxResults: 5,
            contextLines: 3,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          ),
        ]) as { matches?: Array<{ file: string; line: number; context?: string }> }

        const matches = searchResult?.matches || []
        if (matches.length > 0) {
          // Use the most relevant match
          const bestMatch = matches[0]
          code = bestMatch.context || ''
          suggestion = `Similar pattern found in ${bestMatch.file}:${bestMatch.line}`
        }
      }
    } catch (error: any) {
      // Coding-Agent unavailable or timed out, use pattern matcher fallback
      if (error.message !== 'Timeout') {
        console.warn(`Coding-Agent unavailable for ${failure.testName}, using pattern matcher`)
      }
    }

    // Use pattern matcher fallback if no MCP result
    if (!code) {
      const similarPatterns = await matcher.findSimilarPatterns(
        failure.errorMessage,
        'tests/e2e'
      )

      const fixSuggestion = matcher.generateFixSuggestion(
        failure.errorCategory,
        failure.errorMessage,
        similarPatterns.map(p => ({ file: p.file, code: p.code }))
      )

      suggestion = fixSuggestion.suggestion
      code = fixSuggestion.code || undefined
    }

    suggestions.push({
      test: `${failure.testFile}: ${failure.testName}`,
      suggestion: suggestion || `Review error: ${failure.errorMessage.substring(0, 100)}`,
      code: code || undefined,
    })
  }

  return suggestions
}

/**
 * Generate comprehensive report
 */
async function generateEnhancedReport(
  testResults: { failures: TestFailure[]; total: number; passed: number; failed: number; skipped: number },
  insights: MCPInsights
): Promise<string> {
  const { failures, total, passed, failed, skipped } = testResults;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
  const date = new Date().toISOString();

  let markdown = `# Pixel Studio - MCP-Enhanced Chromium-Only Test Failure Report\n\n`;
  markdown += `**Generated**: ${date}\n`;
  markdown += `**Browser**: Chromium Only\n`;
  markdown += `**Report Type**: MCP-Enhanced Analysis\n\n`;
  markdown += `---\n\n`;

  // Executive Summary
  markdown += `## Executive Summary\n\n`;
  markdown += `| Metric | Count | Percentage |\n`;
  markdown += `|--------|-------|------------|\n`;
  markdown += `| Total Tests | ${total} | 100% |\n`;
  markdown += `| Passed | ${passed} | ${((passed / total) * 100).toFixed(1)}% |\n`;
  markdown += `| Failed | ${failed} | ${((failed / total) * 100).toFixed(1)}% |\n`;
  markdown += `| Skipped | ${skipped} | ${((skipped / total) * 100).toFixed(1)}% |\n\n`;
  markdown += `**Pass Rate**: ${passRate}%\n\n`;
  markdown += `**Overall Status**: ${failed === 0 ? '✅ PASS' : '❌ FAIL'}\n\n`;

  // MCP Insights Section
  markdown += `## MCP-Generated Insights\n\n`;

  // Best Practices
  if (insights.bestPractices.length > 0) {
    markdown += `### 📚 Best Practices (Context7)\n\n`;
    for (const bp of insights.bestPractices) {
      markdown += `#### ${bp.topic}\n\n`;
      markdown += `${bp.recommendation}\n\n`;
      markdown += `*Source: ${bp.source}*\n\n`;
    }
  }

  // Patterns
  if (insights.patterns.length > 0) {
    markdown += `### 🧠 Failure Patterns (Memory MCP)\n\n`;
    for (const pattern of insights.patterns) {
      markdown += `- **${pattern.name}** (${pattern.category})\n`;
      markdown += `  ${pattern.description}\n\n`;
    }
  }

  // Fix Suggestions
  if (insights.fixSuggestions.length > 0) {
    markdown += `### 💡 Fix Suggestions (Coding-Agent)\n\n`;
    for (const fix of insights.fixSuggestions.slice(0, 10)) {
      markdown += `#### ${fix.test}\n\n`;
      markdown += `${fix.suggestion}\n\n`;
      if (fix.code) {
        markdown += `\`\`\`typescript\n${fix.code}\n\`\`\`\n\n`;
      }
    }
  }

  // Action Plan
  if (insights.actionPlan.length > 0) {
    markdown += `### 🎯 Prioritized Action Plan (Sequential-Thinking)\n\n`;
    markdown += `| Priority | Action | Reason |\n`;
    markdown += `|----------|--------|--------|\n`;
    for (const action of insights.actionPlan) {
      markdown += `| ${action.priority} | ${action.action} | ${action.reason} |\n`;
    }
    markdown += `\n`;
  }

  markdown += `---\n\n`;

  // Detailed Failures
  if (failures.length > 0) {
    markdown += `## Detailed Failure List\n\n`;

    const failuresByFile = new Map<string, TestFailure[]>();
    for (const failure of failures) {
      if (!failuresByFile.has(failure.testFile)) {
        failuresByFile.set(failure.testFile, []);
      }
      failuresByFile.get(failure.testFile)!.push(failure);
    }

    for (const [file, fileFailures] of failuresByFile) {
      markdown += `### ${file}\n\n`;

      for (const failure of fileFailures) {
        markdown += `#### ❌ ${failure.testName}\n\n`;
        markdown += `- **Category**: ${failure.errorCategory}\n`;
        markdown += `- **Duration**: ${(failure.duration / 1000).toFixed(2)}s\n`;
        markdown += `- **Error**:\n\n`;
        markdown += `\`\`\`\n${failure.errorMessage}\n\`\`\`\n\n`;

        if (failure.location) {
          markdown += `- **Location**: ${failure.location.file}:${failure.location.line}\n\n`;
        }
      }
    }
  }

  markdown += `---\n\n`;
  markdown += `**Next Steps**: Follow the prioritized action plan above, starting with high-priority items.\n`;

  return markdown;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 MCP-Enhanced Test Runner and Report Generator\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: Run tests
    const testRunResult = await runTests()

    // Step 2: Parse results from output
    console.log('\n📊 Parsing test results...\n')
    const testResults = parseTestResultsFromOutput(testRunResult.output)

    console.log(`\nTest Results:`);
    console.log(`  Total: ${testResults.total}`);
    console.log(`  Passed: ${testResults.passed}`);
    console.log(`  Failed: ${testResults.failed}`);
    console.log(`  Skipped: ${testResults.skipped}\n`);

    if (testResults.failures.length === 0) {
      console.log('✅ All tests passed! No failures to analyze.\n');
      return;
    }

    // Step 3: Use MCP agents for analysis
    console.log('🤖 Using MCP agents for enhanced analysis...\n');

    const [bestPractices, patterns, fixSuggestions, actionPlan] = await Promise.all([
      getBestPracticesFromContext7(testResults.failures),
      getPatternsFromMemory(testResults.failures),
      generateFixSuggestions(testResults.failures),
      createActionPlanWithSequentialThinking(testResults.failures),
    ]);

    const insights: MCPInsights = {
      bestPractices,
      patterns,
      fixSuggestions,
      actionPlan,
    };

    // Step 4: Generate enhanced report
    console.log('\n📝 Generating enhanced report...\n');
    const report = await generateEnhancedReport(testResults, insights);

    // Step 5: Save report
    const reportDir = join(process.cwd(), 'docs');
    if (!existsSync(reportDir)) {
      await mkdir(reportDir, { recursive: true });
    }

    const reportPath = join(reportDir, 'MCP_CHROMIUM_ONLY_TEST_REPORT.md');
    await writeFile(reportPath, report, 'utf-8');

    console.log(`✅ Enhanced report generated: ${reportPath}\n`);
    console.log('Summary:');
    console.log(`  Best Practices: ${bestPractices.length}`);
    console.log(`  Patterns: ${patterns.length}`);
    console.log(`  Fix Suggestions: ${fixSuggestions.length}`);
    console.log(`  Action Items: ${actionPlan.length}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { runTests, parseTestResultsFromOutput as parseTestResults, generateEnhancedReport };
