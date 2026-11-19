/**
 * Supabase Client Configuration
 * 
 * This module initializes and exports the Supabase client instance
 * configured for the Papa Bolotas application with authentication,
 * real-time subscriptions, and connection health monitoring.
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/config';

/**
 * Supabase client options configured for optimal PWA behavior
 */
const supabaseOptions = {
  auth: {
    // Persist authentication session in browser storage
    persistSession: true,
    // Automatically refresh expired tokens
    autoRefreshToken: true,
    // Detect authentication from URL (for OAuth flows if implemented later)
    detectSessionInUrl: true,
    // Store session in localStorage (survives page reloads)
    storage: window.localStorage,
    // Flow type for authentication (PKCE is more secure for web apps)
    flowType: 'pkce' as const,
  },
  realtime: {
    // Enable real-time subscriptions for multi-device sync
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'x-application-name': env.app.name,
      'x-application-version': env.app.version,
    },
  },
  db: {
    // Database schema (default is 'public')
    schema: 'public',
  },
};

/**
 * Supabase client instance
 * 
 * Use this client throughout the application for:
 * - Database queries
 * - Authentication operations
 * - Real-time subscriptions
 * - Storage operations
 * 
 * @example
 * ```typescript
 * import { supabase } from '@/lib/supabase';
 * 
 * // Query data
 * const { data, error } = await supabase
 *   .from('menu_items')
 *   .select('*');
 * 
 * // Authenticate
 * const { data, error } = await supabase.auth.signInWithPassword({
 *   email: 'user@example.com',
 *   password: 'password123'
 * });
 * 
 * // Subscribe to real-time changes
 * const channel = supabase
 *   .channel('menu-changes')
 *   .on('postgres_changes', 
 *     { event: '*', schema: 'public', table: 'menu_items' },
 *     (payload) => console.log('Change received!', payload)
 *   )
 *   .subscribe();
 * ```
 */
export const supabase = createClient(
  env.supabase.url,
  env.supabase.anonKey,
  supabaseOptions
);

/**
 * Check if Supabase client is properly configured
 * @returns true if URL and anon key are configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(env.supabase.url && env.supabase.anonKey);
}

/**
 * Connection health check utility
 * 
 * Performs a lightweight query to verify database connectivity
 * 
 * @returns Promise resolving to health check result
 */
export async function checkConnection(): Promise<{
  isConnected: boolean;
  latency: number | null;
  error: Error | null;
}> {
  if (!isSupabaseConfigured()) {
    return {
      isConnected: false,
      latency: null,
      error: new Error('Supabase client not configured'),
    };
  }

  const startTime = performance.now();

  try {
    // Perform a lightweight query to check connectivity
    // Using a simple query that doesn't require authentication
    const { error } = await supabase
      .from('menu_items')
      .select('id')
      .limit(1)
      .single();

    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    // Note: error might be null or indicate "no rows returned"
    // We consider the connection successful if we got a response
    const isConnected = true;

    return {
      isConnected,
      latency,
      error: error && error.code !== 'PGRST116' ? new Error(error.message) : null,
    };
  } catch (error) {
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    return {
      isConnected: false,
      latency,
      error: error instanceof Error ? error : new Error('Unknown connection error'),
    };
  }
}

/**
 * Check authentication status
 * @returns Promise resolving to current session or null
 */
export async function checkAuth() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      throw error;
    }
    
    return session;
  } catch (error) {
    console.error('Error checking auth status:', error);
    return null;
  }
}

/**
 * Monitor connection health periodically
 * 
 * @param intervalMs - Check interval in milliseconds (default: 30000 = 30s)
 * @param onStatusChange - Callback when connection status changes
 * @returns Cleanup function to stop monitoring
 */
export function monitorConnection(
  intervalMs: number = 30000,
  onStatusChange?: (status: { isConnected: boolean; latency: number | null }) => void
): () => void {
  let lastStatus = true; // Assume connected initially
  
  const checkHealth = async () => {
    const result = await checkConnection();
    
    // Only notify on status change
    if (result.isConnected !== lastStatus) {
      lastStatus = result.isConnected;
      onStatusChange?.({
        isConnected: result.isConnected,
        latency: result.latency,
      });
    }
  };
  
  // Perform initial check
  checkHealth();
  
  // Set up periodic checks
  const intervalId = window.setInterval(checkHealth, intervalMs);
  
  // Return cleanup function
  return () => {
    window.clearInterval(intervalId);
  };
}

// Log initialization in development
if (env.isDevelopment) {
  console.log('Supabase client initialized:', {
    url: env.supabase.url,
    configured: isSupabaseConfigured(),
    realtime: 'enabled',
    auth: 'enabled with session persistence',
  });
}

export default supabase;
