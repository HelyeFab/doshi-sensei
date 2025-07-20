#!/usr/bin/env node

// Quick script to download just N5 kanji audio for testing
const fs = require('fs');
const path = require('path');

// Modify the main script to only process N5
const originalScript = fs.readFileSync(path.join(__dirname, 'download-jlpt-kanji-audio.js'), 'utf8');

// Replace the levels array to only include N5
const modifiedScript = originalScript.replace(
  "const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];",
  "const levels = ['N5']; // Modified to download N5 only"
);

// Also reduce batch delay for faster testing
const testScript = modifiedScript.replace(
  "const BATCH_DELAY = 10000;",
  "const BATCH_DELAY = 3000; // Reduced for N5 test"
);

console.log(`
=====================================
  N5 Kanji Audio Download (Test)
=====================================

This will download only N5 kanji audio files for testing.
- 80 kanji characters
- ~400 audio files total
- Estimated time: 5-10 minutes

To download all JLPT levels, use:
  node scripts/download-jlpt-kanji-audio.js

Starting in 3 seconds...
`);

setTimeout(() => {
  // Execute the modified script
  eval(testScript);
}, 3000);