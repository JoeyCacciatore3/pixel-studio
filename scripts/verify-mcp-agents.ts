#!/usr/bin/env tsx
/**
 * MCP Agent Verification Script
 * Tests availability and functionality of all MCP agents used in the test infrastructure
 */

interface MCPAgentStatus {
  name: string;
  available: boolean;
  latency?: number;
  error?: string;
  testResults?: {
    test: string;
    passed: boolean;
    error?: string;
    latency?: number;
  }[];
}

interface VerificationResult {
  agents: MCPAgentStatus[];
  summary: {
    total: number;
    available: number;
    unavailable: number;
    averageLatency: number;
  };
  recommendations: string[];
}

/**
 * Test Context7 MCP agent
 */
async function testContext7(): Promise<MCPAgentStatus> {
  const status: MCPAgentStatus = {
    name: 'Context7',
    available: false,
    testResults: [],
  };

  try {
    // Test 1: Resolve library ID
    const start1 = Date.now();
    try {
      // @ts-ignore - MCP function may not be in types
      const result = (await mcp_context7_resolve) - library - id({ libraryName: 'playwright' });
      const latency1 = Date.now() - start1;
      status.testResults!.push({
        test: 'resolve-library-id',
        passed: true,
        latency: latency1,
      });
      status.available = true;
      status.latency = latency1;
    } catch (error: any) {
      status.testResults!.push({
        test: 'resolve-library-id',
        passed: false,
        error: error.message || String(error),
      });
    }

    // Test 2: Get library docs (if first test passed)
    if (status.available) {
      const start2 = Date.now();
      try {
        // @ts-ignore
        const docs =
          (await mcp_context7_get) -
          library -
          docs({
            context7CompatibleLibraryID: '/playwright/playwright',
            topic: 'best practices',
            mode: 'code',
          });
        const latency2 = Date.now() - start2;
        status.testResults!.push({
          test: 'get-library-docs',
          passed: true,
          latency: latency2,
        });
        status.latency = Math.max(status.latency || 0, latency2);
      } catch (error: any) {
        status.testResults!.push({
          test: 'get-library-docs',
          passed: false,
          error: error.message || String(error),
        });
      }
    }
  } catch (error: any) {
    status.error = error.message || String(error);
  }

  return status;
}

/**
 * Test Memory MCP agent
 */
async function testMemoryMCP(): Promise<MCPAgentStatus> {
  const status: MCPAgentStatus = {
    name: 'Memory MCP',
    available: false,
    testResults: [],
  };

  try {
    // Test 1: Create entities
    const start1 = Date.now();
    try {
      const testEntityName = `test-entity-${Date.now()}`;
      // @ts-ignore
      await mcp_memory_create_entities({
        entities: [
          {
            name: testEntityName,
            entityType: 'TestPattern',
            observations: ['Test observation for verification'],
          },
        ],
      });
      const latency1 = Date.now() - start1;
      status.testResults!.push({
        test: 'create-entities',
        passed: true,
        latency: latency1,
      });
      status.available = true;
      status.latency = latency1;

      // Test 2: Search nodes
      if (status.available) {
        const start2 = Date.now();
        try {
          // @ts-ignore
          const searchResult = await mcp_memory_search_nodes({ query: testEntityName });
          const latency2 = Date.now() - start2;
          status.testResults!.push({
            test: 'search-nodes',
            passed: true,
            latency: latency2,
          });
          status.latency = Math.max(status.latency || 0, latency2);

          // Cleanup: Delete test entity
          try {
            // @ts-ignore
            await mcp_memory_delete_entities({ entityNames: [testEntityName] });
          } catch {
            // Ignore cleanup errors
          }
        } catch (error: any) {
          status.testResults!.push({
            test: 'search-nodes',
            passed: false,
            error: error.message || String(error),
          });
        }
      }
    } catch (error: any) {
      status.testResults!.push({
        test: 'create-entities',
        passed: false,
        error: error.message || String(error),
      });
    }
  } catch (error: any) {
    status.error = error.message || String(error);
  }

  return status;
}

/**
 * Test Sequential-Thinking MCP agent
 */
async function testSequentialThinking(): Promise<MCPAgentStatus> {
  const status: MCPAgentStatus = {
    name: 'Sequential-Thinking',
    available: false,
    testResults: [],
  };

  try {
    const start = Date.now();
    try {
      // @ts-ignore
      const result =
        (await mcp_sequential) -
        thinking_sequentialthinking({
          thought: 'Test thought: Analyze a simple problem and provide a solution.',
          nextThoughtNeeded: false,
          thoughtNumber: 1,
          totalThoughts: 1,
        });
      const latency = Date.now() - start;
      status.testResults!.push({
        test: 'sequentialthinking',
        passed: true,
        latency,
      });
      status.available = true;
      status.latency = latency;
    } catch (error: any) {
      status.testResults!.push({
        test: 'sequentialthinking',
        passed: false,
        error: error.message || String(error),
      });
    }
  } catch (error: any) {
    status.error = error.message || String(error);
  }

  return status;
}

/**
 * Test Coding-Agent MCP
 */
