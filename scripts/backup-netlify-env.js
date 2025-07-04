#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const util = require('util');
const execPromise = util.promisify(exec);

async function backupNetlifyEnv() {
  try {
    console.log('🔍 Fetching environment variables from Netlify...');
    
    const backupFile = '.env.backup';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const timestampedBackup = `.env.backup.${timestamp}`;
    
    // Use the --plain flag to get .env format output
    const { stdout, stderr } = await execPromise('netlify env:list --plain');
    
    if (stderr) {
      console.warn('⚠️  Warning:', stderr);
    }
    
    if (stdout && stdout.trim()) {
      // Save to both files
      fs.writeFileSync(backupFile, stdout);
      fs.writeFileSync(timestampedBackup, stdout);
      
      // Count variables
      const varCount = stdout.split('\n').filter(line => 
        line.trim() && !line.startsWith('#')
      ).length;
      
      console.log(`\n✅ Backed up ${varCount} environment variables`);
      console.log(`📁 Saved to: ${backupFile}`);
      console.log(`📁 Timestamped copy: ${timestampedBackup}`);
      console.log('\n⚠️  Remember to add these to your .gitignore:');
      console.log('   .env.backup');
      console.log('   .env.backup.*');
    } else {
      console.log('❌ No environment variables found or empty output');
    }
    
  } catch (error) {
    console.error('❌ Error backing up environment variables:', error.message);
    console.log('\n📋 Alternative methods:');
    console.log('1. Netlify UI: Site Settings → Environment variables → Click clipboard icon');
    console.log('2. Try with context: netlify env:list --plain --context production');
    console.log('3. Manual export: netlify env:list');
  }
}

// Run the backup
backupNetlifyEnv();