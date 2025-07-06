const fs = require('fs').promises;
const path = require('path');

async function copyDirectory(src, dest) {
  try {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
        console.log(`Copied: ${srcPath} -> ${destPath}`);
      }
    }
  } catch (error) {
    console.error(`Error copying ${src} to ${dest}:`, error.message);
  }
}

async function prepareForDeploy() {
  try {
    console.log('Preparing for Netlify deployment...');

    // Create .next directory if it doesn't exist
    await fs.mkdir('.next', { recursive: true });

    // Ensure kuromoji dictionary files exist in public directory
    const dictSource = path.join(__dirname, '..', 'public', 'dict');
    
    try {
      await fs.access(dictSource);
      const files = await fs.readdir(dictSource);
      console.log(`✅ Found ${files.length} kuromoji dictionary files in public/dict/`);
    } catch (error) {
      console.log('⚠️  Kuromoji dictionary files not found in public/dict/, running setup...');
      // Run setup script to download dictionary files
      const { execSync } = require('child_process');
      execSync('node scripts/setup-kuromoji.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    }

    console.log('✅ Deployment preparation complete');

  } catch (error) {
    console.error('❌ Error preparing for deployment:', error);
    process.exit(1);
  }
}

prepareForDeploy();
