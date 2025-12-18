/**
 * Production-safe logger utility
 *
 * Provides environment-aware logging that:
 * - Removes debug/log statements in production builds
 * - Always logs errors (for production error tracking)
 * - Maintains development debugging capabilities
 * - Supports configurable verbosity levels
 */

const isDev = process.env.NODE_ENV === 'development';

// Verbosity levels for development logging
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

// Default log level - can be configured via environment variable
const DEFAULT_LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'warn';

// Convert log level to numeric value for comparison
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  none: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

const currentLogLevel = LOG_LEVEL_VALUES[DEFAULT_LOG_LEVEL] || LOG_LEVEL_VALUES.warn;

/**
 * Logger utility for production-safe logging
 *
 * @example
 * ```ts
 * import { logger } from '@/lib/utils/logger'
 *
 * logger.log('Debug info') // Only in development (info level)
 * logger.warn('Warning') // Only in development (warn level)
 * logger.error('Error') // Always logged
 * logger.debug('Debug') // Only in development (debug level)
 *
 * // Configure log level via LOG_LEVEL environment variable:
 * // LOG_LEVEL=debug - Shows all logs
 * // LOG_LEVEL=info - Shows info, warn, error
 * // LOG_LEVEL=warn - Shows warn, error (default)
 * // LOG_LEVEL=error - Shows only errors
 * // LOG_LEVEL=none - Shows nothing
 * ```
 */
export const logger = {
  /**
   * Log informational messages (development only, info level)
   * Use for general information that helps with development
   */
  log: (...args: unknown[]): void => {
    if (isDev && currentLogLevel >= LOG_LEVEL_VALUES.info) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Log warning messages (development only, warn level)
   * Use for warnings that don't break functionality but should be noted
   */
  warn: (...args: unknown[]): void => {
    if (isDev && currentLogLevel >= LOG_LEVEL_VALUES.warn) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Log error messages (always logged, even in production)
   * Errors should always be logged for production debugging
   */
  error: (...args: unknown[]): void => {
    console.error('[ERROR]', ...args);
    // Note: Error reporting service integration is planned for future implementation.
    // When implemented, uncomment the following:
    // if (process.env.NODE_ENV === 'production') {
    //   errorReportingService.captureException(args)
    // }
  },

  /**
   * Log debug messages (development only, debug level)
   * Use for detailed debugging information
   */
  debug: (...args: unknown[]): void => {
    if (isDev && currentLogLevel >= LOG_LEVEL_VALUES.debug) {
      console.debug('[DEBUG]', ...args);
    }
  },
};

export default logger;
