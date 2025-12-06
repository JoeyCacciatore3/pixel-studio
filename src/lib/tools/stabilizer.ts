/**
 * Stabilizer Module
 * Line stabilization for smoother drawing
 */

export interface Stabilizer {
  setStrength(strength: number): void;
  getStrength(): number;
  processPoint(x: number, y: number): { x: number; y: number };
  reset(): void;
}

export function createStabilizer(): Stabilizer {
  let strength = 50;
  let lastPoints: { x: number; y: number }[] = [];

  return {
    setStrength(newStrength: number) {
      strength = Math.max(0, Math.min(100, newStrength));
    },

    getStrength() {
      return strength;
    },

    processPoint(x: number, y: number) {
      if (strength === 0) {
        return { x, y };
      }

      lastPoints.push({ x, y });
      const bufferSize = Math.floor((strength / 100) * 10) + 1;

      if (lastPoints.length > bufferSize) {
        lastPoints.shift();
      }

      // Average the points
      let avgX = 0;
      let avgY = 0;
      for (const point of lastPoints) {
        avgX += point.x;
        avgY += point.y;
      }
      avgX /= lastPoints.length;
      avgY /= lastPoints.length;

      return { x: avgX, y: avgY };
    },

    reset() {
      lastPoints = [];
    },
  };
}
