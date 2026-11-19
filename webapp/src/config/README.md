# Configuration Module

This module provides centralized, type-safe access to environment variables and application configuration.

## Usage

### Importing Configuration

```typescript
// Import the entire config object
import { env } from '@/config';

// Or import from the module directly
import { env } from '@/config/env';
```

### Accessing Values

```typescript
// Supabase configuration
const supabaseUrl = env.supabase.url;
const supabaseKey = env.supabase.anonKey;

// Application configuration
const appName = env.app.name;
const appVersion = env.app.version;

// Security configuration
const securityCode = env.security.securityCode;

// Environment detection
if (env.isDevelopment) {
  console.log('Running in development mode');
}

if (env.isProduction) {
  console.log('Running in production mode');
}
```

### Example: Setting up Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config';

// Create Supabase client with environment configuration
export const supabase = createClient(
  env.supabase.url,
  env.supabase.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
```

### Example: Conditional Logic Based on Environment

```typescript
import { env } from '@/config';

function logDebugInfo(message: string, data?: any) {
  // Only log debug info in development
  if (env.isDevelopment) {
    console.log(`[DEBUG] ${message}`, data);
  }
}

function getApiUrl() {
  // Use different URLs based on environment
  return env.isProduction
    ? 'https://api.papabolotas.com'
    : 'http://localhost:3000';
}
```

## Type Safety

All environment variables are strongly typed through the `EnvironmentConfig` interface:

```typescript
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
```

TypeScript will provide autocomplete and type checking when accessing these values.

## Validation

The configuration module automatically validates that all required environment variables are present when the application starts. If any required variable is missing, a helpful error message is displayed:

```
Missing required environment variables:
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

Please create a .env.local file based on .env.example and add the missing variables.
```

## Environment Files

- `.env.example` - Template with all available variables (committed to git)
- `.env.local` - Your local configuration (gitignored, never commit)
- `.env.production` - Production-specific values (optional)
- `.env.development` - Development-specific values (optional)

## Security Best Practices

1. **Never commit sensitive values**: The `.env.local` file is gitignored. Keep it that way!

2. **Use appropriate keys**: 
   - ✅ Client-side: Use `VITE_SUPABASE_ANON_KEY` (anon/public key)
   - ❌ Client-side: Never use service role keys

3. **Validate input**: The config module validates required variables on startup

4. **Environment-specific logic**: Use `env.isDevelopment` and `env.isProduction` for environment-specific behavior

5. **Rotate keys if exposed**: If you accidentally commit a key, rotate it immediately in your Supabase dashboard

## Adding New Environment Variables

To add a new environment variable:

1. Add it to `.env.example` with a placeholder value
2. Add it to your `.env.local` with the actual value
3. Add the type to `ImportMetaEnv` in `src/vite-env.d.ts`
4. Add it to the `EnvironmentConfig` interface in `env.ts`
5. Add the getter in the `env` object
6. Update this README with usage examples

Example:

```typescript
// 1. In .env.example
VITE_MY_NEW_VAR=example-value

// 2. In src/vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_MY_NEW_VAR: string;
  // ... other vars
}

// 3. In env.ts
interface EnvironmentConfig {
  myFeature: {
    newVar: string;
  };
  // ... other config
}

export const env: EnvironmentConfig = {
  myFeature: {
    newVar: getEnvVar('VITE_MY_NEW_VAR'),
  },
  // ... other config
};
```

## Troubleshooting

### Variables not updating

If changes to environment variables aren't reflected:

1. Stop the dev server
2. Clear any caches
3. Restart the dev server
4. Hard refresh the browser (Ctrl+Shift+R)

### Build errors

If you see build errors related to environment variables:

1. Make sure all required variables are set
2. Check for typos in variable names
3. Ensure variables are prefixed with `VITE_`
4. Verify `.env.local` is in the correct directory

## See Also

- [ENV_SETUP.md](../../ENV_SETUP.md) - Detailed setup guide
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Requirements 15.10, 17.3](../../.kiro/specs/papa-bolotas-webapp/requirements.md)
