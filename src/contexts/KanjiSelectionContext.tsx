"use client";
import React, { createContext, useContext, useState } from 'react';

export interface KanjiSelectionContextType {
    selectedKanji: any[];
    setSelectedKanji: (kanji: any[]) => void;
    clearSelectedKanji: () => void;
}

const KanjiSelectionContext = createContext<KanjiSelectionContextType | undefined>(undefined);

export function KanjiSelectionProvider({ children }: { children: React.ReactNode }) {
    const [selectedKanji, setSelectedKanji] = useState<any[]>([]);

    const clearSelectedKanji = () => setSelectedKanji([]);

    return (
        <KanjiSelectionContext.Provider value={{ selectedKanji, setSelectedKanji, clearSelectedKanji }}>
            {children}
        </KanjiSelectionContext.Provider>
    );
}

export function useKanjiSelection() {
    const context = useContext(KanjiSelectionContext);
    if (!context) {
        throw new Error('useKanjiSelection must be used within a KanjiSelectionProvider');
    }
    return context;
}
