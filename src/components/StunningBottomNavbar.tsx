'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  activeIcon: string;
}

export default function StunningBottomNavbar() {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string>('');
  const [showIndicator, setShowIndicator] = useState(false);

  const navItems: NavItem[] = [
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
      id: 'account',
      label: 'You',
      href: '/account',
      icon: '/flat-icons/ui/navbar/account.svg',
      activeIcon: '/flat-icons/ui/navbar/account.svg'
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
      setShowIndicator(true);
    }
  }, [pathname]);

  const getIndicatorPosition = () => {
    const index = navItems.findIndex(item => item.id === activeItem);
    if (index === -1) return '0%';
    return `${(index * 25) + 12.5}%`;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-4 pb-4 pointer-events-none">
      {/* Main container - removed extra wrapper */}
      <div className="relative bg-card/5 backdrop-blur-[6px] border border-gray-300/30 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto">
          {/* Gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 opacity-50 blur-xl" />
          
          {/* Navigation items container */}
          <div className="relative flex items-center justify-around px-2 py-3">
            {/* Animated indicator - removed */}

            {navItems.map((item) => {
              const isActive = item.id === activeItem;
              
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="relative flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300 group"
                  onClick={() => setActiveItem(item.id)}
                >
                  {/* Hover/tap effect */}
                  <motion.div
                    className="absolute inset-0 bg-primary/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    whileTap={{ scale: 0.95 }}
                  />
                  
                  {/* Icon container */}
                  <motion.div
                    className="relative z-10 p-2 rounded-xl transition-all duration-300 group-hover:bg-muted"
                    animate={{
                      y: 0,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30
                    }}
                  >
                    <div className={`relative transition-all duration-300 ${
                      isActive ? 'w-8 h-8' : 'w-7 h-7 group-hover:scale-110'
                    }`}>
                      <Image
                        src={item.icon}
                        alt={item.label}
                        fill
                        className={`object-contain transition-all duration-300 ${
                          isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
                        }`}
                      />
                    </div>
                  </motion.div>
                  
                  {/* Label - hidden */}
                  <motion.span
                    className="absolute -bottom-1 text-xs font-medium transition-all duration-300 text-muted-foreground opacity-0"
                    animate={{
                      y: 4,
                      opacity: 0
                    }}
                    transition={{
                      duration: 0.2
                    }}
                  >
                    {item.label}
                  </motion.span>

                  {/* Active dot indicator - removed */}
                </Link>
              );
            })}
          </div>
      </div>

      {/* Safe area padding for iOS */}
      <div className="h-safe-area-bottom" />
    </nav>
  );
}