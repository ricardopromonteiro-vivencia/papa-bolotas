/**
 * Generate PWA icons from the Papa Bolotas logo (webapp/logo.png).
 * The logo is not square, so it is fitted inside a square canvas without distortion.
 */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');
const logoPath = join(__dirname, '..', 'logo.png');

// Cream color of the logo, used where an opaque background is required
const CREAM = { r: 250, g: 244, b: 230, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/**
 * Render the logo centered in a size x size square.
 * @param {number} size final icon size in px
 * @param {number} scale fraction of the canvas the logo may occupy (0-1)
 * @param {object} background canvas background color
 */
async function render(size, scale, background) {
  const inner = Math.round(size * scale);
  const logo = await sharp(logoPath)
    .resize(inner, inner, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background }
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png();
}

const icons = [
  // "any" icons: transparent background, logo fills the canvas
  { size: 192, name: 'icon-192x192.png', scale: 1, bg: TRANSPARENT },
  { size: 512, name: 'icon-512x512.png', scale: 1, bg: TRANSPARENT },
  { size: 32, name: 'favicon-32x32.png', scale: 1, bg: TRANSPARENT },
  { size: 16, name: 'favicon-16x16.png', scale: 1, bg: TRANSPARENT },
  // iOS does not support transparency: opaque background with a little padding
  { size: 180, name: 'apple-touch-icon.png', scale: 0.88, bg: CREAM },
  // Maskable icons: logo kept inside the 80% safe zone on an opaque background
  { size: 192, name: 'icon-192x192-maskable.png', scale: 0.8, bg: CREAM },
  { size: 512, name: 'icon-512x512-maskable.png', scale: 0.8, bg: CREAM }
];

async function generateIcons() {
  console.log('Generating PWA icons from logo.png...\n');
  for (const { size, name, scale, bg } of icons) {
    try {
      const img = await render(size, scale, bg);
      await img.toFile(join(publicDir, name));
      console.log(`✓ Generated ${name}`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name}:`, error.message);
      process.exitCode = 1;
    }
  }
  console.log('\nIcon generation complete!');
}

generateIcons().catch(error => {
  console.error('Error generating icons:', error);
  process.exit(1);
});
