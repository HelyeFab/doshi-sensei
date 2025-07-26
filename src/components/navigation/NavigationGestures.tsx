'use client';

import { useNavigationGestures } from '@/hooks/useNavigationGestures';
import { SwipeHint } from './SwipeHint';
import { useSettings } from '@/contexts/SettingsContext';

export function NavigationGestures() {
  const { settings } = useSettings();
  
  // Check if gestures are enabled in settings (default to true)
  const gesturesEnabled = settings?.navigationGestures !== false;
  
  const { isSwipeHintVisible, swipeDirection, canGoBack, canGoForward } = useNavigationGestures({
    enabled: gesturesEnabled,
    showHints: true,
    minSwipeDistance: 75,
    maxSwipeTime: 300
  });

  return (
    <SwipeHint
      isVisible={isSwipeHintVisible}
      direction={swipeDirection}
      canGoBack={canGoBack}
      canGoForward={canGoForward}
    />
  );
}