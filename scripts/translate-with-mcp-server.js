#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
  cleanedStringsFile: 'extracted-strings/cleaned-strings.json',
  outputDir: 'src/config/strings',
  mcpPath: '/home/mate/Dev/MCPs/translator-mcp',
  targetLanguages: {
    'fr': 'french',
    'it': 'italian', 
    'de': 'german',
    'es': 'spanish',
    'ar': 'arabic',
    'ko': 'korean'
  }
};

// Prepare strings in the format expected by the MCP
function prepareStringsForMCP() {
  const cleanedData = JSON.parse(fs.readFileSync(CONFIG.cleanedStringsFile, 'utf8'));
  const { strings } = cleanedData;
  
  // Create a strings object in the MCP's expected format
  const mcpStrings = {
    appName: "Doshi Sensei",
    appDescription: "Learn Japanese with AI assistance",
    
    // Group all strings under common section
    common: {}
  };
  
  // Add all cleaned strings to common section
  Object.entries(strings).forEach(([key, value]) => {
    // Use simpler keys for MCP
    const simpleKey = key.split('_').slice(-2).join('_') || key;
    mcpStrings.common[simpleKey] = value;
  });
  
  return mcpStrings;
}

// Create the strings-english.ts file for MCP
function createEnglishStringsFile() {
  const strings = prepareStringsForMCP();
  
  const content = `export const strings = ${JSON.stringify(strings, null, 2)};

export type StringKeys = keyof typeof strings;
`;
  
  const filePath = path.join(CONFIG.outputDir, 'strings-english.ts');
  fs.writeFileSync(filePath, content);
  console.log(`✅ Created ${filePath}`);
  
  return filePath;
}

// Call the MCP translate_strings tool
async function translateWithMCP(stringsPath, targetLanguages) {
  return new Promise((resolve, reject) => {
    console.log('\n🔄 Calling translator MCP...');
    
    // Prepare the request
    const request = {
      method: 'translate_strings',
      params: {
        stringsPath: stringsPath,
        targetLanguages: Object.keys(targetLanguages),
        apiKey: process.env.GOOGLE_TRANSLATE_API_KEY
      }
    };
    
    // Check if API key is set
    if (!request.params.apiKey) {
      console.error('❌ GOOGLE_TRANSLATE_API_KEY environment variable not set!');
      console.log('\nTo use the translator MCP, you need to:');
      console.log('1. Get a Google Translate API key from Google Cloud Console');
      console.log('2. Set it as an environment variable:');
      console.log('   export GOOGLE_TRANSLATE_API_KEY="your-api-key-here"');
      console.log('\nAlternatively, you can use the mock translations:');
      console.log('   node scripts/translate-with-mcp-server.js --mock');
      reject(new Error('Missing API key'));
      return;
    }
    
    // Call the MCP server
    const mcpProcess = spawn('node', [
      path.join(CONFIG.mcpPath, 'dist/index.js')
    ], {
      env: {
        ...process.env,
        MCP_REQUEST: JSON.stringify(request)
      }
    });
    
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
        console.error(`❌ MCP exited with code ${code}`);
        console.error('Error:', error);
        reject(new Error(error));
      } else {
        console.log('✅ Translation completed');
        resolve(output);
      }
    });
  });
}

// Convert MCP output files to our format
function convertMCPTranslations() {
  const cleanedData = JSON.parse(fs.readFileSync(CONFIG.cleanedStringsFile, 'utf8'));
  const originalStrings = cleanedData.strings;
  
  Object.entries(CONFIG.targetLanguages).forEach(([langCode, langName]) => {
    const mcpFile = path.join(CONFIG.outputDir, `strings-${langName}.ts`);
    
    if (fs.existsSync(mcpFile)) {
      console.log(`\n📄 Processing ${langName} translations...`);
      
      // Read the MCP-generated file
      const content = fs.readFileSync(mcpFile, 'utf8');
      
      // Extract the strings object (this is a bit hacky but works)
      const match = content.match(/export const strings = ({[\s\S]*?});/);
      if (!match) {
        console.error(`❌ Could not parse ${mcpFile}`);
        return;
      }
      
      try {
        // Evaluate the strings object
        const mcpStrings = eval(`(${match[1]})`);
        
        // Map back to our original keys
        const translatedStrings = {};
        
        Object.entries(originalStrings).forEach(([originalKey, originalValue]) => {
          // Find the corresponding translation in MCP output
          const simpleKey = originalKey.split('_').slice(-2).join('_') || originalKey;
          
          if (mcpStrings.common && mcpStrings.common[simpleKey]) {
            translatedStrings[originalKey] = mcpStrings.common[simpleKey];
          } else {
            // Fallback to original if not found
            translatedStrings[originalKey] = originalValue;
          }
        });
        
        // Create our format translation file
        const ourContent = `// Auto-generated translation file for ${langName.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Total strings: ${Object.keys(translatedStrings).length}

export const ${langCode} = ${JSON.stringify(translatedStrings, null, 2)};

export type ${langCode.toUpperCase()}Keys = keyof typeof ${langCode};
`;
        
        const ourFile = path.join(CONFIG.outputDir, 'translations', `${langCode}.ts`);
        
        // Ensure directory exists
        const translationsDir = path.join(CONFIG.outputDir, 'translations');
        if (!fs.existsSync(translationsDir)) {
          fs.mkdirSync(translationsDir, { recursive: true });
        }
        
        fs.writeFileSync(ourFile, ourContent);
        console.log(`✅ Created ${ourFile}`);
        
      } catch (error) {
        console.error(`❌ Error processing ${langName}:`, error);
      }
    }
  });
}

