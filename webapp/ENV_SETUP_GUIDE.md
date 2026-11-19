# Environment Setup Guide

This guide explains how to configure environment variables for the Papa Bolotas webapp.

## Quick Start

1. **Copy the template file:**
   ```bash
   cp .env.local.template .env.local
   ```

2. **Edit `.env.local` with your values:**
   - Get Supabase credentials from your project dashboard
   - Set a secure security code
   - Customize app name/version if needed

3. **Verify configuration:**
   ```bash
   npm run dev
   ```
   The app will validate environment variables on startup and display an error if anything is missing.

## Required Environment Variables

### VITE_SUPABASE_URL
- **Description:** Your Supabase project URL
- **Format:** `https://xxxxx.supabase.co`
- **Where to find:** Supabase Dashboard → Project Settings → API → Project URL
- **Example:** `https://abcdefghijklmnop.supabase.co`

### VITE_SUPABASE_ANON_KEY
- **Description:** Your Supabase anonymous/public API key
- **Security:** Safe to expose in client code (protected by Row Level Security)
- **Where to find:** Supabase Dashboard → Project Settings → API → Project API keys → anon public
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### VITE_SECURITY_CODE
- **Description:** Numeric code required for sensitive operations (order cancellation)
- **Security:** Change from default value for production
- **Format:** 4-6 digit number (as string)
- **Example:** `"1234"` (default) → Change to `"8675"` or similar

## Optional Environment Variables

### VITE_APP_NAME
- **Description:** Application name displayed in the UI
- **Default:** `"Papa Bolotas"`
- **Example:** `"Papa Bolotas - Loja Principal"`

### VITE_APP_VERSION
- **Description:** Application version (keep in sync with package.json)
- **Default:** `"0.1.0"`
- **Example:** `"1.0.0"`

### VITE_DEV_MODE
- **Description:** Enable development features (verbose logging, debug tools)
- **Values:** `"true"` or `"false"`
- **Default:** Automatically set based on build mode
- **Example:** `"true"`

### VITE_USE_MOCK_DATA
- **Description:** Use mock data instead of real database (for development)
- **Values:** `"true"` or `"false"`
- **Default:** `"false"`
- **Example:** `"false"`

## Environment Modes

The application supports different environment modes via Vite:

### Development Mode
```bash
npm run dev
# or
npm run build:dev
```
- Source maps enabled
- Verbose logging
- Hot module replacement
- Unminified code

### Production Mode
```bash
npm run build
# or
npm run build:prod
```
- Source maps disabled
- Minified code
- Optimized chunks
- Performance optimizations

## Security Best Practices

### ✅ DO:
- Store actual credentials in `.env.local` (gitignored)
- Use `.env.local.template` as documentation
- Change default security codes for production
- Validate environment variables on app startup
- Use Supabase Row Level Security (RLS) policies
- Set environment variables in hosting platform for production

### ❌ DON'T:
- Commit `.env.local` or any file with actual credentials
- Store service role keys in environment variables (server-side only)
- Use default security codes in production
- Expose sensitive values in client-side code
- Share credentials in chat, email, or documentation

## Environment Variable Validation

The application automatically validates environment variables on startup:

```typescript
import { validateEnvironment } from '@/lib/env';

// Called in main.tsx on app initialization
validateEnvironment();
```

If validation fails, you'll see a clear error message indicating which variable is missing or invalid.

## Type Safety

Environment variables are fully typed in `src/env.d.ts`:

```typescript
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // ... other variables
}
```

Access them with full TypeScript support:

```typescript
import { env } from '@/lib/env';

const url = env.SUPABASE_URL; // Fully typed and validated
```

## Troubleshooting

### Error: "Missing required environment variable"
- Check that `.env.local` exists
- Verify all required variables are set
- Ensure variable names match exactly (including VITE_ prefix)
- Restart dev server after changing `.env.local`

### Error: "Invalid VITE_SUPABASE_URL format"
- URL must start with `https://`
- URL should end with `.supabase.co`
- No trailing slashes
- Example: `https://myproject.supabase.co`

### Environment variables not updating
- Restart the dev server (`npm run dev`)
- Vite loads `.env` files only on startup
- Clear browser cache if values seem cached

### Production deployment not working
- Set environment variables in hosting platform settings
- Netlify: Site Settings → Build & Deploy → Environment
- Vercel: Project Settings → Environment Variables
- Railway: Project → Variables
- Don't commit `.env.local` to version control

## Additional Resources

- [Vite Environment Variables Documentation](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase API Keys Guide](https://supabase.com/docs/guides/api/api-keys)
- [Environment Variables Security Best Practices](https://12factor.net/config)

## Requirements Compliance

This setup implements:
- **Requirement 15.10:** Store sensitive configuration (API keys, database credentials) as environment variables
- **Requirement 17.3:** Authenticate to Supabase using secure API keys

## Support

If you encounter issues:
1. Check this guide thoroughly
2. Verify `.env.local.template` matches your `.env.local`
3. Review browser console for specific error messages
4. Check Supabase dashboard for correct API keys
