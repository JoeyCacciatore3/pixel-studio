#!/usr/bin/env tsx
/**
 * AI-Powered Test Generator
 * Generates Playwright tests from natural language descriptions
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  getRecommendedPatterns,
  validateTestAgainstBestPractices,
} from '../tests/e2e/helpers/mcp-context7-helpers';
import {
  findSimilarPatterns,
} from '../tests/e2e/helpers/mcp-memory-helpers';

interface TestGenerationOptions {
  description: string;
  testFile?: string;
  testName?: string;
  category?: string;
  tags?: string[];
  usePatterns?: boolean;
}

/**
 * Generate test code from description
 */
async function generateTestFromDescription(
  options: TestGenerationOptions
): Promise<string> {
  const { description, testName, category, tags, usePatterns } = options;

  console.log('🤖 Generating test from description...');
  console.log(`Description: ${description}\n`);

  // Find similar patterns if enabled (uses Memory MCP with fallback)
  let similarPatterns: any[] = []
  if (usePatterns) {
    similarPatterns = await findSimilarPatterns(description)
    if (similarPatterns.length > 0) {
      console.log(`📚 Found ${similarPatterns.length} similar patterns to reference`)
    }
  }

  // Get recommended pattern for the category (uses Context7 MCP with fallback)
  let recommendedPattern: string | null = null
  if (category) {
    recommendedPattern = await getRecommendedPatterns(category)
  }

  // Try Coding-Agent MCP for code generation if available
  // Note: MCP functions are called dynamically at runtime, not statically typed
  let generatedCode: string | null = null
  try {
    // MCP function calls are handled at runtime via MCP server integration
    // This would be called via the MCP client, not directly in TypeScript
    // For now, we'll skip direct MCP calls and use pattern-based generation
    const matches: Array<{ file: string; line: number; content: string }> = []
    if (matches.length > 0) {
      // Extract code from matches
      generatedCode = matches.map((m: any) => m.context || m.line).join('\n')
    }
  } catch (error: any) {
    // Coding-Agent unavailable, will use pattern-based generation
    if (error.message !== 'Timeout') {
      console.warn('Coding-Agent unavailable for code generation, using pattern-based approach')
    }
  }

  // Generate test code
  const testCode = generateTestCode({
    description,
    testName: testName || generateTestName(description),
    similarPatterns,
    recommendedPattern,
    tags: tags || [],
    generatedCode, // Include Coding-Agent generated code if available
  });

  // Validate against best practices
  const validation = await validateTestAgainstBestPractices(testCode);

  if (!validation.isValid) {
    console.log('⚠️  Validation issues found:');
    validation.issues.forEach(issue => {
      console.log(`   Line ${issue.line}: ${issue.message}`);
      console.log(`   Suggestion: ${issue.suggestion}`);
    });
  }

  if (validation.suggestions.length > 0) {
    console.log('\n💡 Suggestions:');
    validation.suggestions.forEach(suggestion => {
      console.log(`   - ${suggestion}`);
    });
  }

  return testCode;
}

/**
 * Generate test code structure
 */
function generateTestCode(options: {
  description: string
  testName: string
  similarPatterns: any[]
  recommendedPattern: string | null
  tags: string[]
  generatedCode?: string | null
}): string {
  const { description, testName, similarPatterns, recommendedPattern, generatedCode } = options

  // Extract key actions from description
  const actions = extractActions(description);

  // Generate imports
  const imports = generateImports(actions);

  // Generate test body
  const testBody = generateTestBody(description, actions, similarPatterns, recommendedPattern, generatedCode)

  // Generate test code
  const testCode = `
${imports}

test.describe('${extractFeature(description)}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await waitForCanvasReady(page);
  });

  test('${testName}', async ({ page }) => {
${testBody}
  });
});
  `.trim();

  return testCode;
}

/**
 * Extract actions from description
 */
function extractActions(description: string): string[] {
  const actionKeywords = [
    'click', 'select', 'draw', 'type', 'fill', 'upload', 'clear', 'undo', 'redo',
    'create', 'delete', 'toggle', 'move', 'resize', 'zoom', 'pan', 'save', 'load'
  ];

  const actions: string[] = [];
  const lowerDesc = description.toLowerCase();

  actionKeywords.forEach(keyword => {
    if (lowerDesc.includes(keyword)) {
      actions.push(keyword);
    }
  });

  return actions;
}

/**
 * Extract feature name from description
 */
