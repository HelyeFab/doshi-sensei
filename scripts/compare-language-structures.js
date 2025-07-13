#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Read and parse a language file
function readLanguageFile(langCode) {
  const filePath = langCode === 'en' 
    ? 'src/config/strings/en.ts'
    : `src/config/strings/translations/${langCode}.ts`;
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(new RegExp(`export const ${langCode} = ({[\\s\\S]*});`));
  if (!match) throw new Error(`Could not parse ${langCode}.ts`);
  
  try {
    return eval(`(${match[1]})`);
  } catch (error) {
    throw new Error(`Failed to evaluate ${langCode}.ts: ${error.message}`);
  }
}

// Deep comparison of object structures
function compareStructures(obj1, obj2, path = '', differences = []) {
  const keys1 = Object.keys(obj1 || {});
  const keys2 = Object.keys(obj2 || {});
  
  // Find missing keys in obj2
  keys1.forEach(key => {
    const newPath = path ? `${path}.${key}` : key;
    
    if (!keys2.includes(key)) {
      differences.push({
        type: 'missing',
        path: newPath,
        value: obj1[key]
      });
    } else if (typeof obj1[key] === 'object' && obj1[key] !== null) {
      if (typeof obj2[key] !== 'object' || obj2[key] === null) {
        differences.push({
          type: 'type_mismatch',
          path: newPath,
          expected: 'object',
          actual: typeof obj2[key]
        });
      } else {
        // Recursively compare nested objects
        compareStructures(obj1[key], obj2[key], newPath, differences);
      }
    }
  });
  
  // Find extra keys in obj2
  keys2.forEach(key => {
    const newPath = path ? `${path}.${key}` : key;
    
    if (!keys1.includes(key)) {
      differences.push({
        type: 'extra',
        path: newPath,
        value: obj2[key]
      });
    }
  });
  
  return differences;
}

// Get the type and structure info of a value
function getValueInfo(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `string: "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`;
  if (typeof value === 'number') return `number: ${value}`;
  if (typeof value === 'boolean') return `boolean: ${value}`;
  if (Array.isArray(value)) return `array[${value.length}]`;
  if (typeof value === 'object') return `object{${Object.keys(value).length} keys}`;
  return typeof value;
}

// Count total keys in an object (including nested)
function countKeys(obj, depth = 0) {
  let count = 0;
  let maxDepth = depth;
  
  Object.entries(obj || {}).forEach(([key, value]) => {
    count++;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const [subCount, subDepth] = countKeys(value, depth + 1);
      count += subCount;
      maxDepth = Math.max(maxDepth, subDepth);
    }
  });
  
  return [count, maxDepth];
}

