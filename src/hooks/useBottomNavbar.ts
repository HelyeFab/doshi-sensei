'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Custom hook to manage bottom navbar spacing for StunningBottomNavbar
 * Returns the height of the bottom navbar for proper content spacing
 */
export function useBottomNavbar() {
  const [navbarHeight, setNavbarHeight] = useState(0);
  const [safeAreaBottom, setSafeAreaBottom] = useState(0);
  const pathname = usePathname();
  
  // Don't show navbar on admin pages or homepage
  const shouldShowNavbar = !pathname?.startsWith('/admin') && pathname !== '/';
  
  useEffect(() => {
    if (!shouldShowNavbar) {
      setNavbarHeight(0);
      return;
    }
    
    // Measure the actual navbar height
    const measureNavbar = () => {
      const navbar = document.querySelector('nav.fixed.bottom-0');
      if (navbar) {
        const rect = navbar.getBoundingClientRect();
        setNavbarHeight(rect.height);
      }
      
      // Get iOS safe area bottom padding
      const safeArea = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0'
      );
      setSafeAreaBottom(safeArea);
    };
    
    // Initial measurement
    measureNavbar();
    
    // Re-measure on resize
    window.addEventListener('resize', measureNavbar);
    
    // Re-measure when orientation changes
    window.addEventListener('orientationchange', measureNavbar);
    
    return () => {
      window.removeEventListener('resize', measureNavbar);
      window.removeEventListener('orientationchange', measureNavbar);
    };
  }, [shouldShowNavbar]);
  
  return {
    navbarHeight,
    safeAreaBottom,
    totalHeight: navbarHeight + safeAreaBottom,
    shouldShowNavbar,
    // Provide common spacing classes
    spacing: {
      paddingBottom: shouldShowNavbar ? `${navbarHeight + safeAreaBottom + 24}px` : '0px',
      marginBottom: shouldShowNavbar ? `${navbarHeight + safeAreaBottom + 32}px` : '32px',
    }
  };
}