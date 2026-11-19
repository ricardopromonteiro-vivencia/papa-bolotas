/// <reference types="vite/client" />

/**
 * Environment Variables Type Definitions
 * 
 * This file provides TypeScript type safety for environment variables
 * used throughout the application. All variables must be prefixed with
 * VITE_ to be accessible in the client code.
 * 
 * Requirements:
 * - Requirement 15.10: Store sensitive configuration as environment variables
 * - Requirement 17.3: Authenticate to Supabase using secure API keys
 */

interface ImportMetaEnv {
  // Supabase Configuration (Required)
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  
  // Application Configuration
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  
  // Security Configuration (Required)
  readonly VITE_SECURITY_CODE: string;
  
  // Development Configuration (Optional)
  readonly VITE_DEV_MODE?: string;
  readonly VITE_USE_MOCK_DATA?: string;
  
  // Vite Built-in Variables
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
