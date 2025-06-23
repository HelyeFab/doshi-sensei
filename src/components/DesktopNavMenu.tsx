'use client';

import { useState } from 'react';
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
    id: 'kanji-moods',
    label: 'Kanji Mood Boards',
    icon: '🗺️',
    href: '/kanji-moods'
  },
  {
    id: 'kanji',
    label: 'Kanji Browser',
    icon: '漢',
    href: '/kanji-browser'
  },
  {
    id: 'vocabulary',
    label: 'Browse Vocabulary',
    icon: '📖',
    href: '/vocabulary'
  },
  {
    id: 'favourites',
    label: 'Saved Items',
    icon: '⭐',
    href: '/favourites'
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

export default function DesktopNavMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="hidden md:block fixed top-6 right-6 z-50">
      {/* Burger Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-card/95 backdrop-blur-md border border-border rounded-full shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
        aria-label="Navigation menu"
      >
        <div className="space-y-1">
          <div className={`w-5 h-0.5 bg-foreground transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
          <div className={`w-5 h-0.5 bg-foreground transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`} />
          <div className={`w-5 h-0.5 bg-foreground transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute top-16 right-0 w-64 bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-lg overflow-hidden">
            <div className="py-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href === '/kanji-moods' && pathname.startsWith('/kanji-moods'));
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 hover:bg-muted transition-colors ${
                      isActive ? 'bg-primary/10 text-primary' : 'text-foreground'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* App Info */}
            <div className="px-4 py-3 bg-muted/50">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span className="text-lg">🏮</span>
                <span className="font-medium">Doshi Sensei</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Japanese Conjugation Practice
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
