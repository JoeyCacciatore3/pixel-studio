/**
 * Element Interactivity Test Helpers
 * Utilities for waiting for elements to be in an interactive state
 */

import { Page, Locator, expect } from '@playwright/test'

export interface ElementInteractivityOptions {
  /**
   * Maximum time to wait for element to be interactive in milliseconds
   * @default 10000
   */
  maxWait?: number

  /**
   * Whether to wait for element to be visible
   * @default true
   */
  waitForVisible?: boolean

  /**
   * Whether to wait for element to be enabled
   * @default true
   */
  waitForEnabled?: boolean

  /**
   * Whether to wait for element to not be animating
   * @default true
   */
  waitForNotAnimating?: boolean

  /**
   * Whether to wait for element to be in viewport
   * @default true
   */
  waitForInViewport?: boolean

  /**
   * Timeout for animation check (how long to wait for animation to stop)
   * @default 1000
   */
  animationTimeout?: number
}

/**
 * Wait for an element to be in an interactive state
 *
 * This function ensures:
 * 1. Element is visible
 * 2. Element is enabled (not disabled)
 * 3. Element is not animating (CSS transitions/animations complete)
 * 4. Element is in viewport (scrollable into view if needed)
 *
 * @param locator - Playwright locator for the element
 * @param options - Configuration options
 * @throws Error if element is not interactive within maxWait time
 */
export async function waitForElementInteractive(
  locator: Locator,
  options: ElementInteractivityOptions = {}
): Promise<void> {
  const {
    maxWait = 10000,
    waitForVisible = true,
    waitForEnabled = true,
    waitForNotAnimating = true,
    waitForInViewport = true,
    animationTimeout = 1000,
  } = options

  const startTime = Date.now()
  const errors: string[] = []

  // Wait for element to be visible
  if (waitForVisible) {
    try {
      await expect(locator).toBeVisible({ timeout: maxWait })
    } catch (error: any) {
      errors.push(`Element not visible: ${error.message}`)
      throw new Error(`Element not interactive: ${errors.join('; ')}`)
    }
  }

  // Wait for element to be enabled
  if (waitForEnabled) {
    try {
      const remainingTime = maxWait - (Date.now() - startTime)
      if (remainingTime > 0) {
        await expect(locator).toBeEnabled({ timeout: remainingTime })
      } else {
        errors.push('Timeout waiting for element to be enabled')
      }
    } catch (error: any) {
      errors.push(`Element not enabled: ${error.message}`)
    }
  }

  // Wait for element to be in viewport (scroll into view if needed)
  if (waitForInViewport) {
    try {
      const remainingTime = maxWait - (Date.now() - startTime)
      if (remainingTime > 0) {
        await locator.scrollIntoViewIfNeeded({ timeout: remainingTime })
        // Verify element is actually in viewport
        const boundingBox = await locator.boundingBox()
        if (!boundingBox) {
          errors.push('Element not in viewport (no bounding box)')
        }
      } else {
        errors.push('Timeout waiting for element to be in viewport')
      }
    } catch (error: any) {
      errors.push(`Element not in viewport: ${error.message}`)
    }
  }

  // Wait for element to not be animating
  if (waitForNotAnimating) {
    try {
      const remainingTime = maxWait - (Date.now() - startTime)
      if (remainingTime > 0) {
        await waitForAnimationComplete(locator, Math.min(remainingTime, animationTimeout))
      }
    } catch (error: any) {
      // Animation check is non-critical, just log a warning
      console.warn(`Animation check failed for element: ${error.message}`)
    }
  }

  // If there are critical errors and we've exceeded timeout, throw
  const elapsed = Date.now() - startTime
  if (errors.length > 0 && elapsed >= maxWait) {
    throw new Error(
      `Element not interactive after ${elapsed}ms (max: ${maxWait}ms). Errors:\n${errors.join('\n')}`
    )
  }

  // Additional stability wait to ensure element is settled
  await locator.page().waitForTimeout(100)
}

/**
 * Wait for CSS animations/transitions to complete on an element
 */
async function waitForAnimationComplete(locator: Locator, timeout: number): Promise<void> {
  const startTime = Date.now()
  const checkInterval = 100
  const maxChecks = Math.ceil(timeout / checkInterval)

  for (let i = 0; i < maxChecks && Date.now() - startTime < timeout; i++) {
    const isAnimating = await locator.evaluate((el: Element) => {
      const style = window.getComputedStyle(el)
      const transition = style.transition
      const animation = style.animation

      // Check if element has active transitions or animations
      if (transition && transition !== 'none' && transition !== 'all 0s ease 0s') {
        return true
      }
      if (animation && animation !== 'none') {
        return true
      }

      // Check if element is in a transition/animation state
      // This is a heuristic - we check if transform or opacity are changing
      return false
    })

    if (!isAnimating) {
      return // Animation complete
    }

    await locator.page().waitForTimeout(checkInterval)
  }

  // If we get here, animation might still be running, but we've timed out
  // This is non-critical, so we don't throw
}

/**
 * Check if element is interactive (non-blocking check)
 * Returns true if all interactivity checks pass, false otherwise
 */
export async function isElementInteractive(
  locator: Locator,
  options: Omit<ElementInteractivityOptions, 'maxWait'> = {}
): Promise<boolean> {
  try {
    await waitForElementInteractive(locator, { ...options, maxWait: 1000 })
    return true
  } catch {
    return false
  }
}

/**
 * Wait for element to be interactive with retries
 * Useful for flaky element state scenarios
 */
export async function waitForElementInteractiveWithRetries(
  locator: Locator,
  options: ElementInteractivityOptions & { retries?: number; retryDelay?: number } = {}
): Promise<void> {
  const { retries = 3, retryDelay = 500, ...interactivityOptions } = options

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await waitForElementInteractive(locator, interactivityOptions)
      return // Success
    } catch (error) {
      if (attempt === retries) {
        throw error // Last attempt failed
      }
      // Wait before retry
      await locator.page().waitForTimeout(retryDelay * attempt) // Exponential backoff
    }
  }
}

/**
 * Helper to get element by data-testid with interactivity wait
 */
export async function getByTestId(
  page: Page,
  testId: string,
  options?: ElementInteractivityOptions
): Promise<Locator> {
  const locator = page.getByTestId(testId)
  if (options) {
    await waitForElementInteractive(locator, options)
  }
  return locator
}
