#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const CONFIG = {
  mcpPath: '/home/mate/Dev/MCPs/translator-mcp/dist/index.js',
  projectPath: '/home/mate/Dev/NextProjects/doshi-sensei',
  stringsPath: '/home/mate/Dev/NextProjects/doshi-sensei/src/config/strings/strings',
  targetLanguages: ['fr', 'it', 'de', 'es', 'ar', 'ko'],
  cleanedStringsFile: 'extracted-strings/cleaned-strings.json'
};

// Prepare strings-english.ts from cleaned strings
function prepareEnglishStrings() {
  console.log('📝 Preparing strings-english.ts...');
  
  // Read existing en.ts
  const enPath = path.join(CONFIG.projectPath, 'src/config/strings/en.ts');
  const enContent = fs.readFileSync(enPath, 'utf8');
  
  // Read cleaned strings
  const cleanedData = JSON.parse(fs.readFileSync(CONFIG.cleanedStringsFile, 'utf8'));
  const { strings: cleanedStrings } = cleanedData;
  
  // Parse existing en object
  const match = enContent.match(/export const en = ({[\s\S]*});/);
  if (!match) {
    console.error('Could not parse en.ts');
    return false;
  }
  
  try {
    const enObj = eval(`(${match[1]})`);
    
    // Add extracted strings section
    if (!enObj.extracted) {
      enObj.extracted = {};
    }
    
    // Add all cleaned strings
    Object.entries(cleanedStrings).forEach(([key, value]) => {
      enObj.extracted[key] = value;
    });
    
    // Create strings-english.ts
    const outputContent = `export const strings = ${JSON.stringify(enObj, null, 2)};

export type StringKeys = keyof typeof strings;
`;
    
    const outputPath = path.join(CONFIG.projectPath, 'src/config/strings/strings-english.ts');
    fs.writeFileSync(outputPath, outputContent);
    console.log(`✅ Created ${outputPath}`);
    
    return true;
  } catch (error) {
    console.error('Error preparing strings:', error);
    return false;
  }
}

// Send request to MCP
async function callMCP(method, params) {
  return new Promise((resolve, reject) => {
    const mcp = spawn('node', [CONFIG.mcpPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let responseData = '';
    let errorData = '';
    let requestId = Date.now();
    
    // Handle stdout
    const rl = readline.createInterface({
      input: mcp.stdout,
      crlfDelay: Infinity
    });
    
    rl.on('line', (line) => {
      if (line.trim()) {
        try {
          const msg = JSON.parse(line);
          if (msg.jsonrpc === '2.0' && msg.id === requestId) {
            if (msg.result) {
              resolve(msg.result);
            } else if (msg.error) {
              reject(new Error(msg.error.message || 'Unknown error'));
            }
            mcp.kill();
          }
        } catch (e) {
          // Not JSON, might be initialization message
          console.log('MCP:', line);
        }
      }
    });
    
    // Handle stderr
    mcp.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    mcp.on('error', (error) => {
      reject(error);
    });
    
    mcp.on('close', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`MCP exited with code ${code}: ${errorData}`));
      }
    });
    
    // Send initialization
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
      id: requestId - 1
    };
    
    mcp.stdin.write(JSON.stringify(initRequest) + '\n');
    
    // Send the actual request after a short delay
    setTimeout(() => {
      const request = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: method,
          arguments: params
        },
        id: requestId
      };
      
      console.log(`\n📤 Sending ${method} request...`);
      mcp.stdin.write(JSON.stringify(request) + '\n');
    }, 100);
  });
}

// Main function
async function main() {
  console.log('🌐 Doshi Sensei Translator MCP Integration\n');
  
  // Check for API key
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GOOGLE_TRANSLATE_API_KEY environment variable not set!');
    console.log('\nTo get real translations:');
    console.log('1. Get a Google Translate API key from Google Cloud Console');
    console.log('2. Set it: export GOOGLE_TRANSLATE_API_KEY="your-key"');
    console.log('3. Run this script again\n');
    console.log('For now, you can use the mock translations already generated.');
    return;
  }
  
  try {
    // Step 1: Prepare English strings
    if (!prepareEnglishStrings()) {
      console.error('Failed to prepare English strings');
      return;
    }
    
    // Step 2: Analyze project (optional, for info)
    console.log('\n📊 Analyzing project...');
    const analysis = await callMCP('analyze_project', {
      projectPath: CONFIG.projectPath,
      stringsPath: CONFIG.stringsPath
    });
    
    console.log('Analysis results:', analysis.content?.[0]?.text || analysis);
    
    // Step 3: Translate strings
    console.log('\n🔄 Translating strings...');
    const translation = await callMCP('translate_strings', {
      stringsPath: CONFIG.stringsPath,
      targetLanguages: CONFIG.targetLanguages,
      apiKey: apiKey
    });
    
    console.log('Translation results:', translation.content?.[0]?.text || translation);
    
    // Step 4: Convert translated files to our format
    console.log('\n📦 Converting translations to project format...');
    convertTranslations();
    
    console.log('\n✅ Translation complete!');
    console.log('\n📁 Generated files:');
    CONFIG.targetLanguages.forEach(lang => {
      console.log(`   - src/config/strings/translations/${lang}.ts`);
    });
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Ensure the MCP is built: cd /home/mate/Dev/MCPs/translator-mcp && npm run build');
    console.log('2. Check your Google Translate API key is valid');
    console.log('3. Try running the MCP directly to test it');
  }
}

// Convert MCP-generated files to our format
function convertTranslations() {
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
  
  CONFIG.targetLanguages.forEach(langCode => {
    const langName = langMap[langCode];
    const mcpFile = path.join(CONFIG.projectPath, 'src/config/strings', `strings-${langName}.ts`);
    
    if (fs.existsSync(mcpFile)) {
      console.log(`   Converting ${langName}...`);
      
      // Read MCP file
      const content = fs.readFileSync(mcpFile, 'utf8');
      
      // Extract strings object
      const match = content.match(/export const strings = ({[\s\S]*});/);
      if (!match) {
        console.error(`   ❌ Could not parse ${mcpFile}`);
        return;
      }
      
      try {
        const translatedObj = eval(`(${match[1]})`);
        
        // Create our format
        const ourContent = `// Auto-generated translation file for ${langName.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Translated using Google Translate API

export const ${langCode} = ${JSON.stringify(translatedObj, null, 2)};

export type ${langCode.toUpperCase()}Keys = keyof typeof ${langCode};
`;
        
        const ourFile = path.join(translationsDir, `${langCode}.ts`);
        fs.writeFileSync(ourFile, ourContent);
        console.log(`   ✅ Created ${langCode}.ts`);
        
      } catch (error) {
        console.error(`   ❌ Error converting ${langName}:`, error);
      }
    } else {
      console.log(`   ⚠️  ${langName} file not found: ${mcpFile}`);
    }
  });
}

// Run the script
main();