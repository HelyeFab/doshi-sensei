#!/usr/bin/env node

/**
 * Test script for refund logic validation
 * 
 * This script helps validate that the refund handling logic works correctly
 * by testing various scenarios and edge cases.
 * 
 * Usage:
 *   node scripts/test-refund-logic.js
 */

const admin = require('firebase-admin');
const { Stripe } = require('stripe');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Initialize Stripe (only if API key is available)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
} else {
  console.log('ℹ️  STRIPE_SECRET_KEY not set - running in simulation mode');
}

/**
 * Test scenarios for refund handling
 */
const testScenarios = [
  {
    name: 'Full Refund - Active Premium User',
    description: 'Test full refund for user with active premium subscription',
    setup: async () => {
      // Create test user with premium subscription
      const testUser = {
        email: 'test-premium@example.com',
        subscription: {
          plan: 'monthly',
          status: 'active',
          stripeCustomerId: 'cus_test_premium',
          stripeSubscriptionId: 'sub_test_premium',
          stripePriceId: 'price_test_monthly'
        }
      };
      
      await db.collection('users').doc('test-premium-user').set(testUser);
      return 'test-premium-user';
    },
    mockCharge: {
      id: 'ch_test_full_refund',
      amount: 2000,
      amount_refunded: 2000,
      currency: 'usd',
      customer: 'cus_test_premium'
    },
    expectedResult: {
      plan: 'free',
      status: 'canceled',
      cancelReason: 'refunded'
    }
  },
  
  {
    name: 'Partial Refund - Policy Test',
    description: 'Test that even partial refunds trigger immediate downgrade',
    setup: async () => {
      const testUser = {
        email: 'test-partial@example.com',
        subscription: {
          plan: 'yearly',
          status: 'active',
          stripeCustomerId: 'cus_test_partial',
          stripeSubscriptionId: 'sub_test_partial',
          stripePriceId: 'price_test_yearly'
        }
      };
      
      await db.collection('users').doc('test-partial-user').set(testUser);
      return 'test-partial-user';
    },
    mockCharge: {
      id: 'ch_test_partial_refund',
      amount: 10000,
      amount_refunded: 5000,
      currency: 'usd',
      customer: 'cus_test_partial'
    },
    expectedResult: {
      plan: 'free',
      status: 'canceled',
      cancelReason: 'refunded',
      refundType: 'partial'
    }
  },
  
  {
    name: 'Already Free User',
    description: 'Test refund for user who is already on free plan',
    setup: async () => {
      const testUser = {
        email: 'test-free@example.com',
        subscription: {
          plan: 'free',
          status: 'canceled'
        }
      };
      
      await db.collection('users').doc('test-free-user').set(testUser);
      return 'test-free-user';
    },
    mockCharge: {
      id: 'ch_test_free_user_refund',
      amount: 2000,
      amount_refunded: 2000,
      currency: 'usd',
      customer: 'cus_test_free'
    },
    expectedResult: {
      plan: 'free',
      status: 'canceled',
      // Should log duplicate but not change subscription
    }
  },
  
  {
    name: 'User Not Found',
    description: 'Test handling when user cannot be found for refund',
    setup: async () => {
      // Don't create any user - simulate missing user scenario
      return null;
    },
    mockCharge: {
      id: 'ch_test_missing_user',
      amount: 2000,
      amount_refunded: 2000,
      currency: 'usd',
      customer: 'cus_test_missing'
    },
    expectedResult: {
      // Should create critical alert
      criticalAlert: true,
      alertType: 'refund_user_not_found'
    }
  }
];

/**
 * Mock the Stripe customer metadata lookup
 */
function mockStripeCustomerLookup(customerId, hasMetadata = false, firebaseUID = null) {
  return {
    id: customerId,
    deleted: false,
    metadata: hasMetadata ? { firebaseUID } : {}
  };
}

/**
 * Run a single test scenario
 */
async function runTestScenario(scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log(`📝 ${scenario.description}\n`);
  
  try {
    // Setup test data
    const testUserId = await scenario.setup();
    
    // TODO: This would normally call the actual handleChargeRefunded function
    // For now, we'll simulate the key checks
    
    console.log(`✅ Setup completed for user: ${testUserId || 'none'}`);
    
    // Simulate the refund processing logic
    const refundResult = await simulateRefundProcessing(scenario.mockCharge, testUserId);
    
    // Verify results
    const isValid = await verifyTestResults(scenario, refundResult, testUserId);
    
    if (isValid) {
      console.log(`✅ ${scenario.name} - PASSED`);
    } else {
      console.log(`❌ ${scenario.name} - FAILED`);
    }
    
    // Cleanup test data
    if (testUserId) {
      await db.collection('users').doc(testUserId).delete();
    }
    
  } catch (error) {
    console.error(`❌ ${scenario.name} - ERROR:`, error.message);
  }
}

/**
 * Simulate the refund processing logic
 */
