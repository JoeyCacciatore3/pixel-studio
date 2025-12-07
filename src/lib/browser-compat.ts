/**
 * Browser Compatibility Utilities
 * Handles browser-specific issues and optimizations
 */

export interface BrowserInfo {
  name: string;
  version: number;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
}

/**
 * Detect browser information
 */
export function detectBrowser(): BrowserInfo {
  if (typeof window === 'undefined') {
    return {
      name: 'unknown',
      version: 0,
      isSafari: false,
      isChrome: false,
      isFirefox: false,
      isEdge: false,
      isIOS: false,
      isAndroid: false,
      isMobile: false,
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isMobile = isIOS || isAndroid;

  let name = 'unknown';
  let version = 0;

  // Safari (including iOS)
  if (/safari/.test(ua) && !/chrome/.test(ua)) {
    name = 'safari';
    const match = ua.match(/version\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }
  // Chrome
  else if (/chrome/.test(ua) && !/edg/.test(ua)) {
    name = 'chrome';
    const match = ua.match(/chrome\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }
  // Firefox
  else if (/firefox/.test(ua)) {
    name = 'firefox';
    const match = ua.match(/firefox\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }
  // Edge
  else if (/edg/.test(ua)) {
    name = 'edge';
    const match = ua.match(/edg\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }

  return {
    name,
    version,
    isSafari: name === 'safari' || isIOS,
    isChrome: name === 'chrome',
    isFirefox: name === 'firefox',
    isEdge: name === 'edge',
    isIOS,
    isAndroid,
    isMobile,
  };
}

const browserInfo = detectBrowser();

/**
 * Apply browser-specific fixes
 */
export function applyBrowserFixes(): void {
  if (typeof window === 'undefined') return;

  // Safari-specific fixes
  if (browserInfo.isSafari) {
    // Fix iOS viewport height issue
    if (browserInfo.isIOS) {
      const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      setViewportHeight();
      window.addEventListener('resize', setViewportHeight);
      window.addEventListener('orientationchange', setViewportHeight);
    }

    // Prevent elastic scrolling on canvas
    document.addEventListener(
      'touchmove',
      (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('#mainCanvas')) {
          e.preventDefault();
        }
      },
      { passive: false }
    );
  }

  // Chrome-specific optimizations
  if (browserInfo.isChrome) {
    // Enable hardware acceleration hints
    const style = document.createElement('style');
    style.textContent = `
      #mainCanvas {
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
      }
    `;
    document.head.appendChild(style);
  }

  // Firefox-specific fixes
  if (browserInfo.isFirefox) {
    // Fix canvas rendering issues
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Firefox sometimes needs explicit image smoothing settings
        ctx.imageSmoothingEnabled = false;
      }
    }
  }

  // Mobile-specific fixes
  if (browserInfo.isMobile) {
    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener(
      'touchend',
      (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      },
      false
    );

    // Prevent pull-to-refresh on canvas
    let touchStartY = 0;
    document.addEventListener(
      'touchstart',
      (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('#mainCanvas')) {
          touchStartY = e.touches[0].clientY;
        }
      },
      { passive: true }
    );

    document.addEventListener(
      'touchmove',
      (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('#mainCanvas')) {
          const touchY = e.touches[0].clientY;
          // Prevent pull-to-refresh when scrolling down on canvas
          if (touchY > touchStartY && window.scrollY === 0) {
            e.preventDefault();
          }
        }
      },
      { passive: false }
    );
  }
}

/**
 * Get canvas memory limits based on browser
 */
export function getCanvasMemoryLimit(): { maxWidth: number; maxHeight: number } {
  if (browserInfo.isSafari && browserInfo.isIOS) {
    // iOS Safari has stricter memory limits
    return { maxWidth: 2048, maxHeight: 2048 };
  }
  if (browserInfo.isMobile) {
    // Mobile browsers generally have lower limits
    return { maxWidth: 4096, maxHeight: 4096 };
  }
  // Desktop browsers can handle larger canvases
  return { maxWidth: 8192, maxHeight: 8192 };
}

/**
 * Check if browser supports touch pressure
 */
export function supportsTouchPressure(): boolean {
  if (typeof window === 'undefined') return false;
  return 'TouchEvent' in window && 'force' in TouchEvent.prototype;
}

/**
 * Get optimal frame rate for device
 */
export function getOptimalFrameRate(): number {
  if (browserInfo.isMobile) {
    // Mobile devices: 30fps to save battery
    return 30;
  }
  // Desktop: 60fps
  return 60;
}

// Apply fixes on module load
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBrowserFixes);
  } else {
    applyBrowserFixes();
  }
}

export { browserInfo };
