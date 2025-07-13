#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const dotenv = require('dotenv');

// Load the MCP's .env file
const mcpEnvPath = '/home/mate/Dev/MCPs/translator-mcp/.env';
const mcpEnv = dotenv.parse(fs.readFileSync(mcpEnvPath));

// Configuration
const CONFIG = {
  mcpPath: '/home/mate/Dev/MCPs/translator-mcp/dist/index.js',
  projectPath: '/home/mate/Dev/NextProjects/doshi-sensei',
  stringsPath: '/home/mate/Dev/NextProjects/doshi-sensei/src/config/strings/strings',
  targetLanguages: ['fr', 'it', 'de', 'es', 'ar', 'ko'],
  cleanedStringsFile: 'extracted-strings/cleaned-strings.json',
  apiKey: mcpEnv.GOOGLE_TRANSLATE_API_KEY
};

console.log('🔑 Using API key from MCP .env file');

// Prepare strings-english.ts from en-merged.ts
function prepareEnglishStrings() {
  console.log('📝 Preparing strings-english.ts from en-merged.ts...');
  
  // Read the merged file we created earlier
  const mergedPath = path.join(CONFIG.projectPath, 'src/config/strings/en-merged.ts');
  
  if (!fs.existsSync(mergedPath)) {
    console.error('❌ en-merged.ts not found. Run merge-with-existing-en.js first.');
    return false;
  }
  
  const mergedContent = fs.readFileSync(mergedPath, 'utf8');
  
  // Convert to MCP format
  const newContent = mergedContent.replace('export const en =', 'export const strings =');
  
  const outputPath = path.join(CONFIG.projectPath, 'src/config/strings/strings-english.ts');
  fs.writeFileSync(outputPath, newContent);
  console.log(`✅ Created ${outputPath}`);
  
  return true;
}

// Call MCP directly using spawn
async function translateWithMCP() {
  return new Promise((resolve, reject) => {
    console.log('\n🔄 Starting translator MCP...');
    
    const env = {
      ...process.env,
      GOOGLE_TRANSLATE_API_KEY: CONFIG.apiKey
    };
    
    const mcp = spawn('node', [CONFIG.mcpPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env
    });
    
    let output = '';
    let errorOutput = '';
    
    // Handle stdout line by line
    const rl = readline.createInterface({
      input: mcp.stdout,
      crlfDelay: Infinity
    });
    
    rl.on('line', (line) => {
      console.log('MCP:', line);
      output += line + '\n';
    });
    
    mcp.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    mcp.on('error', (error) => {
      reject(error);
    });
    
    mcp.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`MCP exited with code ${code}: ${errorOutput}`));
      } else {
        resolve(output);
      }
    });
    
    // Send initialization
    setTimeout(() => {
      const initRequest = {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'translator-script',
            version: '1.0.0'
          }
        },
        id: 1
      };
      
      mcp.stdin.write(JSON.stringify(initRequest) + '\n');
    }, 100);
    
    // Send translate request
    setTimeout(() => {
      const translateRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'translate_strings',
          arguments: {
            stringsPath: CONFIG.stringsPath,
            targetLanguages: CONFIG.targetLanguages,
            apiKey: CONFIG.apiKey
          }
        },
        id: 2
      };
      
      console.log(`\n📤 Sending translation request for languages: ${CONFIG.targetLanguages.join(', ')}`);
      mcp.stdin.write(JSON.stringify(translateRequest) + '\n');
      
      // Give it time to process, then close
      setTimeout(() => {
        mcp.stdin.end();
      }, 30000); // 30 seconds should be enough for translation
    }, 500);
  });
}

// Convert MCP output to our format
function convertTranslations() {
  console.log('\n📦 Converting translations...');
  
  const translationsDir = path.join(CONFIG.projectPath, 'src/config/strings/translations');
  if (!fs.existsSync(translationsDir)) {
    fs.mkdirSync(translationsDir, { recursive: true });
  }
  
  const langMap = {
    'fr': 'french',
    'it': 'italian',
    'de': 'german',
    'es': 'spanish',
    'ar': 'arabic',
    'ko': 'korean'
  };
  
  let successCount = 0;
  
  CONFIG.targetLanguages.forEach(langCode => {
    const langName = langMap[langCode];
    const mcpFile = path.join(CONFIG.projectPath, 'src/config/strings', `strings-${langName}.ts`);
    
    if (fs.existsSync(mcpFile)) {
      console.log(`\n📄 Processing ${langName}...`);
      
      try {
        // Read the MCP-generated file
        const content = fs.readFileSync(mcpFile, 'utf8');
        
        // Convert to our format
        const ourContent = content
          .replace('export const strings =', `export const ${langCode} =`)
          .replace('export type StringKeys =', `export type ${langCode.toUpperCase()}Keys =`)
          .replace('keyof typeof strings;', `keyof typeof ${langCode};`);
        
        // Add header
        const finalContent = `// Auto-generated translation file for ${langName.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Translated using Google Translate API via MCP

${ourContent}`;
        
        const ourFile = path.join(translationsDir, `${langCode}.ts`);
        fs.writeFileSync(ourFile, finalContent);
        console.log(`   ✅ Created ${langCode}.ts`);
        successCount++;
        
      } catch (error) {
        console.error(`   ❌ Error processing ${langName}:`, error.message);
      }
    } else {
      console.log(`   ⚠️  ${langName} file not found: ${mcpFile}`);
    }
  });
  
  return successCount;
}

// Main function
async function main() {
  console.log('🌐 Doshi Sensei Real Translation with MCP\n');
  
  try {
    // Step 1: Prepare English strings
    if (!prepareEnglishStrings()) {
      return;
    }
    
    // Step 2: Run MCP translation
    await translateWithMCP();
    
    // Wait a bit for files to be written
    console.log('\n⏳ Waiting for translation files...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Convert translations
    const converted = convertTranslations();
    
    if (converted > 0) {
      console.log(`\n✅ Successfully translated to ${converted} languages!`);
      console.log('\n🎉 Real translations complete!');
      console.log('\nNext steps:');
      console.log('1. Test the translations in your app');
      console.log('2. Review and adjust any translations as needed');
      console.log('3. Consider running replace-strings.js to update components');
    } else {
      console.log('\n⚠️  No translations were converted. Check the MCP output above for errors.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check the MCP output above for specific errors');
    console.log('2. Verify your Google Translate API key is valid');
    console.log('3. Check your Google Cloud Console for API quotas');
  }
}

// Run the script
main();