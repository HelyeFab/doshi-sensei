'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';
import DoshiMascot from '@/components/DoshiMascot';

interface NavItem {
  label: string;
  icon: string;
  href: string;
}

const DesktopNavMenu = React.memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { isAdmin } = useAdmin();

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
        className="flex items-center justify-center w-16 h-16 bg-card/80 backdrop-blur-md rounded-full hover:bg-card/90 shadow-lg border-2 border-primary"
        style={{
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)'
        }}
        aria-label="Navigation Menu"
      >
        <div>
          <DoshiMascot
            variant="animated"
            size="small"
            alt="Menu"
            loop={true}
            animationSpeed={0.5}
            className="w-10 h-10"
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <React.Fragment>
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
                <img
                  src="/doshi.png"
                  alt="Doshi"
                  className="w-4 h-4 object-contain flex-shrink-0"
                />
                <span className="font-medium">Dōshi Sensei</span>
              </div>
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
});

DesktopNavMenu.displayName = 'DesktopNavMenu';

export default DesktopNavMenu;