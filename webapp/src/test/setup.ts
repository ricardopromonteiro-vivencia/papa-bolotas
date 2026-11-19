/**
 * Test Setup Configuration
 * 
 * Configures the test environment with necessary polyfills and mocks:
 * - fake-indexeddb for IndexedDB testing
 * - jsdom for DOM testing
 * - testing-library matchers
 */

import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Setup test environment variables
process.env.VITE_SUPABASE_URL = 'https://test-project.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.VITE_APP_NAME = 'Papa Bolotas Test';
process.env.VITE_APP_VERSION = '0.1.0';
process.env.VITE_SECURITY_CODE = '1234';

// Polyfill for structuredClone if not available in test environment
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

// Polyfill for pointer capture (needed for Radix UI components)
if (typeof Element.prototype.hasPointerCapture === 'undefined') {
  Element.prototype.hasPointerCapture = function() {
    return false;
  };
}

if (typeof Element.prototype.setPointerCapture === 'undefined') {
  Element.prototype.setPointerCapture = function() {
    // no-op
  };
}

if (typeof Element.prototype.releasePointerCapture === 'undefined') {
  Element.prototype.releasePointerCapture = function() {
    // no-op
  };
}

// Mock console methods to reduce noise in test output
globalThis.console = {
  ...console,
  // Suppress info logs during tests
  info: vi.fn(),
  // Keep error and warn for debugging
  error: console.error,
  warn: console.warn,
};
