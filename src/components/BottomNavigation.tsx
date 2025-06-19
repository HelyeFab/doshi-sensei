'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

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
    id: 'kanji',
    label: 'Kanji',
    icon: '🍙',
    href: '/kanji-browser'
  },
  {
    id: 'vocabulary',
    label: 'Browse',
    icon: '📖',
    href: '/vocabulary'
  }
];

// Secondary navigation items (in modal)
const secondaryNavItems: NavItem[] = [
  {
    id: 'practice',
    label: 'Practice',
    icon: '📚',
    href: '/practice'
  },
  {
    id: 'favourites',
    label: 'Saved',
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

export default function BottomNavigation() {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50 p-4 pb-6">
        <div className="bg-card/95 backdrop-blur-md border border-border rounded-full shadow-lg mx-3 mb-2 relative">
          <div className="flex items-center justify-between py-2 px-4 safe-area-bottom">
            {/* Left side navigation items */}
            <div className="flex items-center space-x-6">
              {primaryNavItems.slice(0, 2).map((item) => {
                const isActive = pathname === item.href && item.href !== '/';
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

            {/* Center Logo */}
            <button
              onClick={openModal}
              className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all hover:scale-105 border-3 border-background"
            >
              <span className="text-primary-foreground text-lg font-bold">道</span>
            </button>

            {/* Right side navigation items */}
            <div className="flex items-center space-x-6">
              {primaryNavItems.slice(2, 4).map((item) => {
                const isActive = pathname === item.href;
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
        </div>
      </nav>

      {/* Navigation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] md:hidden">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-bold">道</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-card-foreground">Doshi Sensei</h3>
                  <p className="text-sm text-muted-foreground">Navigation Menu</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {secondaryNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={closeModal}
                      className={`flex flex-col items-center justify-center p-6 rounded-xl transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary border-2 border-primary/20'
                          : 'bg-muted/50 text-card-foreground hover:bg-muted border-2 border-transparent'
                      }`}
                    >
                      <span className="text-2xl mb-2">{item.icon}</span>
                      <span className="text-sm font-medium text-center">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-muted/50 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Japanese Language Learning Platform
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
