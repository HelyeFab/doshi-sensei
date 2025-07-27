const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// Splash screen sizes
const sizes = [
  { width: 750, height: 1334 }, // iPhone SE
  { width: 1170, height: 2532 }, // iPhone 12 Pro
  { width: 1290, height: 2796 }, // iPhone 14 Pro Max
  { width: 1536, height: 2048 }, // iPad
  { width: 2048, height: 2732 }, // iPad Pro 12.9"
];

async function generateSplashScreens() {
  const splashDir = path.join(__dirname, '../public/splash');
  
  // Ensure directory exists
  if (!fs.existsSync(splashDir)) {
    fs.mkdirSync(splashDir, { recursive: true });
  }

  // Load doshi image
  const doshiImage = await loadImage(path.join(__dirname, '../public/doshi.png'));

  for (const size of sizes) {
    const canvas = createCanvas(size.width, size.height);
    const ctx = canvas.getContext('2d');

    // Fill background with purple color
    ctx.fillStyle = '#8a5cf6';
    ctx.fillRect(0, 0, size.width, size.height);

    // Calculate positions
    const centerX = size.width / 2;
    const centerY = size.height / 2;
    const imageSize = Math.min(size.width, size.height) * 0.2;

    // Draw doshi image
    ctx.drawImage(
      doshiImage,
      centerX - imageSize / 2,
      centerY - imageSize * 1.2,
      imageSize,
      imageSize
    );

    // Draw text
    ctx.fillStyle = '#ff6b35';
    ctx.font = `bold ${size.width / 10}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('DōshiSensei', centerX, centerY + imageSize / 3);

    // Draw Japanese text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = `${size.width / 20}px Arial`;
    ctx.fillText('動詞先生', centerX, centerY + imageSize / 1.5);

    // Draw loading dots
    ctx.fillStyle = 'white';
    const dotY = centerY + imageSize;
    const dotRadius = size.width / 150;
    const dotSpacing = size.width / 50;
    
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(centerX + (i * dotSpacing), dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Save the image
    const filename = `splash-${size.width}x${size.height}.png`;
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(splashDir, filename), buffer);
    console.log(`Generated ${filename}`);
  }

  console.log('All splash screens generated!');
}

generateSplashScreens().catch(console.error);