// Generate mock translations for testing
function generateMockTranslations() {
  console.log('🔧 Generating mock translations...\n');
  
  const cleanedData = JSON.parse(fs.readFileSync(CONFIG.cleanedStringsFile, 'utf8'));
  const { strings } = cleanedData;
  
  const translationsDir = path.join(CONFIG.outputDir, 'translations');
  if (!fs.existsSync(translationsDir)) {
    fs.mkdirSync(translationsDir, { recursive: true });
  }
  
  const mockPrefixes = {
    'fr': '🇫🇷 ',
    'it': '🇮🇹 ',
    'de': '🇩🇪 ',
    'es': '🇪🇸 ',
    'ar': '🇸🇦 ',
    'ko': '🇰🇷 '
  };
  
  Object.entries(CONFIG.targetLanguages).forEach(([langCode, langName]) => {
    const translations = {};
    
    Object.entries(strings).forEach(([key, value]) => {
      translations[key] = `${mockPrefixes[langCode]}${value}`;
    });
    
    const content = `// Mock translation file for ${langName.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Total strings: ${Object.keys(translations).length}

export const ${langCode} = ${JSON.stringify(translations, null, 2)};

export type ${langCode.toUpperCase()}Keys = keyof typeof ${langCode};
`;
    
    const filePath = path.join(translationsDir, `${langCode}.ts`);
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created mock ${filePath}`);
  });
}

// Update the main strings index
function updateStringsIndex() {
  const content = `import { en } from './en';
import { fr } from './translations/fr';
import { it } from './translations/it';
import { de } from './translations/de';
import { es } from './translations/es';
import { ar } from './translations/ar';
import { ko } from './translations/ko';

// All available languages
export const strings = {
  en,
  fr,
  it,
  de,
  es,
  ar,
  ko
};

export type Language = keyof typeof strings;
export type StringKeys = keyof typeof en;

// Helper functions
export function getStrings(language: Language = 'en') {
  return strings[language] || strings.en;
}

export function getSupportedLanguages(): Language[] {
  return Object.keys(strings) as Language[];
}

export function isLanguageSupported(language: string): language is Language {
  return language in strings;
}

export function getUserPreferredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  
  const userLang = navigator.language.split('-')[0] as Language;
  return isLanguageSupported(userLang) ? userLang : 'en';
}

export { en as default } from './en';
`;
  
  const indexPath = path.join(CONFIG.outputDir, 'index.ts');
  fs.writeFileSync(indexPath, content);
  console.log('\n✅ Updated strings index');
}

// Main function
async function main() {
  console.log('🌐 Doshi Sensei MCP Translation Tool\n');
  
  // Check if cleaned strings exist
  if (!fs.existsSync(CONFIG.cleanedStringsFile)) {
    console.error(`❌ Cleaned strings file not found: ${CONFIG.cleanedStringsFile}`);
    console.error('   Run merge-translations.js first.');
    process.exit(1);
  }
  
  if (process.argv.includes('--mock')) {
    generateMockTranslations();
    updateStringsIndex();
    console.log('\n✅ Mock translations complete!');
    return;
  }
  
  try {
    // Create English strings file for MCP
    const stringsPath = createEnglishStringsFile();
    
    // Call MCP to translate
    await translateWithMCP(stringsPath, Object.keys(CONFIG.targetLanguages));
    
    // Convert MCP output to our format
    convertMCPTranslations();
    
    // Update the main index
    updateStringsIndex();
    
    console.log('\n🎉 Translation complete!');
    console.log('\nNext steps:');
    console.log('1. Review the translations in src/config/strings/translations/');
    console.log('2. Test the translations in your app');
    console.log('3. Run replace-strings.js to update your components');
    
  } catch (error) {
    console.error('\n❌ Translation failed:', error.message);
    console.log('\nYou can use mock translations for testing:');
    console.log('   node scripts/translate-with-mcp-server.js --mock');
  }
}

// Run the script
main();