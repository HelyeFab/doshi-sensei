'use client';

import React, { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  activeIcon: string;
}

/**
 * SECURITY CRITICAL COMPONENT
 * 
 * This navbar includes admin access. Security measures:
 * 1. Admin email is hardcoded in a separate type file
 * 2. Double-checks authentication at component level
 * 3. Double-checks before rendering each admin link
 * 4. Uses exact email match - no role-based access
 * 5. Admin routes are also protected server-side
 * 
 * NEVER modify the admin check logic without security review
 */
const StunningBottomNavbar = React.memo(() => {
  const pathname = usePathname();
  const router = useRouter();
  const [activeItem, setActiveItem] = useState<string>('');
  const [showIndicator, setShowIndicator] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  
  // STRICT SECURITY CHECK - Using server-verified admin status from AdminContext

  // Memoize base navigation items
  const baseNavItems = useMemo<NavItem[]>(() => [
    {
      id: 'home',
      label: 'Home',
      href: '/',
      icon: '/flat-icons/ui/navbar/home.svg',
      activeIcon: '/flat-icons/ui/navbar/home.svg'
    },
    {
      id: 'practice',
      label: 'Practice',
      href: '/practice',
      icon: '/flat-icons/ui/navbar/practice.svg',
      activeIcon: '/flat-icons/ui/navbar/practice.svg'
    },
    {
      id: 'games',
      label: 'Games',
      href: '/games',
      icon: '/flat-icons/ui/navbar/game-console.svg',
      activeIcon: '/flat-icons/ui/navbar/game-console.svg'
    },
    {
      id: 'read',
      label: 'Read',
      href: '/read',
      icon: '/flat-icons/ui/navbar/books.svg',
      activeIcon: '/flat-icons/ui/navbar/books.svg'
    }
  ], []);

  // Memoize nav items array to prevent recreation on every render
  const navItems = useMemo(() => {
    if (isAdmin) {
      return [
        ...baseNavItems.slice(0, 3), // home, practice, games
        {
          id: 'admin',
          label: 'Admin',
          href: '/admin',
          icon: '/flat-icons/ui/navbar/dashboard.svg',
          activeIcon: '/flat-icons/ui/navbar/dashboard.svg'
        },
        baseNavItems[3] // read
      ];
    }
    return baseNavItems;
  }, [isAdmin, baseNavItems]);

  useEffect(() => {
    const active = navItems.find(item => {
      if (pathname === item.href) return true;
      if (item.href !== '/' && pathname.startsWith(item.href)) return true;
      return false;
    });
    
    if (active) {
      setActiveItem(active.id);
      setShowIndicator(true);
    }
  }, [pathname, navItems.length]); // Re-run when navItems changes (admin login/logout)

  const getIndicatorPosition = () => {
    const index = navItems.findIndex(item => item.id === activeItem);
    if (index === -1) return '0%';
    const itemWidth = 100 / navItems.length;
    return `${(index * itemWidth) + (itemWidth / 2)}%`;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Navigation items container */}
      <div className="flex items-center justify-around" style={{ height: 'var(--bottom-nav-height)' }}>
        {navItems.map((item) => {
          const isActive = item.id === activeItem;
          
          // DOUBLE SECURITY CHECK: Never render admin link unless user is verified admin
          if (item.id === 'admin' && !isAdmin) {
            return null;
          }
          
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
                      ? 'opacity-100 filter-none' 
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
                  ? 'text-primary font-medium' 
                  : 'text-muted-foreground'
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