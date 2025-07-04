import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
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

export async function POST(request: NextRequest) {
  try {
    const { amount, userEmail, userName } = await request.json();

    if (!amount || amount < 100) { // Minimum $1.00
      return NextResponse.json(
        { error: 'Minimum donation amount is $1.00' },
        { status: 400 }
      );
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Create PayPal order
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: (amount / 100).toFixed(2), // Convert cents to dollars
          },
          description: 'Support Doshi Sensei - Japanese Learning App ☕',
          custom_id: `donation_${Date.now()}`,
          soft_descriptor: 'DOSHI SENSEI',
        },
      ],
      application_context: {
        brand_name: 'Doshi Sensei',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: `${request.nextUrl.origin}/?paypal_success=true`,
        cancel_url: `${request.nextUrl.origin}/?paypal_canceled=true`,
      },
      payer: userEmail ? {
        email_address: userEmail,
        name: userName ? {
          given_name: userName.split(' ')[0] || userName,
          surname: userName.split(' ').slice(1).join(' ') || '',
        } : undefined,
      } : undefined,
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `donation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
      body: JSON.stringify(orderData),
    });

    const order = await response.json();

    if (!response.ok) {
      console.error('PayPal order creation failed:', order);
      return NextResponse.json(
        { error: 'Failed to create PayPal order' },
        { status: 500 }
      );
    }

    // Find the approval URL
    const approvalUrl = order.links?.find((link: any) => link.rel === 'approve')?.href;

    if (!approvalUrl) {
      console.error('No approval URL found in PayPal response:', order);
      return NextResponse.json(
        { error: 'Invalid PayPal response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orderId: order.id,
      approvalUrl: approvalUrl
    });

  } catch (error) {
    console.error('Error creating PayPal donation:', error);
    return NextResponse.json(
      { error: 'Failed to create PayPal donation' },
      { status: 500 }
    );
  }
}
