'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
}

const StunningBottomNavbar = React.memo(() => {
  const pathname = usePathname();
  const router = useRouter();
  const [activeItem, setActiveItem] = useState<string>('');

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      href: '/',
      icon: '/flat-icons/ui/navbar/home.svg'
    },
    {
      id: 'practice',
      label: 'Practice', 
      href: '/practice',
      icon: '/flat-icons/ui/navbar/practice.svg'
    },
    {
      id: 'games',
      label: 'Games',
      href: '/games',
      icon: '/flat-icons/ui/navbar/game-console.svg'
    },
    {
      id: 'read',
      label: 'Read',
      href: '/read',
      icon: '/flat-icons/ui/navbar/books.svg'
    }
  ];

  useEffect(() => {
    const active = navItems.find(item => {
      if (pathname === item.href) return true;
      if (item.href !== '/' && pathname.startsWith(item.href)) return true;
      return false;
    });
    
    if (active) {
      setActiveItem(active.id);
    }
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = item.id === activeItem;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveItem(item.id);
                router.push(item.href);
              }}
              className="flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors"
              aria-label={item.label}
            >
              {/* Icon */}
              <div className="relative w-6 h-6 mb-1">
                <Image
                  src={item.icon}
                  alt={item.label}
                  fill
                  className={`object-contain transition-all ${
                    isActive 
                      ? 'opacity-100' 
                      : 'opacity-60 grayscale'
                  }`}
                  style={{
                    filter: isActive ? 'none' : 'grayscale(100%)'
                  }}
                />
              </div>
              
              {/* Label */}
              <span className={`text-xs transition-colors ${
                isActive 
                  ? 'text-blue-600 font-medium' 
                  : 'text-gray-500'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

StunningBottomNavbar.displayName = 'StunningBottomNavbar';

export default StunningBottomNavbar;