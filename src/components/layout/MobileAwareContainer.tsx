'use client';

import { useBottomNavbar } from '@/hooks/useBottomNavbar';
import { ReactNode } from 'react';

interface MobileAwareContainerProps {
  children: ReactNode;
  className?: string;
  extraPadding?: number; // Additional padding beyond navbar height
}

/**
 * Container component that automatically adjusts bottom padding
 * based on the mobile navbar presence and height
 */
export function MobileAwareContainer({ 
  children, 
  className = '',
  extraPadding = 24 
}: MobileAwareContainerProps) {
  const { spacing, shouldShowNavbar } = useBottomNavbar();
  
  // Calculate dynamic padding
  const paddingBottom = shouldShowNavbar 
    ? spacing.paddingBottom 
    : `${extraPadding}px`;
  
  return (
    <div 
      className={className}
      style={{ paddingBottom }}
    >
      {children}
    </div>
  );
}