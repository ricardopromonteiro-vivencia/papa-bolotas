/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * Type definitions for Vite environment variables
 * This provides TypeScript autocomplete and type checking for import.meta.env
 */

interface ImportMetaEnv {
  // Supabase Configuration
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  
  // Application Configuration
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_VERSION?: string;
  
  // Security
  readonly VITE_SECURITY_CODE?: string;
  
  // Vite built-in variables
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
