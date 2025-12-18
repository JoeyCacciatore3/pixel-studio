/**
 * Performance Monitoring Module
 * Tracks render times, memory usage, and performance metrics
 */

import { logger } from '@/lib/utils/logger';

interface PerformanceMetrics {
  renderTime: number;
  frameTime: number;
  memoryUsage?: number;
  timestamp: number;
}

interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private webVitals: WebVitalsMetric[] = [];
  private maxMetrics = 100;
  private maxWebVitals = 50;
  private renderStartTime = 0;
  private frameStartTime = 0;
  private observer: PerformanceObserver | null = null;

  constructor() {
    this.initPerformanceObserver();
  }

  /**
   * Initialize PerformanceObserver for monitoring
   * Requires PerformanceObserver support (SSR-safe check)
   */
  private initPerformanceObserver(): void {
    // SSR check - PerformanceObserver not available on server
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
      if (typeof window !== 'undefined') {
        // Client-side but PerformanceObserver missing - throw error
        throw new Error('PerformanceObserver is required but not supported in this environment');
      }
      return; // SSR - skip initialization
    }

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            // Track custom performance measures (dev mode only)
            logger.debug('Performance measure:', entry.name, entry.duration, 'ms');
          }
        }
      });

      this.observer.observe({ entryTypes: ['measure', 'mark'] });
    } catch (error) {
      // PerformanceObserver failed to initialize - throw error, no fallback
      throw new Error(
        `PerformanceObserver initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Start measuring render time
   * Requires performance.mark support
   */
  startRender(): void {
    this.renderStartTime = performance.now();
    // Require performance.mark - no feature detection fallback
    performance.mark('render-start');
  }

  /**
   * End measuring render time
   * Requires performance.mark and performance.measure support
   */
  endRender(): void {
    if (this.renderStartTime === 0) return;

    const renderTime = performance.now() - this.renderStartTime;
    this.renderStartTime = 0;

    // Require performance.mark and measure - no feature detection fallback
    performance.mark('render-end');
    performance.measure('render-duration', 'render-start', 'render-end');

    this.recordMetric({
      renderTime,
      frameTime: renderTime,
      memoryUsage: this.getMemoryUsage(),
      timestamp: Date.now(),
    });
  }

  /**
   * Start measuring frame time
   */
  startFrame(): void {
    this.frameStartTime = performance.now();
  }

  /**
   * End measuring frame time
   */
  endFrame(): void {
    if (this.frameStartTime === 0) return;

    const frameTime = performance.now() - this.frameStartTime;
    this.frameStartTime = 0;

    // Update last metric with frame time
    if (this.metrics.length > 0) {
      this.metrics[this.metrics.length - 1]!.frameTime = frameTime;
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log warning if performance is poor (development only)
    if (metric.frameTime > 16.67) {
      // 16.67ms = 60fps threshold
      logger.warn(`Slow frame detected: ${metric.frameTime.toFixed(2)}ms`);
    }
  }

  /**
   * Get memory usage
   * Note: performance.memory is Chrome-specific, not standard API
   * Returns undefined if not available (not an error - it's a non-standard feature)
   */
  private getMemoryUsage(): number | undefined {
    // performance.memory is Chrome-specific, not standard - check is legitimate
    if (
      'memory' in performance &&
      typeof (performance as { memory?: { usedJSHeapSize?: number } }).memory?.usedJSHeapSize ===
        'number'
    ) {
      return (performance as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize;
    }
    return undefined;
  }

  /**
   * Get average render time
   */
  getAverageRenderTime(): number {
    if (this.metrics.length === 0) return 0;
    const sum = this.metrics.reduce((acc, m) => acc + m.renderTime, 0);
    return sum / this.metrics.length;
  }

  /**
   * Get average frame time
   */
  getAverageFrameTime(): number {
    if (this.metrics.length === 0) return 0;
    const sum = this.metrics.reduce((acc, m) => acc + m.frameTime, 0);
    return sum / this.metrics.length;
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(count: number = 10): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.webVitals = [];
  }

  /**
   * Record a Web Vitals metric
   */
  recordWebVital(metric: WebVitalsMetric): void {
    this.webVitals.push(metric);

    // Keep only recent metrics
    if (this.webVitals.length > this.maxWebVitals) {
      this.webVitals.shift();
    }
  }

  /**
   * Get Web Vitals metrics
   */
  getWebVitals(): WebVitalsMetric[] {
    return [...this.webVitals];
  }

  /**
   * Get latest Web Vital by name
   */
  getLatestWebVital(name: string): WebVitalsMetric | undefined {
    return this.webVitals.findLast((m) => m.name === name);
  }

  /**
   * Get performance report
   */
  getReport(): {
    averageRenderTime: number;
    averageFrameTime: number;
    currentMemoryUsage?: number;
    metricsCount: number;
    isPerformingWell: boolean;
    webVitals: {
      lcp?: WebVitalsMetric;
      fcp?: WebVitalsMetric;
      cls?: WebVitalsMetric;
      fid?: WebVitalsMetric;
      ttfb?: WebVitalsMetric;
      inp?: WebVitalsMetric;
    };
  } {
    const avgRender = this.getAverageRenderTime();
    const avgFrame = this.getAverageFrameTime();
    const currentMemory = this.getMemoryUsage();

    return {
      averageRenderTime: avgRender,
      averageFrameTime: avgFrame,
      currentMemoryUsage: currentMemory,
      metricsCount: this.metrics.length,
      isPerformingWell: avgFrame < 16.67, // 60fps threshold
      webVitals: {
        lcp: this.getLatestWebVital('LCP'),
        fcp: this.getLatestWebVital('FCP'),
        cls: this.getLatestWebVital('CLS'),
        fid: this.getLatestWebVital('FID'),
        ttfb: this.getLatestWebVital('TTFB'),
        inp: this.getLatestWebVital('INP'),
      },
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.clear();
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