function extractFeature(description: string): string {
  // Simple extraction - take first few words
  const words = description.split(' ').slice(0, 3);
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Generate test name from description
 */
function generateTestName(description: string): string {
  // Convert description to test name format
  let name = description
    .toLowerCase()
    .replace(/should\s+/i, '')
    .replace(/test\s+/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

  // Capitalize first letter of each word
  name = name.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return name;
}

/**
 * Generate imports based on actions
 */
function generateImports(actions: string[]): string {
  const imports = new Set<string>();

  imports.add("import { test, expect } from '@playwright/test';");
  imports.add("import { waitForCanvasReady, APP_URL } from './helpers/canvas-helpers';");

  if (actions.includes('select') || actions.includes('click')) {
    imports.add("import { selectTool } from './helpers/canvas-helpers';");
  }

  if (actions.includes('draw')) {
    imports.add("import { drawStroke } from './helpers/canvas-helpers';");
  }

  if (actions.includes('upload')) {
    imports.add("import { getCanvasDataURL } from './helpers/canvas-helpers';");
  }

  return Array.from(imports).join('\n');
}

/**
 * Generate test body
 */
function generateTestBody(
  description: string,
  actions: string[],
  similarPatterns: any[],
  recommendedPattern: string | null,
  generatedCode?: string | null
): string {
  const lines: string[] = []
  const indent = '    '

  // Use Coding-Agent generated code if available
  if (generatedCode) {
    const codeLines = generatedCode
      .split('\n')
      .filter(line => line.trim())
      .map(line => indent + line.trim())
    lines.push(...codeLines)
    return lines.join('\n')
  }

  // Use recommended pattern if available
  if (recommendedPattern) {
    const patternLines = recommendedPattern
      .split('\n')
      .filter(line => line.trim() && !line.includes('// Recommended pattern'))
      .map(line => indent + line.trim())
    lines.push(...patternLines)
    return lines.join('\n')
  }

  // Use similar pattern if available
  if (similarPatterns.length > 0) {
    const pattern = similarPatterns[0];
    // Adapt the pattern code (simplified)
    lines.push(`${indent}// Based on pattern: ${pattern.name}`);
    // In a real implementation, we would adapt the pattern code here
  }

  // Generate basic test structure
  if (actions.includes('draw')) {
    lines.push(`${indent}await selectTool(page, 'pencil');`);
    lines.push(`${indent}await drawStroke(page, { x: 50, y: 50 }, { x: 100, y: 100 });`);
  }

  if (actions.includes('select')) {
    lines.push(`${indent}await selectTool(page, 'pencil');`);
  }

  if (actions.includes('clear')) {
    lines.push(`${indent}const clearButton = page.locator('#clearBtn');`);
    lines.push(`${indent}await clearButton.click();`);
  }

  if (actions.includes('upload')) {
    lines.push(`${indent}const fileInput = page.locator('input[type="file"]#imageUpload');`);
    lines.push(`${indent}await fileInput.setInputFiles('path/to/test-image.png');`);
  }

  // Add assertion
  if (description.toLowerCase().includes('should')) {
    const expected = extractExpected(description);
    if (expected) {
      lines.push(`${indent}await expect(${expected}).toBeVisible();`);
    }
  }

  // Default assertion if none specified
  if (lines.length === 0) {
    lines.push(`${indent}const canvas = page.locator('#mainCanvas');`);
    lines.push(`${indent}await expect(canvas).toBeVisible();`);
  }

  return lines.join('\n');
}

/**
 * Extract expected outcome from description
 */
function extractExpected(description: string): string | null {
  if (description.toLowerCase().includes('visible')) {
    return 'page.locator("#mainCanvas")';
  }
  if (description.toLowerCase().includes('draw')) {
    return 'page.locator("#mainCanvas")';
  }
  return null;
}

/**
 * Save generated test to file
 */
async function saveTestToFile(
  testCode: string,
  testFile: string
): Promise<string> {
  const filePath = join(process.cwd(), 'tests/e2e', testFile);

  // Check if file exists
  let existingContent = '';
  try {
    existingContent = await readFile(filePath, 'utf-8');
  } catch {
    // File doesn't exist, create new
  }

  // Append test if file exists, otherwise create new
  if (existingContent) {
    // Find the last test.describe or add before the end
    const newContent = existingContent + '\n\n' + testCode;
    await writeFile(filePath, newContent);
  } else {
    await writeFile(filePath, testCode);
  }

  return filePath;
}

// CLI interface
(async () => {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: tsx scripts/mcp-test-generator.ts <description> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --file <path>     Test file path');
    console.log('  --name <name>     Test name');
    console.log('  --category <cat>  Test category');
    console.log('  --tags <tags>     Comma-separated tags');
    console.log('  --use-patterns    Use similar patterns');
    console.log('  --save            Save to file');
    process.exit(1);
  }

  const description = args[0];
  const options: TestGenerationOptions = {
    description,
  };

  // Parse options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--file' && args[i + 1]) {
      options.testFile = args[++i];
    } else if (arg === '--name' && args[i + 1]) {
      options.testName = args[++i];
    } else if (arg === '--category' && args[i + 1]) {
      options.category = args[++i];
    } else if (arg === '--tags' && args[i + 1]) {
      options.tags = args[++i].split(',').map(t => t.trim());
    } else if (arg === '--use-patterns') {
      options.usePatterns = true;
    }
  }

  try {
    const testCode = await generateTestFromDescription(options);

    console.log('\n📝 Generated Test Code:');
    console.log('========================\n');
    console.log(testCode);
    console.log('');

    // Save if requested
    if (options.testFile) {
      const filePath = await saveTestToFile(
        testCode,
        options.testFile
      );
      console.log(`✅ Test saved to: ${filePath}`);
    } else {
      console.log('💡 Use --save --file <path> to save the test');
    }
  } catch (error) {
    console.error('❌ Error generating test:', error);
    process.exit(1);
  }
})();
