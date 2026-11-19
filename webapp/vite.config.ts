import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

/**
 * Vite Configuration for Papa Bolotas Webapp
 * 
 * This configuration handles:
 * - Environment variable loading (Requirement 15.10)
 * - Development and production build modes
 * - PWA configuration for offline support
 * - Path aliases for clean imports
 * 
 * Environment Variables:
 * - All client-side env vars must be prefixed with VITE_
 * - Configured in .env.local (see .env.local.template)
 * - Requirement 17.3: Secure API keys for Supabase authentication
 */

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load environment variables based on current mode
  // This allows different configurations for development, staging, production
  const env = loadEnv(mode, process.cwd(), '');
  
  // Log build mode for debugging
  console.log(`🚀 Building for: ${mode}`);
  console.log(`📦 Command: ${command}`);

  return {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon-32x32.png',
        'favicon-16x16.png',
        'apple-touch-icon.png',
        'robots.txt',
        'icon.svg'
      ],
      manifest: {
        name: 'Papa Bolotas POS',
        short_name: 'Papa Bolotas',
        description: 'Papa Bolotas Point of Sale System - Offline-first restaurant management application',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'any',
        categories: ['business', 'productivity', 'finance'],
        lang: 'pt-PT',
        dir: 'ltr',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-192x192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icon-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Cache static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}'],
        // Increase maximum file size for caching
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        // Runtime caching strategies
        runtimeCaching: [
          // Supabase API - NetworkFirst strategy for real-time data with offline fallback
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Google Fonts - CacheFirst for performance
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Images - CacheFirst for static assets
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // CSS and JS - StaleWhileRevalidate for balance between freshness and performance
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        // Navigation fallback - serve app shell for offline navigation
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
        // Clean up old caches
        cleanupOutdatedCaches: true,
        // Skip waiting - activate new service worker immediately
        skipWaiting: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  // Environment variable configuration
  envPrefix: 'VITE_', // Only expose variables with VITE_ prefix to client
  
  // Build configuration
  build: {
    // Output directory
    outDir: 'dist',
    
    // Generate source maps for debugging in production
    sourcemap: mode === 'production' ? false : true,
    
    // Minify for production
    minify: mode === 'production' ? 'esbuild' : false,
    
    // Target modern browsers for smaller bundle size
    target: 'esnext',
    
    // Asset size warnings
    chunkSizeWarningLimit: 1000,
    
    // Rollup options for optimization
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'db-vendor': ['dexie'],
          'ui-vendor': ['lucide-react', 'date-fns'],
        },
      },
    },
  },
  
  // Development server configuration
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    open: false,
  },
  
  // Preview server configuration (for testing production builds)
  preview: {
    port: 4173,
    strictPort: false,
    host: true,
    open: false,
  },
}
})
