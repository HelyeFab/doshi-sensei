import { NavItem } from '@/types';

/**
 * ⚠️  IMPORTANT: NAVIGATION MAINTENANCE REMINDER ⚠️
 *
 * When adding new pages/features to the app, you MUST update this file to include
 * the new navigation option so users can add it to their custom navigation.
 *
 * Steps when adding a new page:
 * 1. Add the new NavItem to AVAILABLE_NAV_ITEMS array below
 * 2. Test that it appears in Settings > Mobile Navigation
 * 3. Verify the navigation works correctly in the bottom nav
 * 4. Update any relevant documentation
 *
 * This ensures users can customize their navigation to include new features.
 */

/**
 * Available navigation items for mobile bottom navigation
 * Home is always included and cannot be removed
 *
 * 🔥 REMEMBER: When adding new app features, add them here too!
 */
export const AVAILABLE_NAV_ITEMS: NavItem[] = [
  {
    id: 'drill',
    label: 'Drill',
    icon: '⚡',
    href: '/drill',
    description: 'Quick conjugation practice sessions'
  },
  {
    id: 'kanji-moods',
    label: 'Moods',
    icon: '🗺️',
    href: '/kanji-moods',
    description: 'Learn kanji by themed mood boards'
  },
  {
    id: 'resources',
    label: 'Resources',
    icon: '🎌',
    href: '/resources',
    description: 'Articles, tips, and learning resources'
  },
  {
    id: 'vocabulary',
    label: 'Vocabulary',
    icon: '📖',
    href: '/vocabulary',
    description: 'Search and browse Japanese vocabulary'
  },
  {
    id: 'practice',
    label: 'Practice',
    icon: '📚',
    href: '/practice',
    description: 'Learn verb conjugations step by step'
  },
  {
    id: 'news',
    label: 'News',
    icon: '🗞️',
    href: '/news',
    description: 'Read Japanese news articles'
  },
  {
    id: 'stories',
    label: 'Stories',
    icon: '📚',
    href: '/stories',
    description: 'Interactive AI-generated stories'
  },
  {
    id: 'games',
    label: 'Games',
    icon: '🎮',
    href: '/games',
    description: 'Fun listening and word games'
  },
  // {
  //   id: 'favourites',
  //   label: 'Saved',
  //   icon: '⭐',
  //   href: '/favourites',
  //   description: 'Your saved words and items'
  // },
  // {
  //   id: 'kanji-browser',
  //   label: 'Kanji',
  //   icon: '漢',
  //   href: '/kanji-browser',
  //   description: 'Browse and study individual kanji'
  // },
  {
    id: 'account',
    label: 'Account',
    icon: '👤',
    href: '/account',
    description: 'Profile, stats, and account settings'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    href: '/settings',
    description: 'App preferences and configuration'
  }
];

/**
 * Fixed navigation item that always appears (cannot be customized)
 */
export const HOME_NAV_ITEM: NavItem = {
  id: 'home',
  label: 'Home',
  icon: '🏠',
  href: '/',
  description: 'Return to the main dashboard'
};

/**
 * Default navigation items for new users
 */
export const DEFAULT_NAV_ITEMS = [
  'drill',
  'kanji-moods',
  'resources'
];

/**
 * Get navigation item by ID
 */
export function getNavItemById(id: string): NavItem | undefined {
  if (id === 'home') return HOME_NAV_ITEM;
  return AVAILABLE_NAV_ITEMS.find(item => item.id === id);
}

/**
 * Get multiple navigation items by IDs
 */
export function getNavItemsByIds(ids: string[]): NavItem[] {
  return ids.map(id => getNavItemById(id)).filter(Boolean) as NavItem[];
}
