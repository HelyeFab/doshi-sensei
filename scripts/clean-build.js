#!/usr/bin/env node

/**
 * Clean build script to remove all build artifacts and caches
 * This helps resolve phantom dependency issues
 */

const fs = require('fs');
const path = require('path');

const dirsToClean = [
  '.next',
  '.netlify',
  'node_modules/.cache',
  '.turbo',
  '.vercel',
  'dist',
  'build'
];

console.log('🧹 Cleaning build artifacts...\n');

dirsToClean.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    console.log(`  Removing ${dir}...`);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
});

console.log('\n✅ Build artifacts cleaned successfully!');
console.log('   Run "npm install" and "npm run build" to rebuild.\n');