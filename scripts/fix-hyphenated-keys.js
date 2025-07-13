const fs = require('fs');
const path = require('path');

// Languages to fix
const languages = ['fr', 'it', 'de', 'es', 'ar', 'ko'];

languages.forEach(lang => {
  const filePath = path.join(__dirname, `../src/config/strings/translations/${lang}.ts`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${lang} - file does not exist`);
    return;
  }
  
  console.log(`Fixing ${lang}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix hyphenated keys by adding quotes
  // Match patterns like "i-adjective:" or "na-adjective:" and add quotes
  content = content.replace(/(\s+)([a-zA-Z]+-[a-zA-Z-]+):/g, '$1"$2":');
  
  // Also fix any numeric-prefixed keys if they exist
  content = content.replace(/(\s+)(\d+[a-zA-Z_-]*):/g, '$1"$2":');
  
  // Write back
  fs.writeFileSync(filePath, content);
  console.log(`✓ Fixed ${lang}.ts`);
});

console.log('\nAll files fixed!');