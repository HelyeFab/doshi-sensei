#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
  inputFile: 'extracted-strings/structured-strings.json',
  outputDir: 'src/config/strings/generated',
  mcpPath: '/home/mate/Dev/MCPs/translator-mcp',
  targetLanguages: ['ja', 'fr', 'de', 'es', 'it', 'ko', 'zh'],
  batchSize: 50, // Process strings in batches to avoid overwhelming the MCP
};

// Helper functions
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function callTranslatorMCP(text, targetLang, sourceLang = 'en') {
  return new Promise((resolve, reject) => {
    // This is a placeholder - you'll need to adjust based on your MCP's actual interface
    const mcpProcess = spawn('node', [
      path.join(CONFIG.mcpPath, 'index.js'),
      '--translate',
      '--source', sourceLang,
      '--target', targetLang,
      '--text', text
    ]);

    let output = '';
    let error = '';

    mcpProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    mcpProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    mcpProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`MCP exited with code ${code}: ${error}`));
      } else {
        resolve(output.trim());
      }
    });
  });
}

async function translateBatch(strings, targetLang) {
  const translations = {};
  
  for (const [key, text] of Object.entries(strings)) {
    try {
      console.log(`  Translating: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      const translated = await callTranslatorMCP(text, targetLang);
      translations[key] = translated;
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  ❌ Failed to translate "${key}": ${error.message}`);
      translations[key] = text; // Fallback to original
    }
  }
  
  return translations;
}

async function generateTranslationFile(language, translations) {
  const fileName = `${language}.ts`;
  const filePath = path.join(CONFIG.outputDir, fileName);
  
  // Generate TypeScript content
  const content = `// Auto-generated translation file for ${language.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Source: English (en)

export const ${language} = ${JSON.stringify(translations, null, 2)};

export type ${language.toUpperCase()}Keys = keyof typeof ${language};
`;

  fs.writeFileSync(filePath, content);
  console.log(`✅ Generated ${filePath}`);
}

async function main() {
  console.log('🌐 Doshi Sensei MCP Translation Tool\n');
  
  // Load extracted strings
  if (!fs.existsSync(CONFIG.inputFile)) {
    console.error(`❌ Input file not found: ${CONFIG.inputFile}`);
    console.error('   Run extract-strings.js first to generate the structured strings.');
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(CONFIG.inputFile, 'utf8'));
  const { sections } = data;
  
  // Flatten all strings
  const allStrings = {};
  Object.values(sections).forEach(section => {
    Object.values(section).forEach(component => {
      Object.assign(allStrings, component);
    });
  });
  
  console.log(`📋 Loaded ${Object.keys(allStrings).length} strings to translate\n`);
  
  // Ensure output directory exists
  ensureDirectoryExists(CONFIG.outputDir);
  
  // Process each language
  for (const targetLang of CONFIG.targetLanguages) {
    console.log(`\n🔄 Translating to ${targetLang.toUpperCase()}...`);
    
    const translations = {};
    const entries = Object.entries(allStrings);
    
    // Process in batches
    for (let i = 0; i < entries.length; i += CONFIG.batchSize) {
      const batch = entries.slice(i, i + CONFIG.batchSize);
      const batchObj = Object.fromEntries(batch);
      
      console.log(`  Processing batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(entries.length / CONFIG.batchSize)}...`);
      
      try {
        const batchTranslations = await translateBatch(batchObj, targetLang);
        Object.assign(translations, batchTranslations);
      } catch (error) {
        console.error(`  ❌ Batch translation failed: ${error.message}`);
      }
    }
    
    // Generate translation file
    await generateTranslationFile(targetLang, translations);
  }
  
  // Generate index file
  const indexContent = `// Auto-generated index file for translations
// Generated on: ${new Date().toISOString()}

${CONFIG.targetLanguages.map(lang => `export { ${lang} } from './${lang}';`).join('\n')}

// Re-export existing languages
export { en } from '../en';
export { fr } from '../fr';
`;

  fs.writeFileSync(path.join(CONFIG.outputDir, 'index.ts'), indexContent);
  
  console.log('\n🎉 Translation complete!');
  console.log('\nNext steps:');
  console.log('1. Review the generated translations in', CONFIG.outputDir);
  console.log('2. Update src/config/strings/index.ts to include the new languages');
  console.log('3. Test the translations in your application');
}

// Alternative: Simple JSON-based translation for testing
async function generateMockTranslations() {
  console.log('🔧 Generating mock translations for testing...\n');
  
  if (!fs.existsSync(CONFIG.inputFile)) {
    console.error(`❌ Input file not found: ${CONFIG.inputFile}`);
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(CONFIG.inputFile, 'utf8'));
  const enStrings = JSON.parse(fs.readFileSync('extracted-strings/extracted-en.json', 'utf8'));
  
  ensureDirectoryExists(CONFIG.outputDir);
  
  // Generate simple mock translations
  const mockTranslations = {
    ja: mockTranslate(enStrings, 'ja'),
    fr: mockTranslate(enStrings, 'fr'),
    de: mockTranslate(enStrings, 'de'),
    es: mockTranslate(enStrings, 'es'),
  };
  
  Object.entries(mockTranslations).forEach(([lang, translations]) => {
    generateTranslationFile(lang, translations);
  });
  
  console.log('\n✅ Mock translations generated!');
}

function mockTranslate(strings, targetLang) {
  const translations = {};
  const prefixes = {
    ja: '【JA】',
    fr: '【FR】',
    de: '【DE】',
    es: '【ES】',
    it: '【IT】',
    ko: '【KO】',
    zh: '【ZH】'
  };
  
  Object.entries(strings).forEach(([key, value]) => {
    translations[key] = `${prefixes[targetLang] || '[??]'} ${value}`;
  });
  
  return translations;
}

// Check command line arguments
if (process.argv.includes('--mock')) {
  generateMockTranslations();
} else {
  main().catch(console.error);
}