async function testCodingAgent(): Promise<MCPAgentStatus> {
  const status: MCPAgentStatus = {
    name: 'Coding-Agent',
    available: false,
    testResults: [],
  };

  try {
    // Test 1: Read file
    const start1 = Date.now();
    try {
      // @ts-ignore
      const result = (await mcp_coding) - agent_read_file({ path: 'package.json' });
      const latency1 = Date.now() - start1;
      status.testResults!.push({
        test: 'read-file',
        passed: true,
        latency: latency1,
      });
      status.available = true;
      status.latency = latency1;
    } catch (error: any) {
      status.testResults!.push({
        test: 'read-file',
        passed: false,
        error: error.message || String(error),
      });
    }

    // Test 2: Search text (if first test passed)
    if (status.available) {
      const start2 = Date.now();
      try {
        // @ts-ignore
        const searchResult =
          (await mcp_coding) -
          agent_search_text({
            pattern: 'test',
            directory: 'tests/e2e',
            filePattern: '*.ts',
            maxResults: 5,
          });
        const latency2 = Date.now() - start2;
        status.testResults!.push({
          test: 'search-text',
          passed: true,
          latency: latency2,
        });
        status.latency = Math.max(status.latency || 0, latency2);
      } catch (error: any) {
        status.testResults!.push({
          test: 'search-text',
          passed: false,
          error: error.message || String(error),
        });
      }
    }
  } catch (error: any) {
    status.error = error.message || String(error);
  }

  return status;
}

/**
 * Test Firecrawl MCP (optional)
 */
async function testFirecrawl(): Promise<MCPAgentStatus> {
  const status: MCPAgentStatus = {
    name: 'Firecrawl',
    available: false,
    testResults: [],
  };

  try {
    const start = Date.now();
    try {
      // @ts-ignore
      const result =
        (await mcp_firecrawl) -
        mcp_firecrawl_search({
          query: 'playwright testing',
          limit: 1,
          sources: [{ type: 'web' }],
        });
      const latency = Date.now() - start;
      status.testResults!.push({
        test: 'search',
        passed: true,
        latency,
      });
      status.available = true;
      status.latency = latency;
    } catch (error: any) {
      status.testResults!.push({
        test: 'search',
        passed: false,
        error: error.message || String(error),
      });
    }
  } catch (error: any) {
    status.error = error.message || String(error);
  }

  return status;
}

/**
 * Main verification function
 */
async function verifyMCPAgents(): Promise<VerificationResult> {
  console.log('🔍 Verifying MCP Agent Availability...\n');
  console.log('='.repeat(60) + '\n');

  const agents: MCPAgentStatus[] = [];

  // Test all agents
  console.log('Testing Context7...');
  agents.push(await testContext7());

  console.log('Testing Memory MCP...');
  agents.push(await testMemoryMCP());

  console.log('Testing Sequential-Thinking...');
  agents.push(await testSequentialThinking());

  console.log('Testing Coding-Agent...');
  agents.push(await testCodingAgent());

  console.log('Testing Firecrawl (optional)...');
  agents.push(await testFirecrawl());

  // Calculate summary
  const available = agents.filter((a) => a.available).length;
  const unavailable = agents.filter((a) => !a.available).length;
  const latencies = agents.filter((a) => a.latency).map((a) => a.latency!);
  const averageLatency =
    latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

  // Generate recommendations
  const recommendations: string[] = [];

  if (unavailable > 0) {
    recommendations.push(
      `${unavailable} MCP agent(s) are unavailable. Functional fallbacks will be used.`
    );
  }

  const slowAgents = agents.filter((a) => a.available && a.latency && a.latency > 2000);
  if (slowAgents.length > 0) {
    recommendations.push(
      `${slowAgents.length} agent(s) are slow (>2s). Consider implementing caching.`
    );
  }

  if (available === agents.length) {
    recommendations.push('All MCP agents are available and working correctly.');
  }

  const result: VerificationResult = {
    agents,
    summary: {
      total: agents.length,
      available,
      unavailable,
      averageLatency,
    },
    recommendations,
  };

  return result;
}

/**
 * Print verification results
 */
function printResults(result: VerificationResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MCP Agent Verification Results');
  console.log('='.repeat(60) + '\n');

  console.log('Summary:');
  console.log(`  Total Agents: ${result.summary.total}`);
  console.log(`  Available: ${result.summary.available} ✅`);
  console.log(`  Unavailable: ${result.summary.unavailable} ❌`);
  console.log(`  Average Latency: ${result.summary.averageLatency.toFixed(2)}ms\n`);

  console.log('Agent Details:');
  for (const agent of result.agents) {
    const status = agent.available ? '✅' : '❌';
    const latency = agent.latency ? ` (${agent.latency}ms)` : '';
    console.log(`  ${status} ${agent.name}${latency}`);

    if (agent.testResults && agent.testResults.length > 0) {
      for (const test of agent.testResults) {
        const testStatus = test.passed ? '✓' : '✗';
        const testLatency = test.latency ? ` (${test.latency}ms)` : '';
        console.log(`    ${testStatus} ${test.test}${testLatency}`);
        if (test.error) {
          console.log(`      Error: ${test.error}`);
        }
      }
    }

    if (agent.error) {
      console.log(`    Error: ${agent.error}`);
    }
    console.log('');
  }

  if (result.recommendations.length > 0) {
    console.log('Recommendations:');
    for (const rec of result.recommendations) {
      console.log(`  - ${rec}`);
    }
    console.log('');
  }
}

/**
 * Save results to file
 */
async function saveResults(result: VerificationResult): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const resultsPath = path.join(process.cwd(), 'tests/e2e/.mcp-verification-results.json');
  await fs.writeFile(resultsPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`📄 Results saved to: ${resultsPath}\n`);
}

/**
 * Main execution
 */
async function main() {
  try {
    const result = await verifyMCPAgents();
    printResults(result);
    await saveResults(result);

    // Exit with appropriate code
    const allAvailable = result.summary.unavailable === 0;
    process.exit(allAvailable ? 0 : 1);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export {
  verifyMCPAgents,
  testContext7,
  testMemoryMCP,
  testSequentialThinking,
  testCodingAgent,
  testFirecrawl,
};
