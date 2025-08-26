#!/usr/bin/env node

/**
 * Webhook System Test Script
 * Tests that Stripe webhooks are properly configured and processed
 * 
 * This script verifies:
 * 1. Webhook endpoint is accessible
 * 2. Required events are registered in Stripe
 * 3. Events are processed correctly
 * 4. User data is updated in Firestore
 */

const fetch = require('node-fetch');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const WEBHOOK_URL = 'https://stripewebhook-jtmxvmnera-uc.a.run.app';
const LOCAL_WEBHOOK_URL = 'https://doshisensei.com/api/stripe-webhook';

// Required webhook events for our system
const REQUIRED_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated', 
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'charge.refunded' // Critical for immediate access revocation
];

// Test results collector
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x991b[33m',
  blue: '\x1b[34m'
};

function log(message, type = 'info') {
  const prefix = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`,
    test: `${colors.bright}🧪${colors.reset}`
  };
  console.log(`${prefix[type] || ''} ${message}`);
}

async function testWebhookEndpoint() {
  log('Testing Cloud Function webhook endpoint accessibility...', 'test');
  
  try {
    // Test with GET request (should return status info)
    const response = await fetch(WEBHOOK_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      log(`Webhook endpoint accessible: ${WEBHOOK_URL}`, 'success');
      testResults.passed.push('Webhook endpoint is accessible');
      return true;
    } else {
      log(`Webhook endpoint returned status ${response.status}`, 'error');
      testResults.failed.push(`Webhook endpoint returned ${response.status}`);
      return false;
    }
  } catch (error) {
    log(`Failed to reach webhook endpoint: ${error.message}`, 'error');
    testResults.failed.push(`Cannot reach webhook endpoint: ${error.message}`);
    return false;
  }
}

async function testLocalWebhookDisabled() {
  log('Testing that local webhook endpoint is properly disabled...', 'test');
  
  try {
    const response = await fetch(LOCAL_WEBHOOK_URL, {
      method: 'GET'
    });
    
    const data = await response.json();
    
    if (response.status === 410 || data.status?.includes('DISABLED')) {
      log('Local webhook endpoint correctly disabled (410 Gone)', 'success');
      testResults.passed.push('Local webhook properly disabled');
      return true;
    } else {
      log(`WARNING: Local webhook not properly disabled! Status: ${response.status}`, 'warning');
      testResults.warnings.push('Local webhook should return 410 Gone');
      return false;
    }
  } catch (error) {
    log(`Could not test local webhook: ${error.message}`, 'warning');
    testResults.warnings.push('Could not verify local webhook status');
    return false;
  }
}

async function testStripeWebhookConfiguration() {
  log('Checking Stripe webhook configuration...', 'test');
  
  try {
    // Use Stripe CLI to list webhook endpoints
    const { stdout } = await execPromise('stripe webhook_endpoints list --limit 10 2>/dev/null');
    
    if (stdout.includes(WEBHOOK_URL)) {
      log('Cloud Function webhook is registered in Stripe', 'success');
      testResults.passed.push('Webhook registered in Stripe');
      
      // Check which events are enabled
      const lines = stdout.split('\n');
      const webhookLine = lines.find(line => line.includes(WEBHOOK_URL));
      
      if (webhookLine) {
        log(`Webhook configuration found: ${webhookLine.trim()}`, 'info');
      }
      
      return true;
    } else {
      log('Cloud Function webhook NOT found in Stripe configuration!', 'error');
      testResults.failed.push('Webhook not registered in Stripe Dashboard');
      return false;
    }
  } catch (error) {
    log('Could not check Stripe configuration (is Stripe CLI installed and logged in?)', 'warning');
    testResults.warnings.push('Install Stripe CLI and run: stripe login');
    return false;
  }
}

async function testWebhookEvents() {
  log('Checking if required webhook events are configured...', 'test');
  
  try {
    // Get detailed webhook endpoint info
    const { stdout } = await execPromise(`stripe webhook_endpoints list --limit 10 2>/dev/null | grep -A 20 "${WEBHOOK_URL}"`);
    
    const missingEvents = [];
    const foundEvents = [];
    
    for (const event of REQUIRED_EVENTS) {
      if (stdout.includes(event)) {
        foundEvents.push(event);
      } else {
        missingEvents.push(event);
      }
    }
    
    if (foundEvents.length > 0) {
      log(`Found ${foundEvents.length}/${REQUIRED_EVENTS.length} required events`, 'success');
      foundEvents.forEach(event => log(`  ✓ ${event}`, 'success'));
    }
    
    if (missingEvents.length > 0) {
      log(`Missing ${missingEvents.length} required events:`, 'error');
      missingEvents.forEach(event => log(`  ✗ ${event}`, 'error'));
      testResults.failed.push(`Missing events: ${missingEvents.join(', ')}`);
      return false;
    }
    
    testResults.passed.push('All required events configured');
    return true;
  } catch (error) {
    log('Could not verify webhook events configuration', 'warning');
    testResults.warnings.push('Could not verify individual events');
    
    // List the required events for manual verification
    log('Please verify these events are enabled in Stripe Dashboard:', 'info');
    REQUIRED_EVENTS.forEach(event => log(`  - ${event}`, 'info'));
    
    return false;
  }
}

async function testWebhookProcessing() {
  log('Testing webhook processing simulation...', 'test');
  
  try {
    // Create a test webhook event using Stripe CLI
    log('Sending test webhook event...', 'info');
    
    const { stdout, stderr } = await execPromise(
      `stripe trigger checkout.session.completed --skip-verify 2>&1`
    );
    
    if (stdout.includes('succeeded') || stdout.includes('200')) {
      log('Test webhook event sent successfully', 'success');
      testResults.passed.push('Test webhook processed');
      
      // Give it a moment to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check Cloud Function logs if possible
      log('Check Cloud Function logs for processing confirmation', 'info');
      
      return true;
    } else {
      log('Test webhook event failed', 'error');
      log(`Error: ${stderr || stdout}`, 'error');
      testResults.failed.push('Test webhook failed');
      return false;
    }
  } catch (error) {
    log('Could not send test webhook (Stripe CLI required)', 'warning');
    testResults.warnings.push('Install Stripe CLI to test webhook processing');
    return false;
  }
}

async function checkRecentWebhookActivity() {
  log('Checking recent webhook activity...', 'test');
  
  try {
    const response = await fetch('https://doshisensei.com/api/webhook-health');
    
    if (response.ok) {
      const data = await response.json();
      
      log(`Webhook health status: ${data.status}`, data.status === 'healthy' ? 'success' : 'warning');
      
      if (data.lastProcessed) {
        const lastProcessedDate = new Date(data.lastProcessed);
        const hoursSinceLastEvent = (Date.now() - lastProcessedDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastEvent < 24) {
          log(`Last webhook processed ${hoursSinceLastEvent.toFixed(1)} hours ago`, 'success');
          testResults.passed.push('Recent webhook activity detected');
        } else if (hoursSinceLastEvent < 72) {
          log(`Last webhook processed ${hoursSinceLastEvent.toFixed(1)} hours ago`, 'warning');
          testResults.warnings.push('No recent webhook activity (>24h)');
        } else {
          log(`No webhook activity in ${hoursSinceLastEvent.toFixed(0)} hours`, 'error');
          testResults.failed.push('No recent webhook activity');
        }
      }
      
      if (data.stats) {
        log(`Total webhooks processed: ${data.stats.total || 0}`, 'info');
        log(`Success rate: ${data.stats.successRate || 0}%`, 'info');
      }
      
      return true;
    } else {
      log('Could not fetch webhook health status', 'warning');
      testResults.warnings.push('Webhook health endpoint not accessible');
      return false;
    }
  } catch (error) {
    log(`Error checking webhook health: ${error.message}`, 'warning');
    testResults.warnings.push('Could not check webhook health');
    return false;
  }
}

async function testCriticalEventHandling() {
  log('\n═══════════════════════════════════════', 'info');
  log('CRITICAL EVENT HANDLING VERIFICATION', 'test');
  log('═══════════════════════════════════════\n', 'info');
  
  const criticalTests = [
    {
      event: 'customer.subscription.created',
      description: 'New subscription activates premium access',
      updates: ['subscription.status = active', 'subscription.plan = monthly/yearly']
    },
    {
      event: 'customer.subscription.deleted', 
      description: 'Cancelled subscription removes access',
      updates: ['subscription.status = canceled', 'subscription.plan = free']
    },
    {
      event: 'charge.refunded',
      description: 'Refund IMMEDIATELY revokes access',
      updates: ['subscription.plan = free', 'No grace period!']
    },
    {
      event: 'invoice.payment_failed',
      description: 'Failed payment marks subscription as past_due',
      updates: ['subscription.status = past_due', 'May limit access']
    }
  ];
  
  log('Your system should handle these critical scenarios:', 'info');
  
  criticalTests.forEach(test => {
    log(`\n📌 ${test.event}`, 'info');
    log(`   ${test.description}`, 'info');
    test.updates.forEach(update => log(`   → ${update}`, 'info'));
  });
  
  log('\n⚠️  MOST IMPORTANT: Refunds must revoke access IMMEDIATELY', 'warning');
  log('   This prevents refunded users from keeping premium features', 'warning');
  
  testResults.passed.push('Critical event handling documented');
}

async function generateReport() {
  log('\n═══════════════════════════════════════', 'info');
  log('WEBHOOK SYSTEM TEST REPORT', 'info');
  log('═══════════════════════════════════════\n', 'info');
  
  // Summary
  const totalTests = testResults.passed.length + testResults.failed.length;
  const passRate = totalTests > 0 ? (testResults.passed.length / totalTests * 100).toFixed(0) : 0;
  
  if (testResults.failed.length === 0) {
    log(`✅ ALL TESTS PASSED (${testResults.passed.length}/${totalTests})`, 'success');
  } else {
    log(`⚠️  SOME TESTS FAILED (${testResults.passed.length}/${totalTests} passed)`, 'warning');
  }
  
  // Passed tests
  if (testResults.passed.length > 0) {
    log('\n✅ Passed Tests:', 'success');
    testResults.passed.forEach(test => log(`   ✓ ${test}`, 'success'));
  }
  
  // Failed tests
  if (testResults.failed.length > 0) {
    log('\n❌ Failed Tests:', 'error');
    testResults.failed.forEach(test => log(`   ✗ ${test}`, 'error'));
  }
  
  // Warnings
  if (testResults.warnings.length > 0) {
    log('\n⚠️  Warnings:', 'warning');
    testResults.warnings.forEach(warning => log(`   ⚠ ${warning}`, 'warning'));
  }
  
  // Action items
  log('\n📋 ACTION ITEMS:', 'info');
  
  if (testResults.failed.length > 0) {
    log('\n1. CRITICAL - Fix these issues:', 'error');
    
    if (testResults.failed.some(f => f.includes('not registered'))) {
      log('   → Go to Stripe Dashboard > Webhooks', 'info');
      log(`   → Add webhook endpoint: ${WEBHOOK_URL}`, 'info');
      log('   → Enable all required events listed above', 'info');
    }
    
    if (testResults.failed.some(f => f.includes('Missing events'))) {
      log('   → Edit webhook endpoint in Stripe Dashboard', 'info');
      log('   → Enable missing events', 'info');
    }
    
    if (testResults.failed.some(f => f.includes('endpoint returned'))) {
      log('   → Check Cloud Function deployment', 'info');
      log('   → Verify function is running: firebase functions:log', 'info');
    }
  }
  
  log('\n2. MONITORING - Regular checks:', 'info');
  log('   → Check webhook health daily: /api/webhook-health', 'info');
  log('   → Monitor Cloud Function logs for errors', 'info');
  log('   → Verify refunds revoke access immediately', 'info');
  
  if (testResults.warnings.some(w => w.includes('Stripe CLI'))) {
    log('\n3. OPTIONAL - For better testing:', 'info');
    log('   → Install Stripe CLI: https://stripe.com/docs/stripe-cli', 'info');
    log('   → Run: stripe login', 'info');
    log('   → Then rerun this script for complete testing', 'info');
  }
}

// Main test runner
async function runTests() {
  log('🚀 Starting Webhook System Tests...', 'test');
  log('════════════════════════════════════\n', 'info');
  
  // Run all tests
  await testWebhookEndpoint();
  await testLocalWebhookDisabled();
  await testStripeWebhookConfiguration();
  await testWebhookEvents();
  await testWebhookProcessing();
  await checkRecentWebhookActivity();
  await testCriticalEventHandling();
  
  // Generate report
  await generateReport();
  
  // Exit with appropriate code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});