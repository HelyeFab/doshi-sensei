#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function deleteAllNetlifyEnv() {
  console.log('⚠️  WARNING: This will delete ALL environment variables from Netlify!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  // Give user time to cancel
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    // First, get list of all environment variables
    console.log('🔍 Fetching list of environment variables...');
    const { stdout } = await execPromise('netlify env:list');
    
    // Parse variable names from output
    const lines = stdout.split('\n');
    const varNames = [];
    
    lines.forEach(line => {
      // Skip headers and empty lines
      if (line.includes('─') || !line.trim() || line.includes('Variable Name')) return;
      
      // Extract variable name (first column)
      const match = line.match(/^(\S+)/);
      if (match) {
        varNames.push(match[1]);
      }
    });
    
    if (varNames.length === 0) {
      console.log('✅ No environment variables found to delete.');
      return;
    }
    
    console.log(`\n📋 Found ${varNames.length} variables to delete:`);
    varNames.forEach(name => console.log(`   - ${name}`));
    
    console.log('\n🗑️  Deleting variables...');
    
    // Delete each variable
    for (const varName of varNames) {
      try {
        await execPromise(`netlify env:unset ${varName}`);
        console.log(`   ✅ Deleted: ${varName}`);
      } catch (error) {
        console.log(`   ❌ Failed to delete ${varName}: ${error.message}`);
      }
    }
    
    console.log('\n✅ All environment variables have been deleted from Netlify!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the deletion
deleteAllNetlifyEnv();