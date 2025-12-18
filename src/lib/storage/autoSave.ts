/**
 * Auto-Save Module
 * Automatically saves project state to IndexedDB
 */

import indexedDBStorage from './indexedDB';
import PixelStudio from '../app';
import History from '../history';
import type { AppState } from '../types';
import { logger } from '../utils/logger';
import { AUTO_SAVE_INTERVAL, MIN_SAVE_INTERVAL } from '../constants';
const SIGNIFICANT_CHANGE_EVENTS = [
  'history:save',
  'layers:create',
  'layers:delete',
  'layers:update',
];

class AutoSave {
  private projectId: string | null = null;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private lastSaveTime = 0;
  private isSaving = false;
  private savePromise: Promise<void> | null = null;
  private historyListeners: Array<{ event: string; handler: () => void }> = [];
  private layerListeners: Array<{ event: string; handler: () => void }> = [];

  /**
   * Initialize auto-save for a project
   */
  async init(projectId: string): Promise<void> {
    // Cleanup existing listeners and timers if already initialized
    // This prevents listener accumulation if init() is called multiple times
    if (this.projectId !== null) {
      this.cleanupChangeListeners();
      if (this.autoSaveTimer) {
        clearInterval(this.autoSaveTimer);
        this.autoSaveTimer = null;
      }
    }

    this.projectId = projectId;
    await indexedDBStorage.init();

    // Start auto-save timer
    this.startAutoSave();

    // Listen for significant changes to trigger immediate save
    this.setupChangeListeners();
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      this.save();
    }, AUTO_SAVE_INTERVAL);
  }

  /**
   * Setup listeners for significant changes
   */
  private setupChangeListeners(): void {
    // Listen to history events
    if (History.on) {
      for (const event of SIGNIFICANT_CHANGE_EVENTS) {
        if (event.startsWith('history:')) {
          const handler = () => {
            // Debounce: only save if last save was more than MIN_SAVE_INTERVAL ago
            if (Date.now() - this.lastSaveTime > MIN_SAVE_INTERVAL) {
              this.save();
            }
          };
          History.on(event, handler);
          this.historyListeners.push({ event, handler });
        }
      }
    }

    // Listen to layer events
    const layersModule = PixelStudio.getLayers();
    if (layersModule && layersModule.on) {
      for (const event of SIGNIFICANT_CHANGE_EVENTS) {
        if (event.startsWith('layers:')) {
          const handler = () => {
            // Debounce: only save if last save was more than MIN_SAVE_INTERVAL ago
            if (Date.now() - this.lastSaveTime > MIN_SAVE_INTERVAL) {
              this.save();
            }
          };
          layersModule.on(event, handler);
          this.layerListeners.push({ event, handler });
        }
      }
    }
  }

  /**
   * Cleanup all event listeners
   */
  private cleanupChangeListeners(): void {
    // Remove all history listeners
    if (History.off) {
      this.historyListeners.forEach(({ event, handler }) => {
        History.off(event, handler);
      });
      this.historyListeners = [];
    }

    // Remove all layer listeners
    const layersModule = PixelStudio.getLayers();
    if (layersModule && layersModule.off) {
      this.layerListeners.forEach(({ event, handler }) => {
        layersModule.off(event, handler);
      });
      this.layerListeners = [];
    }
  }

  /**
   * Save current project state
   * Prevents race conditions by queueing saves and ensuring only one save operation runs at a time
   */
  async save(): Promise<void> {
    if (!this.projectId) {
      return;
    }

    // If already saving, wait for the current save to complete
    // This prevents race conditions when save() is called rapidly
    if (this.savePromise) {
      return this.savePromise;
    }

    // Create new save promise
    this.savePromise = (async () => {
      // Double-check isSaving flag after promise creation
      if (this.isSaving) {
        return;
      }

      this.isSaving = true;

      try {
        const state = PixelStudio.getState();
        if (!state) {
          return;
        }

        // Serialize project data
        const projectData = {
          state: state as AppState,
          historyIndex: History.getIndex(),
          historyLength: History.getLength(),
        };

        // Save to IndexedDB
        await indexedDBStorage.saveProject(
          this.projectId!,
          'Untitled Project', // Could be made configurable
          projectData
        );

        this.lastSaveTime = Date.now();
      } catch (error) {
        logger.error('Auto-save failed:', error);
      } finally {
        this.isSaving = false;
        this.savePromise = null;
      }
    })();

    return this.savePromise;
  }

  /**
   * Load project state
   */
  async load(
    projectId: string
  ): Promise<{ state: AppState; historyIndex: number; historyLength: number } | null> {
    try {
      const project = await indexedDBStorage.loadProject(projectId);
      if (!project) {
        return null;
      }

      const projectData = project.data as {
        state: AppState;
        historyIndex: number;
        historyLength: number;
      };

      return projectData;
    } catch (error) {
      logger.error('Failed to load project:', error);
      return null;
    }
  }

  /**
   * Stop auto-save
   */
  stop(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    this.cleanupChangeListeners(); // Cleanup event listeners
    this.projectId = null;
  }

  /**
   * Get last save time
   */
  getLastSaveTime(): number {
    return this.lastSaveTime;
  }
}

// Singleton instance
const autoSave = new AutoSave();

export default autoSave;
