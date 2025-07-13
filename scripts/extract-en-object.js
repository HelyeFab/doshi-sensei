const fs = require('fs');
const path = require('path');

// Read the English file
const enPath = path.join(__dirname, '../src/config/strings/en.ts');
const enContent = fs.readFileSync(enPath, 'utf8');

// Extract just the object literal using regex
const match = enContent.match(/export const en = (\{[\s\S]*?\n\});/);
if (!match) {
  console.error('Could not extract English object');
  process.exit(1);
}

// Write just the object to a JSON file for processing
const enObjectStr = match[1]
  // Remove comments
  .replace(/\/\/.*$/gm, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  // Convert to valid JSON
  .replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '"$1":')
  // Handle trailing commas
  .replace(/,(\s*[}\]])/g, '$1')
  // Escape newlines in strings
  .replace(/\n/g, '\\n');

try {
  const enObj = JSON.parse(enObjectStr);
  fs.writeFileSync(path.join(__dirname, 'en-structure.json'), JSON.stringify(enObj, null, 2));
  console.log('English structure extracted to en-structure.json');
} catch (e) {
  console.error('Error parsing English object:', e);
  // Save the string for debugging
  fs.writeFileSync(path.join(__dirname, 'en-structure-debug.txt'), enObjectStr);
  console.log('Saved debug output to en-structure-debug.txt');
}