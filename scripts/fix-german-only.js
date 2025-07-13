const fs = require('fs');
const path = require('path');

// Check if German file exists and is valid
const dePath = path.join(__dirname, '../src/config/strings/translations/de.ts');

try {
  const content = fs.readFileSync(dePath, 'utf8');
  
  // Check for syntax issues
  const lines = content.split('\n');
  console.log(`Total lines: ${lines.length}`);
  
  // Check around line 281
  console.log('\nLines around 281:');
  for (let i = 275; i < 285 && i < lines.length; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
  
  // Try to parse it
  const match = content.match(/export const de = (\{[\s\S]*\});/);
  if (!match) {
    console.error('Could not find export statement');
  } else {
    console.log('\nExport statement found');
    
    // Check if it can be evaluated
    try {
      const obj = eval(`(${match[1]})`);
      console.log('✓ File parses correctly');
      console.log(`Top-level keys: ${Object.keys(obj).length}`);
    } catch (e) {
      console.error('❌ Parse error:', e.message);
      console.error('Error location:', e.stack);
    }
  }
  
} catch (error) {
  console.error('Error reading file:', error.message);
}