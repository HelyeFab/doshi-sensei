const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const inputFile = path.join(__dirname, '..', 'public', 'doshi.png');
  const outputDir = path.join(__dirname, '..', 'public');
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');

  // Ensure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Define icon sizes for PWA
  const sizes = [
    // High resolution splash screen icons
    { size: 1024, name: 'icon-1024x1024.png', dir: iconsDir },
    { size: 2048, name: 'icon-2048x2048.png', dir: iconsDir },
    
    // Standard PWA icons (ensure we have all sizes)
    { size: 192, name: 'icon-192x192.png', dir: iconsDir },
    { size: 512, name: 'icon-512x512.png', dir: iconsDir },
    { size: 384, name: 'icon-384x384.png', dir: iconsDir },
    
    // iOS specific high-res icons
    { size: 1024, name: 'apple-touch-icon-1024x1024.png', dir: outputDir },
    
    // Android adaptive icon backgrounds
    { size: 1024, name: 'maskable-1024x1024.png', dir: iconsDir },
  ];

  console.log('🎨 Generating high-resolution icons...');

  for (const { size, name, dir } of sizes) {
    const outputPath = path.join(dir, name);
    
    try {
      // For maskable icons, add padding (safe zone)
      if (name.includes('maskable')) {
        await sharp(inputFile)
          .resize(Math.floor(size * 0.8), Math.floor(size * 0.8))
          .extend({
            top: Math.floor(size * 0.1),
            bottom: Math.floor(size * 0.1),
            left: Math.floor(size * 0.1),
            right: Math.floor(size * 0.1),
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .toFile(outputPath);
      } else {
        // Regular icons - resize with high quality
        await sharp(inputFile)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png({
            quality: 100,
            compressionLevel: 0  // No compression for highest quality
          })
          .toFile(outputPath);
      }
      
      console.log(`✅ Generated ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${name}:`, error.message);
    }
  }

  console.log('\n📱 Icons generated successfully!');
  console.log('Next steps:');
  console.log('1. Update manifest.json to include new icon sizes');
  console.log('2. Clear PWA cache and reinstall the app');
}

generateIcons().catch(console.error);