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

// GET /api/admin/cleanup-subscriptions - Check for phantom subscriptions
export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);
    
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    
    // Get all users with active subscriptions
    const usersRef = db.collection('users');
    const snapshot = await usersRef
      .where('subscription.status', '==', 'active')
      .get();
    
    const phantomSubscriptions: any[] = [];
    const validSubscriptions: any[] = [];
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      const info = {
        userId: doc.id,
        email: data.email,
        hasStripeId: !!data.subscription?.stripeSubscriptionId,
        stripeId: data.subscription?.stripeSubscriptionId || 'NONE',
        plan: data.subscription?.plan,
        createdAt: data.subscription?.metadata?.createdAt
      };
      
      if (!data.subscription?.stripeSubscriptionId) {
        phantomSubscriptions.push(info);
      } else {
        validSubscriptions.push(info);
      }
    });
    
    return NextResponse.json({
      success: true,
      summary: {
        totalActive: snapshot.size,
        phantom: phantomSubscriptions.length,
        valid: validSubscriptions.length
      },
      phantomSubscriptions,
      validSubscriptions
    });
    
  } catch (error) {
    console.error('Error checking subscriptions:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to check subscriptions';
    const statusCode = errorMessage.includes('authorization') || errorMessage.includes('permissions') ? 403 : 500;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

// POST /api/admin/cleanup-subscriptions - Remove phantom subscriptions
export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
    
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    
    // Get all users with active subscriptions but no Stripe ID
    const usersRef = db.collection('users');
    const snapshot = await usersRef
      .where('subscription.status', '==', 'active')
      .get();
    
    let cleaned = 0;
    const batch = db.batch();
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      
      // If subscription exists but has no Stripe ID, mark it as canceled
      if (data.subscription && !data.subscription.stripeSubscriptionId) {
        console.log(`Cleaning phantom subscription for user ${doc.id} (${data.email})`);
        
        // Update to canceled/free status
        const updatedSubscription = {
          ...data.subscription,
          status: 'canceled',
          plan: 'free',
          metadata: {
            ...data.subscription.metadata,
            cleanedAt: new Date().toISOString(),
            cleanReason: 'No Stripe subscription ID found'
          }
        };
        
        batch.update(doc.ref, {
          subscription: updatedSubscription
        });
        
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      await batch.commit();
      console.log(`Cleaned ${cleaned} phantom subscriptions`);
    }
    
    return NextResponse.json({
      success: true,
      message: `Cleaned ${cleaned} phantom subscriptions`,
      details: {
        totalChecked: snapshot.size,
        cleaned: cleaned
      }
    });
    
  } catch (error) {
    console.error('Error cleaning subscriptions:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to clean subscriptions';
    const statusCode = errorMessage.includes('authorization') || errorMessage.includes('permissions') ? 403 : 500;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}