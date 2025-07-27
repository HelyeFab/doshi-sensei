'use client';

import React, { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNavigation } from '@/contexts/NavigationContext';
import { navigationRules } from '@/lib/navigation/rules';
import type { NavigationType } from '@/types/navigation';

interface SmartNavigationLinkProps {
  href: string;
  title: string;
  type?: NavigationType;
  // Optional metadata to include with navigation
  metadata?: Record<string, any>;
  // Children to render
  children: React.ReactNode;
  // Whether to preserve current page state before navigating
  preserveCurrentState?: boolean;
  // Optional state to preserve
  stateToPreserve?: any;
  // Additional props to pass to the wrapper
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  [key: string]: any;
}

export function SmartNavigationLink({
  href,
  title,
  type = 'page',
  metadata,
  children,
  preserveCurrentState = true,
  stateToPreserve,
  className,
  onClick,
  ...props
}: SmartNavigationLinkProps) {
  const router = useRouter();
  const navigation = useNavigation();
  
  // Prefetch the route on mount and hover
  useEffect(() => {
    router.prefetch(href);
  }, [href, router]);
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // Call custom onClick handler if provided
    if (onClick) {
      onClick(e);
    }
    
    // Check if navigation is allowed
    const currentPath = navigation.currentEntry?.path || '/';
    if (!navigationRules.isNavigationAllowed(currentPath, href)) {
      console.warn(`Navigation from ${currentPath} to ${href} is not allowed`);
      return;
    }
    
    // Preserve current state if requested
    if (preserveCurrentState && stateToPreserve) {
      navigation.preserveState(stateToPreserve);
    }
    
    // Push to navigation stack
    navigation.push({
      path: href,
      title,
      type,
      metadata
    });
    
    // Navigate
    router.push(href);
  }, [href, title, type, metadata, preserveCurrentState, stateToPreserve, onClick, navigation, router]);
  
  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
      onMouseEnter={() => router.prefetch(href)}
      {...props}
    >
      {children}
    </a>
  );
}