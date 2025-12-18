/**
 * Browser Feature Detection Test Helpers
 * Utilities for detecting browser features and simulating missing features
 */

import { Page } from '@playwright/test';

/**
 * Check if OffscreenCanvas is supported
 */
export async function isOffscreenCanvasSupported(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return typeof OffscreenCanvas !== 'undefined';
  });
}

/**
 * Check if Workers are supported
 */
export async function isWorkersSupported(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return typeof Worker !== 'undefined';
  });
}

/**
 * Check if IndexedDB is available
 */
export async function isIndexedDBAvailable(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return typeof indexedDB !== 'undefined';
  });
}

/**
 * Check if localStorage is available
 */
export async function isLocalStorageAvailable(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * Check if requestIdleCallback is available
 */
export async function isRequestIdleCallbackAvailable(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return typeof requestIdleCallback !== 'undefined';
  });
}

/**
 * Check if Touch events are supported
 */
export async function isTouchSupported(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });
}

/**
 * Check if Pointer events are supported
 */
export async function isPointerSupported(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return 'onpointerdown' in window;
  });
}

/**
 * Get device pixel ratio
 */
export async function getDevicePixelRatio(page: Page): Promise<number> {
  return await page.evaluate(() => {
    return window.devicePixelRatio || 1;
  });
}

/**
 * Simulate missing OffscreenCanvas
 */
export async function simulateMissingOffscreenCanvas(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).OffscreenCanvas = undefined;
  });
}

/**
 * Simulate missing Workers
 */
export async function simulateMissingWorkers(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).Worker = undefined;
    (window as any).SharedWorker = undefined;
  });
}

/**
 * Simulate missing IndexedDB
 */
export async function simulateMissingIndexedDB(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).indexedDB = undefined;
  });
}

/**
 * Simulate missing requestIdleCallback
 */
export async function simulateMissingRequestIdleCallback(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).requestIdleCallback = undefined;
  });
}

/**
 * Get browser name
 */
export async function getBrowserName(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'chrome';
    if (ua.includes('Firefox')) return 'firefox';
    if (ua.includes('Safari')) return 'safari';
    if (ua.includes('Edge')) return 'edge';
    return 'unknown';
  });
}

/**
 * Get browser version
 */
export async function getBrowserVersion(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const ua = navigator.userAgent;
    const match = ua.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
    return match ? match[2]! : 'unknown';
  });
}

/**
 * Check if service worker is registered
 */
export async function isServiceWorkerRegistered(page: Page): Promise<boolean> {
  return await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    }
    return false;
  });
}

/**
 * Get all browser features
 */
export async function getAllBrowserFeatures(page: Page): Promise<{
  offscreenCanvas: boolean;
  workers: boolean;
  indexedDB: boolean;
  localStorage: boolean;
  requestIdleCallback: boolean;
  touch: boolean;
  pointer: boolean;
  serviceWorker: boolean;
  devicePixelRatio: number;
  browserName: string;
  browserVersion: string;
}> {
  return {
    offscreenCanvas: await isOffscreenCanvasSupported(page),
    workers: await isWorkersSupported(page),
    indexedDB: await isIndexedDBAvailable(page),
    localStorage: await isLocalStorageAvailable(page),
    requestIdleCallback: await isRequestIdleCallbackAvailable(page),
    touch: await isTouchSupported(page),
    pointer: await isPointerSupported(page),
    serviceWorker: await isServiceWorkerRegistered(page),
    devicePixelRatio: await getDevicePixelRatio(page),
    browserName: await getBrowserName(page),
    browserVersion: await getBrowserVersion(page),
  };
}

/**
 * Check if browser supports all required features
 */
export async function checkRequiredFeatures(page: Page): Promise<{
  supported: boolean;
  missing: string[];
}> {
  const features = await getAllBrowserFeatures(page);
  const missing: string[] = [];

  // Required features
  if (!features.workers) missing.push('Workers');
  if (!features.indexedDB) missing.push('IndexedDB');
  if (!features.localStorage) missing.push('localStorage');
  if (!features.pointer) missing.push('Pointer Events');

  return {
    supported: missing.length === 0,
    missing,
  };
}
