'use client';

import { useState, useEffect, useRef } from 'react';
import { UnifiedReviewEngine, AlgorithmType } from '@/lib/unified-review';

// Singleton instance shared across all components
let engineInstance: UnifiedReviewEngine | null = null;
let initializationPromise: Promise<void> | null = null;

/**
 * Hook for accessing the Unified Review Engine
 * Works without requiring auth context - follows old codebase pattern
 */
export function useUnifiedReview() {
  const [engine, setEngine] = useState<UnifiedReviewEngine | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const initRef = useRef(false);

  useEffect(() => {
    const initializeEngine = async () => {
      // Prevent multiple initializations
      if (initRef.current) return;
      initRef.current = true;

      try {
        // If already initializing, wait for it
        if (initializationPromise) {
          await initializationPromise;
          if (engineInstance) {
            setEngine(engineInstance);
            setIsReady(true);
            setIsLoading(false);
            return;
          }
        }

        // Create initialization promise
        initializationPromise = (async () => {
          if (!engineInstance) {
            // Default to guest user
            let userId = 'guest';
            let userType = 'guest';
            
            // Try to get user info from localStorage if available
            if (typeof window !== 'undefined') {
              try {
                // Check for auth state in localStorage (set by AuthContext)
                const authState = localStorage.getItem('auth-state');
                if (authState) {
                  const parsed = JSON.parse(authState);
                  if (parsed.user?.uid) {
                    userId = parsed.user.uid;
                    userType = parsed.subscription?.status === 'active' ? 'premium' : 'free';
                  }
                }
              } catch (e) {
                // Fallback to guest
                console.debug('No auth state found, using guest mode');
              }
            }
            
            // Create the engine instance with configuration
            engineInstance = new UnifiedReviewEngine({
              userId: userId,
              enableSync: userType === 'premium',
              defaultAlgorithm: userType === 'premium' ? AlgorithmType.FSRS : AlgorithmType.SIMPLE,
              enableNotifications: true
            });
            
            // Initialize the engine
            await engineInstance.init();
          }
        })();

        await initializationPromise;
        
        setEngine(engineInstance);
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize review engine:', error);
        // Create fallback guest engine
        engineInstance = new UnifiedReviewEngine({
          userId: 'guest',
          enableSync: false,
          defaultAlgorithm: AlgorithmType.SIMPLE
        });
        await engineInstance.init();
        setEngine(engineInstance);
        setIsReady(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeEngine();
  }, []);

  return {
    engine,
    isReady,
    isLoading
  };
}

/**
 * Direct access to the review engine for non-component usage
 * Creates a guest engine if none exists
 */
export async function getReviewEngine(): Promise<UnifiedReviewEngine> {
  if (!engineInstance) {
    engineInstance = new UnifiedReviewEngine({
      userId: 'guest',
      enableSync: false,
      defaultAlgorithm: AlgorithmType.SIMPLE
    });
    await engineInstance.init();
  }
  return engineInstance;
}

/**
 * Reset the engine instance (useful for auth state changes)
 */
export function resetReviewEngine() {
  if (engineInstance) {
    engineInstance.destroy?.();
    engineInstance = null;
    initializationPromise = null;
  }
}