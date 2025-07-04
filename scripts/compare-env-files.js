#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse .env file format
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const vars = {};
  
  content.split('\n').forEach(line => {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) return;
    
    // Handle KEY=VALUE format
    const separatorIndex = line.indexOf('=');
    if (separatorIndex > 0) {
      const key = line.substring(0, separatorIndex).trim();
      const value = line.substring(separatorIndex + 1);
      vars[key] = value;
    }
  });
  
  return vars;
}

// Compare two env objects
function compareEnvFiles(masterPath, backupPath) {
  console.log('🔍 Comparing environment files...\n');
  console.log(`📄 Master: ${masterPath}`);
  console.log(`📄 Backup: ${backupPath}\n`);
  
  const master = parseEnvFile(masterPath);
  const backup = parseEnvFile(backupPath);
  
  if (!master) {
    console.error(`❌ Master file not found: ${masterPath}`);
    return;
  }
  
  if (!backup) {
    console.error(`❌ Backup file not found: ${backupPath}`);
    return;
  }
  
  const masterKeys = Object.keys(master);
  const backupKeys = Object.keys(backup);
  
  // Track all unique keys
  const allKeys = new Set([...masterKeys, ...backupKeys]);
  
  let differences = 0;
  const report = {
    missingInBackup: [],
    extraInBackup: [],
    differentValues: [],
    matching: []
  };
  
  // Check each key
  allKeys.forEach(key => {
    if (master.hasOwnProperty(key) && !backup.hasOwnProperty(key)) {
      report.missingInBackup.push(key);
      differences++;
    } else if (!master.hasOwnProperty(key) && backup.hasOwnProperty(key)) {
      report.extraInBackup.push(key);
      differences++;
    } else if (master[key] !== backup[key]) {
      report.differentValues.push({
        key,
        masterLength: master[key].length,
        backupLength: backup[key].length,
        preview: {
          master: master[key].substring(0, 50) + (master[key].length > 50 ? '...' : ''),
          backup: backup[key].substring(0, 50) + (backup[key].length > 50 ? '...' : '')
        }
      });
      differences++;
    } else {
      report.matching.push(key);
    }
  });
  
  // Display report
  console.log('📊 COMPARISON REPORT\n');
  console.log(`Total variables in master: ${masterKeys.length}`);
  console.log(`Total variables in backup: ${backupKeys.length}`);
  console.log(`Differences found: ${differences}\n`);
  
  if (report.matching.length > 0) {
    console.log(`✅ ${report.matching.length} variables match perfectly:`);
    report.matching.forEach(key => console.log(`   - ${key}`));
    console.log('');
  }
  
  if (report.missingInBackup.length > 0) {
    console.log(`⚠️  ${report.missingInBackup.length} variables in master but MISSING in backup:`);
    report.missingInBackup.forEach(key => {
      console.log(`   - ${key}`);
      console.log(`     Action: Add to backup with value from master`);
    });
    console.log('');
  }
  
  if (report.extraInBackup.length > 0) {
    console.log(`❌ ${report.extraInBackup.length} variables in backup but NOT in master:`);
    report.extraInBackup.forEach(key => {
      console.log(`   - ${key}`);
      console.log(`     Action: Should be removed from backup (master wins)`);
    });
    console.log('');
  }
  
  if (report.differentValues.length > 0) {
    console.log(`⚠️  ${report.differentValues.length} variables have DIFFERENT values:`);
    report.differentValues.forEach(({key, masterLength, backupLength, preview}) => {
      console.log(`   - ${key}`);
      console.log(`     Master length: ${masterLength} chars`);
      console.log(`     Backup length: ${backupLength} chars`);
      if (masterLength !== backupLength) {
        console.log(`     Length difference: ${Math.abs(masterLength - backupLength)} chars`);
      }
      console.log(`     Action: Update backup to match master value`);
    });
    console.log('');
  }
  
  // Summary
  if (differences === 0) {
    console.log('✅ RESULT: Files are identical! No action needed.\n');
  } else {
    console.log('❌ RESULT: Files differ. Backup needs to be updated to match master.\n');
    console.log('🔧 To fix: Copy .env to .env.backup or run:');
    console.log('   cp .env .env.backup\n');
  }
}

// Run comparison
const masterFile = path.join(process.cwd(), '.env');
const backupFile = path.join(process.cwd(), '.env.backup');

compareEnvFiles(masterFile, backupFile);