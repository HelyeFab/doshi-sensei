'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

interface SmartHeaderProps {
  title: string;
  backHref?: string; // Optional, defaults to '/'
  showBack?: boolean; // Optional, defaults to true
}

export default function SmartHeader({ title, backHref, showBack = true }: SmartHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Don't show back button on homepage
  const showBackButton = showBack && pathname !== '/';

  return (
    <header className="px-4 pt-24 pb-4 md:pt-24">
      <div className="flex items-center gap-3">
        {/* Back Button */}
        {showBackButton && (
          <button
            onClick={() => {
              if (backHref) {
                router.replace(backHref);
              } else {
                router.back();
              }
            }}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Go back"
          >
            <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        {/* Page Title */}
        <h1 className="text-xl font-bold text-foreground flex-1">
          {title}
        </h1>
      </div>
    </header>
  );
}