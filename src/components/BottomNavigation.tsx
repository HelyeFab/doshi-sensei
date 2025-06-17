'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

const navItems: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: '🏠',
    href: '/'
  },
  {
    id: 'practice',
    label: 'Practice',
    icon: '📚',
    href: '/practice'
  },
  {
    id: 'drill',
    label: 'Drill',
    icon: '⚡',
    href: '/drill'
  },
  {
    id: 'vocabulary',
    label: 'Browse',
    icon: '📖',
    href: '/vocabulary'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    href: '/settings'
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
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-full shadow-lg mx-3 mb-2">
        <div className="flex items-center justify-around py-4 px-3 safe-area-bottom">
          {navItems.map((item) => {
            const isActive = pathname === item.href && item.href !== '/';
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-0.5 rounded-lg transition-colors ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="text-lg mb-1.5">{item.icon}</span>
                <span className="text-xs font-medium truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
