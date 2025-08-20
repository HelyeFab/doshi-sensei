'use client';

import VirtualCompanion from './VirtualCompanion';
import CompanionTrigger from './CompanionTrigger';
import { useVirtualCompanion } from '@/contexts/VirtualCompanionContext';

export default function GlobalVirtualCompanion() {
  const { isCompanionOpen, closeCompanion } = useVirtualCompanion();

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