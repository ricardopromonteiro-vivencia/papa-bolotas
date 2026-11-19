/**
 * Supabase Client Example
 * 
 * This file demonstrates how to initialize the Supabase client using
 * the environment configuration module.
 * 
 * Note: This is an example file. The actual Supabase client will be
 * created in task 2.4 when @supabase/supabase-js is installed.
 */

// Uncomment when @supabase/supabase-js is installed:
// import { createClient } from '@supabase/supabase-js';
import { env } from '@/config';

/**
 * Example: Creating the Supabase client with environment configuration
 * 
 * Usage:
 * ```typescript
 * import { supabase } from '@/lib/supabase';
 * 
 * // Use the client
 * const { data, error } = await supabase
 *   .from('menu_items')
 *   .select('*');
 * ```
 */

// This will be implemented in task 2.4:
// export const supabase = createClient(
//   env.supabase.url,
//   env.supabase.anonKey,
//   {
//     auth: {
//       persistSession: true,
//       autoRefreshToken: true,
//       detectSessionInUrl: true,
//     },
//   }
// );

// For now, export the configuration so it can be used when needed
export const supabaseConfig = {
  url: env.supabase.url,
  anonKey: env.supabase.anonKey,
} as const;

// Log configuration status in development
if (env.isDevelopment) {
  console.log('Supabase configuration ready:', {
    url: supabaseConfig.url,
    keyConfigured: !!supabaseConfig.anonKey,
  });
}
