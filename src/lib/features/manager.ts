/**
 * Feature Manager
 * Manages the feature registry and feature-related queries
 */

import { Feature, FeatureCategory, FeatureStatus, FeatureRegistry } from './types';
import { FEATURE_REGISTRY } from './registry';
import { dynamicRegistry } from './dynamic-registry';

export class FeatureManager {
  private features: FeatureRegistry = FEATURE_REGISTRY;
  private initialized = false;
  
  /**
   * Initialize with dynamic registry if available
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Try to load from dynamic registry
      this.features = await dynamicRegistry.getRegistry();
      this.initialized = true;
      
      // Subscribe to changes
      dynamicRegistry.subscribe((registry) => {
        this.features = registry;
      });
    } catch (error) {

      this.features = FEATURE_REGISTRY;
      this.initialized = true;
    }
  }
  
  /**
   * Get a specific feature by ID
   */
  getFeature(featureId: string): Feature | undefined {
    // Use static registry for synchronous calls
    // Dynamic registry will update this.features when loaded
    return this.features[featureId];
  }
  
  /**
   * Get a specific feature by ID (async version that ensures dynamic registry is loaded)
   */
  async getFeatureAsync(featureId: string): Promise<Feature | undefined> {
    await this.ensureInitialized();
    return this.features[featureId];
  }
  
  /**
   * Get all features
   */
  getAllFeatures(): Feature[] {
    return Object.values(this.features);
  }
  
  /**
   * Get features by category
   */
  getFeaturesByCategory(category: FeatureCategory): Feature[] {
    return this.getAllFeatures().filter(f => f.category === category);
  }
  
  /**
   * Get features by status
   */
  getFeaturesByStatus(status: FeatureStatus): Feature[] {
    return this.getAllFeatures().filter(f => f.status === status);
  }
  
  /**
   * Get active features only
   */
  getActiveFeatures(): Feature[] {
    return this.getFeaturesByStatus('active');
  }
  
  /**
   * Check if a feature requires authentication
   */
  requiresAuth(featureId: string): boolean {
    const feature = this.getFeature(featureId);
    return feature?.requiresAuth ?? true;
  }
  
  /**
   * Check if a feature requires subscription
   */
  requiresSubscription(featureId: string): boolean {
    const feature = this.getFeature(featureId);
    return feature?.requiresSubscription ?? false;
  }
  
  /**
   * Get features that share a limit group
   */
  getSharedLimitFeatures(featureId: string): Feature[] {
    const feature = this.getFeature(featureId);
    if (!feature?.sharedLimitGroup) return [feature].filter(Boolean);
    
    return this.getAllFeatures().filter(
      f => f.sharedLimitGroup === feature.sharedLimitGroup
    );
  }
  
  /**
   * Get the effective limit key for a feature
   * (handles shared limit groups)
   */
  getEffectiveLimitKey(featureId: string): string {
    const feature = this.getFeature(featureId);
    return feature?.sharedLimitGroup || featureId;
  }
}

// Singleton instance
export const featureManager = new FeatureManager();