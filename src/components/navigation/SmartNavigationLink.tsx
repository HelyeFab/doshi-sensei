'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  // Whether to prefetch on mount (default false to prevent initial load freeze)
  prefetchOnMount?: boolean;
  // Whether to prefetch on hover (default true)
  prefetchOnHover?: boolean;
  // Additional props to pass to the wrapper
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  [key: string]: any;
}

// Queue for prefetch requests to prevent overwhelming the router
const prefetchQueue: string[] = [];
let isPrefetching = false;

const processPrefetchQueue = async (router: any) => {
  if (isPrefetching || prefetchQueue.length === 0) return;
  
  isPrefetching = true;
  const href = prefetchQueue.shift();
  
  if (href) {
    try {
      await router.prefetch(href);
    } catch (error) {
      console.error(`Failed to prefetch ${href}:`, error);
    }
  }
  
  isPrefetching = false;
  
  // Process next item after a small delay
  if (prefetchQueue.length > 0) {
    setTimeout(() => processPrefetchQueue(router), 100);
  }
};

export function SmartNavigationLink({
  href,
  title,
  type = 'page',
  metadata,
  children,
  preserveCurrentState = true,
  stateToPreserve,
  prefetchOnMount = false,
  prefetchOnHover = true,
  className,
  onClick,
  ...props
}: SmartNavigationLinkProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const [hasPrefetched, setHasPrefetched] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  // Only prefetch on mount if explicitly enabled
  useEffect(() => {
    if (prefetchOnMount && !hasPrefetched) {
      // Add to queue instead of prefetching immediately
      if (!prefetchQueue.includes(href)) {
        prefetchQueue.push(href);
        processPrefetchQueue(router);
      }
      setHasPrefetched(true);
    }
  }, [href, router, prefetchOnMount, hasPrefetched]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const handleMouseEnter = useCallback(() => {
    if (prefetchOnHover && !hasPrefetched) {
      // Delay prefetch slightly to avoid prefetching on quick mouse movements
      timeoutRef.current = setTimeout(() => {
        router.prefetch(href);
        setHasPrefetched(true);
      }, 150);
    }
  }, [href, router, prefetchOnHover, hasPrefetched]);
  
  const handleMouseLeave = useCallback(() => {
    // Cancel prefetch if mouse leaves quickly
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);
  
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </a>
  );
}