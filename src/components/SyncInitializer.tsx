'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

/**
 * Component that handles automatic sync on app launch and auth changes
 * Firebase data always wins as the source of truth
 */
export default function SyncInitializer() {
  const { user } = useAuth();
  const { forceSyncFromFirebase } = useSettings();
  const hasInitialSynced = useRef(false);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    // Sync when:
    // 1. App launches and user is authenticated (initial sync)
    // 2. User logs in (auth change)
    // 3. User switches accounts (different user ID)
    
    const shouldSync = () => {
      if (!user) {
        // User logged out - reset sync state
        hasInitialSynced.current = false;
        lastUserId.current = null;
        return false;
      }

      // Check if this is a new user or first sync
      if (!hasInitialSynced.current || lastUserId.current !== user.uid) {
        hasInitialSynced.current = true;
        lastUserId.current = user.uid;
        return true;
      }

      return false;
    };

    if (shouldSync()) {
      console.log('🚀 Auto-sync triggered:', {
        reason: !hasInitialSynced.current ? 'App launch' : 'User change',
        userId: user?.uid
      });

      // Delay slightly to ensure Firebase is fully initialized
      const timer = setTimeout(() => {
        forceSyncFromFirebase().then(success => {
          if (success) {
            console.log('✅ Auto-sync completed successfully');
          } else {
            console.log('ℹ️ Auto-sync: No changes detected');
          }
        }).catch(error => {
          console.error('❌ Auto-sync failed:', error);
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [user, forceSyncFromFirebase]);

  // No UI - this is a background service
  return null;
}