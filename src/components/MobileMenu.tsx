'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { pokemonManager } from '@/utils/pokemonManager';
import { AVAILABLE_NAV_ITEMS, HOME_NAV_ITEM } from '@/config/navigation';
import PokedexModal from '@/components/games/PokedexModal';

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPokedex, setShowPokedex] = useState(false);
  const [pokemonCaught, setPokemonCaught] = useState(0);
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();

  // Load Pokemon stats just like in the homepage
  useEffect(() => {
    const loadPokemonStats = async () => {
      try {
        const pokedexStats = await pokemonManager.getPokedexStats();
        setPokemonCaught(pokedexStats.totalCaught);
      } catch (error) {
        console.error('Error loading Pokemon stats:', error);
      }
    };

    loadPokemonStats();
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleNavigation = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const togglePokedex = () => {
    setIsOpen(false);
    setShowPokedex(true);
  };

  // Create a simple menu items array like in your image
  const simpleMenuItems = [
    { label: 'Home', icon: '🏠', href: '/' },
    ...(isAdmin ? [{ label: 'Admin Dashboard', icon: '👑', href: '/admin' }] : []),
    ...(pokemonCaught > 0 ? [{ label: 'Pokédex', icon: '📱', href: '#', action: 'pokedex', count: pokemonCaught }] : []),
    { label: 'Account', icon: '👤', href: '/account' },
    { label: 'News Articles', icon: '🗞️', href: '/news' },
    { label: 'Vocabulary', icon: '📖', href: '/vocabulary' },
    { label: 'Practice Drill', icon: '⚡', href: '/drill' },
  ];

  return (
    <>
      {/* Menu Button - Top Right Corner (replaces Pokédex position) */}
      <div className="fixed top-4 right-4 z-50 md:hidden">
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
            />
          </div>
        </button>
      </div>

      {/* Menu Modal Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu Modal - Simple dropdown like your image */}
      <div className={`
        fixed top-20 right-4 w-64 bg-background border border-border rounded-lg shadow-xl z-50 md:hidden
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Simple Menu Items like your image - Scrollable */}
          <div className="py-2 overflow-y-auto flex-1 min-h-0">
            {simpleMenuItems.map((item, index) => {
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href));
              
              if (item.action === 'pokedex') {
                return (
                  <button
                    key={index}
                    onClick={togglePokedex}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                  >
                    <span className="text-lg">{item.icon}</span>
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
                  onClick={() => handleNavigation(item.href)}
                  className={`
                    flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors
                    ${isActive ? 'bg-primary/10 text-primary' : 'text-foreground'}
                  `}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border flex-shrink-0">
            <div className="text-center text-sm text-muted-foreground">
              Doshi Sensei
            </div>
            <div className="text-center text-xs text-muted-foreground mt-1">
              E.Fabiani ❤️
            </div>
          </div>
        </div>
      </div>

      {/* Pokedex Modal */}
      {showPokedex && (
        <PokedexModal
          isOpen={showPokedex}
          onClose={() => setShowPokedex(false)}
        />
      )}
    </>
  );
}