// Main comparison function
async function main() {
  console.log('🔍 Comprehensive Language Structure Comparison\n');
  console.log('=' .repeat(80));
  
  const languages = ['en', 'fr', 'it', 'de', 'es', 'ar', 'ko'];
  const structures = {};
  const errors = [];
  
  // Load all language files
  console.log('\n📚 Loading language files...\n');
  
  for (const lang of languages) {
    try {
      structures[lang] = readLanguageFile(lang);
      const [totalKeys, maxDepth] = countKeys(structures[lang]);
      console.log(`${colors.green}✓${colors.reset} ${lang.toUpperCase()}: Loaded successfully (${totalKeys} total keys, max depth: ${maxDepth})`);
    } catch (error) {
      console.log(`${colors.red}✗${colors.reset} ${lang.toUpperCase()}: ${error.message}`);
      errors.push({ lang, error: error.message });
    }
  }
  
  if (!structures.en) {
    console.error('\n❌ Cannot proceed without English base file!');
    return;
  }
  
  // Compare each language with English
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Comparing each language with English structure...\n');
  
  const comparisonResults = {};
  
  for (const lang of languages.filter(l => l !== 'en' && structures[l])) {
    console.log(`\n${colors.blue}Comparing ${lang.toUpperCase()} with EN:${colors.reset}`);
    console.log('-'.repeat(40));
    
    const differences = compareStructures(structures.en, structures[lang]);
    comparisonResults[lang] = differences;
    
    if (differences.length === 0) {
      console.log(`${colors.green}✓ Perfect match! No structural differences found.${colors.reset}`);
    } else {
      // Group differences by type
      const missing = differences.filter(d => d.type === 'missing');
      const extra = differences.filter(d => d.type === 'extra');
      const typeMismatch = differences.filter(d => d.type === 'type_mismatch');
      
      console.log(`${colors.yellow}⚠ Found ${differences.length} differences:${colors.reset}`);
      
      if (missing.length > 0) {
        console.log(`\n${colors.red}Missing keys (${missing.length}):${colors.reset}`);
        missing.slice(0, 10).forEach(diff => {
          console.log(`  - ${diff.path} (${getValueInfo(diff.value)})`);
        });
        if (missing.length > 10) {
          console.log(`  ... and ${missing.length - 10} more`);
        }
      }
      
      if (extra.length > 0) {
        console.log(`\n${colors.yellow}Extra keys (${extra.length}):${colors.reset}`);
        extra.slice(0, 10).forEach(diff => {
          console.log(`  + ${diff.path} (${getValueInfo(diff.value)})`);
        });
        if (extra.length > 10) {
          console.log(`  ... and ${extra.length - 10} more`);
        }
      }
      
      if (typeMismatch.length > 0) {
        console.log(`\n${colors.red}Type mismatches (${typeMismatch.length}):${colors.reset}`);
        typeMismatch.forEach(diff => {
          console.log(`  ! ${diff.path}: expected ${diff.expected}, got ${diff.actual}`);
        });
      }
    }
  }
  
  // Summary report
  console.log('\n' + '='.repeat(80));
  console.log('\n📈 SUMMARY REPORT\n');
  
  const [enTotalKeys, enMaxDepth] = countKeys(structures.en);
  console.log(`English base structure:`);
  console.log(`  - Total keys: ${enTotalKeys}`);
  console.log(`  - Maximum depth: ${enMaxDepth}`);
  console.log(`  - Top-level sections: ${Object.keys(structures.en).length}`);
  console.log(`  - Top-level sections: ${Object.keys(structures.en).join(', ')}`);
  
  console.log('\nComparison results:');
  Object.entries(comparisonResults).forEach(([lang, differences]) => {
    if (differences.length === 0) {
      console.log(`  ${colors.green}✓ ${lang.toUpperCase()}: Structurally identical to EN${colors.reset}`);
    } else {
      const missing = differences.filter(d => d.type === 'missing').length;
      const extra = differences.filter(d => d.type === 'extra').length;
      const typeMismatch = differences.filter(d => d.type === 'type_mismatch').length;
      
      console.log(`  ${colors.yellow}⚠ ${lang.toUpperCase()}: ${missing} missing, ${extra} extra, ${typeMismatch} type mismatches${colors.reset}`);
    }
  });
  
  // Save detailed report
  const reportPath = 'language-structure-report.json';
  const report = {
    timestamp: new Date().toISOString(),
    english: {
      totalKeys: enTotalKeys,
      maxDepth: enMaxDepth,
      topLevelSections: Object.keys(structures.en)
    },
    comparisons: comparisonResults,
    errors: errors
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Recommendations
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 RECOMMENDATIONS:\n');
  
  const hasIssues = Object.values(comparisonResults).some(diffs => diffs.length > 0);
  
  if (hasIssues) {
    console.log('1. Run the fix-translations-final.js script to align all structures');
    console.log('2. Consider creating a translation mapping file for proper key-to-key translations');
    console.log('3. Implement a validation step in your build process to catch structure mismatches');
    console.log('4. Use the English structure as the single source of truth');
  } else {
    console.log('✅ All language files are structurally aligned with English!');
    console.log('   You can now focus on translating the actual content.');
  }
  
  console.log('\n' + '='.repeat(80));
}

// Run the comparison
main().catch(console.error);