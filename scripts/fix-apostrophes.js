const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all page.tsx files
const files = glob.sync('src/app/**/page.tsx', { 
  cwd: path.join(__dirname, '..'),
  absolute: true 
});

let fixedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  // Check if file contains the problematic apostrophe in metadata
  if (content.includes("Doshi Sensei's")) {
    // Replace only in metadata sections (between quotes)
    const newContent = content
      // Fix in single-quoted strings
      .replace(/'([^']*?)Doshi Sensei's([^']*?)'/g, "'$1Doshi Sensei\\'s$2'")
      // Fix in double-quoted strings (in structured data)
      .replace(/"([^"]*?)Doshi Sensei's([^"]*?)"/g, '"$1Doshi Sensei\'s$2"');
    
    if (newContent !== content) {
      fs.writeFileSync(file, newContent);
      modified = true;
      fixedCount++;
      console.log(`✅ Fixed apostrophes in: ${path.relative(process.cwd(), file)}`);
    }
  }
});

console.log(`\n✨ Fixed ${fixedCount} files with apostrophe issues.`);