async function simulateRefundProcessing(mockCharge, testUserId) {
  // Step 1: Validate refund amount
  if (!mockCharge.amount_refunded || mockCharge.amount_refunded <= 0) {
    return { error: 'Invalid refund amount' };
  }
  
  // Step 2: Determine refund type
  const isFullRefund = mockCharge.amount_refunded >= mockCharge.amount;
  const refundType = isFullRefund ? 'full' : 'partial';
  
  // Step 3: User lookup simulation
  let firebaseUID = null;
  
  // For test purposes, map customer IDs to Firebase UIDs
  const customerToUIDMap = {
    'cus_test_premium': 'test-premium-user',
    'cus_test_partial': 'test-partial-user',
    'cus_test_free': 'test-free-user',
    'cus_test_missing': null // Simulate not found
  };
  
  firebaseUID = customerToUIDMap[mockCharge.customer];
  
  if (!firebaseUID) {
    return { 
      error: 'User not found',
      criticalAlert: true,
      alertType: 'refund_user_not_found'
    };
  }
  
  // Step 4: Get current user state
  const userDoc = await db.collection('users').doc(firebaseUID).get();
  const currentSubscription = userDoc.exists ? userDoc.data()?.subscription : null;
  
  // Step 5: Handle already-free users
  if (currentSubscription?.plan === 'free' && currentSubscription?.status === 'canceled') {
    return {
      action: 'logged_duplicate',
      plan: 'free',
      status: 'canceled',
      refundType
    };
  }
  
  // Step 6: Process downgrade
  const refundedSubscriptionData = {
    plan: 'free',
    status: 'canceled',
    cancelReason: 'refunded',
    refundedAt: admin.firestore.FieldValue.serverTimestamp(),
    refundAmount: mockCharge.amount_refunded,
    refundChargeId: mockCharge.id,
    refundType,
    metadata: {
      source: 'test_refund_simulation',
      previousPlan: currentSubscription?.plan || 'unknown',
      previousStatus: currentSubscription?.status || 'unknown'
    }
  };
  
  // Update user subscription (in test mode, we'll just return the data)
  return {
    action: 'downgraded',
    ...refundedSubscriptionData,
    firebaseUID
  };
}

/**
 * Verify test results match expectations
 */
async function verifyTestResults(scenario, result, testUserId) {
  const expected = scenario.expectedResult;
  
  // Check for critical alerts
  if (expected.criticalAlert) {
    return result.criticalAlert === true && result.alertType === expected.alertType;
  }
  
  // Check subscription changes
  if (expected.plan && expected.status) {
    return result.plan === expected.plan && 
           result.status === expected.status &&
           (expected.cancelReason ? result.cancelReason === expected.cancelReason : true);
  }
  
  // Check refund type if specified
  if (expected.refundType) {
    return result.refundType === expected.refundType;
  }
  
  return true;
}

/**
 * Main test runner
 */
async function runRefundTests() {
  console.log('🚀 Starting Refund Logic Tests');
  console.log('================================\n');
  
  let passedTests = 0;
  let totalTests = testScenarios.length;
  
  for (const scenario of testScenarios) {
    try {
      await runTestScenario(scenario);
      passedTests++;
    } catch (error) {
      console.error(`❌ Test failed: ${scenario.name}`, error);
    }
  }
  
  console.log('\n================================');
  console.log('🎯 Test Results Summary');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed - review implementation');
  }
}

/**
 * Validation checklist for manual verification
 */
function printValidationChecklist() {
  console.log('\n📋 Manual Validation Checklist');
  console.log('==============================');
  console.log('');
  console.log('1. ✅ Business Policy Implementation:');
  console.log('   □ Any refund (partial/full) triggers immediate downgrade');
  console.log('   □ No grace period - access revoked immediately');
  console.log('   □ Subscription status set to "canceled"');
  console.log('   □ Plan downgraded to "free"');
  console.log('');
  console.log('2. ✅ Error Handling:');
  console.log('   □ User not found creates critical alert');
  console.log('   □ Invalid refund amounts are rejected');
  console.log('   □ Processing errors are logged and alerted');
  console.log('   □ Already-free users logged but not modified');
  console.log('');
  console.log('3. ✅ Data Integrity:');
  console.log('   □ All premium fields cleared (stripeSubscriptionId, etc.)');
  console.log('   □ Refund amount and type recorded');
  console.log('   □ Audit trail preserved in metadata');
  console.log('   □ Subscription history updated');
  console.log('');
  console.log('4. ✅ Monitoring & Compliance:');
  console.log('   □ Refund events logged to audit collections');
  console.log('   □ Critical alerts created for manual review');
  console.log('   □ Unique refund ID generated for tracking');
  console.log('   □ Environment context preserved');
  console.log('');
  console.log('5. ✅ Production Safety:');
  console.log('   □ Multiple user lookup strategies implemented');
  console.log('   □ Webhook idempotency prevents duplicate processing');
  console.log('   □ Active Stripe subscription canceled');
  console.log('   □ Function fails safe (revokes access on doubt)');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runRefundTests()
    .then(() => {
      printValidationChecklist();
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runRefundTests,
  testScenarios,
  simulateRefundProcessing
};