'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { strings } from '@/config/strings';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

const navItems: NavItem[] = [
  {
    id: 'home',
    label: strings.navigation.home.label,
    icon: strings.navigation.home.icon,
    href: '/'
  },
  {
    id: 'practice',
    label: strings.navigation.practice.label,
    icon: strings.navigation.practice.icon,
    href: '/practice'
  },
  {
    id: 'drill',
    label: strings.navigation.drill.label,
    icon: strings.navigation.drill.icon,
    href: '/drill'
  },
  {
    id: 'kanji-moods',
    label: strings.navigation.kanjiMoods.label,
    icon: strings.navigation.kanjiMoods.icon,
    href: '/kanji-moods'
  },
  {
    id: 'kanji',
    label: strings.navigation.kanjiBrowser.label,
    icon: strings.navigation.kanjiBrowser.icon,
    href: '/kanji-browser'
  },
  {
    id: 'vocabulary',
    label: strings.navigation.vocabulary.label,
    icon: strings.navigation.vocabulary.icon,
    href: '/vocabulary'
  },
  {
    id: 'favourites',
    label: strings.navigation.favourites.label,
    icon: strings.navigation.favourites.icon,
    href: '/favourites'
  },
  {
    id: 'settings',
    label: strings.navigation.settings.label,
    icon: strings.navigation.settings.icon,
    href: '/settings'
  },
  {
    id: 'account',
    label: strings.navigation.account.label,
    icon: strings.navigation.account.icon,
    href: '/account'
  }
];

export default function DesktopNavMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="hidden md:block fixed top-6 right-6 z-50">
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-card/95 backdrop-blur-md border border-border rounded-full shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
        aria-label={strings.navigation.menu.navigationMenu}
      >
        <div className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
          <Image
            src="/flat-icons/menu.svg"
            alt="Menu"
            width={24}
            height={24}
            className="w-6 h-6"
          />
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
                    className={`flex items-center space-x-3 px-4 py-3 hover:bg-muted transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-foreground'
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
                <span className="font-medium">{strings.navigation.app.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {strings.navigation.app.tagline}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
