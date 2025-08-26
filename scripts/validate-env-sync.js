#!/usr/bin/env node

/**
 * Environment Synchronization Validator
 * 
 * Ensures that critical Stripe configuration is synchronized between:
 * - Main project .env file
 * - Cloud Functions .env file
 * 
 * Run this script before deployment to catch configuration mismatches
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

// File paths
const MAIN_ENV_PATH = path.join(__dirname, '..', '.env');
const FUNCTIONS_ENV_PATH = path.join(__dirname, '..', 'functions', '.env');
const FUNCTIONS_TEST_ENV_PATH = path.join(__dirname, '..', 'functions', '.env.test');

// Critical variables that must be synchronized
const CRITICAL_VARS = {
  price_ids: [
    { main: 'NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID', functions: 'STRIPE_MONTHLY_PRICE_ID' },
    { main: 'NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID', functions: 'STRIPE_YEARLY_PRICE_ID' }
  ],
  shared: [
    'NEXT_PUBLIC_APP_URL'
  ]
};

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const vars = {};
  
  content.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (line.startsWith('#') || !line.trim()) return;
    
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      vars[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  return vars;
}

function log(message, type = 'info') {
  const prefix = {
    error: `${colors.red}❌ ERROR:${colors.reset}`,
    warning: `${colors.yellow}⚠️  WARNING:${colors.reset}`,
    success: `${colors.green}✅ SUCCESS:${colors.reset}`,
    info: `${colors.blue}ℹ️  INFO:${colors.reset}`
  };
  
  console.log(`${prefix[type]} ${message}`);
}

function validateEnvironments() {
  console.log(`\n${colors.bold}🔍 Validating Environment Configuration Synchronization${colors.reset}\n`);
  
  // Parse environment files
  const mainEnv = parseEnvFile(MAIN_ENV_PATH);
  const functionsEnv = parseEnvFile(FUNCTIONS_ENV_PATH);
  const functionsTestEnv = parseEnvFile(FUNCTIONS_TEST_ENV_PATH);
  
  if (!mainEnv) {
    log(`Main .env file not found at ${MAIN_ENV_PATH}`, 'error');
    return false;
  }
  
  if (!functionsEnv) {
    log(`Functions .env file not found at ${FUNCTIONS_ENV_PATH}`, 'error');
    return false;
  }
  
  let hasErrors = false;
  let hasWarnings = false;
  
  console.log(`${colors.bold}Checking Price ID Synchronization:${colors.reset}`);
  
  // Check price ID synchronization
  CRITICAL_VARS.price_ids.forEach(({ main, functions }) => {
    const mainValue = mainEnv[main];
    const functionsValue = functionsEnv[functions];
    
    if (!mainValue) {
      log(`Missing ${main} in main .env`, 'error');
      hasErrors = true;
    }
    
    if (!functionsValue) {
      log(`Missing ${functions} in functions/.env`, 'error');
      hasErrors = true;
    }
    
    if (mainValue && functionsValue) {
      if (mainValue === functionsValue) {
        log(`${main} = ${functions} ✓`, 'success');
      } else {
        log(`Mismatch: ${main} != ${functions}`, 'error');
        log(`  Main: ${mainValue}`, 'error');
        log(`  Functions: ${functionsValue}`, 'error');
        hasErrors = true;
      }
    }
  });
  
  console.log(`\n${colors.bold}Checking Shared Variables:${colors.reset}`);
  
  // Check shared variables
  CRITICAL_VARS.shared.forEach(varName => {
    const mainValue = mainEnv[varName];
    const functionsValue = functionsEnv[varName];
    
    if (mainValue === functionsValue) {
      log(`${varName} synchronized ✓`, 'success');
    } else {
      log(`${varName} mismatch`, 'warning');
      log(`  Main: ${mainValue || '(not set)'}`, 'warning');
      log(`  Functions: ${functionsValue || '(not set)'}`, 'warning');
      hasWarnings = true;
    }
  });
  
  // Check for Stripe keys
  console.log(`\n${colors.bold}Checking Stripe Keys:${colors.reset}`);
  
  const mainStripeKey = mainEnv['STRIPE_SECRET_KEY'];
  const functionsStripeKey = functionsEnv['STRIPE_SECRET_KEY'];
  
  if (!functionsStripeKey) {
    log('Functions missing STRIPE_SECRET_KEY', 'error');
    hasErrors = true;
  } else {
    const isLiveKey = functionsStripeKey.startsWith('sk_live_');
    const isTestKey = functionsStripeKey.startsWith('sk_test_');
    
    if (isLiveKey) {
      log('Functions using LIVE Stripe key', 'success');
      
      // Check if price IDs look like production IDs
      const monthlyPrice = functionsEnv['STRIPE_MONTHLY_PRICE_ID'];
      const yearlyPrice = functionsEnv['STRIPE_YEARLY_PRICE_ID'];
      
      if (monthlyPrice && monthlyPrice.includes('test')) {
        log('WARNING: Using test price ID with live key!', 'warning');
        hasWarnings = true;
      }
    } else if (isTestKey) {
      log('Functions using TEST Stripe key', 'info');
    } else {
      log('Invalid Stripe key format in Functions', 'error');
      hasErrors = true;
    }
  }
  
  // Check webhook secrets
  const mainWebhookSecret = mainEnv['STRIPE_WEBHOOK_SECRET'];
  const functionsWebhookSecret = functionsEnv['STRIPE_WEBHOOK_SECRET'];
  
  if (!functionsWebhookSecret) {
    log('Functions missing STRIPE_WEBHOOK_SECRET', 'error');
    hasErrors = true;
  } else if (functionsWebhookSecret.startsWith('whsec_')) {
    log('Functions webhook secret configured ✓', 'success');
  } else {
    log('Invalid webhook secret format', 'error');
    hasErrors = true;
  }
  
  // Summary
  console.log(`\n${colors.bold}========================================${colors.reset}`);
  
  if (hasErrors) {
    console.log(`${colors.red}${colors.bold}❌ VALIDATION FAILED${colors.reset}`);
    console.log(`\n${colors.yellow}Action Required:${colors.reset}`);
    console.log('1. Ensure price IDs match between main .env and functions/.env');
    console.log('2. Main app uses NEXT_PUBLIC_STRIPE_* variables');
    console.log('3. Functions use STRIPE_* variables (without NEXT_PUBLIC prefix)');
    console.log('\nExample fix:');
    console.log('  Main .env:      NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_xxx');
    console.log('  Functions .env: STRIPE_MONTHLY_PRICE_ID=price_xxx');
    process.exit(1);
  } else if (hasWarnings) {
    console.log(`${colors.yellow}${colors.bold}⚠️  VALIDATION PASSED WITH WARNINGS${colors.reset}`);
    console.log('Review the warnings above and ensure they are intentional.');
    process.exit(0);
  } else {
    console.log(`${colors.green}${colors.bold}✅ ALL VALIDATIONS PASSED${colors.reset}`);
    console.log('Environment files are properly synchronized!');
    process.exit(0);
  }
}

// Run validation
validateEnvironments();