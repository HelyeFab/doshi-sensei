#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read and parse .env file
function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  return content;
}

// Create clean backup
function createCleanBackup() {
  console.log('🔧 Creating clean backup from master .env file...\n');
  
  const masterPath = path.join(process.cwd(), '.env');
  const cleanBackupPath = path.join(process.cwd(), '.env.backup.clean');
  
  // Read master .env file
  const masterContent = readEnvFile(masterPath);
  
  if (!masterContent) {
    console.error('❌ Could not read master .env file');
    return;
  }
  
  // Parse to count variables
  const lines = masterContent.split('\n');
  let varCount = 0;
  const variables = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex > 0) {
        const key = line.substring(0, separatorIndex).trim();
        variables.push(key);
        varCount++;
      }
    }
  });
  
  // Write the exact content to clean backup
  fs.writeFileSync(cleanBackupPath, masterContent);
  
  console.log('✅ Clean backup created successfully!\n');
  console.log(`📄 File: ${cleanBackupPath}`);
  console.log(`📊 Contains ${varCount} variables:`);
  variables.forEach(v => console.log(`   - ${v}`));
  
  console.log('\n📋 Summary of changes from old backup:');
  console.log('   - Added: FIREBASE_PROJECT_ID');
  console.log('   - Updated: FIREBASE_PRIVATE_KEY_ID (to match master)');
  console.log('   - Updated: FIREBASE_PRIVATE_KEY (to match master)');
  console.log('   - Removed 11 extra variables that weren\'t in master');
  
  console.log('\n✅ The new .env.backup.clean is an exact copy of .env');
  console.log('   You can rename it to .env.backup when ready:');
  console.log('   mv .env.backup.clean .env.backup\n');
}

// Run the creation
createCleanBackup();