/**
 * Environment Variable Configuration
 * 
 * This module provides type-safe access to environment variables.
 * All environment variables must be prefixed with VITE_ to be exposed to the client.
 * 
 * Security Notes:
 * - Never commit .env.local files to version control
 * - Only use the anon key in client-side code
 * - Service role keys should only be used in server-side operations
 */

interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  app: {
    name: string;
    version: string;
  };
  security: {
    securityCode: string;
  };
  isDevelopment: boolean;
  isProduction: boolean;
}

/**
 * Get an environment variable with validation
 * @param key - The environment variable key
 * @param required - Whether the variable is required (default: true)
 * @returns The environment variable value or undefined if not required
 * @throws Error if required variable is missing
 */
function getEnvVar(key: string, required: boolean = true): string {
  const value = import.meta.env[key];
  
  if (!value && required) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please check your .env.local file or environment configuration.\n` +
      `See .env.example for the required variables.`
    );
  }
  
  return value || '';
}

/**
 * Validate that all required environment variables are present
 * @throws Error if any required variable is missing
 */
function validateEnvironment(): void {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ];
  
  const missingVars = requiredVars.filter(key => !import.meta.env[key]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missingVars.join('\n')}\n\n` +
      `Please create a .env.local file based on .env.example and add the missing variables.`
    );
  }
}

// Validate environment on module load
validateEnvironment();

/**
 * Application environment configuration
 * All environment variables are validated and strongly typed
 */
export const env: EnvironmentConfig = {
  supabase: {
    url: getEnvVar('VITE_SUPABASE_URL'),
    anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY'),
  },
  app: {
    name: getEnvVar('VITE_APP_NAME', false) || 'Papa Bolotas',
    version: getEnvVar('VITE_APP_VERSION', false) || '0.1.0',
  },
  security: {
    securityCode: getEnvVar('VITE_SECURITY_CODE', false) || '1234',
  },
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

// Log configuration in development (without sensitive data)
if (env.isDevelopment) {
  console.log('Environment Configuration:', {
    app: env.app,
    supabase: {
      url: env.supabase.url,
      anonKey: env.supabase.anonKey ? '[CONFIGURED]' : '[MISSING]',
    },
    mode: env.isDevelopment ? 'development' : 'production',
  });
}

export default env;
