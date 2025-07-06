/**
 * Entitlement Manager
 * Manages user permissions and limits based on their subscription type
 */

import { UserType, Permission, EntitlementCheckResult } from './types';
import { getEntitlementRulesForUserType } from './rules';
import { dynamicRules } from './dynamic-rules';

export class EntitlementManager {
  /**
   * Check if a user type has a specific permission
   */
  hasPermission(userType: UserType, permission: Permission): boolean {
    const rule = getEntitlementRulesForUserType(userType);
    if (!rule) return false;
    
    // Check for wildcard permission
    if (rule.permissions.includes('*')) return true;
    
    return rule.permissions.includes(permission);
  }
  
  /**
   * Get all permissions for a user type
   */
  getPermissions(userType: UserType): Permission[] {
    const rule = getEntitlementRulesForUserType(userType);
    return rule?.permissions || [];
  }
  
  /**
   * Get limit for a specific feature
   */
  getLimit(userType: UserType, featureId: string, limitType: 'daily' | 'total'): number {
    const rule = getEntitlementRulesForUserType(userType);
    if (!rule) return 0;
    
    const limits = rule.limits[limitType];
    if (!limits) return 0;
    
    // Check for shared limit groups (e.g., all games share a limit)
    // This will be handled by the access control layer
    return limits[featureId] ?? 0;
  }
  
  /**
   * Get all limits for a user type
   */
  getAllLimits(userType: UserType) {
    const rule = getEntitlementRulesForUserType(userType);
    return rule?.limits || { daily: {}, total: {} };
  }
  
  /**
   * Perform a complete entitlement check
   */
  checkEntitlements(userType: UserType): EntitlementCheckResult {
    const rule = getEntitlementRulesForUserType(userType);
    
    if (!rule) {
      return {
        allowed: false,
        permissions: [],
        limits: { daily: {}, total: {} },
        userType
      };
    }
    
    return {
      allowed: true,
      permissions: rule.permissions,
      limits: rule.limits,
      userType
    };
  }
}

// Singleton instance
export const entitlementManager = new EntitlementManager();