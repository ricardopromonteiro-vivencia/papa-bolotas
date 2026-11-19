# PWA Icons

## ✅ Completed

All required icon files have been successfully generated for the PWA!

## Generated Icons

The following icons are automatically generated from `icon.svg`:

1. ✅ **icon-192x192.png** - 192x192 pixels PNG icon
2. ✅ **icon-512x512.png** - 512x512 pixels PNG icon
3. ✅ **icon-192x192-maskable.png** - 192x192 pixels maskable PNG icon (with safe zone padding)
4. ✅ **icon-512x512-maskable.png** - 512x512 pixels maskable PNG icon (with safe zone padding)
5. ✅ **apple-touch-icon.png** - 180x180 pixels PNG icon for iOS
6. ✅ **favicon-32x32.png** - 32x32 pixels favicon
7. ✅ **favicon-16x16.png** - 16x16 pixels favicon

## Design Guidelines

The icons follow these design principles:

- Papa Bolotas branding colors (#2563eb blue)
- "PB" initials with clean typography
- Maskable icons include 20% padding for safe zone compliance
- Solid background color for maximum compatibility
- High contrast for visibility on various backgrounds

## Regenerating Icons

If you need to regenerate the icons (e.g., after updating `icon.svg`):

```bash
npm run generate-icons
```

This script uses Sharp to convert the SVG into all required PNG formats with proper sizing and padding for maskable icons.

## Maskable Icons

Maskable icons ensure the logo remains visible within the "safe zone" regardless of the shape applied by the device:

- **Standard icons**: Full 100% of canvas used
- **Maskable icons**: Content scaled to 80% with 10% padding on all sides
- **Background**: Matches theme color (#2563eb)

Different devices may apply different masks:
- Circle (most common on Android)
- Rounded square
- Squircle (rounded corners)
- Teardrop

## Files in This Directory

- `icon.svg` - Source SVG file (512x512)
- `icon-*.png` - Generated standard PWA icons
- `apple-touch-icon.png` - iOS-specific icon
- `favicon-*.png` - Browser favicon in multiple sizes
- `robots.txt` - Search engine directives
- `vite.svg` - Legacy Vite logo (can be removed)

## Tools Used

- **Sharp** - High-performance Node.js image processing library
- Automated generation script in `scripts/generate-icons.js`

