/**
 * Browser Polyfills and Feature Detection
 * Ensures compatibility across all browsers
 */

// Feature detection utilities
export const BrowserFeatures = {
  // Check if Pointer Events are supported
  hasPointerEvents(): boolean {
    return typeof PointerEvent !== 'undefined';
  },

  // Check if Canvas 2D is supported
  hasCanvas2D(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('2d');
    } catch {
      return false;
    }
  },

  // Check if Service Worker is supported
  hasServiceWorker(): boolean {
    return 'serviceWorker' in navigator;
  },

  // Check if LocalStorage is supported
  hasLocalStorage(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },

  // Check if requestAnimationFrame is supported
  hasRequestAnimationFrame(): boolean {
    return (
      typeof requestAnimationFrame !== 'undefined' ||
      typeof window.requestAnimationFrame !== 'undefined'
    );
  },

  // Check if CSS transforms are supported
  hasCSSTransforms(): boolean {
    const style = document.createElement('div').style;
    return (
      'transform' in style ||
      'webkitTransform' in style ||
      'mozTransform' in style ||
      'msTransform' in style
    );
  },
};

// requestAnimationFrame polyfill
if (!BrowserFeatures.hasRequestAnimationFrame()) {
  let lastTime = 0;
  const vendors = ['webkit', 'moz', 'ms', 'o'];

  for (let x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = (window as any)[`${vendors[x]}RequestAnimationFrame`];
    window.cancelAnimationFrame =
      (window as any)[`${vendors[x]}CancelAnimationFrame`] ||
      (window as any)[`${vendors[x]}CancelRequestAnimationFrame`];
  }

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (callback: FrameRequestCallback): number {
      const currTime = new Date().getTime();
      const timeToCall = Math.max(0, 16 - (currTime - lastTime));
      const id = window.setTimeout(() => {
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function (id: number): void {
      clearTimeout(id);
    };
  }
}

// Initialize polyfills on load
if (typeof window !== 'undefined') {
  // Ensure all polyfills are loaded
  if (!BrowserFeatures.hasCanvas2D()) {
    console.warn('Canvas 2D is not supported in this browser');
  }

  if (!BrowserFeatures.hasLocalStorage()) {
    console.warn('LocalStorage is not supported in this browser');
  }
}
