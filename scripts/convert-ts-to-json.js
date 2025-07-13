#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Read the TypeScript file
const tsPath = path.join(__dirname, '../src/config/strings/en.ts');
const content = fs.readFileSync(tsPath, 'utf8');

// Extract just the object content
const startIndex = content.indexOf('export const en = {');
if (startIndex === -1) {
  console.error('Could not find "export const en = {" in file');
  process.exit(1);
}

// Find the matching closing brace
let braceCount = 0;
let inString = false;
let stringChar = null;
let endIndex = -1;

for (let i = startIndex + 18; i < content.length; i++) {
  const char = content[i];
  const prevChar = i > 0 ? content[i - 1] : '';
  
  // Handle string boundaries
  if (!inString && (char === '"' || char === "'" || char === '`')) {
    inString = true;
    stringChar = char;
  } else if (inString && char === stringChar && prevChar !== '\\') {
    inString = false;
    stringChar = null;
  }
  
  // Count braces only outside of strings
  if (!inString) {
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }
}

if (endIndex === -1) {
  console.error('Could not find matching closing brace');
  process.exit(1);
}

// Extract the object string
const objectString = content.substring(startIndex + 18, endIndex);

// Create a sandbox to evaluate the object
const sandbox = {};
const script = new vm.Script(`(${objectString})`);
const context = vm.createContext(sandbox);

try {
  const enObject = script.runInContext(context);
  
  // Save as JSON
  const jsonPath = path.join(__dirname, 'en-strings.json');
  fs.writeFileSync(jsonPath, JSON.stringify(enObject, null, 2));
  console.log(`✅ Successfully converted to JSON: ${jsonPath}`);
  console.log(`📊 Total keys: ${Object.keys(enObject).length}`);
} catch (error) {
  console.error('❌ Error evaluating object:', error.message);
  process.exit(1);
}