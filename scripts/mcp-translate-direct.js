#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load the MCP's .env file
const mcpEnvPath = '/home/mate/Dev/MCPs/translator-mcp/.env';
const mcpEnv = dotenv.parse(fs.readFileSync(mcpEnvPath));

console.log('🔑 Using Google Translate API from MCP .env');

// First, let's analyze the project
async function runMCPCommand(command, args) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      GOOGLE_TRANSLATE_API_KEY: mcpEnv.GOOGLE_TRANSLATE_API_KEY
    };
    
    // Build the command based on MCP's expected format
    const request = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: command,
        arguments: args
      },
      id: Date.now()
    };
    
    const mcp = spawn('node', ['/home/mate/Dev/MCPs/translator-mcp/dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env
    });
    
    let output = '';
    let hasInitialized = false;
    
    mcp.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        try {
          const parsed = JSON.parse(line);
          
          if (parsed.id === 1 && parsed.result) {
            // Initialization complete
            hasInitialized = true;
            // Send our actual request
            mcp.stdin.write(JSON.stringify(request) + '\n');
          } else if (parsed.id === request.id) {
            // Our request response
            resolve(parsed);
            mcp.kill();
          }
        } catch (e) {
          console.log('MCP Output:', line);
        }
      });
    });
    
    mcp.stderr.on('data', (data) => {
      console.error('MCP Error:', data.toString());
    });
    
    mcp.on('error', (error) => {
      reject(error);
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
      id: 1
    };
    
    mcp.stdin.write(JSON.stringify(initRequest) + '\n');
  });
}

async function main() {
  try {
    console.log('\n📊 Step 1: Analyzing project...\n');
    
    const analyzeResult = await runMCPCommand('analyze_project', {
      projectPath: '/home/mate/Dev/NextProjects/doshi-sensei',
      stringsPath: '/home/mate/Dev/NextProjects/doshi-sensei/src/config/strings/strings'
    });
    
    console.log('Analysis Result:', JSON.stringify(analyzeResult.result, null, 2));
    
    console.log('\n🔄 Step 2: Translating strings...\n');
    
    const translateResult = await runMCPCommand('translate_strings', {
      stringsPath: '/home/mate/Dev/NextProjects/doshi-sensei/src/config/strings/strings',
      targetLanguages: ['fr', 'it', 'de', 'es', 'ar', 'ko'],
      apiKey: mcpEnv.GOOGLE_TRANSLATE_API_KEY
    });
    
    console.log('Translation Result:', JSON.stringify(translateResult.result, null, 2));
    
    // Check what files were created
    console.log('\n📁 Checking created files...\n');
    
    const stringsDir = '/home/mate/Dev/NextProjects/doshi-sensei/src/config/strings';
    const files = fs.readdirSync(stringsDir).filter(f => f.startsWith('strings-'));
    
    console.log('Found translation files:', files);
    
    // Convert them to our format
    if (files.length > 0) {
      console.log('\n📦 Converting to project format...\n');
      
      const langMap = {
        'strings-french.ts': 'fr',
        'strings-italian.ts': 'it',
        'strings-german.ts': 'de',
        'strings-spanish.ts': 'es',
        'strings-arabic.ts': 'ar',
        'strings-korean.ts': 'ko'
      };
      
      const translationsDir = path.join(stringsDir, 'translations');
      
      files.forEach(file => {
        const langCode = langMap[file];
        if (langCode) {
          const sourcePath = path.join(stringsDir, file);
          const content = fs.readFileSync(sourcePath, 'utf8');
          
          // Convert format
          const newContent = content
            .replace('export const strings =', `export const ${langCode} =`)
            .replace('export type StringKeys =', `export type ${langCode.toUpperCase()}Keys =`)
            .replace('keyof typeof strings;', `keyof typeof ${langCode};`);
          
          const targetPath = path.join(translationsDir, `${langCode}.ts`);
          fs.writeFileSync(targetPath, newContent);
          console.log(`✅ Created ${langCode}.ts`);
        }
      });
      
      console.log('\n🎉 Translation complete!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();