'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useStrings } from '@/hooks/useLanguage';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { pokemonManager } from '@/utils/pokemonManager';
import PokedexModal from '@/components/games/PokedexModal';

interface NavItem {
  label: string;
  icon: string;
  href: string;
  action?: string;
  count?: number;
}

export default function DesktopNavMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPokedex, setShowPokedex] = useState(false);
  const [pokemonCaught, setPokemonCaught] = useState(0);
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { profile } = useUserProfile();
  const { subscription } = useSubscription2();
  const pathname = usePathname();
  const strings = useStrings();
  
  // Load Pokemon stats just like in the mobile menu
  useEffect(() => {
    const loadPokemonCount = async () => {
      try {
        const isPremiumUser = subscription?.status === 'active' &&
          (subscription?.plan === 'monthly' ||
            subscription?.plan === 'yearly');
        const caughtPokemon = await pokemonManager.getCaughtPokemon(profile, isPremiumUser);
        setPokemonCaught(caughtPokemon.length);
      } catch (error) {
        console.error('Error loading Pokémon count in DesktopNavMenu:', error);
      }
    };
    loadPokemonCount();
  }, [profile?.uid, subscription?.status, subscription?.plan]);

  const togglePokedex = () => {
    setIsOpen(false);
    setShowPokedex(true);
  };

  // Create menu items matching mobile menu
  const menuItems = [
    { label: strings.nav.home || 'Home', icon: '🏠', href: '/' },
    ...(isAdmin ? [{ label: strings.nav.adminDashboard || 'Admin Dashboard', icon: '🛡️', href: '/admin' }] : []),
    ...(pokemonCaught > 0 ? [{ label: strings.nav.pokedex || 'Pokedex', icon: '/Pokedex.png', href: '#', action: 'pokedex', count: pokemonCaught }] : []),
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
    { label: strings.nav.stories || 'Stories', icon: '/flat-icons/story.svg', href: '/stories' },
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
                
                if (item.action === 'pokedex') {
                  return (
                    <button
                      key={index}
                      onClick={togglePokedex}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                    >
                      {item.icon.startsWith('/') ? (
                        <img src={item.icon} alt={item.label} className="w-5 h-5 object-contain" />
                      ) : (
                        <span className="text-lg">{item.icon}</span>
                      )}
                      <span className="font-medium">{item.label}</span>
                      {item.count && (
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                }
                
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

      {/* Pokedex Modal */}
      {showPokedex && (
        <PokedexModal
          isOpen={showPokedex}
          onClose={() => setShowPokedex(false)}
        />
      )}
    </div>
  );
}
