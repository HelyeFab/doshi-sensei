/**
 * Dynamic Entitlement Rules
 * Allows runtime configuration of user limits through admin dashboard
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EntitlementRule } from './types';
import { ENTITLEMENT_RULES as DEFAULT_RULES } from './rules';

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
   * Get current rules (from Firestore or fallback to defaults)
   */
  async getRules(): Promise<EntitlementRule[]> {
    // Return cached if available
    if (this.cachedRules) {
      return this.cachedRules;
    }

    try {
      const rulesDoc = await getDoc(doc(db, 'config', RULES_DOC_ID));
      
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
   * Save updated rules to Firestore
   */
  async saveRules(rules: EntitlementRule[]): Promise<void> {
    try {
      await setDoc(doc(db, 'config', RULES_DOC_ID), {
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