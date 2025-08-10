'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface VirtualCompanionContextType {
  isCompanionOpen: boolean;
  openCompanion: () => void;
  closeCompanion: () => void;
}

const VirtualCompanionContext = createContext<VirtualCompanionContextType | undefined>(undefined);

export function VirtualCompanionProvider({ children }: { children: ReactNode }) {
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);

  const openCompanion = () => setIsCompanionOpen(true);
  const closeCompanion = () => setIsCompanionOpen(false);

  return (
    <VirtualCompanionContext.Provider value={{ isCompanionOpen, openCompanion, closeCompanion }}>
      {children}
    </VirtualCompanionContext.Provider>
  );
}

export function useVirtualCompanion() {
  const context = useContext(VirtualCompanionContext);
  if (context === undefined) {
    throw new Error('useVirtualCompanion must be used within a VirtualCompanionProvider');
  }
  return context;
}