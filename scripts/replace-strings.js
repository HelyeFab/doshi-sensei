#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  mappingFile: 'extracted-strings/string-mapping.json',
  backupDir: 'backup-before-i18n',
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose')
};

// Helper functions
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createBackup(filePath) {
  const backupPath = path.join(CONFIG.backupDir, path.relative('.', filePath));
  ensureDirectoryExists(path.dirname(backupPath));
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function addImportIfNeeded(content, filePath) {
  // Check if useStrings is already imported
  if (content.includes("useStrings") || content.includes("@/hooks/useLanguage")) {
    return content;
  }
  
  // Find the last import statement
  const importRegex = /^import.*from.*;?\s*$/gm;
  let lastImportIndex = 0;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    lastImportIndex = match.index + match[0].length;
  }
  
  // Add the import after the last import
  const importStatement = "\nimport { useStrings } from '@/hooks/useLanguage';\n";
  return content.slice(0, lastImportIndex) + importStatement + content.slice(lastImportIndex);
}

function addStringsHookIfNeeded(content, filePath) {
  // Check if component already uses strings
  if (content.includes("const strings = useStrings()")) {
    return content;
  }
  
  // Find the component function
  const componentRegex = /(?:export\s+(?:default\s+)?)?function\s+\w+\s*\([^)]*\)\s*{/g;
  const match = componentRegex.exec(content);
  
  if (match) {
    const insertIndex = match.index + match[0].length;
    const hookStatement = "\n  const strings = useStrings();\n";
    return content.slice(0, insertIndex) + hookStatement + content.slice(insertIndex);
  }
  
  return content;
}

function replaceStringsInFile(filePath, mappings) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return { replaced: 0, errors: 1 };
  }
  
  // Create backup
  if (!CONFIG.dryRun) {
    createBackup(filePath);
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let replaced = 0;
  let needsStringsImport = false;
  
  // Filter mappings for this file
  const fileMappings = mappings.filter(m => m.file === filePath);
  
  if (fileMappings.length === 0) {
    return { replaced: 0, errors: 0 };
  }
  
  // Sort mappings by line number in reverse order to avoid position shifts
  fileMappings.sort((a, b) => b.line - a.line);
  
  // Replace each string
  fileMappings.forEach(mapping => {
    const { original, key, type } = mapping;
    let searchPattern;
    let replacement;
    
    switch (type) {
      case 'jsx':
        // Replace >text< with >{strings.key}<
        searchPattern = new RegExp(`>\\s*${escapeRegex(original)}\\s*<`, 'g');
        replacement = `>{strings['${key}']}<`;
        break;
        
      case 'prop':
        // Replace prop="text" with prop={strings.key}
        searchPattern = new RegExp(`((?:title|placeholder|label|aria-label|alt|name|description|message|error|success|content|heading|text)=)["']${escapeRegex(original)}["']`, 'g');
        replacement = `$1{strings['${key}']}`;
        break;
        
      case 'button':
        // Replace <Button>text</Button> with <Button>{strings.key}</Button>
        searchPattern = new RegExp(`(<(?:button|Button|Link|a)[^>]*>)\\s*${escapeRegex(original)}\\s*<`, 'g');
        replacement = `$1{strings['${key}']}<`;
        break;
        
      case 'toast':
        // Replace toast.success("text") with toast.success(strings.key)
        searchPattern = new RegExp(`(toast\\.(?:success|error|info|warning)\\s*\\()\\s*["']${escapeRegex(original)}["']`, 'g');
        replacement = `$1strings['${key}']`;
        break;
        
      default:
        return;
    }
    
    const newContent = content.replace(searchPattern, replacement);
    if (newContent !== content) {
      content = newContent;
      replaced++;
      needsStringsImport = true;
      
      if (CONFIG.verbose) {
        console.log(`  ✓ Replaced "${original}" with strings['${key}']`);
      }
    }
  });
  
  // Add import and hook if replacements were made
  if (needsStringsImport && replaced > 0) {
    content = addImportIfNeeded(content, filePath);
    content = addStringsHookIfNeeded(content, filePath);
  }
  
  // Write the file
  if (!CONFIG.dryRun && replaced > 0) {
    fs.writeFileSync(filePath, content);
  }
  
  return { replaced, errors: 0 };
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Main execution
function main() {
  console.log('🔄 Doshi Sensei String Replacement Tool\n');
  
  if (CONFIG.dryRun) {
    console.log('🏃 Running in DRY RUN mode - no files will be modified\n');
  }
  
  // Load mappings
  if (!fs.existsSync(CONFIG.mappingFile)) {
    console.error(`❌ Mapping file not found: ${CONFIG.mappingFile}`);
    console.error('   Run extract-strings.js first to generate the mapping file.');
    process.exit(1);
  }
  
  const mappings = JSON.parse(fs.readFileSync(CONFIG.mappingFile, 'utf8'));
  console.log(`📋 Loaded ${mappings.length} string mappings\n`);
  
  // Group mappings by file
  const fileGroups = {};
  mappings.forEach(mapping => {
    if (!fileGroups[mapping.file]) {
      fileGroups[mapping.file] = [];
    }
    fileGroups[mapping.file].push(mapping);
  });
  
  // Process each file
  let totalReplaced = 0;
  let totalErrors = 0;
  
  Object.entries(fileGroups).forEach(([filePath, fileMappings]) => {
    console.log(`📄 Processing ${filePath} (${fileMappings.length} strings)...`);
    const { replaced, errors } = replaceStringsInFile(filePath, fileMappings);
    totalReplaced += replaced;
    totalErrors += errors;
    
    if (replaced > 0) {
      console.log(`   ✅ Replaced ${replaced} strings`);
    } else if (errors > 0) {
      console.log(`   ❌ Errors: ${errors}`);
    } else {
      console.log(`   ⏭️  No replacements made`);
    }
  });
  
  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   - Files processed: ${Object.keys(fileGroups).length}`);
  console.log(`   - Strings replaced: ${totalReplaced}`);
  console.log(`   - Errors: ${totalErrors}`);
  
  if (!CONFIG.dryRun) {
    console.log(`\n📁 Backups saved to: ${CONFIG.backupDir}/`);
    console.log('\n⚠️  Important next steps:');
    console.log('1. Review the changes in your code');
    console.log('2. Add the new translation keys to your language files');
    console.log('3. Test that everything still works correctly');
  } else {
    console.log('\n💡 Run without --dry-run to apply the changes');
  }
}

// Run the script
main();