'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useStrings } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useStats } from '@/hooks/useStats';

interface NavItem {
  label: string;
  icon: string;
  href: string;
  action?: string;
  count?: number;
}

export default function DesktopNavMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { profile } = useUserProfile();
  const { subscription } = useSubscription2();
  const pathname = usePathname();
  const strings = useStrings();
  const { canInstall, isInstalled, isInstalling, install } = usePWAInstall();
  const { stats } = useStats();


  // Create menu items matching mobile menu
  const menuItems = [
    { label: strings.nav.home || 'Home', icon: '🏠', href: '/' },
    ...(isAdmin ? [{ label: strings.nav.adminDashboard || 'Admin Dashboard', icon: '🛡️', href: '/admin' }] : []),
    { label: strings.nav.practice || 'Practice', icon: '📚', href: '/practice' },
    { label: strings.nav.drill || 'Drill', icon: '⚡', href: '/drill' },
    { label: strings.nav.vocab || 'Vocabulary', icon: '📖', href: '/vocabulary' },
    { label: strings.nav.kanjiBrowser || 'Kanji Browser', icon: '漢', href: '/kanji-browser' },
    { label: strings.nav.kanjiMoods || 'Kanji Moods', icon: '🗺️', href: '/kanji-moods' },
    { label: strings.nav.favourites || 'Favourites', icon: '⭐', href: '/favourites' },
    { label: strings.nav.account || 'Account', icon: '👤', href: '/account' },
    { label: strings.nav.settings || 'Settings', icon: '⚙️', href: '/settings' },
    { label: strings.nav.news || 'News', icon: '🗞️', href: '/news' },
    { label: strings.nav.games || 'Games', icon: '🎮', href: '/games' },
    { label: strings.nav.resources || 'Resources', icon: '🎌', href: '/resources' },
    { label: strings.nav.stories || 'Stories', icon: '/flat-icons/root-icons/story.svg', href: '/stories' },
  ];

  return (
    <div className="hidden md:block fixed top-6 right-6 z-50">
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-12 h-12 bg-background/80 backdrop-blur-md rounded-full hover:bg-background/90 transition-all duration-300"
        style={{
          border: '2px solid white',
          boxShadow: 'inset 0 0 0 1px var(--primary), 0 6px 20px rgba(0, 0, 0, 0.2)'
        }}
        aria-label={strings.navigation?.menu?.navigationMenu || 'Navigation Menu'}
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
            <div className="py-2 overflow-y-auto flex-1" style={{ maxHeight: '260px' }}>
              {menuItems.map((item, index) => {
                const isActive = pathname === item.href || (item.href === '/kanji-moods' && pathname.startsWith('/kanji-moods'));
                
                
                return (
                  <Link
                    key={index}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors ${
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
              
              {/* Install App Option */}
              {canInstall && !isInstalled && (
                <button
                  onClick={async () => {
                    setIsOpen(false);
                    await install();
                  }}
                  disabled={isInstalling}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                >
                  <img 
                    src="/flat-icons/root-icons/phone-installation.svg" 
                    alt="Install" 
                    className="w-5 h-5 object-contain" 
                  />
                  <span className="font-medium">
                    {isInstalling ? 'Installing...' : 'Install Doshi Sensei'}
                  </span>
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* App Info */}
            <div className="px-4 py-3 bg-muted/50">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span className="text-lg">🏮</span>
                <span className="font-medium">{strings.navigation?.app?.name || 'Doshi Sensei'}</span>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
