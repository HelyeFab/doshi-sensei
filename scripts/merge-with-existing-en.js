#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the existing en.ts file
function readExistingEnFile() {
  const enPath = 'src/config/strings/en.ts';
  const content = fs.readFileSync(enPath, 'utf8');
  
  // Extract the object (simplified parser)
  const match = content.match(/export const en = ({[\s\S]*});/);
  if (!match) {
    console.error('Could not parse en.ts');
    return {};
  }
  
  try {
    // Evaluate the object
    const enObj = eval(`(${match[1]})`);
    return enObj;
  } catch (error) {
    console.error('Error parsing en.ts:', error);
    return {};
  }
}

// Read cleaned strings
function readCleanedStrings() {
  const cleanedPath = 'extracted-strings/cleaned-strings.json';
  const data = JSON.parse(fs.readFileSync(cleanedPath, 'utf8'));
  return data.strings;
}

// Merge strings into existing structure
function mergeStrings(existing, newStrings) {
  const merged = JSON.parse(JSON.stringify(existing)); // Deep clone
  
  // Add a new section for extracted strings if it doesn't exist
  if (!merged.extracted) {
    merged.extracted = {};
  }
  
  // Group new strings by component/page
  const grouped = {};
  
  Object.entries(newStrings).forEach(([key, value]) => {
    // Skip if already exists somewhere in the object
    if (JSON.stringify(existing).includes(value)) {
      return;
    }
    
    // Group by first part of key
    const parts = key.split('_');
    const section = parts[0] || 'general';
    
    if (!grouped[section]) {
      grouped[section] = {};
    }
    
    grouped[section][key] = value;
  });
  
  // Add grouped strings to merged object
  Object.entries(grouped).forEach(([section, strings]) => {
    if (!merged.extracted[section]) {
      merged.extracted[section] = {};
    }
    Object.assign(merged.extracted[section], strings);
  });
  
  return merged;
}

// Generate updated en.ts file
function generateUpdatedEnFile(merged) {
  const content = `export const en = ${JSON.stringify(merged, null, 2)};

export type EnKeys = keyof typeof en;
`;
  
  // Create backup
  const backupPath = 'src/config/strings/en.ts.backup';
  fs.copyFileSync('src/config/strings/en.ts', backupPath);
  console.log(`✅ Created backup: ${backupPath}`);
  
  // Write updated file
  const outputPath = 'src/config/strings/en-merged.ts';
  fs.writeFileSync(outputPath, content);
  console.log(`✅ Created merged file: ${outputPath}`);
  
  return outputPath;
}

// Main function
function main() {
  console.log('🔀 Merging extracted strings with existing en.ts\n');
  
  // Read existing strings
  const existing = readExistingEnFile();
  console.log(`📋 Found ${Object.keys(existing).length} top-level sections in existing en.ts`);
  
  // Read cleaned strings
  const newStrings = readCleanedStrings();
  console.log(`📋 Found ${Object.keys(newStrings).length} cleaned strings to merge`);
  
  // Merge strings
  const merged = mergeStrings(existing, newStrings);
  
  // Count new additions
  let addedCount = 0;
  if (merged.extracted) {
    Object.values(merged.extracted).forEach(section => {
      if (typeof section === 'object') {
        addedCount += Object.keys(section).length;
      }
    });
  }
  
  console.log(`✨ Added ${addedCount} new strings to the extracted section`);
  
  // Generate updated file
  generateUpdatedEnFile(merged);
  
  console.log('\n📊 Summary:');
  console.log(`   - Existing sections preserved: ${Object.keys(existing).length}`);
  console.log(`   - New strings added: ${addedCount}`);
  console.log(`   - Duplicates skipped: ${Object.keys(newStrings).length - addedCount}`);
  
  console.log('\n🎯 Next steps:');
  console.log('1. Review src/config/strings/en-merged.ts');
  console.log('2. If satisfied, replace en.ts with en-merged.ts');
  console.log('3. Run the translator MCP to translate all strings');
}

main();