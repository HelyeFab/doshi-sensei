import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  console.log('Netlify Function: api-stripe-webhook called');
  console.log('Method:', event.httpMethod);
  console.log('Headers:', JSON.stringify(event.headers, null, 2));
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Log that we received the webhook
    console.log('Webhook received in Netlify function');
    console.log('Body length:', event.body?.length);
    
    // For now, just return success to see if Stripe can reach us
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        received: true,
        message: 'Webhook received by Netlify function',
        timestamp: new Date().toISOString()
      }),
    };
  } catch (error) {
    console.error('Error in webhook handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};