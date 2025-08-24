import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// TEMPORARY: Direct Stripe integration for testing
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { idToken, userEmail } = await request.json();
    
    // For testing, get the current user's email
    let email = userEmail;
    
    if (!email) {
      // Try to get from auth if available
      const user = auth.currentUser;
      email = user?.email || null;
    }
    
    if (!email) {
      return NextResponse.json(
        { error: 'User email required' },
        { status: 400 }
      );
    }
    
    // Get customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });
    
    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: 'No customer found for this email' },
        { status: 404 }
      );
    }
    
    const customer = customers.data[0];
    
    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${request.headers.get('origin')}/account`,
    });
    
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}