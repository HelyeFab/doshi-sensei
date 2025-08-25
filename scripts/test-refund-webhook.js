#!/usr/bin/env node

/**
 * Test script for simulating Stripe refund webhook
 * Usage: node scripts/test-refund-webhook.js [email]
 */

const https = require('https');
const crypto = require('crypto');

// Get email from command line or use default
const customerEmail = process.argv[2] || 'test@example.com';

// Your webhook endpoint
const WEBHOOK_URL = 'https://stripewebhook-jtmxvmnera-uc.a.run.app';
const WEBHOOK_SECRET = 'whsec_nG3vQaHKSaQMB2rl3jqZwdqOmaUCdt91';

// Create a test refund event
const event = {
  id: 'evt_test_' + Date.now(),
  object: 'event',
  api_version: '2023-10-16',
  created: Math.floor(Date.now() / 1000),
  type: 'charge.refunded',
  data: {
    object: {
      id: 'ch_test_' + Date.now(),
      object: 'charge',
      amount: 999,
      amount_refunded: 999,
      application: null,
      application_fee: null,
      application_fee_amount: null,
      balance_transaction: 'txn_test_' + Date.now(),
      billing_details: {
        address: {
          city: null,
          country: null,
          line1: null,
          line2: null,
          postal_code: null,
          state: null
        },
        email: customerEmail,
        name: null,
        phone: null
      },
      calculated_statement_descriptor: 'DOSHI SENSEI',
      captured: true,
      created: Math.floor(Date.now() / 1000) - 3600,
      currency: 'usd',
      customer: 'cus_test_' + Date.now(),
      description: 'Subscription payment',
      disputed: false,
      failure_code: null,
      failure_message: null,
      fraud_details: {},
      invoice: 'in_test_' + Date.now(),
      livemode: false,
      metadata: {},
      on_behalf_of: null,
      outcome: {
        network_status: 'approved_by_network',
        reason: null,
        risk_level: 'normal',
        risk_score: 32,
        seller_message: 'Payment complete.',
        type: 'authorized'
      },
      paid: true,
      payment_intent: 'pi_test_' + Date.now(),
      payment_method: 'pm_test_' + Date.now(),
      payment_method_details: {
        card: {
          brand: 'visa',
          checks: {
            address_line1_check: null,
            address_postal_code_check: null,
            cvc_check: 'pass'
          },
          country: 'US',
          exp_month: 12,
          exp_year: 2025,
          fingerprint: 'test_fingerprint',
          funding: 'credit',
          installments: null,
          last4: '4242',
          mandate: null,
          network: 'visa',
          three_d_secure: null,
          wallet: null
        },
        type: 'card'
      },
      receipt_email: customerEmail,
      receipt_number: null,
      receipt_url: 'https://pay.stripe.com/receipts/test',
      refunded: true,
      refunds: {
        object: 'list',
        data: [
          {
            id: 'ref_test_' + Date.now(),
            object: 'refund',
            amount: 999,
            charge: 'ch_test_' + Date.now(),
            created: Math.floor(Date.now() / 1000),
            currency: 'usd',
            metadata: {},
            reason: 'requested_by_customer',
            receipt_number: null,
            source_transfer_reversal: null,
            status: 'succeeded',
            transfer_reversal: null
          }
        ],
        has_more: false,
        url: '/v1/charges/ch_test/refunds'
      },
      review: null,
      shipping: null,
      source_transfer: null,
      statement_descriptor: null,
      statement_descriptor_suffix: null,
      status: 'succeeded',
      transfer_data: null,
      transfer_group: null
    }
  }
};

// Generate Stripe signature
function generateStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  
  return `t=${timestamp},v1=${expectedSignature}`;
}

// Send the webhook
function sendWebhook() {
  const payload = JSON.stringify(event);
  const signature = generateStripeSignature(payload, WEBHOOK_SECRET);
  
  const url = new URL(WEBHOOK_URL);
  
  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'stripe-signature': signature
    }
  };
  
  console.log(`\n🔄 Sending test refund webhook for: ${customerEmail}`);
  console.log(`📍 Endpoint: ${WEBHOOK_URL}`);
  console.log(`🎯 Event Type: charge.refunded`);
  console.log(`💰 Refund Amount: $9.99\n`);
  
  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Webhook sent successfully!');
        console.log(`📊 Response: ${data}\n`);
        console.log('Next steps:');
        console.log('1. Check Firebase Console to verify user was downgraded to free plan');
        console.log('2. Check function logs: firebase functions:log --project doshi-sensei');
        console.log('3. Verify user lost premium access in the app\n');
      } else {
        console.error(`❌ Webhook failed with status ${res.statusCode}`);
        console.error(`Response: ${data}`);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Error sending webhook:', error);
  });
  
  req.write(payload);
  req.end();
}

// Run the test
console.log('================================');
console.log('  Stripe Refund Webhook Tester');
console.log('================================');

sendWebhook();