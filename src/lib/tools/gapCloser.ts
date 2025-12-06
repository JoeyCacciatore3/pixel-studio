/**
 * Gap Closer Module
 * Auto-closes gaps in flood fill operations
 */

export interface GapCloser {
  setThreshold(threshold: number): void;
  getThreshold(): number;
  shouldCloseGap(x1: number, y1: number, x2: number, y2: number): boolean;
}

export function createGapCloser(): GapCloser {
  let threshold = 2;

  return {
    setThreshold(newThreshold: number) {
      threshold = Math.max(0, Math.min(10, newThreshold));
    },

    getThreshold() {
      return threshold;
    },

    shouldCloseGap(x1: number, y1: number, x2: number, y2: number): boolean {
      const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      return dist <= threshold;
    },
  };
}
