'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/contexts/SettingsContext';
import { useModal } from '@/contexts/ModalContext';
import { HOME_NAV_ITEM, getNavItemsByIds, DEFAULT_NAV_ITEMS } from '@/config/navigation';
import type { NavItem } from '@/types';

export default function BottomNavigation() {
  const pathname = usePathname();
  const { settings } = useSettings();
  const { isModalOpen } = useModal();

  // Build navigation items based on user preferences
  const getNavigationItems = (): NavItem[] => {
    const navItems: NavItem[] = [HOME_NAV_ITEM]; // Home is always first

    // Fallback for older settings without navigationPreferences
    const navPrefs = settings.navigationPreferences || {
      customNavItems: DEFAULT_NAV_ITEMS,
      useCustomNavigation: false
    };

    if (navPrefs.useCustomNavigation) {
      // Use custom navigation
      const customItems = getNavItemsByIds(navPrefs.customNavItems || DEFAULT_NAV_ITEMS);
      navItems.push(...customItems.slice(0, 3)); // Limit to 3 additional items
    } else {
      // Use default navigation
      const defaultItems = getNavItemsByIds(DEFAULT_NAV_ITEMS);
      navItems.push(...defaultItems);
      
      // Add account as the 5th item by default
      const accountItem = getNavItemsByIds(['account'])[0];
      if (accountItem) {
        navItems.push(accountItem);
      }
    }

    return navItems;
  };

  const navigationItems = getNavigationItems();

  // Helper function to check if a navigation item is active
  const isNavItemActive = (item: NavItem): boolean => {
    if (pathname === item.href) return true;
    
    // Special cases for nested routes
    if (item.href === '/kanji-moods' && pathname.startsWith('/kanji-moods')) return true;
    if (item.href === '/resources' && pathname.startsWith('/resources')) return true;
    if (item.href === '/games' && pathname.startsWith('/games')) return true;
    if (item.href === '/stories' && pathname.startsWith('/stories')) return true;
    if (item.href === '/news' && pathname.startsWith('/news')) return true;
    
    return false;
  };

  // Hide navigation when modal is open on mobile
  if (isModalOpen) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50 p-4 pb-6">
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-full shadow-lg mx-3 mb-2 relative">
        <div className="flex items-center justify-evenly py-2 px-4 safe-area-bottom">
          {navigationItems.map((item) => {
            const isActive = isNavItemActive(item);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center justify-center p-3 rounded-full transition-colors ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={item.label}
              >
                <span className="text-xl">{item.icon}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
