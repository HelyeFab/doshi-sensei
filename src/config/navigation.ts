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
    description: strings.nav.drillDescription || 'Drill mode'
  },
  {
    id: 'kanji-moods',
    label: strings.nav.kanjiMoods,
    icon: '🎭', // Fallback icon
    href: '/kanji-moods',
    description: strings.nav.kanjiMoodsDescription || 'Kanji Moods'
  },
  {
    id: 'resources',
    label: strings.nav.resources,
    icon: '📚', // Fallback icon
    href: '/resources',
    description: strings.nav.resourcesDescription || 'Resources'
  },
  {
    id: 'vocabulary',
    label: strings.nav.vocabulary,
    icon: '📝', // Fallback icon
    href: '/vocabulary',
    description: strings.nav.vocabularyDescription || 'Vocabulary'
  },
  {
    id: 'practice',
    label: strings.nav.practice,
    icon: '💪', // Fallback icon
    href: '/practice',
    description: strings.nav.practiceDescription || 'Practice'
  },
  {
    id: 'news',
    label: strings.nav.news,
    icon: '📰', // Fallback icon
    href: '/news',
    description: strings.nav.newsDescription || 'News'
  },
  {
    id: 'stories',
    label: strings.nav.stories,
    icon: '📖', // Fallback icon
    href: '/stories',
    description: strings.nav.storiesDescription || 'Stories'
  },
  {
    id: 'games',
    label: strings.nav.games,
    icon: '🎮', // Fallback icon
    href: '/games',
    description: strings.nav.gamesDescription || 'Games'
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
    description: strings.nav.accountDescription || 'Account'
  },
  {
    id: 'settings',
    label: strings.nav.settings,
    icon: '⚙️', // Fallback icon
    href: '/settings',
    description: strings.nav.settingsDescription || 'Settings'
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
  description: strings.nav.homeDescription || 'Home'
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
