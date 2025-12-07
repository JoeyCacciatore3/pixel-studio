/**
 * Touch Gesture Recognition
 * Handles pinch-to-zoom, pan, and other touch gestures
 */

export interface GestureState {
  type: 'pinch' | 'pan' | 'tap' | 'longpress' | null;
  scale: number;
  deltaX: number;
  deltaY: number;
  centerX: number;
  centerY: number;
}

export class GestureRecognizer {
  private touches: Map<number, Touch> = new Map();
  private lastDistance: number = 0;
  private lastCenterX: number = 0;
  private lastCenterY: number = 0;
  private longPressTimer: number | null = null;
  private longPressDelay: number = 500;

  /**
   * Handle touch start
   */
  onTouchStart(touches: TouchList): GestureState | null {
    this.touches.clear();
    Array.from(touches).forEach((touch) => {
      this.touches.set(touch.identifier, touch);
    });

    // Single touch - setup long press timer
    if (touches.length === 1) {
      const touch = touches[0];
      this.lastCenterX = touch.clientX;
      this.lastCenterY = touch.clientY;

      this.longPressTimer = window.setTimeout(() => {
        return {
          type: 'longpress',
          scale: 1,
          deltaX: 0,
          deltaY: 0,
          centerX: touch.clientX,
          centerY: touch.clientY,
        };
      }, this.longPressDelay);
    }

    // Two touches - setup pinch
    if (touches.length === 2) {
      const [t1, t2] = Array.from(touches);
      const distance = this.getDistance(t1, t2);
      this.lastDistance = distance;

      const center = this.getCenter(t1, t2);
      this.lastCenterX = center.x;
      this.lastCenterY = center.y;
    }

    return null;
  }

  /**
   * Handle touch move
   */
  onTouchMove(touches: TouchList): GestureState | null {
    // Update touch positions
    Array.from(touches).forEach((touch) => {
      this.touches.set(touch.identifier, touch);
    });

    // Cancel long press on movement
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Single touch - pan
    if (touches.length === 1) {
      const touch = touches[0];
      const deltaX = touch.clientX - this.lastCenterX;
      const deltaY = touch.clientY - this.lastCenterY;

      this.lastCenterX = touch.clientX;
      this.lastCenterY = touch.clientY;

      return {
        type: 'pan',
        scale: 1,
        deltaX,
        deltaY,
        centerX: touch.clientX,
        centerY: touch.clientY,
      };
    }

    // Two touches - pinch
    if (touches.length === 2) {
      const [t1, t2] = Array.from(touches);
      const distance = this.getDistance(t1, t2);
      const scale = this.lastDistance > 0 ? distance / this.lastDistance : 1;

      this.lastDistance = distance;

      const center = this.getCenter(t1, t2);
      const deltaX = center.x - this.lastCenterX;
      const deltaY = center.y - this.lastCenterY;

      this.lastCenterX = center.x;
      this.lastCenterY = center.y;

      return {
        type: 'pinch',
        scale,
        deltaX,
        deltaY,
        centerX: center.x,
        centerY: center.y,
      };
    }

    return null;
  }

  /**
   * Handle touch end
   */
  onTouchEnd(touches: TouchList): GestureState | null {
    // Remove ended touches
    const remainingIds = new Set(Array.from(touches).map((t) => t.identifier));
    this.touches.forEach((_, id) => {
      if (!remainingIds.has(id)) {
        this.touches.delete(id);
      }
    });

    // Cancel long press
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Single tap detection (if touch ended quickly)
    if (touches.length === 0 && this.touches.size === 0) {
      // This would need timing information to detect tap vs drag
      // For now, return null
    }

    return null;
  }

  /**
   * Calculate distance between two touches
   */
  private getDistance(t1: Touch, t2: Touch): number {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.hypot(dx, dy);
  }

  /**
   * Calculate center point between two touches
   */
  private getCenter(t1: Touch, t2: Touch): { x: number; y: number } {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    };
  }

  /**
   * Reset gesture state
   */
  reset(): void {
    this.touches.clear();
    this.lastDistance = 0;
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
}
