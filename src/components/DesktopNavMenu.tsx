'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

interface NavItem {
  label: string;
  icon: string;
  href: string;
}

const DesktopNavMenu = React.memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Menu items
  const menuItems = useMemo(() => [
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
  ], []);

  return (
    <div className="hidden md:block fixed top-6 right-6 z-50">
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-12 h-12 bg-white/80 backdrop-blur-md rounded-full hover:bg-white/90 transition-all duration-300 shadow-lg border-2 border-white"
        style={{
          boxShadow: 'inset 0 0 0 1px rgb(59, 130, 246), 0 6px 20px rgba(0, 0, 0, 0.2)'
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
          <div className="absolute top-16 right-0 w-64 bg-white/95 backdrop-blur-md border border-gray-200 rounded-lg shadow-lg overflow-hidden flex flex-col" style={{ maxHeight: '400px' }}>
            <div className="py-2 overflow-y-auto flex-1" style={{ maxHeight: '320px' }}>
              {menuItems.map((item, index) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname.startsWith(item.href));
                
                return (
                  <Link
                    key={index}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
            <div className="border-t border-gray-200"></div>

            {/* App Info */}
            <div className="px-4 py-3 bg-gray-50">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
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