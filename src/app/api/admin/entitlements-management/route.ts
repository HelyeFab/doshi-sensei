import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import { ENTITLEMENT_RULES as DEFAULT_RULES } from '@/lib/entitlements/rules';
import { EntitlementRule } from '@/lib/entitlements/types';
import { clearRulesCache, getServerDynamicRulesAdmin } from '@/lib/server-dynamic-rules-admin';

const RULES_DOC_ID = 'entitlement_rules_v1';

// Type definitions for API responses
export interface EntitlementDebugInfo {
  currentRules: {
    source: 'firestore' | 'default';
    lastUpdated: string;
    version: number;
    rulesCount: number;
  };
  youtubeLimits: {
    userType: string;
    limit: number;
  }[];
  structureStatus: {
    isValid: boolean;
    issues: string[];
  };
  cacheInfo: {
    serverCacheAge: number | null;
    clientCacheStatus: string;
  };
}

export interface EntitlementFixResult {
  success: boolean;
  message: string;
  fixed: string[];
  errors: string[];
}

async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.substring(7);
  const admin = await getFirebaseAdmin();
  const decodedToken = await admin.auth().verifyIdToken(token);

  // Check if user is admin (matching pattern from other admin routes)
  const userEmail = decodedToken.email || '';
  const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';
  if (!isAdmin) {
    throw new Error('Forbidden - Admin access required');
  }

  return { admin, userEmail };
}

// GET /api/admin/entitlements-management - Debug info
export async function GET(request: NextRequest) {
  try {
    await verifyAuth(request);
    
    // Get current rules
    const rules = await getServerDynamicRulesAdmin(true); // Force refresh
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    const rulesDocRef = db.doc(`config/${RULES_DOC_ID}`);
    const rulesDoc = await rulesDocRef.get();
    
    const debugInfo: EntitlementDebugInfo = {
      currentRules: {
        source: rulesDoc.exists ? 'firestore' : 'default',
        lastUpdated: rulesDoc.exists ? rulesDoc.data()?.lastUpdated : 'N/A',
        version: rulesDoc.exists ? rulesDoc.data()?.version : 0,
        rulesCount: rules.length
      },
      youtubeLimits: [],
      structureStatus: {
        isValid: true,
        issues: []
      },
      cacheInfo: {
        serverCacheAge: null, // Will be implemented with cache metadata
        clientCacheStatus: 'unknown'
      }
    };
    
    // Extract YouTube limits for each user type
    const userTypes = ['guest', 'free', 'monthly', 'yearly'];
    userTypes.forEach(userType => {
      const rule = rules.find(r => r.userTypes.includes(userType as any));
      if (rule?.limits?.daily?.youtube_shadowing !== undefined) {
        debugInfo.youtubeLimits.push({
          userType,
          limit: rule.limits.daily.youtube_shadowing
        });
      }
    });
    
    // Check structure validity
    rules.forEach(rule => {
      if (!rule.id || !rule.userTypes || !rule.permissions) {
        debugInfo.structureStatus.isValid = false;
        debugInfo.structureStatus.issues.push(`Invalid rule structure: ${rule.id}`);
      }
      
      // Check for required limit types
      if (!rule.limits || typeof rule.limits !== 'object') {
        debugInfo.structureStatus.isValid = false;
        debugInfo.structureStatus.issues.push(`Missing limits object for rule: ${rule.id}`);
      }
    });
    
    return NextResponse.json(debugInfo);
    
  } catch (error) {
    console.error('Debug error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized' || message === 'Forbidden') {
      return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 403 });
    }
    return NextResponse.json({ error: 'Failed to get debug info', details: message }, { status: 500 });
  }
}

// POST /api/admin/entitlements-management - Fix structure
export async function POST(request: NextRequest) {
  try {
    const { admin } = await verifyAuth(request);
    const { action } = await request.json();
    
    if (action !== 'fix-structure') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    const db = admin.firestore();
    const rulesDocRef = db.doc(`config/${RULES_DOC_ID}`);
    
    const fixResult: EntitlementFixResult = {
      success: false,
      message: '',
      fixed: [],
      errors: []
    };
    
    try {
      // Get current rules or use defaults
      const rulesDoc = await rulesDocRef.get();
      let rules = rulesDoc.exists ? rulesDoc.data()?.rules : DEFAULT_RULES;
      
      // Ensure rules is an array
      if (!Array.isArray(rules)) {
        rules = DEFAULT_RULES;
        fixResult.fixed.push('Reset to default rules (invalid structure)');
      }
      
      // Fix each rule
      const fixedRules = rules.map((rule: any) => {
        const fixed = { ...rule };
        
        // Ensure required fields
        if (!fixed.id) {
          fixed.id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          fixResult.fixed.push(`Added missing ID to rule`);
        }
        
        if (!Array.isArray(fixed.userTypes)) {
          fixed.userTypes = [];
          fixResult.fixed.push(`Fixed userTypes for rule ${fixed.id}`);
        }
        
        if (!Array.isArray(fixed.permissions)) {
          fixed.permissions = [];
          fixResult.fixed.push(`Fixed permissions for rule ${fixed.id}`);
        }
        
        // Ensure limits structure
        if (!fixed.limits || typeof fixed.limits !== 'object') {
          fixed.limits = { daily: {}, total: {} };
          fixResult.fixed.push(`Added missing limits structure to rule ${fixed.id}`);
        }
        
        if (!fixed.limits.daily || typeof fixed.limits.daily !== 'object') {
          fixed.limits.daily = {};
          fixResult.fixed.push(`Fixed daily limits for rule ${fixed.id}`);
        }
        
        if (!fixed.limits.total || typeof fixed.limits.total !== 'object') {
          fixed.limits.total = {};
          fixResult.fixed.push(`Fixed total limits for rule ${fixed.id}`);
        }
        
        return fixed;
      });
      
      // Save the fixed rules
      await rulesDocRef.set({
        rules: fixedRules,
        lastUpdated: new Date().toISOString(),
        version: 1,
        fixedAt: new Date().toISOString()
      });
      
      // Clear cache
      clearRulesCache();
      
      fixResult.success = true;
      fixResult.message = fixResult.fixed.length > 0 
        ? `Fixed ${fixResult.fixed.length} issues` 
        : 'Structure is already valid';
      
    } catch (error) {
      fixResult.errors.push(error instanceof Error ? error.message : 'Unknown error during fix');
    }
    
    return NextResponse.json(fixResult);
    
  } catch (error) {
    console.error('Fix error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized' || message === 'Forbidden') {
      return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 403 });
    }
    return NextResponse.json({ error: 'Failed to fix structure', details: message }, { status: 500 });
  }
}