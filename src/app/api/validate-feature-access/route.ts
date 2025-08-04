import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserSubscription } from '@/types/subscription';

// Server-side feature validation to prevent client-side bypass
export async function POST(request: NextRequest) {
  try {
    const { userId, feature, increment = false } = await request.json();

    // Validate input
    if (!userId || !feature) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const validFeatures = ['drills', 'lists', 'sync', 'save'];
    if (!validFeatures.includes(feature)) {
      return NextResponse.json(
        { error: 'Invalid feature' },
        { status: 400 }
      );
    }

    const userDocRef = doc(db, 'users', userId);

    if (increment) {
      // Use transaction for incrementing usage
      const result = await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const subscription: UserSubscription = userData.subscription;

        if (!subscription) {
          throw new Error('No subscription data found');
        }

        // Check if feature is available before incrementing
        const isAvailable = checkFeatureAvailability(subscription, feature);
        
        if (!isAvailable.allowed) {
          return {
            allowed: false,
            reason: isAvailable.reason,
            limits: subscription.limits,
            currentUsage: subscription.currentUsage
          };
        }

        // Increment usage if it's a countable feature
        if (feature === 'drills') {
          const today = new Date().toISOString().split('T')[0];
          const isToday = subscription.currentUsage?.lastDrillDate === today;
          const currentCount = isToday ? (subscription.currentUsage?.drillsToday || 0) : 0;

          const updatedSubscription = {
            ...subscription,
            currentUsage: {
              ...subscription.currentUsage,
              drillsToday: currentCount + 1,
              lastDrillDate: today,
            },
          };

          transaction.set(userDocRef, { subscription: updatedSubscription }, { merge: true });
        } else if (feature === 'lists') {
          const updatedSubscription = {
            ...subscription,
            currentUsage: {
              ...subscription.currentUsage,
              listsCount: (subscription.currentUsage?.listsCount || 0) + 1,
            },
          };

          transaction.set(userDocRef, { subscription: updatedSubscription }, { merge: true });
        }

        return {
          allowed: true,
          reason: null,
          limits: subscription.limits,
          currentUsage: subscription.currentUsage
        };
      });

      return NextResponse.json(result);
    } else {
      // Just check availability without incrementing
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const userData = userDoc.data();
      const subscription: UserSubscription = userData.subscription;

      if (!subscription) {
        return NextResponse.json(
          { error: 'No subscription data found' },
          { status: 404 }
        );
      }

      const result = checkFeatureAvailability(subscription, feature);
      
      return NextResponse.json({
        allowed: result.allowed,
        reason: result.reason,
        limits: subscription.limits,
        currentUsage: subscription.currentUsage
      });
    }
  } catch (error) {
    console.error('Feature validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function checkFeatureAvailability(subscription: UserSubscription, feature: string): { allowed: boolean; reason?: string } {
  const { limits, currentUsage } = subscription;
  
  if (!limits || !currentUsage) {
    return { allowed: false, reason: 'Missing subscription data' };
  }

  switch (feature) {
    case 'save':
      return { allowed: limits?.canSave || false };
      
    case 'sync':
      return { 
        allowed: limits?.canSync || false,
        reason: (limits?.canSync) ? undefined : 'Premium subscription required for cloud sync'
      };
      
    case 'lists':
      const canCreateList = (limits?.maxLists === -1) || ((currentUsage?.listsCount || 0) < (limits?.maxLists || 0));
      return { 
        allowed: canCreateList,
        reason: canCreateList ? undefined : `Maximum of ${limits?.maxLists || 0} study lists allowed on free plan`
      };
      
    case 'drills':
      const today = new Date().toISOString().split('T')[0];
      const isToday = currentUsage?.lastDrillDate === today;
      const todayCount = isToday ? (currentUsage?.drillsToday || 0) : 0;
      const canDoDrill = (limits?.maxDrillsPerDay === -1) || (todayCount < (limits?.maxDrillsPerDay || 0));
      
      return { 
        allowed: canDoDrill,
        reason: canDoDrill ? undefined : `Daily limit of ${limits?.maxDrillsPerDay || 0} drills reached`
      };
      
    default:
      return { allowed: false, reason: 'Unknown feature' };
  }
}