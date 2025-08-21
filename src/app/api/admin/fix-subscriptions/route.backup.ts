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

  // Check if user has admin custom claim or is the admin email
  const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';

  if (!isAdmin) {
    throw new Error('Insufficient permissions');
  }

  return decodedToken;
}

// POST /api/admin/fix-subscriptions - Fix subscriptions missing plan field
export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
    
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    
    // Get all users with active subscriptions
    const usersRef = db.collection('users');
    const snapshot = await usersRef
      .where('subscription.status', '==', 'active')
      .get();

    let fixed = 0;
    const batch = db.batch();
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      
      // Check if subscription exists but plan field is missing
      if (data.subscription && !data.subscription.plan) {
        console.log(`Fixing subscription for user ${doc.id} (${data.email})`);
        
        // Default to monthly plan for now
        // In a real scenario, you'd check the Stripe price ID to determine the plan
        const updatedSubscription = {
          ...data.subscription,
          plan: 'monthly' // Default to monthly
        };
        
        batch.update(doc.ref, {
          subscription: updatedSubscription
        });
        
        fixed++;
      }
    });
    
    if (fixed > 0) {
      await batch.commit();

    }
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixed} subscriptions out of ${snapshot.size} active subscriptions`,
      details: {
        totalActive: snapshot.size,
        fixed: fixed,
        alreadyCorrect: snapshot.size - fixed
      }
    });
    
  } catch (error) {
    console.error('Error fixing subscriptions:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fix subscriptions';
    const statusCode = errorMessage.includes('authorization') || errorMessage.includes('permissions') ? 403 : 500;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

// GET /api/admin/fix-subscriptions - Check subscriptions that need fixing
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
    
    const needsFixing: any[] = [];
    const correct: any[] = [];
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      
      if (data.subscription) {
        const info = {
          userId: doc.id,
          email: data.email,
          hasPlan: !!data.subscription.plan,
          plan: data.subscription.plan,
          status: data.subscription.status
        };
        
        if (!data.subscription.plan) {
          needsFixing.push(info);
        } else {
          correct.push(info);
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      summary: {
        totalActive: snapshot.size,
        needsFixing: needsFixing.length,
        correct: correct.length
      },
      needsFixing,
      correct
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