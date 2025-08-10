'use client';

import VirtualCompanion from './VirtualCompanion';
import { useVirtualCompanion } from '@/contexts/VirtualCompanionContext';

export default function GlobalVirtualCompanion() {
  const { isCompanionOpen, closeCompanion } = useVirtualCompanion();

  return (
    <VirtualCompanion 
      isOpen={isCompanionOpen} 
      onClose={closeCompanion} 
    />
  );
}