import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID!;
const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Get PayPal access token
async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`PayPal auth failed: ${data.error_description}`);
  }

  return data.access_token;
}

// Verify PayPal webhook signature
async function verifyPayPalWebhook(
  headers: Headers,
  body: string,
  webhookId: string
): Promise<boolean> {
  try {
    const accessToken = await getPayPalAccessToken();

    const verificationData = {
      auth_algo: headers.get('PAYPAL-AUTH-ALGO'),
      cert_id: headers.get('PAYPAL-CERT-ID'),
      transmission_id: headers.get('PAYPAL-TRANSMISSION-ID'),
      transmission_sig: headers.get('PAYPAL-TRANSMISSION-SIG'),
      transmission_time: headers.get('PAYPAL-TRANSMISSION-TIME'),
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(verificationData),
    });

    const result = await response.json();
    return result.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('PayPal webhook verification failed:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = request.headers;

    // Verify webhook signature in production
    if (process.env.NODE_ENV === 'production' && PAYPAL_WEBHOOK_ID) {
      const isValid = await verifyPayPalWebhook(headers, body, PAYPAL_WEBHOOK_ID);
      if (!isValid) {
        console.error('PayPal webhook signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    const event = JSON.parse(body);
    console.log('PayPal webhook event received:', event.event_type);

    switch (event.event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        await handleOrderApproved(event);
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCompleted(event);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePaymentFailed(event);
        break;

      default:
        console.log(`Unhandled PayPal event type: ${event.event_type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing PayPal webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleOrderApproved(event: any) {
  const order = event.resource;
  console.log(`PayPal order approved: ${order.id}`);

  // Order is approved but not yet captured
  // The actual payment capture will trigger PAYMENT.CAPTURE.COMPLETED
}

async function handlePaymentCompleted(event: any) {
  const capture = event.resource;
  const amount = capture.amount?.value;
  const currency = capture.amount?.currency_code;
  const payerEmail = capture.payer?.email_address;
  const customId = capture.custom_id;

  console.log(`PayPal donation completed: ${currency} ${amount} from ${payerEmail}`);
  console.log(`Custom ID: ${customId}`);

  // Log the successful donation
  try {
    // You could store donation records in Firestore here if needed
    console.log('PayPal donation processed successfully');
  } catch (error) {
    console.error('Error logging PayPal donation:', error);
  }
}

async function handlePaymentFailed(event: any) {
  const capture = event.resource;
  const customId = capture.custom_id;

  console.log(`PayPal payment failed/refunded: ${event.event_type}`);
  console.log(`Custom ID: ${customId}`);

  // Handle payment failure or refund
  try {
    console.log('PayPal payment failure processed');
  } catch (error) {
    console.error('Error processing PayPal payment failure:', error);
  }
}
