/**
 * Environment Configuration Module
 * 
 * Provides type-safe access to environment variables with validation.
 * Implements requirements for secure configuration management.
 * 
 * Requirements:
 * - Requirement 15.10: Store sensitive configuration as environment variables
 * - Requirement 17.3: Authenticate to Supabase using secure API keys
 * 
 * Usage:
 * ```typescript
 * import { env } from '@/lib/env';
 * 
 * const supabaseUrl = env.SUPABASE_URL;
 * const isProduction = env.IS_PRODUCTION;
 * ```
 */

/**
 * Validates that a required environment variable is set
 * @throws Error if the variable is missing
 */
function requireEnv(key: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please check your .env.local file and ensure it's properly configured.\n` +
      `See .env.local.template for required variables.`
    );
  }
  return value;
}

/**
 * Validates Supabase URL format
 */
function validateSupabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('.supabase.co')) {
      console.warn('Supabase URL does not match expected format (*.supabase.co)');
    }
    return url;
  } catch {
    throw new Error(
      `Invalid VITE_SUPABASE_URL format: ${url}\n` +
      `Expected format: https://your-project-id.supabase.co`
    );
  }
}

/**
 * Application environment configuration
 * All values are validated on module load to fail fast if misconfigured
 */
export const env = {
  // Supabase Configuration
  SUPABASE_URL: validateSupabaseUrl(
    requireEnv('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL)
  ),
  SUPABASE_ANON_KEY: requireEnv(
    'VITE_SUPABASE_ANON_KEY',
    import.meta.env.VITE_SUPABASE_ANON_KEY
  ),

  // Application Configuration
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Papa Bolotas',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '0.1.0',

  // Security Configuration
  SECURITY_CODE: requireEnv(
    'VITE_SECURITY_CODE',
    import.meta.env.VITE_SECURITY_CODE
  ),

  // Environment Flags
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
  MODE: import.meta.env.MODE,

  // Development Options
  DEV_MODE: import.meta.env.VITE_DEV_MODE === 'true',
  USE_MOCK_DATA: import.meta.env.VITE_USE_MOCK_DATA === 'true',
} as const;

/**
 * Runtime environment check utility
 * Useful for conditional logic based on environment
 */
export const isDevelopment = () => env.IS_DEVELOPMENT;
export const isProduction = () => env.IS_PRODUCTION;

/**
 * Logs environment configuration on app startup (safe values only)
 * Never logs sensitive values like API keys or security codes
 */
export function logEnvironmentInfo(): void {
  if (isDevelopment()) {
    console.group('🔧 Environment Configuration');
    console.log('Mode:', env.MODE);
    console.log('App Name:', env.APP_NAME);
    console.log('App Version:', env.APP_VERSION);
    console.log('Supabase URL:', env.SUPABASE_URL);
    console.log('Supabase Key:', env.SUPABASE_ANON_KEY.substring(0, 20) + '...');
    console.log('Dev Mode:', env.DEV_MODE);
    console.log('Mock Data:', env.USE_MOCK_DATA);
    console.groupEnd();
  }
}

/**
 * Validates that all required environment variables are properly configured
 * Call this early in app initialization to fail fast on misconfiguration
 */
export function validateEnvironment(): void {
  try {
    // Access all required variables to trigger validation
    const required = [
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY,
      env.SECURITY_CODE,
    ];

    if (required.some(value => !value)) {
      throw new Error('Environment validation failed');
    }

    if (isDevelopment()) {
      console.log('✅ Environment validation passed');
    }
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    throw error;
  }
}
