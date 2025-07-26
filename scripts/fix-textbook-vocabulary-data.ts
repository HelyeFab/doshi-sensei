#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Function to fix a single vocabulary item
function fixVocabularyItem(item: any) {
  // Ensure partOfSpeech is an array
  if (typeof item.partOfSpeech === 'string') {
    item.partOfSpeech = [item.partOfSpeech];
  } else if (!item.partOfSpeech) {
    item.partOfSpeech = [];
  }
  
  // Fix other potential issues
  if (!item.tags) {
    item.tags = [];
  }
  
  if (!item.examples) {
    item.examples = [];
  }
  
  return item;
}

// Function to process a JSON file
function processFile(filePath: string) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    if (Array.isArray(data)) {
      const fixedData = data.map(fixVocabularyItem);
      writeFileSync(filePath, JSON.stringify(fixedData, null, 2));
      console.log(`✅ Fixed ${filePath} - ${fixedData.length} items`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
  }
}

// Main function
function main() {
  const dataDir = join(__dirname, '../src/data/textbook-vocabulary');
  const textbooks = ['genki-1', 'genki-2', 'minna-1', 'minna-2'];
  
  for (const textbook of textbooks) {
    const textbookDir = join(dataDir, textbook);
    
    try {
      const files = readdirSync(textbookDir);
      const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'metadata.json');
      
      console.log(`\nProcessing ${textbook}...`);
      
      for (const file of jsonFiles) {
        processFile(join(textbookDir, file));
      }
    } catch (error) {
      console.log(`⚠️  Skipping ${textbook} - directory not found or empty`);
    }
  }
  
  console.log('\n✨ All files processed!');
}

main();