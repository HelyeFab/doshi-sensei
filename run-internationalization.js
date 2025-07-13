#!/usr/bin/env node
import { EnhancedTranslatorService } from '/home/mate/Dev/MCPs/translator-mcp/dist/translator-enhanced.js';

async function runInternationalization() {
  console.log('🌍 Starting Enhanced Internationalization Process...\n');
  
  const config = {
    excludeDirectives: ['use client', 'use server', 'use strict'],
    excludeAttributes: ['className', 'id', 'style', 'href', 'src', 'alt', 'key', 'data-testid'],
    excludeImports: true,
    preserveHTMLAttributes: true,
    framework: 'next',
    preserveFrameworkPatterns: true,
    validateIdentifiers: true,
    flattenMultilineStrings: true,
    useTemplateStrings: false,
    dryRun: false,
    generateReport: true,
    backupOriginals: true,
    preserveStrings: [
      'serviceWorker',
      'localStorage',
      'sessionStorage',
      'use client',
      'use server',
      'theme',
      'auth-token',
      'doshi-pwa-metrics',
      'WebApplication',
      'EducationalApplication',
      'Organization',
      'Offer',
      'USD',
      'Web',
      'https://schema.org',
      'priceCurrency',
      'applicationCategory',
      'operatingSystem',
      'resetSchedule',
      'past_due',
      'firebase',
      'firestore',
      'auth'
    ],
    excludePatterns: [
      /^https?:\/\//,              // URLs
      /^[a-z-]+$/,                 // CSS classes
      /^[A-Z_]+$/,                 // Constants
      /^\d+$/,                     // Pure numbers
      /^[a-zA-Z]+-[a-zA-Z]+(-[a-zA-Z]+)*$/, // kebab-case
      /^@\//,                      // Import paths starting with @/
      /^@[a-zA-Z]+$/,              // JSON-LD properties like @type, @context
      /^\w+\/\w+/,                 // Module paths like firebase/auth
      /^[A-Z]{2,}$/,               // Currency codes like USD, EUR
      /^\.[a-zA-Z]+$/,             // File extensions like .json, .tsx
      /^\/api\//,                  // API routes
      /^_[a-zA-Z]+$/,              // Private properties
      /^[a-z]+:[a-z]+$/,           // Namespaced strings like schema:type
    ]
  };
  
  const translator = new EnhancedTranslatorService(config);
  
  const projectPath = '/home/mate/Dev/NextProjects/doshi-sensei';
  const stringsPath = '/home/mate/Dev/NextProjects/doshi-sensei/src/config/strings/strings';
  const targetLanguages = ['fr', 'de', 'es', 'ja', 'ko'];
  
  // Load the API key from the MCP .env file
  const dotenv = await import('dotenv');
  dotenv.config({ path: '/home/mate/Dev/MCPs/translator-mcp/.env' });
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || '';
  
  if (!apiKey) {
    console.log('⚠️  No Google Translate API key found.');
    console.log('   Translation step will be skipped.');
    console.log('   Only string extraction and refactoring will be performed.\n');
  }
  
  try {
    const result = await translator.processProject(
      projectPath,
      stringsPath,
      targetLanguages,
      apiKey
    );
    
    if (result.success) {
      console.log('✅ ' + result.summary);
    } else {
      console.error('❌ Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the process
runInternationalization().catch(console.error);