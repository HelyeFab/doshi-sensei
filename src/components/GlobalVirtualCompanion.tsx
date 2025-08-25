'use client';

import { useEffect, useState } from 'react';
import VirtualCompanion from './VirtualCompanion';
import CompanionTrigger from './CompanionTrigger';
import { useVirtualCompanion } from '@/contexts/VirtualCompanionContext';

export default function GlobalVirtualCompanion() {
  const [mounted, setMounted] = useState(false);
  const { isCompanionOpen, closeCompanion } = useVirtualCompanion();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything on the server
  if (!mounted) {
    return null;
  }

  return (
    <>
      <CompanionTrigger />
      <VirtualCompanion 
        isOpen={isCompanionOpen} 
        onClose={closeCompanion} 
      />
    </>
  );
}