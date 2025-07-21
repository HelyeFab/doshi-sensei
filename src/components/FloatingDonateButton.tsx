'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import DonationModal from './DonationModal';
import { useStrings } from '@/contexts/LanguageContext';

export default function FloatingDonateButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const strings = useStrings();
  const pathname = usePathname();

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Don't render on admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="fixed top-4 right-4 md:bottom-6 md:right-6 md:top-auto z-40 w-14 h-14 bg-primary hover:bg-primary/90 border border-primary/30 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group backdrop-blur-md"
        aria-label={strings.tooltips.supportDeveloper}
        title={strings.tooltips.supportDeveloper}
      >
        {/* Coffee Cup Emoji - matching navigation style */}
        <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
          ☕
        </span>

        {/* Subtle pulse effect on hover */}
        <div className="absolute inset-0 bg-primary/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </button>

      <DonationModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </>
  );
}
