/**
 * Test Constants
 * Shared constants for all E2E tests
 */

export const APP_URL = process.env.APP_URL || 'http://localhost:3000';

/**
 * Common test timeouts (in milliseconds)
 */
export const TEST_TIMEOUTS = {
  SHORT: 5000,
  MEDIUM: 10000,
  LONG: 30000,
  VERY_LONG: 60000,
} as const;

/**
 * Common wait delays (in milliseconds)
 */
export const WAIT_DELAYS = {
  TINY: 100,
  SHORT: 300,
  MEDIUM: 500,
  LONG: 1000,
  VERY_LONG: 2000,
} as const;
