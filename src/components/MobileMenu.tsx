'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { AVAILABLE_NAV_ITEMS, HOME_NAV_ITEM } from '@/config/navigation';
import { useStrings } from '@/contexts/LanguageContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useStats } from '@/hooks/useStats';
import { toggleDevHelper } from '@/components/DevHelper';

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { profile } = useUserProfile();
  const { subscription } = useSubscription2();
  const router = useRouter();
  const pathname = usePathname();
  const strings = useStrings();
  const { canInstall, isInstalled, isInstalling, install } = usePWAInstall();
  const { stats } = useStats();


  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleNavigation = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };


  // Create a simple menu items array like in your image
  const simpleMenuItems = [
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
    <>
      {/* Menu Button - Hidden on mobile since we use bottom navbar */}
      <div className="fixed top-4 right-4 z-50 hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-12 h-12 bg-background/80 backdrop-blur-md rounded-full hover:bg-background/90 transition-all duration-300"
          style={{
            border: '2px solid white',
            boxShadow: 'inset 0 0 0 1px var(--primary), 0 6px 20px rgba(0, 0, 0, 0.2)'
          }}
          aria-label="Toggle menu"
        >
          <div className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
            <img
              src="/menu.svg"
              alt="Menu"
              className="w-6 h-6"
              onLoad={() => console.log('📱 Menu SVG loaded from:', window.location.origin + '/menu.svg')}
              onError={() => console.log('❌ Menu SVG failed to load from:', window.location.origin + '/menu.svg')}
            />
          </div>
        </button>
      </div>

      {/* Menu Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu Modal - Simple dropdown like your image */}
      <div className={`
        fixed top-20 right-4 w-64 bg-background border border-border rounded-lg shadow-xl z-50
        transform transition-all duration-200 ease-in-out origin-top-right
        ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}
      `}>
        <div className="flex flex-col max-h-80">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border flex-shrink-0">
            <h2 className="text-sm font-semibold">Menu</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-muted rounded transition-colors"
              aria-label="Close menu"
            >
              <img
                src="/close.svg"
                alt="Close"
                className="w-4 h-4"
              />
            </button>
          </div>

          {/* Simple Menu Items like your image - Scrollable */}
          <div className="py-2 overflow-y-auto flex-1 min-h-0">
            {simpleMenuItems.map((item, index) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));


              return (
                <Link
                  key={index}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors
                    ${isActive ? 'bg-primary/10 text-primary' : 'text-foreground'}
                  `}
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
            
            {/* Dev Helper Toggle */}
            {(
              <button
                onClick={() => {
                  setIsOpen(false);
                  toggleDevHelper();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-t border-border"
              >
                <span className="text-lg">🛠️</span>
                <span className="font-medium">Toggle Dev Helper</span>
              </button>
            )}
            
            {/* Install App Option */}
            {canInstall && !isInstalled && (
              <button
                onClick={async () => {
                  setIsOpen(false);
                  await install();
                }}
                disabled={isInstalling}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-t border-border"
              >
                <img 
                  src="/flat-icons/root-icons/smartphone.svg" 
                  alt="Install" 
                  className="w-5 h-5 object-contain" 
                />
                <span className="font-medium">
                  {isInstalling ? 'Installing...' : 'Install Doshi Sensei'}
                </span>
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border flex-shrink-0">
            {/* App Info */}
            <div className="px-4 py-3 bg-muted/50">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span className="text-lg">🏮</span>
                <span className="font-medium">{strings.navigation?.app?.name || 'Doshi Sensei'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
