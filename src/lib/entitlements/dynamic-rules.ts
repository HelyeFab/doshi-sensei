/**
 * Dynamic Entitlement Rules
 * Allows runtime configuration of user limits through admin dashboard
 */

import { EntitlementRule } from './types';
import { ENTITLEMENT_RULES as DEFAULT_RULES } from './rules';

// Dynamic import for server/client compatibility
let firestoreModule: any = null;
let dbInstance: any = null;

const RULES_DOC_ID = 'entitlement_rules_v1';

export class DynamicEntitlementRules {
  private static instance: DynamicEntitlementRules;
  private cachedRules: EntitlementRule[] | null = null;
  private listeners: Set<(rules: EntitlementRule[]) => void> = new Set();

  static getInstance(): DynamicEntitlementRules {
    if (!this.instance) {
      this.instance = new DynamicEntitlementRules();
    }
    return this.instance;
  }

  /**
   * Initialize Firestore based on environment
   */
  private async initFirestore() {
    if (dbInstance) return dbInstance;

    try {
      if (typeof window !== 'undefined') {
        // Client-side: use regular Firebase
        const { getFirestore, doc, getDoc, setDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        firestoreModule = { doc, getDoc, setDoc };
        dbInstance = db;
      } else {
        // Server-side: use Firebase Admin
        const { getFirebaseAdmin } = await import('@/lib/firebase-admin-safe');
        const admin = await getFirebaseAdmin();
        dbInstance = admin.firestore();
        
        // Create wrapper functions for admin SDK
        firestoreModule = {
          doc: (db: any, ...pathSegments: string[]) => db.doc(pathSegments.join('/')),
          getDoc: async (docRef: any) => {
            const snapshot = await docRef.get();
            return {
              exists: () => snapshot.exists,
              data: () => snapshot.data()
            };
          },
          setDoc: async (docRef: any, data: any) => {
            await docRef.set(data);
          }
        };
      }
    } catch (error) {
      console.error('Failed to initialize Firestore:', error);
      throw error;
    }
    
    return dbInstance;
  }

  /**
   * Get current rules (from Firestore or fallback to defaults)
   */
  async getRules(): Promise<EntitlementRule[]> {
    // Return cached if available
    if (this.cachedRules) {
      return this.cachedRules;
    }

    try {
      await this.initFirestore();
      const rulesDoc = await firestoreModule.getDoc(firestoreModule.doc(dbInstance, 'config', RULES_DOC_ID));
      
      if (rulesDoc.exists()) {
        const data = rulesDoc.data();
        this.cachedRules = data.rules as EntitlementRule[];
        return this.cachedRules;
      }
      
      // Initialize with defaults if not found
      await this.saveRules(DEFAULT_RULES);
      this.cachedRules = DEFAULT_RULES;
      return DEFAULT_RULES;
    } catch (error) {
      console.error('Error loading dynamic rules:', error);
      // Fallback to hardcoded defaults
      return DEFAULT_RULES;
    }
  }
  
  /**
   * Check if current user is admin
   */
  private async checkAdminAccess(): Promise<boolean> {
    // Server-side always returns false unless specifically marked as admin request
    if (typeof window === 'undefined') {
      return (global as any).__adminRequest === true;
    }
    
    try {
      // Import auth dynamically to avoid circular dependencies
      const { auth } = await import('@/lib/firebase');
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        return false;
      }
      
      // Import ADMIN_EMAIL dynamically
      const { ADMIN_EMAIL } = await import('@/types/admin');
      return user.email === ADMIN_EMAIL;
    } catch (error) {
      // If we can't check auth, assume not admin
      return false;
    }
  }

  /**
   * Save updated rules to Firestore
   */
  async saveRules(rules: EntitlementRule[]): Promise<void> {
    // Only admins can save rules
    const isAdmin = await this.checkAdminAccess();
    if (!isAdmin) {

      throw new Error('Unauthorized: Only admins can modify rules');
    }
    
    try {
      await this.initFirestore();
      await firestoreModule.setDoc(firestoreModule.doc(dbInstance, 'config', RULES_DOC_ID), {
        rules,
        lastUpdated: new Date().toISOString(),
        version: 1
      });
      
      this.cachedRules = rules;
      this.notifyListeners(rules);
    } catch (error) {
      console.error('Error saving rules:', error);
      throw error;
    }
  }

  /**
   * Update a specific limit
   */
  async updateLimit(
    userType: string,
    featureId: string,
    limitType: 'daily' | 'total',
    newValue: number
  ): Promise<void> {
    // Only admins can update limits
    const isAdmin = await this.checkAdminAccess();
    if (!isAdmin) {

      throw new Error('Unauthorized: Only admins can modify limits');
    }
    
    const rules = await this.getRules();
    
    const ruleIndex = rules.findIndex(r => r.userTypes.includes(userType as any));
    if (ruleIndex === -1) {
      throw new Error(`Rule not found for user type: ${userType}`);
    }

    // Deep clone to avoid mutations
    const updatedRules = JSON.parse(JSON.stringify(rules));
    const rule = updatedRules[ruleIndex];

    if (!rule.limits[limitType]) {
      rule.limits[limitType] = {};
    }

    rule.limits[limitType]![featureId] = newValue;

    await this.saveRules(updatedRules);
  }

  /**
   * Add listener for rule changes
   */
  subscribe(callback: (rules: EntitlementRule[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(rules: EntitlementRule[]) {
    this.listeners.forEach(callback => callback(rules));
  }

  /**
   * Clear cache (useful when rules are updated externally)
   */
  clearCache() {
    this.cachedRules = null;
  }
}

// Export singleton instance
export const dynamicRules = DynamicEntitlementRules.getInstance();