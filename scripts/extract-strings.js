#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const CONFIG = {
  // Directories to scan
  sourceDirs: [
    'src/app/**/*.tsx',
    'src/components/**/*.tsx',
    'src/contexts/**/*.tsx',
    'src/hooks/**/*.tsx'
  ],
  // Output directory
  outputDir: 'extracted-strings',
  // Patterns to match hardcoded strings
  patterns: {
    // JSX text content: <tag>Text here</tag>
    jsxText: />([^<>{}\n]+)</g,
    // String props: prop="value" or prop='value'
    stringProps: /(?:title|placeholder|label|aria-label|alt|name|description|message|error|success|content|heading|text)=["']([^"']+)["']/g,
    // Button/Link text in specific components
    buttonText: /<(?:button|Button|Link|a)[^>]*>([^<>{}\n]+)</g,
    // Toast/notification calls
    toastCalls: /toast\.(?:success|error|info|warning)\s*\(\s*["']([^"']+)["']/g,
    // Console/error messages (optional)
    consoleLogs: /console\.(?:log|error|warn)\s*\(\s*["']([^"']+)["']/g,
  },
  // Strings to ignore
  ignorePatterns: [
    /^\s*$/,                    // Empty strings
    /^[0-9]+$/,                 // Just numbers
    /^[A-Z_]+$/,               // Constants like API_KEY
    /^https?:\/\//,            // URLs
    /^[a-z0-9-_]+$/i,          // Single identifiers
    /^\{.*\}$/,                // Template literals
    /^\/.*\/[gim]*$/,          // Regex patterns
    /^#[0-9a-f]{3,8}$/i,       // Hex colors
    /^rgb/i,                   // RGB colors
    /^\d+px$/,                 // Pixel values
  ]
};

// Helper functions
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function shouldIgnoreString(str) {
  const trimmed = str.trim();
  if (trimmed.length < 2) return true;
  return CONFIG.ignorePatterns.some(pattern => pattern.test(trimmed));
}

function generateKey(text, filePath, category = 'general') {
  // Extract component name from file path
  const fileName = path.basename(filePath, '.tsx');
  const dirName = path.dirname(filePath).split('/').pop();
  
  // Clean the text for key generation
  const cleanText = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 30);
  
  // Generate a hierarchical key
  return `${dirName}.${fileName}.${cleanText}`;
}

function extractStringsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const strings = new Map(); // Use Map to avoid duplicates
  
  // Extract JSX text content
  let match;
  while ((match = CONFIG.patterns.jsxText.exec(content)) !== null) {
    const text = match[1].trim();
    if (!shouldIgnoreString(text)) {
      const key = generateKey(text, filePath, 'jsx');
      strings.set(text, {
        key,
        text,
        type: 'jsx',
        file: filePath,
        line: content.substring(0, match.index).split('\n').length
      });
    }
  }
  
  // Extract string props
  CONFIG.patterns.stringProps.lastIndex = 0;
  while ((match = CONFIG.patterns.stringProps.exec(content)) !== null) {
    const text = match[1].trim();
    if (!shouldIgnoreString(text)) {
      const key = generateKey(text, filePath, 'prop');
      strings.set(text, {
        key,
        text,
        type: 'prop',
        file: filePath,
        line: content.substring(0, match.index).split('\n').length
      });
    }
  }
  
  // Extract button text
  CONFIG.patterns.buttonText.lastIndex = 0;
  while ((match = CONFIG.patterns.buttonText.exec(content)) !== null) {
    const text = match[1].trim();
    if (!shouldIgnoreString(text)) {
      const key = generateKey(text, filePath, 'button');
      strings.set(text, {
        key,
        text,
        type: 'button',
        file: filePath,
        line: content.substring(0, match.index).split('\n').length
      });
    }
  }
  
  // Extract toast messages
  CONFIG.patterns.toastCalls.lastIndex = 0;
  while ((match = CONFIG.patterns.toastCalls.exec(content)) !== null) {
    const text = match[1].trim();
    if (!shouldIgnoreString(text)) {
      const key = generateKey(text, filePath, 'toast');
      strings.set(text, {
        key,
        text,
        type: 'toast',
        file: filePath,
        line: content.substring(0, match.index).split('\n').length
      });
    }
  }
  
  return Array.from(strings.values());
}

