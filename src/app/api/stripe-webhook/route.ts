import { NextRequest, NextResponse } from 'next/server';

/**
 * PRODUCTION CRITICAL: This endpoint is PERMANENTLY DISABLED
 * 
 * All Stripe webhooks MUST be processed by Google Cloud Functions at:
 * https://stripewebhook-jtmxvmnera-uc.a.run.app
 * 
 * RE-ENABLING THIS ENDPOINT WILL CAUSE:
 * - Duplicate charges
 * - Data corruption
 * - Race conditions
 * - Inconsistent subscription states
 * 
 * Migration completed: 2025-01-23
 * For the original implementation, see: docs/stripe-migration/archive/original-webhook-implementation.ts
 */

export async function GET() {
  return NextResponse.json({ 
    status: 'DISABLED - Webhook processing moved to Cloud Functions',
    message: 'This endpoint has been disabled to prevent race conditions. All webhook processing is now handled by Google Cloud Functions.',
    correctWebhookUrl: 'https://stripewebhook-jtmxvmnera-uc.a.run.app',
    timestamp: new Date().toISOString(),
    migrationDate: '2025-01-23'
  });
}

export async function POST(request: NextRequest) {
  // Log critical error - this should never be called in production
  console.error('🚨 CRITICAL: Webhook sent to disabled endpoint - check Stripe Dashboard configuration');
  console.error('Correct webhook URL: https://stripewebhook-jtmxvmnera-uc.a.run.app');
  console.error('Request headers:', Object.fromEntries(request.headers.entries()));
  
  return NextResponse.json(
    { 
      error: 'Webhook endpoint disabled', 
      message: 'This endpoint has been permanently disabled to prevent duplicate processing. Webhooks are now handled by Google Cloud Functions.',
      correctWebhookUrl: 'https://stripewebhook-jtmxvmnera-uc.a.run.app',
      action: 'Please update your Stripe Dashboard webhook URL immediately.'
    }, 
    { status: 410 } // 410 Gone - indicates the resource is no longer available
  );
}