#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

let totalRemoved = 0;
let filesModified = 0;

function removeConsoleLogs(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = content;
  let localCount = 0;

  // Patterns to remove (careful not to break code)
  const patterns = [
    // Simple console.log statements on their own line
    /^\s*console\.log\([^)]*\);?\s*$/gm,
    // Console.warn statements (standalone)
    /^\s*console\.warn\([^)]*\);?\s*$/gm,
    // Console.info statements (standalone)
    /^\s*console\.info\([^)]*\);?\s*$/gm,
    // Console.debug statements (standalone)
    /^\s*console\.debug\([^)]*\);?\s*$/gm,
    // Multi-line console.log that starts and ends cleanly
    /^\s*console\.log\([^)]*\n[^)]*\);?\s*$/gm,
  ];

  patterns.forEach(pattern => {
    const matches = modified.match(pattern);
    if (matches) {
      localCount += matches.length;
      modified = modified.replace(pattern, '');
    }
  });

  // Only write if we made changes
  if (localCount > 0) {
    // Clean up double blank lines
    modified = modified.replace(/\n\n\n+/g, '\n\n');
    
    fs.writeFileSync(filePath, modified, 'utf8');
    console.log(`${colors.green}✓${colors.reset} ${filePath}: Removed ${localCount} console statement(s)`);
    totalRemoved += localCount;
    filesModified++;
    return true;
  }
  
  return false;
}

function processFiles() {
  console.log(`${colors.blue}Starting console.log removal...${colors.reset}\n`);

  // Find all TypeScript and JavaScript files in src
  const files = glob.sync('src/**/*.{ts,tsx,js,jsx}', {
    ignore: [
      'src/scripts/**/*',  // Keep scripts
      '**/*.test.*',        // Keep test files
      '**/*.spec.*'         // Keep spec files
    ]
  });

  console.log(`Found ${files.length} files to process\n`);

  files.forEach(file => {
    removeConsoleLogs(file);
  });

  console.log(`\n${colors.green}✅ Complete!${colors.reset}`);
  console.log(`   Files modified: ${filesModified}`);
  console.log(`   Console statements removed: ${totalRemoved}`);
  
  if (totalRemoved === 0) {
    console.log(`\n${colors.yellow}No console statements found to remove.${colors.reset}`);
  }
}

// Check if glob is installed
try {
  require.resolve('glob');
  processFiles();
} catch(e) {
  console.log(`${colors.yellow}Installing glob package...${colors.reset}`);
  require('child_process').execSync('npm install glob', { stdio: 'inherit' });
  processFiles();
}