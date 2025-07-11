/**
 * Sync feature registration for the three-pillar system
 */

import { FeatureRegistry } from './types';

export const SYNC_FEATURES: Partial<FeatureRegistry> = {
  'cloud_sync': {
    id: 'cloud_sync',
    name: 'Cloud Sync',
    description: 'Sync your data across all devices',
    category: 'system',
    icon: '☁️',
    limitType: 'none', // No usage limits for sync
    requiresAuth: true,
    requiresSubscription: true, // Premium only
    status: 'active'
  },
  
  'manual_sync': {
    id: 'manual_sync',
    name: 'Manual Sync',
    description: 'Manually trigger data synchronization',
    category: 'system',
    icon: '🔄',
    limitType: 'daily', // Limit manual syncs per day
    requiresAuth: true,
    requiresSubscription: true,
    status: 'active'
  },
  
  'background_sync': {
    id: 'background_sync',
    name: 'Background Sync',
    description: 'Automatic background synchronization',
    category: 'system',
    icon: '🔃',
    limitType: 'none',
    requiresAuth: true,
    requiresSubscription: true,
    status: 'active'
  }
};