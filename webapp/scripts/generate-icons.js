/**
 * Generate PWA icons from SVG
 * This script creates all required PNG icons for the PWA
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, '..', 'public');
const svgPath = join(publicDir, 'icon.svg');

// Read the SVG file
const svgBuffer = readFileSync(svgPath);

// Icon sizes to generate
const sizes = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 16, name: 'favicon-16x16.png' }
];

// Generate maskable icons (with padding for safe zone)
const maskableSizes = [
  { size: 192, name: 'icon-192x192-maskable.png' },
  { size: 512, name: 'icon-512x512-maskable.png' }
];

async function generateIcons() {
  console.log('Generating PWA icons...\n');

  // Generate standard icons
  for (const { size, name } of sizes) {
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(join(publicDir, name));
      console.log(`✓ Generated ${name}`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name}:`, error.message);
    }
  }

  // Generate maskable icons (add 20% padding for safe zone)
  for (const { size, name } of maskableSizes) {
    try {
      const contentSize = Math.round(size * 0.8);
      const padding = Math.round((size - contentSize) / 2);
      
      await sharp(svgBuffer)
        .resize(contentSize, contentSize)
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 37, g: 99, b: 235, alpha: 1 } // Match theme color
        })
        .png()
        .toFile(join(publicDir, name));
      console.log(`✓ Generated ${name} (maskable)`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name}:`, error.message);
    }
  }

  console.log('\n✓ Icon generation complete!');
}

generateIcons().catch(error => {
  console.error('Error generating icons:', error);
  process.exit(1);
});
