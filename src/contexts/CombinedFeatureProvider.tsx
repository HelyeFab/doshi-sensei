'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { ModalProvider, useModal } from './ModalContext';
import { NotificationProvider, useNotification } from './NotificationContext';
import { KanjiSelectionProvider, useKanjiSelection } from './KanjiSelectionContext';

// Combined context that provides all feature-related contexts
interface CombinedFeatureContextType {
  modal: ReturnType<typeof useModal>;
  notification: ReturnType<typeof useNotification>;
  kanjiSelection: ReturnType<typeof useKanjiSelection>;
}

const CombinedFeatureContext = createContext<CombinedFeatureContextType | null>(null);

// Hook to use combined feature context
export function useCombinedFeature() {
  const context = useContext(CombinedFeatureContext);
  if (!context) {
    throw new Error('useCombinedFeature must be used within CombinedFeatureProvider');
  }
  return context;
}

// Inner component that has access to all individual contexts
function CombinedFeatureInner({ children }: { children: ReactNode }) {
  const modal = useModal();
  const notification = useNotification();
  const kanjiSelection = useKanjiSelection();

  const value = React.useMemo(() => ({
    modal,
    notification,
    kanjiSelection
  }), [modal, notification, kanjiSelection]);

  return (
    <CombinedFeatureContext.Provider value={value}>
      {children}
    </CombinedFeatureContext.Provider>
  );
}

// Main provider that wraps all feature-related providers
export function CombinedFeatureProvider({ children }: { children: ReactNode }) {
  return (
    <KanjiSelectionProvider>
      <NotificationProvider>
        <ModalProvider>
          <CombinedFeatureInner>
            {children}
          </CombinedFeatureInner>
        </ModalProvider>
      </NotificationProvider>
    </KanjiSelectionProvider>
  );
}

// Export individual hooks for backward compatibility
export { useModal } from './ModalContext';
export { useNotification } from './NotificationContext';
export { useKanjiSelection } from './KanjiSelectionContext';