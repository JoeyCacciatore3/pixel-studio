'use client';

/**
 * WebVitals Component
 * Integrates Next.js Core Web Vitals monitoring
 */

import { useReportWebVitals } from 'next/web-vitals';
import performanceMonitor from '@/lib/performance/monitor';
import { logger } from '@/lib/utils/logger';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Track Core Web Vitals in performance monitor
    const webVitalsData = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating as 'good' | 'needs-improvement' | 'poor',
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType || 'navigate',
    };

    // Record in performance monitor
    performanceMonitor.recordWebVital(webVitalsData);

    // Log in development for debugging (debug level - less verbose)
    logger.debug('Web Vital:', webVitalsData);

    // Log warnings for poor performance
    if (metric.rating === 'poor') {
      logger.warn(`Poor ${metric.name}: ${metric.value.toFixed(2)}ms`);
    }
  });

  return null;
}
