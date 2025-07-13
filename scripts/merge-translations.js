#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  extractedFile: 'extracted-strings/extracted-en.json',
  existingFile: 'src/config/strings/strings-english.ts',
  outputFile: 'src/config/strings/merged-strings-english.ts',
  cleanupPatterns: [
    // Remove keys that are just emojis or symbols
    /^[^a-zA-Z]*$/,
    // Remove keys that are just numbers
    /^\d+$/,
    // Remove technical strings
    /^(telephoneno|browserconfigxml|string_\d+)$/,
    // Remove empty or very short keys
    /^.{0,2}$/,
  ]
};

function cleanExtractedStrings(strings) {
  const cleaned = {};
  
  Object.entries(strings).forEach(([key, value]) => {
    // Skip if key matches any cleanup pattern
    const shouldSkip = CONFIG.cleanupPatterns.some(pattern => 
      pattern.test(key.split('.').pop())
    );
    
    if (!shouldSkip && value && value.trim().length > 1) {
      // Clean up the key to be more readable
      const cleanKey = key
        .replace(/\./g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      
      cleaned[cleanKey] = value;
    }
  });
  
  return cleaned;
}

function parseExistingStrings(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract the strings object
  const match = content.match(/export const strings = \{([\s\S]*)\};/);
  if (!match) {
    console.error('Could not parse existing strings file');
    return {};
  }
  
  // Parse the object (this is a simplified parser, might need adjustment)
  try {
    // Create a safe evaluation context
    const stringsContent = match[1];
    const evalContent = `({${stringsContent}})`;
    
    // This is a bit hacky but works for simple objects
    const parsed = eval(evalContent);
    return parsed;
  } catch (error) {
    console.error('Error parsing existing strings:', error);
    return {};
  }
}

function generateMergedFile(existingStrings, newStrings) {
  // Merge strings, keeping existing ones and adding new ones
  const merged = { ...existingStrings };
  
  // Group new strings by component/page
  const grouped = {};
  Object.entries(newStrings).forEach(([key, value]) => {
    const parts = key.split('_');
    const section = parts[0];
    
    if (!grouped[section]) {
      grouped[section] = {};
    }
    
    // Avoid duplicates
    if (!Object.values(merged).includes(value)) {
      grouped[section][key] = value;
    }
  });
  
  // Add new sections to merged object
  Object.entries(grouped).forEach(([section, strings]) => {
    Object.assign(merged, strings);
  });
  
  // Generate the TypeScript file content
  const content = `// Merged translation strings
// Generated on: ${new Date().toISOString()}
// Total strings: ${Object.keys(merged).length}

export const strings = ${JSON.stringify(merged, null, 2)};

export type StringKeys = keyof typeof strings;
`;
  
  return content;
}

function generateCleanStringsFile(cleanedStrings) {
  // Group strings by component/page for better organization
  const grouped = {};
  
  Object.entries(cleanedStrings).forEach(([key, value]) => {
    const parts = key.split('_');
    const section = parts[0] || 'general';
    
    if (!grouped[section]) {
      grouped[section] = {};
    }
    
    grouped[section][key] = value;
  });
  
  // Generate a clean JSON file for translation
  const cleanJson = {
    metadata: {
      extractionDate: new Date().toISOString(),
      totalStrings: Object.keys(cleanedStrings).length,
      sections: Object.keys(grouped)
    },
    strings: cleanedStrings,
    grouped: grouped
  };
  
  fs.writeFileSync(
    'extracted-strings/cleaned-strings.json',
    JSON.stringify(cleanJson, null, 2)
  );
  
  console.log('✅ Generated cleaned-strings.json');
  
  return cleanJson;
}

function main() {
  console.log('🔀 Doshi Sensei Translation Merger\n');
  
  // Load extracted strings
  if (!fs.existsSync(CONFIG.extractedFile)) {
    console.error(`❌ Extracted file not found: ${CONFIG.extractedFile}`);
    process.exit(1);
  }
  
  const extractedStrings = JSON.parse(fs.readFileSync(CONFIG.extractedFile, 'utf8'));
  console.log(`📋 Loaded ${Object.keys(extractedStrings).length} extracted strings`);
  
  // Clean extracted strings
  const cleanedStrings = cleanExtractedStrings(extractedStrings);
  console.log(`🧹 Cleaned to ${Object.keys(cleanedStrings).length} valid strings`);
  
  // Generate clean strings file for translation
  const cleanData = generateCleanStringsFile(cleanedStrings);
  
  // Check if we should merge with existing
  if (fs.existsSync(CONFIG.existingFile)) {
    console.log('\n📄 Parsing existing strings file...');
    const existingStrings = parseExistingStrings(CONFIG.existingFile);
    console.log(`   Found ${Object.keys(existingStrings).length} existing strings`);
    
    // Generate merged file
    const mergedContent = generateMergedFile(existingStrings, cleanedStrings);
    fs.writeFileSync(CONFIG.outputFile, mergedContent);
    console.log(`\n✅ Generated merged file: ${CONFIG.outputFile}`);
  } else {
    console.log('\n⚠️  No existing strings file found, creating new one...');
    
    // Create new strings file
    const content = `export const strings = ${JSON.stringify(cleanedStrings, null, 2)};

export type StringKeys = keyof typeof strings;
`;
    fs.writeFileSync('src/config/strings/new-strings-english.ts', content);
    console.log('✅ Generated new-strings-english.ts');
  }
  
  console.log('\n📊 Summary:');
  console.log(`   - Extracted: ${Object.keys(extractedStrings).length} strings`);
  console.log(`   - Cleaned: ${Object.keys(cleanedStrings).length} strings`);
  console.log(`   - Removed: ${Object.keys(extractedStrings).length - Object.keys(cleanedStrings).length} invalid strings`);
  
  console.log('\n🎯 Next steps:');
  console.log('1. Review cleaned-strings.json for translation');
  console.log('2. Use this file with your translator MCP');
  console.log('3. Run replace-strings.js to update your components');
}

main();