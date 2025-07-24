/**
 * Entitlement Manager
 * Manages user permissions and limits based on their subscription type
 */

import { UserType, Permission, EntitlementCheckResult } from './types';
import { getEntitlementRulesForUserTypeAsync, getUserPermissionsAsync, getUserLimitsAsync } from './rules';
import { dynamicRules } from './dynamic-rules';

export class EntitlementManager {
  /**
   * Check if a user type has a specific permission
   */
  async hasPermission(userType: UserType, permission: Permission): Promise<boolean> {
    const rule = await getEntitlementRulesForUserTypeAsync(userType);
    if (!rule) return false;
    
    // Check for wildcard permission
    if (rule.permissions.includes('*')) return true;
    
    return rule.permissions.includes(permission);
  }
  
  /**
   * Get all permissions for a user type
   */
  async getPermissions(userType: UserType): Promise<Permission[]> {
    return getUserPermissionsAsync(userType);
  }
  
  /**
   * Get limit for a specific feature
   */
  async getLimit(userType: UserType, featureId: string, limitType: 'daily' | 'total'): Promise<number> {
    const rule = await getEntitlementRulesForUserTypeAsync(userType);
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
  async getAllLimits(userType: UserType) {
    return getUserLimitsAsync(userType);
  }
  
  /**
   * Perform a complete entitlement check
   */
  async checkEntitlements(userType: UserType): Promise<EntitlementCheckResult> {
    const rule = await getEntitlementRulesForUserTypeAsync(userType);
    
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