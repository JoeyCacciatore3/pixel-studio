import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Pixel Studio E2E Tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: '.',

  /* Match .spec.ts files in the e2e directory */
  testMatch: ['**/*.spec.ts'],
  testIgnore: [
    '**/node_modules/**',
    '**/src/**',
    '**/__tests__/**',
    '**/*.test.ts',
    '**/lib/__tests__/**',
    '**/mcp-helpers.test.ts',
    '**/mcp-helpers.spec.ts',
    '**/helpers/mcp-helpers.spec.ts',
    '**/*.test.ts',
    '**/src/lib/__tests__/**',
    '**/__tests__/**',
    '**/*.test.*',
  ],

  /* Maximum time one test can run for. */
  timeout: 60 * 1000, // 60 seconds default (individual tests can override)

  /* Maximum time for actions like click, tap, etc. */
  actionTimeout: 10000, // 10 seconds for actions

  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     */
    timeout: 10000, // 10 seconds for assertions

    /**
     * Visual comparison threshold for screenshot testing
     */
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixels: 100,
      maxDiffPixelRatio: 0.01,
    },
  },

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'tests/reports/html' }],
    ['json', { outputFile: 'tests/reports/results.json' }],
    ['junit', { outputFile: 'tests/reports/junit.xml' }],
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.APP_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: process.env.MCP_TRACE_ENABLED === 'true' ? 'on' : 'on-first-retry',

    /* Screenshot on failure */
    screenshot:
      process.env.MCP_SCREENSHOT_ON_FAILURE === 'true' ? 'only-on-failure' : 'only-on-failure',

    /* Video on failure */
    video: process.env.MCP_VIDEO_ON_FAILURE === 'true' ? 'retain-on-failure' : 'retain-on-failure',

    /* Visual regression baseline directory */
    screenshotPathTemplate:
      '{testDir}/visual-baselines/{testFilePath}/{testName}-{projectName}{ext}',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        isMobile: false,
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
        isMobile: false,
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
        isMobile: false,
      },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        hasTouch: true, // Enable touch events for mobile testing
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        hasTouch: true, // Enable touch events for mobile testing
      },
    },

    /* Test against tablet viewports. */
    {
      name: 'Tablet',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 768 },
        hasTouch: true, // Enable touch events for tablet testing
      },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* MCP Integration Settings */
  // Note: MCP tools are configured via mcp-config.json
  // These settings enable MCP-enhanced features when available
  // Performance budgets are defined in mcp-config.json
  // Visual regression baselines are stored in tests/e2e/visual-baselines/
});
