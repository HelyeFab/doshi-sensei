const fs = require('fs');
const path = require('path');

// Read the English file
const enPath = path.join(__dirname, '../src/config/strings/en.ts');
const enContent = fs.readFileSync(enPath, 'utf8');

// Extract the English object
const enMatch = enContent.match(/export const en = (\{[\s\S]*\});/);
if (!enMatch) {
  console.error('Could not extract English object');
  process.exit(1);
}

// Write the extracted object to see what we're working with
fs.writeFileSync('extracted-en.txt', enMatch[1]);
console.log('Extracted object written to extracted-en.txt');

// Try a different approach - use a simple eval in a safe context
try {
  // Create a safe evaluation context
  const enObj = eval(`(${enMatch[1]})`);
  console.log('Successfully parsed object!');
  console.log('Keys:', Object.keys(enObj));
  console.log('Sample nav keys:', Object.keys(enObj.nav));
} catch (e) {
  console.error('Error with eval:', e.message);
}