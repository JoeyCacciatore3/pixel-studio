#!/usr/bin/env tsx
/**
 * Safe Test Execution Script
 * Runs tests in manageable batches with resource monitoring
 */

import { spawn } from 'child_process';

interface TestExecutionOptions {
  project?: string;
  workers?: number;
  timeout?: number;
  shard?: { current: number; total: number };
}

/**
 * Get system resources
 */
async function getSystemResources(): Promise<{ cpuCount: number; memoryGB: number }> {
  try {
    const cpuCount = require('os').cpus().length;
    const totalMemory = require('os').totalmem();
    const memoryGB = Math.round(totalMemory / (1024 * 1024 * 1024));
    return { cpuCount, memoryGB };
  } catch {
    return { cpuCount: 4, memoryGB: 8 }; // Defaults
  }
}

/**
 * Calculate safe worker count
 */
function calculateSafeWorkers(cpuCount: number, memoryGB: number, projectCount: number = 1): number {
  // Base workers on CPU cores, but consider memory
  // Each worker can use ~500MB-1GB, so limit based on available memory
  const memoryBasedWorkers = Math.floor(memoryGB / 2); // Conservative: 2GB per worker
  const cpuBasedWorkers = Math.max(1, Math.floor(cpuCount / 2)); // Use half of CPU cores

  // Take the minimum to be safe
  const safeWorkers = Math.min(memoryBasedWorkers, cpuBasedWorkers, 4); // Cap at 4 for safety

  // If running multiple projects, reduce workers per project
  return Math.max(1, Math.floor(safeWorkers / projectCount));
}

/**
 * Run tests for a specific project
 */
async function runProjectTests(
  project: string,
  options: TestExecutionOptions = {}
): Promise<{ success: boolean; duration: number; output: string }> {
  const configPath = 'tests/e2e/playwright.config.ts';
  const startTime = Date.now();

  const args = [
    'playwright',
    'test',
    `--config=${configPath}`,
    `--project=${project}`,
    '--reporter=json',
    '--reporter=html',
    '--reporter=junit',
  ];

  if (options.workers) {
    args.push(`--workers=${options.workers}`);
  }

  if (options.shard) {
    args.push(`--shard=${options.shard.current}/${options.shard.total}`);
  }

  return new Promise((resolve) => {
    const childProcess = spawn('npx', args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    childProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    childProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    childProcess.on('close', (code) => {
      resolve({
        success: code === 0,
        duration: Date.now() - startTime,
        output: stdout + stderr,
      });
    });

    childProcess.on('error', (error) => {
      resolve({
        success: false,
        duration: Date.now() - startTime,
        output: error.message,
      });
    });
  });
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const project = args.find(arg => arg.startsWith('--project='))?.split('=')[1];
  const workersArg = args.find(arg => arg.startsWith('--workers='))?.split('=')[1];
  const allProjects = args.includes('--all-projects');
  const shardArg = args.find(arg => arg.startsWith('--shard='))?.split('=')[1];

  console.log('🧪 Safe Test Execution\n');
  console.log('='.repeat(60) + '\n');

  // Get system resources
  const resources = await getSystemResources();
  console.log('💻 System Resources:');
  console.log(`   CPU Cores: ${resources.cpuCount}`);
  console.log(`   Memory: ${resources.memoryGB}GB\n`);

  // Determine projects to run
  const projects = allProjects
    ? ['chromium', 'firefox', 'webkit', 'Mobile Chrome', 'Mobile Safari', 'Tablet']
    : project
    ? [project]
    : ['chromium']; // Default to chromium only

  console.log(`📋 Running tests for: ${projects.join(', ')}\n`);

  // Calculate safe workers
  const safeWorkers = workersArg
    ? parseInt(workersArg, 10)
    : calculateSafeWorkers(resources.cpuCount, resources.memoryGB, projects.length);

  console.log(`⚙️  Configuration:`);
  console.log(`   Workers: ${safeWorkers}`);
  console.log(`   Projects: ${projects.length}`);
  console.log(`   Estimated total tests: ~${316 * projects.length}\n`);

  if (projects.length > 1) {
    console.log('⚠️  Running multiple projects. This may take a while.\n');
    console.log('💡 Tip: Run with --project=chromium to test one browser first\n');
  }

  // Run tests for each project
  const results = [];
  for (const proj of projects) {
    console.log(`\n🚀 Running tests for ${proj}...\n`);

    const shard = shardArg ? {
      current: parseInt(shardArg.split('/')[0], 10),
      total: parseInt(shardArg.split('/')[1], 10),
    } : undefined;

    const result = await runProjectTests(proj, {
      workers: safeWorkers,
      shard,
    });

    results.push({ project: proj, ...result });

    console.log(`\n${result.success ? '✅' : '❌'} ${proj}: ${(result.duration / 1000).toFixed(2)}s`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Execution Summary');
  console.log('='.repeat(60) + '\n');

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const successCount = results.filter(r => r.success).length;

  console.log(`Total Duration: ${(totalDuration / 1000 / 60).toFixed(2)} minutes`);
  console.log(`Projects Passed: ${successCount}/${results.length}`);
  console.log(`Projects Failed: ${results.length - successCount}/${results.length}\n`);

  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.project}: ${(result.duration / 1000).toFixed(2)}s`);
  });

  process.exit(successCount === results.length ? 0 : 1);
}

main().catch(console.error);
