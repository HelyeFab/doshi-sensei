'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SlideUpModal from '@/components/SlideUpModal';

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

  // On mobile, render in a slide-up modal
  if (isMobile) {
    return (
      <SlideUpModal
        isOpen={true}
        onClose={handleClose}
        height="90%"
        showHandle={false}
        closeOnOutsideClick={false}
        showCloseButton={true}
        className="bg-background"
      >
        {children}
      </SlideUpModal>
    );
  }

  // On desktop, render normally
  return <>{children}</>;
}