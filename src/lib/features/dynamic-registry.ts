/**
 * Dynamic Feature Registry
 * Allows runtime configuration of features through admin dashboard
 * Falls back to static registry for offline support
 */

import { Feature, FeatureRegistry } from './types';
import { FEATURE_REGISTRY as STATIC_REGISTRY } from './registry';

// Dynamic import for server/client compatibility
let firestoreModule: any = null;
let dbInstance: any = null;

const REGISTRY_DOC_ID = 'feature_registry_v1';

export class DynamicFeatureRegistry {
  private static instance: DynamicFeatureRegistry;
  private cachedRegistry: FeatureRegistry | null = null;
  private listeners: Set<(registry: FeatureRegistry) => void> = new Set();

  static getInstance(): DynamicFeatureRegistry {
    if (!this.instance) {
      this.instance = new DynamicFeatureRegistry();
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
      console.error('Failed to initialize Firestore for feature registry:', error);
      // Return null to use static fallback
      return null;
    }
    
    return dbInstance;
  }

  /**
   * Get current feature registry (from Firestore or fallback to static)
   */
  async getRegistry(): Promise<FeatureRegistry> {
    // Return cached if available
    if (this.cachedRegistry) {
      return this.cachedRegistry;
    }

    try {
      const db = await this.initFirestore();
      if (!db) {
        // Firestore not available, use static registry
        return STATIC_REGISTRY;
      }

      const registryDoc = await firestoreModule.getDoc(
        firestoreModule.doc(dbInstance, 'config', REGISTRY_DOC_ID)
      );
      
      if (registryDoc.exists()) {
        const data = registryDoc.data();
        this.cachedRegistry = data.features as FeatureRegistry;

        return this.cachedRegistry;
      }
      
      // Initialize with static registry if not found

      await this.saveRegistry(STATIC_REGISTRY);
      this.cachedRegistry = STATIC_REGISTRY;
      return STATIC_REGISTRY;
    } catch (error) {
      console.error('[DynamicRegistry] Error loading, falling back to static:', error);
      // Fallback to static registry
      return STATIC_REGISTRY;
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
   * Save updated registry to Firestore
   */
  async saveRegistry(registry: FeatureRegistry): Promise<void> {
    // Only admins can save registry
    const isAdmin = await this.checkAdminAccess();
    if (!isAdmin) {

      throw new Error('Unauthorized: Only admins can modify feature registry');
    }
    
    try {
      const db = await this.initFirestore();
      if (!db) {
        throw new Error('Firestore not available');
      }

      await firestoreModule.setDoc(
        firestoreModule.doc(dbInstance, 'config', REGISTRY_DOC_ID), 
        {
          features: registry,
          lastUpdated: new Date().toISOString(),
          version: 1
        }
      );
      
      this.cachedRegistry = registry;
      this.notifyListeners(registry);

    } catch (error) {
      console.error('[DynamicRegistry] Error saving:', error);
      throw error;
    }
  }

  /**
   * Update a specific feature
   */
  async updateFeature(featureId: string, updates: Partial<Feature>): Promise<void> {
    const registry = await this.getRegistry();
    
    if (!registry[featureId]) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    // Create updated registry
    const updatedRegistry = {
      ...registry,
      [featureId]: {
        ...registry[featureId],
        ...updates,
        id: featureId // Ensure ID doesn't change
      }
    };

    await this.saveRegistry(updatedRegistry);
  }

  /**
   * Add a new feature
   */
  async addFeature(feature: Feature): Promise<void> {
    const registry = await this.getRegistry();
    
    if (registry[feature.id]) {
      throw new Error(`Feature already exists: ${feature.id}`);
    }

    const updatedRegistry = {
      ...registry,
      [feature.id]: feature
    };

    await this.saveRegistry(updatedRegistry);
  }

  /**
   * Delete a feature
   */
  async deleteFeature(featureId: string): Promise<void> {
    const registry = await this.getRegistry();
    
    if (!registry[featureId]) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    const updatedRegistry = { ...registry };
    delete updatedRegistry[featureId];

    await this.saveRegistry(updatedRegistry);
  }

  /**
   * Add listener for registry changes
   */
  subscribe(callback: (registry: FeatureRegistry) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(registry: FeatureRegistry) {
    this.listeners.forEach(callback => callback(registry));
  }

  /**
   * Clear cache (useful when registry is updated externally)
   */
  clearCache() {
    this.cachedRegistry = null;
  }
}

// Export singleton instance
export const dynamicRegistry = DynamicFeatureRegistry.getInstance();