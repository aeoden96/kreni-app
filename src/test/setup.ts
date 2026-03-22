import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
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
    if (message.includes('Failed to load saved state') || 
        message.includes('Unexpected token')) {
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
