/**
 * Event Emitter Utility
 * Lightweight event emitter for event-driven architecture
 * Replaces polling with efficient event-based updates
 */

import { logger } from './logger';

type EventCallback<T = unknown> = (data: T, ...args: unknown[]) => void;

interface EventEmitter {
  on<T = unknown>(event: string, callback: EventCallback<T>): void;
  off<T = unknown>(event: string, callback: EventCallback<T>): void;
  emit<T = unknown>(event: string, data: T, ...args: unknown[]): void;
  once<T = unknown>(event: string, callback: EventCallback<T>): void;
}

const EventEmitter = (function (): EventEmitter {
  const listeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * Subscribe to an event
   */
  function on<T = unknown>(event: string, callback: EventCallback<T>): void {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(callback as EventCallback);
  }

  /**
   * Unsubscribe from an event
   */
  function off<T = unknown>(event: string, callback: EventCallback<T>): void {
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback as EventCallback);
      if (eventListeners.size === 0) {
        listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   */
  function emit<T = unknown>(event: string, data: T, ...args: unknown[]): void {
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      // Create a copy to avoid issues if listeners are modified during iteration
      const callbacks = Array.from(eventListeners);
      for (const callback of callbacks) {
        try {
          (callback as EventCallback<T>)(data, ...args);
        } catch (error) {
          logger.error(`Error in event listener for "${event}":`, error);
        }
      }
    }
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first call)
   */
  function once<T = unknown>(event: string, callback: EventCallback<T>): void {
    const onceCallback: EventCallback<T> = (data: T, ...args: unknown[]) => {
      callback(data, ...args);
      off(event, onceCallback);
    };
    on(event, onceCallback);
  }

  return {
    on,
    off,
    emit,
    once,
  };
})();

export default EventEmitter;
