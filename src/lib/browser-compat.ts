/**
 * Browser Compatibility Utilities
 * Handles browser-specific issues and optimizations
 */

import { DOUBLE_TAP_DELAY } from './constants';

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

// Track if fixes have been applied to prevent duplicate listeners
let fixesApplied = false;
// Store event listener references for cleanup
const listenerRefs: Array<{
  element: Window | Document;
  event: string;
  handler: EventListener | ((e: TouchEvent) => void);
  options?: boolean | AddEventListenerOptions;
}> = [];

/**
 * Apply browser-specific fixes
 */
export function applyBrowserFixes(): void {
  if (typeof window === 'undefined') return;
  // Prevent duplicate listeners
  if (fixesApplied) {
    return;
  }
  fixesApplied = true;

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
      listenerRefs.push({ element: window, event: 'resize', handler: setViewportHeight });
      window.addEventListener('orientationchange', setViewportHeight);
      listenerRefs.push({
        element: window,
        event: 'orientationchange',
        handler: setViewportHeight,
      });
    }

    // Prevent elastic scrolling on canvas
    const preventElasticScroll = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('#mainCanvas')) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchmove', preventElasticScroll, { passive: false });
    listenerRefs.push({
      element: document,
      event: 'touchmove',
      handler: preventElasticScroll,
      options: { passive: false },
    });
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
    const preventDoubleTapZoom = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= DOUBLE_TAP_DELAY) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };
    document.addEventListener('touchend', preventDoubleTapZoom, false);
    listenerRefs.push({
      element: document,
      event: 'touchend',
      handler: preventDoubleTapZoom,
      options: false,
    });

    // Prevent pull-to-refresh on canvas
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('#mainCanvas')) {
        touchStartY = e.touches[0].clientY;
      }
    };
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    listenerRefs.push({
      element: document,
      event: 'touchstart',
      handler: handleTouchStart,
      options: { passive: true },
    });

    const preventPullToRefresh = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('#mainCanvas')) {
        const touchY = e.touches[0].clientY;
        // Prevent pull-to-refresh when scrolling down on canvas
        if (touchY > touchStartY && window.scrollY === 0) {
          e.preventDefault();
        }
      }
    };
    document.addEventListener('touchmove', preventPullToRefresh, { passive: false });
    listenerRefs.push({
      element: document,
      event: 'touchmove',
      handler: preventPullToRefresh,
      options: { passive: false },
    });
  }
}

// Apply fixes on module load
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    const onDOMContentLoaded = () => {
      applyBrowserFixes();
      document.removeEventListener('DOMContentLoaded', onDOMContentLoaded);
    };
    document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
  } else {
    applyBrowserFixes();
  }
}

export { browserInfo };
