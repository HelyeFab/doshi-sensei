import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';

// Verify admin access
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization token provided');
  }

  const token = authHeader.substring(7);
  const admin = await getFirebaseAdmin();
  const decodedToken = await admin.auth().verifyIdToken(token);

  const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';

  if (!isAdmin) {
    throw new Error('Insufficient permissions');
  }

  return decodedToken;
}

// GET /api/admin/pricing-config - Get current pricing configuration
export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);
    
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    
    // Get pricing config from Firestore
    const configDoc = await db.collection('config').doc('pricing').get();
    
    if (!configDoc.exists) {
      // Return default pricing if not configured
      return NextResponse.json({
        success: true,
        pricing: {
          monthly: {
            amount: 3.99,
            currency: 'usd',
            stripePriceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
          },
          yearly: {
            amount: 39.99,
            currency: 'usd',
            stripePriceId: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID
          },
          updatedAt: new Date().toISOString()
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      pricing: configDoc.data()
    });
    
  } catch (error) {
    console.error('Error fetching pricing config:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch pricing';
    const statusCode = errorMessage.includes('authorization') || errorMessage.includes('permissions') ? 403 : 500;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

// POST /api/admin/pricing-config - Update pricing configuration
export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
    
    const { monthly, yearly } = await request.json();
    
    if (!monthly || !yearly) {
      return NextResponse.json(
        { success: false, error: 'Both monthly and yearly pricing required' },
        { status: 400 }
      );
    }
    
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    
    // Update pricing config in Firestore
    await db.collection('config').doc('pricing').set({
      monthly: {
        amount: monthly.amount,
        currency: monthly.currency || 'usd',
        stripePriceId: monthly.stripePriceId
      },
      yearly: {
        amount: yearly.amount,
        currency: yearly.currency || 'usd',
        stripePriceId: yearly.stripePriceId
      },
      updatedAt: new Date().toISOString(),
      updatedBy: (await verifyAdmin(request)).email
    });
    
    return NextResponse.json({
      success: true,
      message: 'Pricing configuration updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating pricing config:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to update pricing';
    const statusCode = errorMessage.includes('authorization') || errorMessage.includes('permissions') ? 403 : 500;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}