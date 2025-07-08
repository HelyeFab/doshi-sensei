import { NavItem } from '@/types';
import { strings } from '@/config/strings';

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
    label: strings.navigation.drill.label,
    icon: strings.navigation.drill.icon,
    href: '/drill',
    description: strings.navigation.drill.description
  },
  {
    id: 'kanji-moods',
    label: strings.navigation.kanjiMoods.label,
    icon: strings.navigation.kanjiMoods.icon,
    href: '/kanji-moods',
    description: strings.navigation.kanjiMoods.description
  },
  {
    id: 'resources',
    label: strings.navigation.resources.label,
    icon: strings.navigation.resources.icon,
    href: '/resources',
    description: strings.navigation.resources.description
  },
  {
    id: 'vocabulary',
    label: strings.navigation.vocabulary.label,
    icon: strings.navigation.vocabulary.icon,
    href: '/vocabulary',
    description: strings.navigation.vocabulary.description
  },
  {
    id: 'practice',
    label: strings.navigation.practice.label,
    icon: strings.navigation.practice.icon,
    href: '/practice',
    description: strings.navigation.practice.description
  },
  {
    id: 'news',
    label: strings.navigation.news.label,
    icon: strings.navigation.news.icon,
    href: '/news',
    description: strings.navigation.news.description
  },
  {
    id: 'stories',
    label: strings.navigation.stories.label,
    icon: strings.navigation.stories.icon,
    href: '/stories',
    description: strings.navigation.stories.description
  },
  {
    id: 'games',
    label: strings.navigation.games.label,
    icon: strings.navigation.games.icon,
    href: '/games',
    description: strings.navigation.games.description
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
    label: strings.navigation.account.label,
    icon: strings.navigation.account.icon,
    href: '/account',
    description: strings.navigation.account.description
  },
  {
    id: 'settings',
    label: strings.navigation.settings.label,
    icon: strings.navigation.settings.icon,
    href: '/settings',
    description: strings.navigation.settings.description
  }
];

/**
 * Fixed navigation item that always appears (cannot be customized)
 */
export const HOME_NAV_ITEM: NavItem = {
  id: 'home',
  label: strings.navigation.home.label,
  icon: strings.navigation.home.icon,
  href: '/',
  description: strings.navigation.home.description
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
