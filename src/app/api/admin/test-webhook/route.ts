import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
}) : null;

async function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split('Bearer ')[1];
  try {
    const admin = await getFirebaseAdmin();
    const decodedToken = await admin.auth().verifyIdToken(token);
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin = decodedToken.admin === true || 
                    (adminEmail && decodedToken.email === adminEmail) ||
                    decodedToken.email === 'hove.international+3@gmail.com' || 
                    decodedToken.email === 'admin@doshisensei.com';
    return isAdmin ? decodedToken : null;
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const adminToken = await verifyAdminToken(request);
    if (!adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json({ 
        error: 'Stripe not configured',
        success: false 
      }, { status: 500 });
    }

    // Get Firebase Admin
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();

    // Create a test event in Stripe
    try {
      // Create a test customer
      const customer = await stripe.customers.create({
        email: 'test@doshisensei.com',
        name: 'Test User for Webhook Verification',
        metadata: {
          test: 'true',
          timestamp: Date.now().toString()
        }
      });

      // Log the test event
      const testEventLog = {
        type: 'webhook.test',
        status: 'success',
        customerId: customer.id,
        email: customer.email,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          isTest: true,
          initiatedBy: adminToken.email,
          purpose: 'webhook_health_check'
        },
        processingTime: 0
      };

      // Save to webhook_logs collection
      await db.collection('webhook_logs').add(testEventLog);

      // Clean up - delete the test customer
      await stripe.customers.del(customer.id);

      // Also trigger the actual webhook endpoint URL if configured
      const webhookEndpointUrl = process.env.GOOGLE_CLOUD_FUNCTION_URL || 
                                  'https://stripe-webhook-yc72p6rr5a-uc.a.run.app';
      
      // Create a test webhook event payload
      const testPayload = {
        id: `evt_test_${Date.now()}`,
        object: 'event',
        api_version: '2024-12-18.acacia',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: customer.id,
            object: 'customer',
            email: customer.email,
            metadata: { test: 'true' }
          }
        },
        type: 'customer.created',
        livemode: false,
        pending_webhooks: 0,
        request: {
          id: null,
          idempotency_key: null
        }
      };

      // Sign the payload with Stripe webhook secret if available
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      let signature = '';
      
      if (webhookSecret) {
        const timestamp = Math.floor(Date.now() / 1000);
        const payload = JSON.stringify(testPayload);
        signature = `t=${timestamp},v1=${require('crypto')
          .createHmac('sha256', webhookSecret)
          .update(`${timestamp}.${payload}`)
          .digest('hex')}`;
      }

      // Send test event to webhook endpoint
      const webhookResponse = await fetch(webhookEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature || 'test-signature'
        },
        body: JSON.stringify(testPayload)
      });

      const responseText = await webhookResponse.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }

      return NextResponse.json({
        success: true,
        message: 'Webhook test completed',
        testCustomerId: customer.id,
        webhookResponse: {
          status: webhookResponse.status,
          statusText: webhookResponse.statusText,
          data: responseData
        },
        timestamp: new Date().toISOString()
      });

    } catch (stripeError: any) {
      console.error('Stripe test error:', stripeError);
      
      // Log the failure
      await db.collection('webhook_logs').add({
        type: 'webhook.test',
        status: 'failed',
        error: stripeError.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          isTest: true,
          initiatedBy: adminToken.email
        }
      });

      return NextResponse.json({
        success: false,
        error: stripeError.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Test webhook error:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}