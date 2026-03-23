import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    clear: vi.fn(() => {
      store = {};
    }),
    getItem: vi.fn((key: string) => store[key] || null),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query: string) => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  })),
  writable: true,
});

// Suppress console.error for expected errors in tests
const originalError = console.error;
beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();

  // Suppress console.error for expected JSON parse errors
  console.error = vi.fn((...args) => {
    const message = args[0]?.toString() || '';
    // Only suppress errors related to localStorage/JSON parsing
    if (message.includes('Failed to load saved state') || message.includes('Unexpected token')) {
      return;
    }
    // Log other errors normally
    originalError(...args);
  });
});

afterEach(() => {
  // Restore console.error after each test
  console.error = originalError;
});
