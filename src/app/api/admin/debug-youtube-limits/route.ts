import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import { getServerDynamicRulesAdmin, clearRulesCache } from '@/lib/server-dynamic-rules-admin';

const RULES_DOC_ID = 'entitlement_rules_v1';

export async function GET(request: NextRequest) {
  try {
    // Force refresh if requested
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    
    console.log('🔍 Debugging YouTube limits...');
    
    // Get Firebase Admin instance
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    
    // Get the rules document directly
    const rulesDocRef = db.doc(`config/${RULES_DOC_ID}`);
    const rulesDoc = await rulesDocRef.get();
    
    let firestoreData = null;
    if (rulesDoc.exists) {
      firestoreData = rulesDoc.data();
      console.log('📄 Raw Firestore data:', JSON.stringify(firestoreData, null, 2));
    }
    
    // Get rules through the cache system
    const cachedRules = await getServerDynamicRulesAdmin(forceRefresh);
    
    // Extract YouTube limits
    const youtubeLimits: any = {};
    cachedRules.forEach(rule => {
      rule.userTypes.forEach(userType => {
        youtubeLimits[userType] = {
          daily: rule.limits?.daily?.youtube_shadowing || 0,
          total: rule.limits?.total?.youtube_shadowing || 0
        };
      });
    });
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      forceRefresh,
      youtubeLimits,
      rawFirestoreData: firestoreData,
      cachedRulesCount: cachedRules.length,
      cacheInfo: {
        message: 'Cache TTL is 5 seconds. Add ?refresh=true to force refresh.'
      }
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'Failed to debug YouTube limits', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}