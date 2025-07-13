#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const CONFIG = {
  inputFile: 'extracted-strings/cleaned-strings.json',
  outputDir: 'src/config/strings/translations',
  mcpPath: '/home/mate/Dev/MCPs/translator-mcp',
  targetLanguages: ['ja', 'de', 'es', 'it', 'ko', 'zh'],
  batchSize: 10, // Translate in small batches
};

// Helper to ensure directory exists
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Call the MCP translator - adjust this based on your MCP's actual interface
async function translateWithMCP(texts, targetLang, sourceLang = 'en') {
  try {
    // Prepare input for MCP
    const input = {
      source_language: sourceLang,
      target_language: targetLang,
      texts: texts
    };
    
    // Write input to temporary file
    const tempInputFile = path.join('/tmp', `translate-input-${Date.now()}.json`);
    fs.writeFileSync(tempInputFile, JSON.stringify(input));
    
    // Call MCP (adjust command based on your MCP's interface)
    const command = `cd ${CONFIG.mcpPath} && node index.js translate --input ${tempInputFile}`;
    console.log(`  Executing: ${command}`);
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error(`  MCP stderr: ${stderr}`);
    }
    
    // Parse output
    const result = JSON.parse(stdout);
    
    // Clean up temp file
    fs.unlinkSync(tempInputFile);
    
    return result;
  } catch (error) {
    console.error(`  Translation error: ${error.message}`);
    // Return original texts as fallback
    return texts.reduce((acc, text, index) => {
      acc[Object.keys(texts)[index]] = text;
      return acc;
    }, {});
  }
}

// Generate translation file for a language
function generateTranslationFile(lang, translations) {
  const fileName = `${lang}.ts`;
  const filePath = path.join(CONFIG.outputDir, fileName);
  
  const content = `// Auto-generated translation file for ${lang.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Total strings: ${Object.keys(translations).length}

export const ${lang} = ${JSON.stringify(translations, null, 2)};

export type ${lang.toUpperCase()}Keys = keyof typeof ${lang};
`;

  fs.writeFileSync(filePath, content);
  console.log(`✅ Generated ${filePath}`);
}

// Main translation function
async function translateStrings() {
  console.log('🌐 Doshi Sensei MCP Translation Tool\n');
  
  // Load cleaned strings
  if (!fs.existsSync(CONFIG.inputFile)) {
    console.error(`❌ Input file not found: ${CONFIG.inputFile}`);
    console.error('   Run merge-translations.js first.');
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(CONFIG.inputFile, 'utf8'));
  const { strings } = data;
  
  console.log(`📋 Loaded ${Object.keys(strings).length} strings to translate\n`);
  
  // Ensure output directory exists
  ensureDirectoryExists(CONFIG.outputDir);
  
  // Process each target language
  for (const targetLang of CONFIG.targetLanguages) {
    console.log(`\n🔄 Translating to ${targetLang.toUpperCase()}...`);
    
    const translations = {};
    const entries = Object.entries(strings);
    
    // Process in batches
    for (let i = 0; i < entries.length; i += CONFIG.batchSize) {
      const batch = entries.slice(i, i + CONFIG.batchSize);
      const batchNumber = Math.floor(i / CONFIG.batchSize) + 1;
      const totalBatches = Math.ceil(entries.length / CONFIG.batchSize);
      
      console.log(`  Batch ${batchNumber}/${totalBatches}...`);
      
      // Prepare batch for translation
      const batchTexts = {};
      batch.forEach(([key, text]) => {
        batchTexts[key] = text;
      });
      
      try {
        const translated = await translateWithMCP(batchTexts, targetLang);
        Object.assign(translations, translated);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`  ❌ Batch ${batchNumber} failed: ${error.message}`);
        // Add original texts as fallback
        batch.forEach(([key, text]) => {
          translations[key] = text;
        });
      }
    }
    
    // Generate translation file
    generateTranslationFile(targetLang, translations);
  }
  
  // Generate index file
  const indexContent = `// Auto-generated translations index
// Generated on: ${new Date().toISOString()}

// Import generated translations
${CONFIG.targetLanguages.map(lang => `import { ${lang} } from './${lang}';`).join('\n')}

// Export all translations
export const translations = {
${CONFIG.targetLanguages.map(lang => `  ${lang},`).join('\n')}
};

export type SupportedLanguage = keyof typeof translations;
`;

  fs.writeFileSync(path.join(CONFIG.outputDir, 'index.ts'), indexContent);
  
  console.log('\n✅ Translation complete!');
  console.log(`📁 Files generated in: ${CONFIG.outputDir}/`);
  
  // Update main strings index
  console.log('\n📝 Updating main strings configuration...');
  
  const mainIndexPath = 'src/config/strings/index.ts';
  const updatedIndexContent = `import { en } from './en';
import { fr } from './fr';
${CONFIG.targetLanguages.map(lang => `import { ${lang} } from './translations/${lang}';`).join('\n')}

// All available languages
export const strings = {
  en,
  fr,
${CONFIG.targetLanguages.map(lang => `  ${lang},`).join('\n')}
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

  fs.writeFileSync(mainIndexPath, updatedIndexContent);
  console.log('✅ Updated main strings index');
  
  console.log('\n🎉 All done! Your app now supports multiple languages.');
}

// Alternative: Generate mock translations for testing
async function generateMockTranslations() {
  console.log('🔧 Generating mock translations for testing...\n');
  
  const data = JSON.parse(fs.readFileSync(CONFIG.inputFile, 'utf8'));
  const { strings } = data;
  
  ensureDirectoryExists(CONFIG.outputDir);
  
  const mockPrefixes = {
    ja: '🇯🇵 ',
    de: '🇩🇪 ',
    es: '🇪🇸 ',
    it: '🇮🇹 ',
    ko: '🇰🇷 ',
    zh: '🇨🇳 '
  };
  
  for (const lang of CONFIG.targetLanguages) {
    const translations = {};
    Object.entries(strings).forEach(([key, value]) => {
      translations[key] = `${mockPrefixes[lang]}${value}`;
    });
    
    generateTranslationFile(lang, translations);
  }
  
  console.log('\n✅ Mock translations generated!');
}

// Check command line arguments
if (process.argv.includes('--mock')) {
  generateMockTranslations();
} else {
  translateStrings().catch(console.error);
}