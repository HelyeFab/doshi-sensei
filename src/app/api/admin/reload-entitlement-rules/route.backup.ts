import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import { ENTITLEMENT_RULES as DEFAULT_RULES } from '@/lib/entitlements/rules';
import { clearRulesCache } from '@/lib/server-dynamic-rules-admin';

const RULES_DOC_ID = 'entitlement_rules_v1';

export async function POST(request: NextRequest) {

  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Get Firebase Admin instance
    const admin = await getFirebaseAdmin();
    const auth = admin.auth();
    const firestore = admin.firestore();
    
    // Verify token and admin status
    const decodedToken = await auth.verifyIdToken(token);
    const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Clear the cache first
    clearRulesCache();
    
    // Get the config collection
    const configRef = firestore.collection('config');
    
    // The rules are stored as an array in the main document
    // We need to completely replace them with the updated defaults

    console.log('📋 Rules to update:', DEFAULT_RULES.map(r => r.id).join(', '));
    
    // Show which rules have kana_study
    DEFAULT_RULES.forEach(rule => {
      const hasKanaStudy = rule.limits?.daily?.kana_study !== undefined;

    });
    
    // Update the document with completely new rules
    await configRef.doc(RULES_DOC_ID).set({
      version: 1,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      rules: DEFAULT_RULES
    }, { merge: false }); // Use merge: false to completely replace

    return NextResponse.json({ 
      success: true, 
      message: 'Entitlement rules reloaded from code defaults',
      rulesUpdated: DEFAULT_RULES.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Reload rules error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to reload entitlement rules',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}