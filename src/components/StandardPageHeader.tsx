'use client';

import Link from 'next/link'
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';
import { useSearchParams } from 'next/navigation';

interface StandardPageHeaderProps {
  title: string;
  backHref?: string;
  showBackButton?: boolean;
}

export function StandardPageHeader({ 
  title, 
  backHref = '/', 
  showBackButton = true 
}: StandardPageHeaderProps) {
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  
  // Determine the back URL based on the 'from' parameter
  let finalBackHref = backHref;
  if (from === 'practice') {
    // If coming from practice page, always go back to practice
    // regardless of the default backHref
    finalBackHref = '/practice';
  }
  return (
    <>
      {/* Spacer for Virtual Companion */}
      <div className="h-20" />
      
      {/* Page Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          {/* Back Button */}
          {showBackButton && (
            <SmartNavigationLink href={finalBackHref}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label={`Go back to ${finalBackHref === '/practice' ? 'practice' : 'home'}`}
             title={preservedTitle || "Previous Page"}>
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </SmartNavigationLink>
          )}
          
          {/* Page Title */}
          <h1 className="text-xl font-bold text-foreground">
            {title}
          </h1>
        </div>
      </header>
    </>
  );
}