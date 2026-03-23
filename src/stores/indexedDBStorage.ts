/**
 * IndexedDB storage adapter for Zustand persist middleware
 * Uses idb-keyval for simple key-value storage with better quota than localStorage
 */

import type { StateStorage } from 'zustand/middleware';

import { del, get, set } from 'idb-keyval';

export const indexedDBStorage: StateStorage = {
  getItem: async (name: string): Promise<null | string> => {
    try {
      const value = await get(name);
      return value ?? null;
    } catch (error) {
      console.warn('Failed to read from IndexedDB:', error);
      return null;
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await del(name);
    } catch (error) {
      console.warn('Failed to remove from IndexedDB:', error);
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await set(name, value);
    } catch (error) {
      // Handle quota exceeded or other errors gracefully
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('IndexedDB quota exceeded, cannot cache data:', error);
      } else {
        console.warn('Failed to write to IndexedDB:', error);
      }
    }
  },
};
