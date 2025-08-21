'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MobileLearningWrapperProps {
  children: React.ReactNode;
  onClose?: () => void;
}

export default function MobileLearningWrapper({ children, onClose }: MobileLearningWrapperProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if we're on mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.replace('/tools/kanji-mastery');
    }
  };

  // On mobile, render full-screen with a close button
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        {/* Close button header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-background/95 backdrop-blur-sm border-b border-border">
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close learning session"
          >
            <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="text-sm font-medium text-muted-foreground">Kanji Learning</span>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>
        
        {/* Content with padding for the header */}
        <div className="h-full w-full overflow-y-auto">
          {children}
        </div>
      </div>
    );
  }

  // On desktop, render normally
  return <>{children}</>;
}