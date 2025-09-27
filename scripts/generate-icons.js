// Simple icon generator for PWA
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple SVG icon
const createSVGIcon = (size) => {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FDE08D;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#D4AF37;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#1A1A1A"/>
    <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.3}" fill="url(#goldGradient)"/>
    <text x="${size * 0.5}" y="${size * 0.6}" text-anchor="middle" fill="#1A1A1A" font-family="serif" font-weight="bold" font-size="${size * 0.25}">GC</text>
  </svg>`;
};

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons for different sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  const svgContent = createSVGIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svgContent);
  console.log(`Generated ${filename}`);
});

// Create a simple PNG placeholder (base64 encoded 1x1 pixel)
const createPNGPlaceholder = () => {
  // This is a 1x1 transparent PNG in base64
  const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  return Buffer.from(base64PNG, 'base64');
};

// Generate PNG placeholders
sizes.forEach(size => {
  const pngContent = createPNGPlaceholder();
  const filename = `icon-${size}x${size}.png`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, pngContent);
  console.log(`Generated ${filename} placeholder`);
});

console.log('PWA icons generated successfully!');
console.log('Note: These are placeholder icons. Replace with actual high-quality icons for production.');
