'use client';

import { useState, useEffect, useCallback } from 'react';
import { SKIP_PATTERNS, type SkipPattern, type SkipKanji } from '@/lib/kanji/skip';
import { useFeature } from '@/hooks/useFeature';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import KanjiDetailsModal from '@/components/kanji/KanjiDetailsModal';
import { Kanji, JLPTLevel } from '@/types';

interface SkipData {
  patterns: typeof SKIP_PATTERNS;
  totalCount: number;
  kanji: SkipKanji[];
  categorized: Record<SkipPattern, SkipKanji[]>;
  subcategorized?: Record<string, Record<string, SkipKanji[]>>;
  stats: {
    leftRight: number;
    upDown: number;
    enclosure: number;
    solid: number;
  };
}

export default function VisualLayoutPage() {
  const router = useRouter();
  const { checkAndTrack } = useFeature('kanji_visual_layout', {
    showModal: true,
    trackUsage: true
  });
  
  const [selectedPattern, setSelectedPattern] = useState<SkipPattern | null>(null);
  const [skipData, setSkipData] = useState<SkipData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'visual'>('visual');
  const [showSubcategories, setShowSubcategories] = useState(true);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [skipCodeSearch, setSkipCodeSearch] = useState('');
  const [modalKanji, setModalKanji] = useState<Kanji | null>(null);
  const [showPatternDropdown, setShowPatternDropdown] = useState(false);
  
  const loadSkipData = async (pattern: SkipPattern | undefined, subcategories: boolean) => {
    // Check access before loading
    const hasAccess = await checkAndTrack();
    if (!hasAccess) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (pattern) params.append('pattern', pattern);
      params.append('subcategories', subcategories.toString());
      
      const response = await fetch(`/api/kanji/by-skip?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to load SKIP data');
      }
      
      const data = await response.json();
      setSkipData(data);
      
      // Auto-select first subcategory if pattern is selected
      if (pattern && data.subcategorized && data.subcategorized[pattern]) {
        const subKeys = Object.keys(data.subcategorized[pattern]);
        if (subKeys.length > 0) {
          setSelectedSubcategory(subKeys[0]);
        }
      }
    } catch (err) {
      console.error('Error loading SKIP data:', err);
      setError('Failed to load visual layout data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadSkipData(selectedPattern || undefined, showSubcategories);
  }, [selectedPattern, showSubcategories]);
  
  const handlePatternSelect = (pattern: SkipPattern) => {
    setSelectedPattern(pattern);
    setSelectedSubcategory(null);
  };
  
  const handleKanjiClick = (kanjiDetail: SkipKanji) => {
    // Convert SkipKanji to Kanji type for modal
    const kanjiForModal: Kanji = {
      kanji: kanjiDetail.kanji,
      meaning: kanjiDetail.meanings?.join(', ') || '',
      onyomi: kanjiDetail.readings?.on || [],
      kunyomi: kanjiDetail.readings?.kun || [],
      jlpt: kanjiDetail.jlpt ? `N${kanjiDetail.jlpt}` as JLPTLevel : 'N5'
    };
    setModalKanji(kanjiForModal);
  };
  
  const searchBySkipCode = async () => {
    if (!skipCodeSearch) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/kanji/by-skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipCode: skipCodeSearch })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle search results
      }
    } catch (err) {
      console.error('SKIP code search error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const getPatternIcon = (pattern: SkipPattern) => {
    return SKIP_PATTERNS[pattern]?.icon || '⬜';
  };
  
  const getPatternColor = (pattern: SkipPattern) => {
    return SKIP_PATTERNS[pattern]?.color || '#888';
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Custom Header with same spacing as SmartPageHeader */}
      <header className="px-4 pt-24 pb-4 md:pt-24">
        <div className="flex flex-col gap-3">
          {/* First Row: Back button and title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Go back"
            >
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h1 className="text-xl font-bold text-foreground flex-1">
              Visual Layout (SKIP)
            </h1>
          </div>
          
          {/* Second Row: All controls in one row */}
          <div className="flex items-center justify-between gap-3 sm:ml-11">
            {/* Subcategories Toggle */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showSubcategories}
                onChange={(e) => setShowSubcategories(e.target.checked)}
                className="rounded"
              />
              <span className="text-muted-foreground whitespace-nowrap">Show subcategories</span>
            </label>
            
            {/* View Mode Toggle */}
            <div className="flex gap-2 bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode('visual')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'visual' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground'
                }`}
              >
                Visual
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'grid' 
                    ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground'
                }`}
              >
                Grid
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Desktop margin wrapper */}
      <div className="md:mx-16 lg:mx-32 xl:mx-48 2xl:mx-64">
        <div className="px-4 pb-4 bg-card border-b border-border">
          <p className="text-sm text-muted-foreground mb-2">
            Navigate kanji by their visual structure and shape patterns
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            SKIP (System of Kanji Indexing by Patterns) is a method for looking up kanji by their visual structure: left-right (⿰), up-down (⿱), enclosure (⿴), or solid (⿵) patterns.
          </p>
          
          {/* SKIP Code Search */}
          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              placeholder="Search by SKIP code (e.g., 1-3-8)"
              value={skipCodeSearch}
              onChange={(e) => setSkipCodeSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchBySkipCode()}
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <button
              onClick={searchBySkipCode}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Search
            </button>
          </div>
        </div>
        
        <div className="p-2 md:p-4">
        {/* Pattern Selector - Mobile Dropdown */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setShowPatternDropdown(!showPatternDropdown)}
            className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg"
          >
            <span className="font-medium">
              {selectedPattern ? SKIP_PATTERNS[selectedPattern]?.name : 'Select a Pattern'}
            </span>
            <svg 
              className={`w-5 h-5 transition-transform ${
                showPatternDropdown ? 'rotate-180' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showPatternDropdown && (
            <div className="absolute left-0 right-0 z-50 mt-2 mx-2 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
              {Object.entries(SKIP_PATTERNS).map(([key, pattern]) => (
                <button
                  key={key}
                  onClick={() => {
                    handlePatternSelect(key as SkipPattern);
                    setShowPatternDropdown(false);
                  }}
                  className={`w-full text-left p-3 hover:bg-muted transition-colors ${
                    selectedPattern === key ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
                      style={{ 
                        backgroundColor: `${pattern.color}20`,
                        color: pattern.color
                      }}
                    >
                      {pattern.icon}
                    </div>
                    <div>
                      <div className="font-medium">{pattern.name}</div>
                      <div className="text-xs text-muted-foreground">{pattern.nameJa}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Pattern Selector - Desktop Visual Mode */}
        {viewMode === 'visual' && (
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Object.entries(SKIP_PATTERNS).map(([key, pattern]) => (
              <motion.button
                key={key}
                onClick={() => handlePatternSelect(key as SkipPattern)}
                className={`relative p-6 rounded-xl border-2 transition-all ${
                  selectedPattern === key
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-muted'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Visual Representation */}
                <div className="mb-4 flex justify-center">
                  <div 
                    className="w-20 h-20 rounded-lg flex items-center justify-center text-4xl"
                    style={{ 
                      backgroundColor: `${pattern.color}20`,
                      color: pattern.color
                    }}
                  >
                    {pattern.icon}
                  </div>
                </div>
                
                <h3 className="font-semibold text-foreground mb-1">{pattern.name}</h3>
                <p className="text-xs text-muted-foreground mb-2">{pattern.nameJa}</p>
                
                {/* Stats Badge */}
                {skipData && (
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      {skipData.stats[key as keyof typeof skipData.stats]} kanji
                    </span>
                  </div>
                )}
                
                {/* Examples */}
                <div className="flex justify-center gap-1 mt-3">
                  {pattern.examples.slice(0, 4).map(ex => (
                    <span key={ex} className="text-lg text-muted-foreground">{ex}</span>
                  ))}
                </div>
              </motion.button>
            ))}
          </div>
        )}
        
        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Subcategory Selector (if pattern selected) */}
          {selectedPattern && showSubcategories && (
            <div className="lg:col-span-1">
              <div className="bg-card rounded-lg border border-border p-4">
                <h2 className="font-semibold mb-4 text-foreground">Subcategories</h2>
                
                <div className="space-y-2">
                  {SKIP_PATTERNS[selectedPattern].subCategories?.map(subcat => {
                    const kanjiCount = skipData?.subcategorized?.[selectedPattern]?.[subcat.id]?.length || 0;
                    
                    return (
                      <button
                        key={subcat.id}
                        onClick={() => setSelectedSubcategory(subcat.id)}
                        disabled={kanjiCount === 0}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedSubcategory === subcat.id
                            ? 'border-primary bg-primary/10'
                            : kanjiCount === 0
                            ? 'border-border opacity-50 cursor-not-allowed'
                            : 'border-border hover:border-primary/50 hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-foreground">{subcat.name}</div>
                            <div className="text-xs text-muted-foreground">{subcat.description}</div>
                          </div>
                          <span className="text-sm text-muted-foreground">{kanjiCount}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Kanji Display */}
          <div className={`${selectedPattern && showSubcategories ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {!selectedPattern ? (
              <div className="bg-card rounded-lg border border-border p-8 md:p-12 text-center">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  Select a Visual Pattern
                </h3>
                <p className="text-muted-foreground">
                  Choose a pattern above to explore kanji by their visual structure
                </p>
              </div>
            ) : loading ? (
              <div className="bg-card rounded-lg border border-border p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading kanji patterns...</p>
              </div>
            ) : error ? (
              <div className="bg-destructive/10 rounded-lg border border-destructive p-6 text-center">
                <p className="text-destructive">{error}</p>
              </div>
            ) : skipData ? (
              <div className="space-y-6">
                {/* Pattern Info */}
                <div 
                  className="bg-card rounded-lg border border-border p-6"
                  style={{ borderColor: `${getPatternColor(selectedPattern)}40` }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                      style={{ 
                        backgroundColor: `${getPatternColor(selectedPattern)}20`,
                        color: getPatternColor(selectedPattern)
                      }}
                    >
                      {getPatternIcon(selectedPattern)}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-foreground mb-1">
                        {SKIP_PATTERNS[selectedPattern].name}
                      </h2>
                      <p className="text-sm text-muted-foreground mb-3">
                        {SKIP_PATTERNS[selectedPattern].description}
                      </p>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="px-2 py-1 bg-muted rounded">
                          {SKIP_PATTERNS[selectedPattern].nameJa}
                        </span>
                        <span className="px-2 py-1 bg-muted rounded">
                          {skipData.categorized[selectedPattern].length} kanji
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Kanji Grid */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="font-semibold mb-4 text-foreground">
                    {selectedSubcategory && showSubcategories
                      ? SKIP_PATTERNS[selectedPattern].subCategories?.find(sc => sc.id === selectedSubcategory)?.name
                      : `All ${SKIP_PATTERNS[selectedPattern].name} Kanji`}
                  </h3>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
                    {(() => {
                      let kanjiToShow: SkipKanji[] = [];
                      
                      if (selectedSubcategory && showSubcategories && skipData.subcategorized) {
                        kanjiToShow = skipData.subcategorized[selectedPattern]?.[selectedSubcategory] || [];
                      } else {
                        kanjiToShow = skipData.categorized[selectedPattern] || [];
                      }
                      
                      return kanjiToShow.map(kanjiDetail => (
                        <motion.button
                          key={kanjiDetail.kanji}
                          onClick={() => handleKanjiClick(kanjiDetail)}
                          className="bg-background border border-border rounded-lg p-3 md:p-4 hover:border-primary hover:shadow-md transition-all group relative"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div className="text-3xl mb-2 text-center group-hover:text-primary transition-colors">
                            {kanjiDetail.kanji}
                          </div>
                          
                          <div className="space-y-1 text-xs">
                            {kanjiDetail.meanings && kanjiDetail.meanings[0] && (
                              <div className="text-muted-foreground truncate text-center">
                                {kanjiDetail.meanings[0]}
                              </div>
                            )}
                            
                            <div className="flex justify-center gap-1 text-muted-foreground/70">
                              {kanjiDetail.jlpt && (
                                <span>N{kanjiDetail.jlpt}</span>
                              )}
                              {kanjiDetail.strokeCount && (
                                <span>{kanjiDetail.strokeCount}画</span>
                              )}
                            </div>
                            
                            {/* SKIP Code Badge */}
                            <div className="absolute top-1 right-1">
                              <span className="text-xs bg-muted px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                {kanjiDetail.skip.code}
                              </span>
                            </div>
                          </div>
                        </motion.button>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        </div>
      </div>
      
      {/* Kanji Detail Modal */}
      {modalKanji && (
        <KanjiDetailsModal
          kanji={modalKanji}
          isOpen={!!modalKanji}
          onClose={() => setModalKanji(null)}
          onSave={() => {
            // Handle save functionality if needed
          }}
          showSaveButton={true}
        />
      )}
    </div>
  );
}