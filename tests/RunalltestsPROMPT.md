# Run All E2E Tests and Generate Detailed Report with MCP Agents

## Project Context
I'm working on Pixel Studio, a web-based pixel art editor with comprehensive Playwright e2e tests (316 tests across 19 spec files). The project has extensive MCP (Model Context Protocol) integration configured.

## Task
Run all e2e tests and generate a comprehensive failure report using MCP agents for enhanced analysis and insights.

## Available MCP Agents
1. **Playwright MCP**: Browser automation, test execution, debugging
2. **Context7**: Documentation and best practices lookup
3. **Memory MCP**: Test pattern storage and learning
4. **Coding-Agent**: Code generation and refactoring
5. **Firecrawl**: Web scraping for documentation
6. **Sequential-Thinking**: Complex scenario planning
7. **Sentry**: Error tracking (if configured)
8. **GitHub**: Repository operations

## Execution Strategy

### Step 1: Run Tests with MCP Enhancement
# Option A: Use MCP-enhanced test runner (recommended)
tsx scripts/mcp-enhanced-test-runner.ts

# Option B: Use npm script for chromium-only tests
npm run test:e2e:chromium-only

# Option C: Use standard runner with full report
npm run test:e2e:full-report

### Step 2: Use MCP Agents for Analysis
After tests complete, use MCP agents to:

1. **Context7**: Look up best practices for common failure patterns
   - "What are Playwright best practices for handling timeouts?"
   - "How to fix selector errors in Playwright tests?"
   - "Best practices for canvas testing in Playwright?"

2. **Memory MCP**: Learn from failures
   - Store failure patterns for future reference
   - Get optimization recommendations
   - Find similar patterns that were fixed before

3. **Coding-Agent**: Generate fixes
   - "Generate a fix for this test failure: [error message]"
   - "Refactor this test to follow best practices: [test code]"
   - "Create a helper function for [common pattern]"

4. **Sequential-Thinking**: Plan fix strategy
   - "Analyze these test failures and create a prioritized fix plan"
   - "What's the root cause of these timeout errors?"
   - "How should we fix configuration issues in test files?"

### Step 3: Generate Enhanced Report
# Generate MCP-enhanced report with insights
tsx scripts/mcp-report-generator.ts

## What I Need

1. **Run all tests** using MCP-enhanced execution (if available)
2. **Use Context7** to look up best practices for common error patterns
3. **Use Memory MCP** to:
   - Store failure patterns
   - Get optimization recommendations
   - Find similar patterns from past tests
4. **Use Coding-Agent** to:
   - Generate fixes for failing tests
   - Refactor problematic test code
   - Create helper functions for common patterns
5. **Use Sequential-Thinking** to:
   - Analyze failure patterns systematically
   - Create a prioritized fix plan
   - Identify root causes
6. **Generate comprehensive report** with:
   - Actual error messages and stack traces
   - MCP-generated insights and recommendations
   - Best practice suggestions from Context7
   - Fix suggestions from Coding-Agent
   - Prioritized action plan from Sequential-Thinking

## Expected Output

### Enhanced Failure Report
- Standard failure details (errors, stack traces, artifacts)
- **MCP Insights**: Best practice recommendations from Context7
- **Pattern Analysis**: Similar failures from Memory MCP
- **Fix Suggestions**: Code fixes from Coding-Agent
- **Action Plan**: Prioritized fix strategy from Sequential-Thinking

### MCP-Generated Artifacts
- Test pattern storage in Memory MCP
- Optimization recommendations
- Code fixes ready to apply
- Best practice documentation references

## Success Criteria
- All tests execute with MCP-enhanced debugging
- Failure patterns are analyzed using Sequential-Thinking
- Best practices are looked up via Context7
- Fix suggestions are generated via Coding-Agent
- Patterns are stored in Memory MCP for future reference
- Comprehensive report includes MCP-generated insights

Please run the tests and use MCP agents to provide enhanced analysis and actionable recommendations.
