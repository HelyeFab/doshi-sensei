import { NavItem } from '@/types';
import { en as strings } from '@/config/strings/en';

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
    label: strings.nav.drill,
    icon: '⚡', // Fallback icon
    href: '/drill',
    description: 'Practice Japanese conjugations with quick drills'
  },
  {
    id: 'kanji-moods',
    label: strings.nav.kanjiMoods,
    icon: '🎭', // Fallback icon
    href: '/kanji-moods',
    description: 'Learn kanji through thematic mood boards'
  },
  {
    id: 'resources',
    label: strings.nav.resources,
    icon: '📚', // Fallback icon
    href: '/resources',
    description: 'Learning resources and study materials'
  },
  {
    id: 'vocabulary',
    label: strings.nav.vocab,
    icon: '📝', // Fallback icon
    href: '/vocabulary',
    description: 'Browse and search Japanese vocabulary'
  },
  {
    id: 'practice',
    label: strings.nav.practice,
    icon: '💪', // Fallback icon
    href: '/practice',
    description: 'Practice conjugations and grammar'
  },
  {
    id: 'news',
    label: strings.nav.news,
    icon: '📰', // Fallback icon
    href: '/news',
    description: 'Read Japanese news articles'
  },
  {
    id: 'stories',
    label: strings.nav.stories,
    icon: '📖', // Fallback icon
    href: '/stories',
    description: 'Read AI-generated Japanese stories'
  },
  {
    id: 'games',
    label: strings.nav.games,
    icon: '🎮', // Fallback icon
    href: '/games',
    description: 'Learn Japanese through fun games'
  },
  {
    id: 'kanji-mastery',
    label: 'Kanji Mastery',
    icon: '🎯', // Fallback icon
    href: '/tools/kanji-mastery',
    description: 'Master kanji with spaced repetition'
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    icon: '🏆', // Fallback icon
    href: '/leaderboard',
    description: 'View top learners and rankings'
  },
  {
    id: 'friends',
    label: 'Friends',
    icon: '👥', // Fallback icon
    href: '/friends',
    description: 'Connect with other learners'
  },
  // {
  //   id: 'favourites',
  //   label: strings.navigation.favourites.label,
  //   icon: strings.navigation.favourites.icon,
  //   href: '/favourites',
  //   description: strings.navigation.favourites.description
  // },
  // {
  //   id: 'kanji-browser',
  //   label: strings.navigation.kanjiBrowser.label,
  //   icon: strings.navigation.kanjiBrowser.icon,
  //   href: '/kanji-browser',
  //   description: strings.navigation.kanjiBrowser.description
  // },
  {
    id: 'account',
    label: strings.nav.account,
    icon: '👤', // Fallback icon
    href: '/account',
    description: 'Manage your account and subscription'
  },
  {
    id: 'settings',
    label: strings.nav.settings,
    icon: '⚙️', // Fallback icon
    href: '/settings',
    description: 'Customize your app preferences'
  }
];

/**
 * Fixed navigation item that always appears (cannot be customized)
 */
export const HOME_NAV_ITEM: NavItem = {
  id: 'home',
  label: strings.nav.home,
  icon: '🏠', // Fallback icon
  href: '/',
  description: 'Return to the home screen'
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
