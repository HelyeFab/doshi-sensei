'use client';

import { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import { useRouter } from 'next/navigation';

interface SwipeConfig {
  // Minimum distance for a swipe (in pixels)
  minSwipeDistance?: number;
  // Maximum time for a swipe (in milliseconds)
  maxSwipeTime?: number;
  // Whether gestures are enabled
  enabled?: boolean;
  // Show visual hints
  showHints?: boolean;
}

export function useNavigationGestures(config: SwipeConfig = {}) {
  const {
    minSwipeDistance = 75,
    maxSwipeTime = 300,
    enabled = true,
    showHints = true
  } = config;

  const navigation = useNavigation();
  const router = useRouter();
  
  const [isSwipeHintVisible, setIsSwipeHintVisible] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);
  const isSwipeInProgress = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Check if touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only track if starting from the edge (first 20px or last 20px of screen)
      const touch = e.touches[0];
      const screenWidth = window.innerWidth;
      
      if (touch.clientX < 20 || touch.clientX > screenWidth - 20) {
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        touchStartTime.current = Date.now();
        isSwipeInProgress.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwipeInProgress.current || touchStartX.current === null || touchStartY.current === null) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // Check if horizontal swipe (more X movement than Y)
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Prevent default scrolling
        e.preventDefault();
        
        // Show swipe hint
        if (showHints && Math.abs(deltaX) > 30) {
          setIsSwipeHintVisible(true);
          setSwipeDirection(deltaX > 0 ? 'right' : 'left');
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSwipeInProgress.current || touchStartX.current === null || touchStartY.current === null || touchStartTime.current === null) {
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;
      const deltaTime = Date.now() - touchStartTime.current;

      // Reset
      isSwipeInProgress.current = false;
      touchStartX.current = null;
      touchStartY.current = null;
      touchStartTime.current = null;
      setIsSwipeHintVisible(false);
      setSwipeDirection(null);

      // Check if it's a valid swipe
      if (
        Math.abs(deltaX) > minSwipeDistance &&
        Math.abs(deltaX) > Math.abs(deltaY) &&
        deltaTime < maxSwipeTime
      ) {
        if (deltaX > 0 && navigation.canGoBack) {
          // Swipe right - go back
          navigation.goBack();
        } else if (deltaX < 0 && navigation.canGoForward) {
          // Swipe left - go forward
          navigation.goForward();
        }
      }
    };

    const handleTouchCancel = () => {
      // Reset everything
      isSwipeInProgress.current = false;
      touchStartX.current = null;
      touchStartY.current = null;
      touchStartTime.current = null;
      setIsSwipeHintVisible(false);
      setSwipeDirection(null);
    };

    // Add event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    // Removed swipe hint tutorial as requested

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [enabled, minSwipeDistance, maxSwipeTime, showHints, navigation, router]);

  return {
    isSwipeHintVisible,
    swipeDirection,
    canGoBack: navigation.canGoBack,
    canGoForward: navigation.canGoForward
  };
}