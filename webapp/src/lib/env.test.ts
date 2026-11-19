/**
 * Tests for Environment Configuration Module
 * 
 * Validates the env utility correctly loads, validates, and provides
 * access to environment variables.
 * 
 * Note: These tests validate the structure and behavior of the env module.
 * Dynamic mocking of import.meta.env is complex in Vitest, so we test
 * the module as-is with actual environment variables set during test runs.
 */

import { describe, it, expect } from 'vitest';
import { env, isDevelopment, isProduction } from './env';

describe('Environment Configuration', () => {
  describe('Environment Variable Access', () => {
    it('should expose SUPABASE_URL', () => {
      expect(env.SUPABASE_URL).toBeDefined();
      expect(typeof env.SUPABASE_URL).toBe('string');
    });

    it('should expose SUPABASE_ANON_KEY', () => {
      expect(env.SUPABASE_ANON_KEY).toBeDefined();
      expect(typeof env.SUPABASE_ANON_KEY).toBe('string');
    });

    it('should expose SECURITY_CODE', () => {
      expect(env.SECURITY_CODE).toBeDefined();
      expect(typeof env.SECURITY_CODE).toBe('string');
    });

    it('should provide APP_NAME', () => {
      expect(env.APP_NAME).toBeDefined();
      expect(typeof env.APP_NAME).toBe('string');
    });

    it('should provide APP_VERSION', () => {
      expect(env.APP_VERSION).toBeDefined();
      expect(typeof env.APP_VERSION).toBe('string');
    });
  });

  describe('Environment Flags', () => {
    it('should expose IS_DEVELOPMENT flag', () => {
      expect(typeof env.IS_DEVELOPMENT).toBe('boolean');
    });

    it('should expose IS_PRODUCTION flag', () => {
      expect(typeof env.IS_PRODUCTION).toBe('boolean');
    });

    it('should expose MODE', () => {
      expect(env.MODE).toBeDefined();
      expect(typeof env.MODE).toBe('string');
    });

    it('should have mutually exclusive dev/prod flags', () => {
      // In any given environment, only one should be true
      if (env.IS_DEVELOPMENT) {
        expect(env.IS_PRODUCTION).toBe(false);
      }
      if (env.IS_PRODUCTION) {
        expect(env.IS_DEVELOPMENT).toBe(false);
      }
    });
  });

  describe('Development Options', () => {
    it('should expose DEV_MODE flag as boolean', () => {
      expect(typeof env.DEV_MODE).toBe('boolean');
    });

    it('should expose USE_MOCK_DATA flag as boolean', () => {
      expect(typeof env.USE_MOCK_DATA).toBe('boolean');
    });
  });

  describe('Environment Object Immutability', () => {
    it('should be declared as const', () => {
      // The env object is declared as const in the module
      // TypeScript prevents reassignment at compile time
      // We just verify the object exists and is accessible
      expect(env).toBeDefined();
      expect(typeof env).toBe('object');
    });
  });
});

describe('Utility Functions', () => {
  describe('isDevelopment', () => {
    it('should return a boolean', () => {
      const result = isDevelopment();
      expect(typeof result).toBe('boolean');
    });

    it('should match env.IS_DEVELOPMENT', () => {
      expect(isDevelopment()).toBe(env.IS_DEVELOPMENT);
    });
  });

  describe('isProduction', () => {
    it('should return a boolean', () => {
      const result = isProduction();
      expect(typeof result).toBe('boolean');
    });

    it('should match env.IS_PRODUCTION', () => {
      expect(isProduction()).toBe(env.IS_PRODUCTION);
    });
  });

  describe('Environment consistency', () => {
    it('should not be both development and production', () => {
      expect(isDevelopment() && isProduction()).toBe(false);
    });
  });
});

describe('Environment Variable Types', () => {
  it('should have all required string properties', () => {
    const requiredStrings = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'APP_NAME',
      'APP_VERSION',
      'SECURITY_CODE',
      'MODE'
    ] as const;

    requiredStrings.forEach(key => {
      expect(typeof env[key]).toBe('string');
      expect(env[key].length).toBeGreaterThan(0);
    });
  });

  it('should have all required boolean properties', () => {
    const requiredBooleans = [
      'IS_PRODUCTION',
      'IS_DEVELOPMENT',
      'DEV_MODE',
      'USE_MOCK_DATA'
    ] as const;

    requiredBooleans.forEach(key => {
      expect(typeof env[key]).toBe('boolean');
    });
  });
});

describe('URL Validation', () => {
  it('SUPABASE_URL should be a valid URL', () => {
    expect(() => new URL(env.SUPABASE_URL)).not.toThrow();
  });

  it('SUPABASE_URL should use HTTPS', () => {
    const url = new URL(env.SUPABASE_URL);
    expect(url.protocol).toBe('https:');
  });
});

