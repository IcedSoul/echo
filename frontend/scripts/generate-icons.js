const sharp = require('sharp');
const path = require('path');

// Wavecho brand colors
const PRIMARY_COLOR = '#06B6D4'; // cyan-500
const GRADIENT_END = '#3B82F6'; // blue-500

async function generateIcon(size, outputPath, isAdaptive = false) {
  // Create a rounded square icon with gradient background
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${PRIMARY_COLOR};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${GRADIENT_END};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${isAdaptive ? 0 : size * 0.2}" fill="url(#grad)"/>
      <g transform="translate(${size * 0.25}, ${size * 0.35})">
        <path d="M${size * 0.05} ${size * 0.15} Q${size * 0.125} ${size * 0.05} ${size * 0.25} ${size * 0.15} T${size * 0.45} ${size * 0.15}" 
              fill="none" stroke="white" stroke-width="${size * 0.04}" stroke-linecap="round"/>
        <path d="M${size * 0.05} ${size * 0.25} Q${size * 0.125} ${size * 0.15} ${size * 0.25} ${size * 0.25} T${size * 0.45} ${size * 0.25}" 
              fill="none" stroke="white" stroke-width="${size * 0.04}" stroke-linecap="round"/>
        <path d="M${size * 0.05} ${size * 0.35} Q${size * 0.125} ${size * 0.25} ${size * 0.25} ${size * 0.35} T${size * 0.45} ${size * 0.35}" 
              fill="none" stroke="white" stroke-width="${size * 0.04}" stroke-linecap="round" opacity="0.7"/>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);

  console.log(`Generated: ${outputPath}`);
}

async function generateSplash(width, height, outputPath) {
  // Splash screen with centered icon
  const iconSize = Math.min(width, height) * 0.25;
  const iconX = (width - iconSize) / 2;
  const iconY = (height - iconSize) / 2 - height * 0.05;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${PRIMARY_COLOR}"/>
      <g transform="translate(${iconX}, ${iconY})">
        <rect width="${iconSize}" height="${iconSize}" rx="${iconSize * 0.2}" fill="white" fill-opacity="0.2"/>
        <g transform="translate(${iconSize * 0.25}, ${iconSize * 0.35})">
          <path d="M${iconSize * 0.05} ${iconSize * 0.15} Q${iconSize * 0.125} ${iconSize * 0.05} ${iconSize * 0.25} ${iconSize * 0.15} T${iconSize * 0.45} ${iconSize * 0.15}" 
                fill="none" stroke="white" stroke-width="${iconSize * 0.04}" stroke-linecap="round"/>
          <path d="M${iconSize * 0.05} ${iconSize * 0.25} Q${iconSize * 0.125} ${iconSize * 0.15} ${iconSize * 0.25} ${iconSize * 0.25} T${iconSize * 0.45} ${iconSize * 0.25}" 
                fill="none" stroke="white" stroke-width="${iconSize * 0.04}" stroke-linecap="round"/>
          <path d="M${iconSize * 0.05} ${iconSize * 0.35} Q${iconSize * 0.125} ${iconSize * 0.25} ${iconSize * 0.25} ${iconSize * 0.35} T${iconSize * 0.45} ${iconSize * 0.35}" 
                fill="none" stroke="white" stroke-width="${iconSize * 0.04}" stroke-linecap="round" opacity="0.7"/>
        </g>
      </g>
      <text x="${width / 2}" y="${iconY + iconSize + height * 0.08}" 
            font-family="Arial, sans-serif" font-size="${height * 0.04}" font-weight="600" 
            fill="white" text-anchor="middle">Wavecho</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);

  console.log(`Generated: ${outputPath}`);
}

async function main() {
  const assetsDir = path.join(__dirname, '..', 'assets');

  // Generate app icon (1024x1024 for stores, Expo will resize)
  await generateIcon(1024, path.join(assetsDir, 'icon.png'));

  // Generate adaptive icon for Android (1024x1024)
  await generateIcon(1024, path.join(assetsDir, 'adaptive-icon.png'), true);

  // Generate favicon (48x48)
  await generateIcon(48, path.join(assetsDir, 'favicon.png'));

  // Generate splash screen (1284x2778 for iPhone 14 Pro Max)
  await generateSplash(1284, 2778, path.join(assetsDir, 'splash.png'));

  console.log('\nAll icons generated successfully!');
}

main().catch(console.error);