function extractAllStrings() {
  console.log('🔍 Starting string extraction...\n');
  
  const allStrings = [];
  const fileCount = { total: 0, withStrings: 0 };
  
  CONFIG.sourceDirs.forEach(pattern => {
    const files = glob.sync(pattern, { ignore: ['**/node_modules/**', '**/*.test.tsx', '**/*.spec.tsx'] });
    
    files.forEach(file => {
      fileCount.total++;
      const strings = extractStringsFromFile(file);
      
      if (strings.length > 0) {
        fileCount.withStrings++;
        allStrings.push(...strings);
        console.log(`📄 ${file}: Found ${strings.length} strings`);
      }
    });
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`   - Files scanned: ${fileCount.total}`);
  console.log(`   - Files with strings: ${fileCount.withStrings}`);
  console.log(`   - Total strings found: ${allStrings.length}`);
  
  return allStrings;
}

function generateTranslationFiles(strings) {
  ensureDirectoryExists(CONFIG.outputDir);
  
  // Group strings by component/page
  const grouped = {};
  strings.forEach(str => {
    const parts = str.key.split('.');
    const section = parts[0];
    const component = parts[1];
    
    if (!grouped[section]) grouped[section] = {};
    if (!grouped[section][component]) grouped[section][component] = {};
    
    grouped[section][component][str.key] = str.text;
  });
  
  // Generate English translation file
  const enTranslations = {};
  strings.forEach(str => {
    enTranslations[str.key] = str.text;
  });
  
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'extracted-en.json'),
    JSON.stringify(enTranslations, null, 2)
  );
  
  // Generate mapping file for automated replacement
  const mapping = strings.map(str => ({
    original: str.text,
    key: str.key,
    file: str.file,
    line: str.line,
    type: str.type
  }));
  
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'string-mapping.json'),
    JSON.stringify(mapping, null, 2)
  );
  
  // Generate a CSV for easy review
  const csv = [
    'Key,Original Text,File,Line,Type',
    ...strings.map(str => 
      `"${str.key}","${str.text.replace(/"/g, '""')}","${str.file}",${str.line},${str.type}`
    )
  ].join('\n');
  
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'extracted-strings.csv'),
    csv
  );
  
  // Generate structured JSON for translator MCP
  const structuredData = {
    metadata: {
      extractionDate: new Date().toISOString(),
      totalStrings: strings.length,
      sourceLanguage: 'en',
      targetLanguages: ['ja', 'fr', 'de', 'es', 'it', 'ko', 'zh']
    },
    sections: grouped
  };
  
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'structured-strings.json'),
    JSON.stringify(structuredData, null, 2)
  );
  
  console.log(`\n✅ Generated files in ${CONFIG.outputDir}/:`);
  console.log('   - extracted-en.json (flat translation file)');
  console.log('   - string-mapping.json (for automated replacement)');
  console.log('   - extracted-strings.csv (for review)');
  console.log('   - structured-strings.json (for translator MCP)');
}

// Main execution
function main() {
  console.log('🌍 Doshi Sensei String Extraction Tool\n');
  
  const strings = extractAllStrings();
  
  if (strings.length === 0) {
    console.log('❌ No strings found to extract.');
    return;
  }
  
  generateTranslationFiles(strings);
  
  console.log('\n🎉 Extraction complete!');
  console.log('\nNext steps:');
  console.log('1. Review extracted-strings.csv to verify the extractions');
  console.log('2. Use structured-strings.json with your translator MCP');
  console.log('3. Run the replace-strings.js script to update your code');
}

// Run the script
main();