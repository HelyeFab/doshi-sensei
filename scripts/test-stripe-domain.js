/**
 * Test Script: Verify Stripe Integration with New Domain
 *
 * This script tests that Stripe checkout sessions work correctly
 * with the new doshisensei.com domain.
 */

const https = require('https');

// Test configuration
const NEW_DOMAIN = 'doshisensei.com';
const TEST_ENDPOINTS = [
  '/api/create-checkout-session',
  '/api/stripe-webhook',
  '/api/cancel-subscription'
];

console.log('🧪 Testing Stripe Integration with New Domain: ' + NEW_DOMAIN);
console.log('=' .repeat(60));

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = `https://${NEW_DOMAIN}${endpoint}`;

    console.log(`📡 Testing: ${url}`);

    const req = https.request(url, { method: 'HEAD' }, (res) => {
      const status = res.statusCode;
      const success = status < 500; // 4xx is OK (method not allowed, etc.)

      console.log(`   ${success ? '✅' : '❌'} Status: ${status}`);
      resolve({ endpoint, status, success });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Error: ${error.message}`);
      resolve({ endpoint, status: 'ERROR', success: false });
    });

    req.setTimeout(5000, () => {
      console.log(`   ⏰ Timeout`);
      req.destroy();
      resolve({ endpoint, status: 'TIMEOUT', success: false });
    });

    req.end();
  });
}

async function runTests() {
  const results = [];

  for (const endpoint of TEST_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    console.log(''); // Empty line for readability
  }

  console.log('📊 Test Summary:');
  console.log('-'.repeat(40));

  const passed = results.filter(r => r.success).length;
  const total = results.length;

  console.log(`✅ Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log('🎉 All endpoints are accessible!');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Update webhook URL in Stripe Dashboard');
    console.log('2. Add domain to Stripe domain verification');
    console.log('3. Test a real checkout session');
  } else {
    console.log('⚠️  Some endpoints may need attention');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.endpoint}: ${r.status}`);
    });
  }
}

// Run the tests
runTests().catch(console.error);
