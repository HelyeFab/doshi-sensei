'use client';

import { useState, useRef, useEffect } from 'react';
import { AdminUserDetails } from '@/types/admin';
import { isPremiumPlan } from '@/types/subscription';
import { useAdminNotifications } from './AdminNotifications';

interface PremiumUpgradeButtonProps {
  user: AdminUserDetails;
  onUpgrade: (userId: string, plan: 'monthly' | 'yearly') => Promise<void>;
}

export function PremiumUpgradeButton({ user, onUpgrade }: PremiumUpgradeButtonProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { success, error } = useAdminNotifications();

  const isPremium = user.subscription?.plan === 'monthly' ||
                   user.subscription?.plan === 'yearly';

  // Calculate menu position based on button position
  useEffect(() => {
    if (showOptions && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuWidth = 240; // increased menu width
      const menuHeight = 200; // approximate menu height
      
      // Position menu below button by default
      let left = rect.left;
      let top = rect.bottom + 4;
      
      // Check if menu would go below viewport bottom
      if (top + menuHeight > viewportHeight) {
        // Position above button instead
        top = rect.top - menuHeight - 4;
        
        // If still not enough space above, position at top of viewport
        if (top < 16) {
          top = 16;
        }
      }
      
      // Adjust if menu would go off screen to the right
      if (left + menuWidth > viewportWidth) {
        left = viewportWidth - menuWidth - 16; // 16px margin from edge
      }
      
      // Ensure menu doesn't go off screen to the left
      if (left < 16) {
        left = 16;
      }
      
      setMenuPosition({ top, left });
    }
  }, [showOptions]);

  // Close dropdown on scroll, escape key, or click outside
  useEffect(() => {
    if (!showOptions) return;

    const handleScroll = () => setShowOptions(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowOptions(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        const target = e.target as Element;
        // Don't close if clicking inside the menu
        if (!target.closest('[data-dropdown-menu]')) {
          setShowOptions(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showOptions]);

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    if (isUpgrading) return;

    setIsUpgrading(true);
    try {
      await onUpgrade(user.id, plan);
      success('User Upgraded', `${user.email} has been upgraded to ${plan} premium`);
      setShowOptions(false);
    } catch (err) {
      console.error('Upgrade failed:', err);
      error('Upgrade Failed', err instanceof Error ? err.message : 'Failed to upgrade user');
    } finally {
      setIsUpgrading(false);
    }
  };

  if (isPremium) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
          ✓ Premium
        </span>
        <span className="text-xs text-muted-foreground">
          ({user.subscription?.plan})
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowOptions(!showOptions)}
        disabled={isUpgrading}
        className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isUpgrading ? (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
            <span>Upgrading...</span>
          </div>
        ) : (
          'Upgrade to Premium'
        )}
      </button>

      {showOptions && !isUpgrading && (
        <div 
          data-dropdown-menu
          className="fixed bg-card border border-border rounded-lg shadow-lg z-50 w-60"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
          }}
        >
            <div className="p-3">
              <h4 className="text-sm font-medium text-foreground mb-2">
                Choose Premium Plan
              </h4>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleUpgrade('monthly')}
                  className="w-full text-left p-2 hover:bg-muted rounded-lg transition-colors group"
                >
                  <div className="flex items-start justify-between min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">Monthly</div>
                      <div className="text-xs text-muted-foreground">$3.99/month</div>
                    </div>
                    <div className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded ml-2 flex-shrink-0">
                      📅
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleUpgrade('yearly')}
                  className="w-full text-left p-2 hover:bg-muted rounded-lg transition-colors group"
                >
                  <div className="flex items-start justify-between min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">Yearly</div>
                      <div className="text-xs text-muted-foreground">$39.99/year</div>
                      <div className="text-xs text-green-600 dark:text-green-400">Save 2 months!</div>
                    </div>
                    <div className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-1 rounded ml-2 flex-shrink-0">
                      🗓️
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-3 pt-2 border-t border-border">
                <button
                  onClick={() => setShowOptions(false)}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
}
