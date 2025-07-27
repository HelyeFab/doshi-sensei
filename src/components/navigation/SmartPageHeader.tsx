'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useNavigation } from '@/contexts/NavigationContext';
import { useStrings } from '@/contexts/LanguageContext';

interface SmartPageHeaderProps {
  title: string;
  // Optional custom back URL (overrides smart navigation)
  customBackUrl?: string;
  // Legacy prop name for backward compatibility
  backHref?: string;
  // Optional custom back title
  customBackTitle?: string;
  // Additional actions to show on the right
  actions?: React.ReactNode;
  // Whether to show the back button
  showBack?: boolean;
  // Additional class names
  className?: string;
}

export function SmartPageHeader({
  title,
  customBackUrl,
  backHref,
  customBackTitle,
  actions,
  showBack = true,
  className = ''
}: SmartPageHeaderProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const strings = useStrings();
  
  // Determine back URL and title (support both customBackUrl and backHref for backward compatibility)
  const fallbackUrl = customBackUrl || backHref;
  const backUrl = fallbackUrl || navigation.getBackUrl() || '/';
  const backTitle = customBackTitle || navigation.getBackTitle() || strings.navigation?.home || 'Home';
  const canGoBack = showBack && (fallbackUrl || navigation.canGoBack);
  
  return (
    <header className={`px-4 pt-24 pb-4 md:pt-24 ${className}`}>
      <div className="flex items-center gap-3">
        {/* Back Button */}
        {canGoBack && (
          <button
            onClick={() => {
              navigation.pop();
              router.push(backUrl);
            }}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label={`Go back to ${backTitle}`}
          >
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        {/* Page Title */}
        <h1 className="text-xl font-bold text-foreground flex-1">
          {title}
        </h1>
        
        {/* Additional Actions */}
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}