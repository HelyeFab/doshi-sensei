import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import { ENTITLEMENT_RULES as DEFAULT_RULES } from '@/lib/entitlements/rules';
import { clearRulesCache } from '@/lib/server-dynamic-rules-admin';

const RULES_DOC_ID = 'entitlement_rules_v1';

export async function POST(request: NextRequest) {
  console.log('🔄 Rebuild config collection API called');
  
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
    
    console.log('✅ Admin verified, rebuilding config collection');
    
    // Clear the cache first
    clearRulesCache();
    
    // Get the config collection reference
    const configRef = firestore.collection('config');
    
    // Delete the old rules document if it exists
    try {
      const oldDoc = await configRef.doc(RULES_DOC_ID).get();
      if (oldDoc.exists) {
        console.log('🗑️ Deleting old rules document');
        await configRef.doc(RULES_DOC_ID).delete();
      }
    } catch (error) {
      console.warn('Could not delete old document:', error);
    }
    
    // Create fresh rules document with all defaults
    console.log('📝 Creating fresh rules document');
    console.log('📋 Rules being added:', DEFAULT_RULES.map(r => ({
      id: r.id,
      userTypes: r.userTypes,
      hasKanaStudy: r.limits?.daily?.kana_study !== undefined,
      kanaStudyLimit: r.limits?.daily?.kana_study
    })));
    
    await configRef.doc(RULES_DOC_ID).set({
      version: 1,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      rules: DEFAULT_RULES,
      metadata: {
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: decodedToken.email,
        source: 'rebuild-config-api'
      }
    });
    
    console.log('✅ Config collection rebuilt successfully');
    
    // Verify the document was created correctly
    const newDoc = await configRef.doc(RULES_DOC_ID).get();
    const data = newDoc.data();
    const rulesWithKanaStudy = data?.rules?.filter((r: any) => r.limits?.daily?.kana_study !== undefined) || [];
    
    return NextResponse.json({ 
      success: true, 
      message: 'Config collection rebuilt from scratch',
      rulesCreated: DEFAULT_RULES.length,
      rulesWithKanaStudy: rulesWithKanaStudy.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Rebuild config error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to rebuild config collection',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}