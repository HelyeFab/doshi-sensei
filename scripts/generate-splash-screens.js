const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Splash screen sizes for different devices
const sizes = [
  { width: 640, height: 1136, name: 'splash-640x1136.png' }, // iPhone 5
  { width: 750, height: 1334, name: 'splash-750x1334.png' }, // iPhone 6/7/8
  { width: 828, height: 1792, name: 'splash-828x1792.png' }, // iPhone 11
  { width: 1125, height: 2436, name: 'splash-1125x2436.png' }, // iPhone X/XS
  { width: 1170, height: 2532, name: 'splash-1170x2532.png' }, // iPhone 12/13 Pro
  { width: 1242, height: 2208, name: 'splash-1242x2208.png' }, // iPhone 6/7/8 Plus
  { width: 1242, height: 2688, name: 'splash-1242x2688.png' }, // iPhone XS Max
  { width: 1284, height: 2778, name: 'splash-1284x2778.png' }, // iPhone 12/13 Pro Max
  { width: 1290, height: 2796, name: 'splash-1290x2796.png' }, // iPhone 14 Pro Max
  { width: 1536, height: 2048, name: 'splash-1536x2048.png' }, // iPad
  { width: 1668, height: 2224, name: 'splash-1668x2224.png' }, // iPad Pro 10.5"
  { width: 1668, height: 2388, name: 'splash-1668x2388.png' }, // iPad Pro 11"
  { width: 2048, height: 2732, name: 'splash-2048x2732.png' }, // iPad Pro 12.9"
];

async function generateSplashScreens() {
  const doshiPath = path.join(__dirname, '../public/doshi.png');
  const splashDir = path.join(__dirname, '../public/splash');

  // Ensure splash directory exists
  await fs.mkdir(splashDir, { recursive: true });

  // Read the doshi image
  const doshiBuffer = await fs.readFile(doshiPath);
  const doshiMetadata = await sharp(doshiBuffer).metadata();

  for (const size of sizes) {
    console.log(`Generating ${size.name}...`);

    // Create SVG with the splash screen design
    const svg = `
      <svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@800&display=swap');
            .title { 
              font-family: 'Manrope', sans-serif; 
              font-weight: 800;
              font-size: ${size.width / 10}px;
              letter-spacing: -0.02em;
            }
            .subtitle { 
              font-family: 'Noto Sans JP', sans-serif; 
              font-weight: 500;
              font-size: ${size.width / 20}px;
            }
          </style>
        </defs>
        
        <!-- Background -->
        <rect width="${size.width}" height="${size.height}" fill="#8a5cf6"/>
        
        <!-- Content centered -->
        <g transform="translate(${size.width / 2}, ${size.height / 2})">
          <!-- Doshi image -->
          <image 
            href="data:image/png;base64,${doshiBuffer.toString('base64')}" 
            x="${-size.width / 6}" 
            y="${-size.height / 4}" 
            width="${size.width / 3}" 
            height="${size.width / 3}"
            preserveAspectRatio="xMidYMid meet"
          />
          
          <!-- Title -->
          <text 
            x="0" 
            y="${size.height / 12}" 
            text-anchor="middle" 
            fill="#ff6b35" 
            class="title"
          >DōshiSensei</text>
          
          <!-- Japanese subtitle -->
          <text 
            x="0" 
            y="${size.height / 7}" 
            text-anchor="middle" 
            fill="rgba(255, 255, 255, 0.9)" 
            class="subtitle"
          >動詞先生</text>
          
          <!-- Loading dots -->
          <g transform="translate(0, ${size.height / 5})">
            <circle cx="-20" cy="0" r="5" fill="white" opacity="0.8"/>
            <circle cx="0" cy="0" r="5" fill="white" opacity="0.8"/>
            <circle cx="20" cy="0" r="5" fill="white" opacity="0.8"/>
          </g>
        </g>
      </svg>
    `;

    // Convert SVG to PNG
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(splashDir, size.name));
  }

  console.log('All splash screens generated successfully!');
}

// Run the generator
generateSplashScreens().catch(console.error);