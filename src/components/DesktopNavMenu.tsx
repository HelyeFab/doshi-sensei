'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_EMAIL } from '@/types/admin';

interface NavItem {
  label: string;
  icon: string;
  href: string;
}

const DesktopNavMenu = React.memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Menu items
  const menuItems = useMemo(() => {
    const items: NavItem[] = [
      { label: 'Home', icon: '🏠', href: '/' },
      { label: 'Practice', icon: '📚', href: '/practice' },
      { label: 'Drill', icon: '⚡', href: '/drill' },
      { label: 'Vocabulary', icon: '📖', href: '/vocabulary' },
      { label: 'Kanji Browser', icon: '漢', href: '/kanji-browser' },
      { label: 'Kanji Moods', icon: '🗺️', href: '/kanji-moods' },
      { label: 'Favourites', icon: '⭐', href: '/favourites' },
      { label: 'Account', icon: '👤', href: '/account' },
      { label: 'Settings', icon: '⚙️', href: '/settings' },
      { label: 'News', icon: '🗞️', href: '/news' },
      { label: 'Games', icon: '🎮', href: '/games' },
      { label: 'Resources', icon: '🎌', href: '/resources' },
      { label: 'Stories', icon: '📖', href: '/stories' },
    ];

    // Add admin dashboard link if user is admin
    if (isAdmin) {
      items.push({ label: 'Admin Dashboard', icon: '🛡️', href: '/admin' });
    }

    return items;
  }, [isAdmin]);

  return (
    <div className="hidden md:block fixed top-6 right-6 z-50">
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-12 h-12 bg-card/80 backdrop-blur-md rounded-full hover:bg-card/90 transition-all duration-300 shadow-lg border-2 border-border"
        style={{
          boxShadow: 'inset 0 0 0 1px hsl(var(--primary)), 0 6px 20px rgba(0, 0, 0, 0.2)'
        }}
        aria-label="Navigation Menu"
      >
        <div className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
          <Image
            src="/menu.svg"
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
          <div className="absolute top-16 right-0 w-64 bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-lg overflow-hidden flex flex-col" style={{ maxHeight: '400px' }}>
            <div className="py-2 overflow-y-auto flex-1" style={{ maxHeight: '320px' }}>
              {menuItems.map((item, index) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname.startsWith(item.href));
                
                return (
                  <Link
                    key={index}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors ${
                      isActive ? 'bg-primary/10 text-primary' : 'text-foreground'
                    }`}
                  >
                    {item.icon.startsWith('/') ? (
                      <img src={item.icon} alt={item.label} className="w-5 h-5 object-contain" />
                    ) : (
                      <span className="text-lg">{item.icon}</span>
                    )}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* App Info */}
            <div className="px-4 py-3 bg-muted">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span className="text-lg">🏮</span>
                <span className="font-medium">Dōshi Sensei</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

DesktopNavMenu.displayName = 'DesktopNavMenu';

export default DesktopNavMenu;