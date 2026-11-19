# Environment Setup Guide

This guide explains how to configure environment variables for the Papa Bolotas Webapp.

## Prerequisites

- A Supabase account and project
- Node.js and npm installed

## Setup Steps

### 1. Create Your Environment File

Copy the example environment file to create your local configuration:

```bash
cp .env.example .env.local
```

### 2. Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Project Settings** > **API**
4. Copy the following values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### 3. Configure Your .env.local File

Edit `.env.local` and replace the placeholder values:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Application Configuration
VITE_APP_NAME=Papa Bolotas
VITE_APP_VERSION=0.1.0

# Security Code (for order cancellation, etc.)
VITE_SECURITY_CODE=1234
```

### 4. Verify Configuration

Start the development server:

```bash
npm run dev
```

If environment variables are missing, you'll see a clear error message indicating which variables need to be configured.

## Environment Variables Reference

### Required Variables

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard > Project Settings > API |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key | Supabase Dashboard > Project Settings > API |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_APP_NAME` | Application name | Papa Bolotas |
| `VITE_APP_VERSION` | Application version | 0.1.0 |
| `VITE_SECURITY_CODE` | Security code for sensitive operations | 1234 |

## Security Best Practices

### ✅ DO

- Keep `.env.local` in your `.gitignore` (already configured)
- Use the **anon/public** key in client-side code
- Rotate keys if they are accidentally exposed
- Use different Supabase projects for development and production

### ❌ DON'T

- Never commit `.env.local` to version control
- Never use the **service role** key in client-side code
- Never share your environment files publicly
- Never hardcode credentials in source code

## Build Scripts

The project includes several build scripts for different scenarios:

```bash
# Development server with hot reload
npm run dev

# Type checking without building
npm run type-check

# Production build (uses production environment)
npm run build

# Development build (includes source maps, less minification)
npm run build:dev

# Production build (optimized, no console.log)
npm run build:prod

# Preview production build locally
npm run preview
```

## Deployment

When deploying to a hosting platform (Netlify, Vercel, etc.), configure environment variables in the platform's dashboard:

### Netlify

1. Go to **Site settings** > **Environment variables**
2. Add each variable from your `.env.local`
3. Redeploy your site

### Vercel

1. Go to **Project Settings** > **Environment Variables**
2. Add each variable from your `.env.local`
3. Redeploy your project

### Railway

1. Go to your project
2. Click **Variables** tab
3. Add each variable from your `.env.local`
4. Railway will automatically redeploy

## Troubleshooting

### Error: Missing required environment variable

**Problem**: You see an error like "Missing required environment variable: VITE_SUPABASE_URL"

**Solution**: 
1. Make sure `.env.local` exists in the webapp root directory
2. Check that the variable name is spelled correctly
3. Ensure the variable has a value (not empty)
4. Restart the development server

### Environment variables not updating

**Problem**: Changes to `.env.local` aren't reflected in the app

**Solution**:
1. Stop the development server (Ctrl+C)
2. Restart with `npm run dev`
3. Clear browser cache if needed

### Supabase connection errors

**Problem**: "Invalid API key" or connection errors

**Solution**:
1. Verify your Supabase project URL is correct
2. Check that you're using the **anon** key, not the service role key
3. Ensure your Supabase project is active
4. Check if Row Level Security policies are properly configured

## Additional Resources

- [Vite Environment Variables Documentation](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase JavaScript Client Documentation](https://supabase.com/docs/reference/javascript/introduction)
- [Papa Bolotas Webapp Requirements](../.kiro/specs/papa-bolotas-webapp/requirements.md)
