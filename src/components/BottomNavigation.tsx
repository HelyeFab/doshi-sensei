'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

// Primary navigation items (always visible)
const primaryNavItems: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: '🏠',
    href: '/'
  },
  {
    id: 'drill',
    label: 'Drill',
    icon: '⚡',
    href: '/drill'
  },
  {
    id: 'kanji-moods',
    label: 'Moods',
    icon: '🗺️',
    href: '/kanji-moods'
  },
  {
    id: 'reading',
    label: 'Reading',
    icon: '📰',
    href: '/reading'
  },
  {
    id: 'account',
    label: 'Account',
    icon: '👤',
    href: '/account'
  }
];

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50 p-4 pb-6">
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-full shadow-lg mx-3 mb-2 relative">
        <div className="flex items-center justify-evenly py-2 px-4 safe-area-bottom">
          {/* All navigation items evenly distributed */}
          {primaryNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/kanji-moods' && pathname.startsWith('/kanji-moods'));
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center justify-center p-3 rounded-full transition-colors ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
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
