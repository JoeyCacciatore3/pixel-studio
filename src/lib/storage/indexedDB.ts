/**
 * IndexedDB Storage Module
 * Provides persistent storage for project data, history, and settings
 */

import { logger } from '../utils/logger';

const DB_NAME = 'PixelStudioDB';
const DB_VERSION = 1;

interface DBSchema {
  projects: {
    key: string; // project ID
    value: {
      id: string;
      name: string;
      data: unknown; // Project state
      createdAt: number;
      updatedAt: number;
    };
  };
  history: {
    key: string; // history entry ID
    value: {
      id: string;
      projectId: string;
      index: number;
      compressed: ArrayBuffer;
      timestamp: number;
    };
  };
  settings: {
    key: string; // setting key
    value: {
      key: string;
      value: unknown;
    };
  };
}

class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        const error = new Error('IndexedDB is required but not supported in this environment');
        reject(error);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        const error = request.error || new Error('Failed to open IndexedDB');
        // IndexedDB is required - reject on error, no graceful degradation
        reject(error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        // Handle database errors
        this.db.onerror = (event) => {
          logger.error('IndexedDB error:', event);
        };
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id' });
          historyStore.createIndex('projectId', 'projectId', { unique: false });
          historyStore.createIndex('index', 'index', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Save project data
   */
  async saveProject(projectId: string, name: string, data: unknown): Promise<void> {
    try {
      await this.init();
    } catch (error) {
      logger.warn('IndexedDB initialization failed, project save skipped:', error);
      return; // Degrade gracefully
    }

    if (!this.db) {
      logger.warn('Database not available, project save skipped');
      return; // Degrade gracefully instead of throwing
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');

      const project = {
        id: projectId,
        name,
        data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const request = store.put(project);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        logger.warn('Failed to save project, operation skipped:', request.error);
        resolve(); // Resolve gracefully instead of rejecting
      };
    });
  }

  /**
   * Load project data
   */
  async loadProject(projectId: string): Promise<{ name: string; data: unknown } | null> {
    try {
      await this.init();
    } catch (error) {
      logger.warn('IndexedDB initialization failed, project load skipped:', error);
      return null; // Degrade gracefully
    }

    if (!this.db) {
      logger.warn('Database not available, project load skipped');
      return null; // Degrade gracefully instead of throwing
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const request = store.get(projectId);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve({
            name: result.name,
            data: result.data,
          });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        logger.warn('Failed to load project, operation skipped:', request.error);
        resolve(null); // Resolve gracefully instead of rejecting
      };
    });
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<Array<{ id: string; name: string; updatedAt: number }>> {
    try {
      await this.init();
    } catch (error) {
      logger.warn('IndexedDB initialization failed, list projects skipped:', error);
      return []; // Degrade gracefully
    }

    if (!this.db) {
      logger.warn('Database not available, list projects skipped');
      return []; // Degrade gracefully instead of throwing
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const index = store.index('updatedAt');
      const request = index.getAll();

      request.onsuccess = () => {
        const results = request.result.map((project: DBSchema['projects']['value']) => ({
          id: project.id,
          name: project.name,
          updatedAt: project.updatedAt,
        }));
        resolve(results);
      };

      request.onerror = () => {
        logger.warn('Failed to list projects, operation skipped:', request.error);
        resolve([]); // Resolve gracefully instead of rejecting
      };
    });
  }

  /**
   * Save history entry
   */
  async saveHistoryEntry(
    projectId: string,
    index: number,
    compressed: ArrayBuffer
  ): Promise<string | null> {
    try {
      await this.init();
    } catch (error) {
      logger.warn('IndexedDB initialization failed, history entry save skipped:', error);
      return null; // Degrade gracefully
    }

    if (!this.db) {
      logger.warn('Database not available, history entry save skipped');
      return null; // Degrade gracefully instead of throwing
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['history'], 'readwrite');
      const store = transaction.objectStore('history');

      const entryId = `history-${projectId}-${index}-${Date.now()}`;
      const entry = {
        id: entryId,
        projectId,
        index,
        compressed,
        timestamp: Date.now(),
      };

      const request = store.put(entry);

      request.onsuccess = () => resolve(entryId);
      request.onerror = () => {
        logger.warn('Failed to save history entry, operation skipped:', request.error);
        resolve(null); // Resolve gracefully instead of rejecting
      };
    });
  }

  /**
   * Load history entry by ID
   */
  async loadHistoryEntry(entryId: string): Promise<ArrayBuffer | null> {
    try {
      await this.init();
    } catch (error) {
      logger.warn('IndexedDB initialization failed, history entry load skipped:', error);
      return null; // Degrade gracefully
    }

    if (!this.db) {
      logger.warn('Database not available, history entry load skipped');
      return null; // Degrade gracefully instead of throwing
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['history'], 'readonly');
      const store = transaction.objectStore('history');
      const request = store.get(entryId);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve(result.compressed);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        logger.warn('Failed to load history entry, operation skipped:', request.error);
        resolve(null); // Resolve gracefully instead of rejecting
      };
    });
  }

  /**
   * Load history entry by project ID and index
   */
  async loadHistoryEntryByIndex(projectId: string, index: number): Promise<ArrayBuffer | null> {
    try {
      await this.init();
    } catch (error) {
      logger.warn('IndexedDB initialization failed, history entry load skipped:', error);
      return null; // Degrade gracefully
    }

    if (!this.db) {
      logger.warn('Database not available, history entry load skipped');
      return null; // Degrade gracefully instead of throwing
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['history'], 'readonly');
      const store = transaction.objectStore('history');
      const index_store = store.index('projectId');
      const request = index_store.getAll(projectId);

      request.onsuccess = () => {
        const results = request.result;
        // Find entry with matching index
        const entry = results.find(
          (result: DBSchema['history']['value']) => result.index === index
        );
        if (entry) {
          resolve(entry.compressed);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        logger.warn('Failed to load history entry by index, operation skipped:', request.error);
        resolve(null); // Resolve gracefully instead of rejecting
      };
    });
  }

  /**
   * Clear history entries for a project
   */
  async clearHistory(projectId: string): Promise<void> {
    try {
      await this.init();
    } catch (error) {
      logger.warn('IndexedDB initialization failed, clear history skipped:', error);
      return; // Degrade gracefully
    }

    if (!this.db) {
      logger.warn('Database not available, clear history skipped');
      return; // Degrade gracefully instead of throwing
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['history'], 'readwrite');
      const store = transaction.objectStore('history');
      const index = store.index('projectId');
      const request = index.openKeyCursor(IDBKeyRange.only(projectId));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        logger.warn('Failed to clear history, operation skipped:', request.error);
        resolve(); // Resolve gracefully instead of rejecting
      };
    });
  }

  /**
   * Save setting
   */
  async saveSetting(key: string, value: unknown): Promise<void> {
    try {
      await this.init();
    } catch (error) {
      logger.warn('IndexedDB initialization failed, save setting skipped:', error);
      return; // Degrade gracefully
    }

    if (!this.db) {
      logger.warn('Database not available, save setting skipped');
      return; // Degrade gracefully instead of throwing
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');

      const setting = { key, value };
      const request = store.put(setting);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        logger.warn('Failed to save setting, operation skipped:', request.error);
        resolve(); // Resolve gracefully instead of rejecting
      };
    });
  }

  /**
   * Load setting
   */
  async loadSetting(key: string): Promise<unknown | null> {
    try {
      await this.init();
    } catch (error) {
      logger.warn('IndexedDB initialization failed, load setting skipped:', error);
      return null; // Degrade gracefully
    }

    if (!this.db) {
      logger.warn('Database not available, load setting skipped');
      return null; // Degrade gracefully instead of throwing
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve(result.value);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        logger.warn('Failed to load setting, operation skipped:', request.error);
        resolve(null); // Resolve gracefully instead of rejecting
      };
    });
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      await this.init();
    } catch (error) {
      logger.warn('IndexedDB initialization failed, delete project skipped:', error);
      return; // Degrade gracefully
    }

    if (!this.db) {
      logger.warn('Database not available, delete project skipped');
      return; // Degrade gracefully instead of throwing
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['projects', 'history'], 'readwrite');
      const projectStore = transaction.objectStore('projects');
      const historyStore = transaction.objectStore('history');
      const historyIndex = historyStore.index('projectId');

      // Delete project
      projectStore.delete(projectId);

      // Delete associated history
      const deleteHistoryRequest = historyIndex.openKeyCursor(IDBKeyRange.only(projectId));
      deleteHistoryRequest.onsuccess = () => {
        const cursor = deleteHistoryRequest.result;
        if (cursor) {
          historyStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        logger.warn('Failed to delete project, operation skipped:', transaction.error);
        resolve(); // Resolve gracefully instead of rejecting
      };
    });
  }
}

// Singleton instance
const indexedDBStorage = new IndexedDBStorage();

export default indexedDBStorage;
