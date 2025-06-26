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

    console.log('✅ Deployment preparation complete');
    console.log('No dictionary files to copy (Jisho removed)');

  } catch (error) {
    console.error('❌ Error preparing for deployment:', error);
    process.exit(1);
  }
}

prepareForDeploy();
