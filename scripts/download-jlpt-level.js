#!/usr/bin/env node

// Script to download a specific JLPT level
const fs = require('fs');
const path = require('path');

// Get level from command line argument
const level = process.argv[2]?.toUpperCase();

if (!level || !['N1', 'N2', 'N3', 'N4', 'N5'].includes(level)) {
  console.log(`
Usage: node scripts/download-jlpt-level.js <level>

Example:
  node scripts/download-jlpt-level.js N4
  node scripts/download-jlpt-level.js N3

Available levels: N1, N2, N3, N4, N5
`);
  process.exit(1);
}

// Check if level is already complete
const progressPath = path.join(__dirname, 'jlpt-kanji-audio-progress.json');
if (fs.existsSync(progressPath)) {
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  const levelComplete = progress.completed.filter(id => id.startsWith(`${level}_`)).length;
  console.log(`\nCurrent progress for ${level}: ${levelComplete} files completed`);
}

// Modify the main script to only process the specified level
const originalScript = fs.readFileSync(path.join(__dirname, 'download-jlpt-kanji-audio.js'), 'utf8');

// Replace the levels array to only include the specified level
const modifiedScript = originalScript.replace(
  "const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];",
  `const levels = ['${level}']; // Modified to download ${level} only`
);

// Also reduce batch delay for single level
const levelScript = modifiedScript.replace(
  "const BATCH_DELAY = 10000;",
  "const BATCH_DELAY = 5000; // Reduced for single level download"
);

console.log(`
=====================================
  ${level} Kanji Audio Download
=====================================

This will download audio files for ${level} kanji only.

Starting in 3 seconds...
`);

setTimeout(() => {
  // Execute the modified script
  eval(levelScript);
}, 3000);