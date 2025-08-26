'use client';

import { useState, useEffect, useCallback } from 'react';
import { SEMANTIC_RADICALS, getRadicalsByCategory, RADICAL_CATEGORIES, type RadicalKanji } from '@/lib/kanji/radicals';
import { useFeature } from '@/hooks/useFeature';
import { useRouter } from 'next/navigation';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import KanjiModal from '@/components/kanji/KanjiModal';
import { Kanji } from '@/types';

interface RadicalData {
  radical: any;
  totalCount: number;
  kanji: RadicalKanji[];
  subThemeGroups?: Record<string, RadicalKanji[]>;
  uncategorized?: RadicalKanji[];
}

export default function KanjiRadicalsPage() {
  const router = useRouter();
  const { checkAndTrack } = useFeature('kanji_radicals', {
    showModal: true,
    trackUsage: true
  });
  
  const [selectedRadical, setSelectedRadical] = useState<string | null>(null);
  const [radicalData, setRadicalData] = useState<RadicalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showSubThemes, setShowSubThemes] = useState(true);
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const [modalKanji, setModalKanji] = useState<Kanji | null>(null);
  
  const radicalsByCategory = getRadicalsByCategory();
  
  const loadRadicalData = async (radicalId: string, subThemes: boolean) => {
    // Check access before loading
    const hasAccess = await checkAndTrack();
    if (!hasAccess) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/kanji/by-radical?radical=${radicalId}&subThemes=${subThemes}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to load radical data');
      }
      
      const data = await response.json();
      setRadicalData(data);
      
      // Auto-expand first theme
      if (data.subThemeGroups && Object.keys(data.subThemeGroups).length > 0) {
        setExpandedThemes(new Set([Object.keys(data.subThemeGroups)[0]]));
      }
    } catch (err) {
      console.error('Error loading radical:', err);
      setError('Failed to load kanji for this radical');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (selectedRadical) {
      loadRadicalData(selectedRadical, showSubThemes);
    }
  }, [selectedRadical, showSubThemes]);
  
  const handleRadicalSelect = (radicalId: string) => {
    setSelectedRadical(radicalId);
    setExpandedThemes(new Set());
  };
  
  const handleKanjiClick = (kanjiDetail: RadicalKanji) => {
    // Convert RadicalKanji to Kanji type for modal
    const kanjiForModal: Kanji = {
      kanji: kanjiDetail.kanji,
      meaning: kanjiDetail.meanings?.join(', ') || '',
      onyomi: kanjiDetail.on_readings || [],
      kunyomi: kanjiDetail.kun_readings || [],
      level: kanjiDetail.jlpt ? `N${kanjiDetail.jlpt}` as any : 'N5',
      grade: kanjiDetail.grade || 0,
      strokeCount: kanjiDetail.stroke_count || 0,
      frequency: kanjiDetail.frequency || 0
    };
    setModalKanji(kanjiForModal);
  };
  
  const toggleTheme = (themeId: string) => {
    const newExpanded = new Set(expandedThemes);
    if (newExpanded.has(themeId)) {
      newExpanded.delete(themeId);
    } else {
      newExpanded.add(themeId);
    }
    setExpandedThemes(newExpanded);
  };
  
  const getFilteredRadicals = () => {
    if (selectedCategory === 'all') {
      return Object.values(SEMANTIC_RADICALS);
    }
    return radicalsByCategory[selectedCategory] || [];
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <SmartPageHeader
        title="Semantic Radicals"
        actions={
          <div className="flex items-center gap-3">
            {/* Sub-theme Toggle */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showSubThemes}
                onChange={(e) => setShowSubThemes(e.target.checked)}
                className="rounded"
              />
              <span className="text-muted-foreground">Show sub-themes</span>
            </label>
            
            {/* View Mode Toggle */}
            <div className="flex gap-2 bg-muted rounded-lg p-1">
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
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'list' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground'
                }`}
              >
                List
              </button>
            </div>
          </div>
        }
      />
      
      {/* Desktop margin wrapper */}
      <div className="md:mx-16 lg:mx-32 xl:mx-48 2xl:mx-64">
        <div className="px-4 pb-4 bg-card border-b border-border">
          <p className="text-sm text-muted-foreground mb-4">
            Explore kanji through their semantic components and meaning clusters
          </p>
          
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-sm transition-all ${
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All Radicals
            </button>
            {Object.entries(RADICAL_CATEGORIES).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  selectedCategory === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <span className="mr-1">{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Radical Selector */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg border border-border p-4">
              <h2 className="font-semibold mb-4 text-foreground">Select a Radical</h2>
              
              <div className={`space-y-2 max-h-[600px] overflow-y-auto ${
                viewMode === 'grid' ? 'grid grid-cols-2 gap-2' : ''
              }`}>
                {getFilteredRadicals().map(radical => (
                  <motion.button
                    key={radical.id}
                    onClick={() => handleRadicalSelect(radical.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedRadical === radical.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-muted'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold"
                        style={{ 
                          backgroundColor: `${radical.color}20`,
                          color: radical.color
                        }}
                      >
                        {radical.radical}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{radical.meaning}</div>
                        <div className="text-xs text-muted-foreground">
                          {radical.meaningJa} • {radical.icon}
                        </div>
                        {radical.subThemes && (
                          <div className="text-xs text-primary mt-1">
                            {radical.subThemes.length} themes
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Kanji Display */}
          <div className="lg:col-span-2">
            {!selectedRadical ? (
              <div className="bg-card rounded-lg border border-border p-12 text-center">
                <div className="text-6xl mb-4">⚛️</div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  Select a Semantic Radical
                </h3>
                <p className="text-muted-foreground">
                  Choose a radical from the list to explore its kanji and meaning clusters
                </p>
              </div>
            ) : loading ? (
              <div className="bg-card rounded-lg border border-border p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading kanji with radical...</p>
              </div>
            ) : error ? (
              <div className="bg-destructive/10 rounded-lg border border-destructive p-6 text-center">
                <p className="text-destructive">{error}</p>
              </div>
            ) : radicalData ? (
              <div className="space-y-6">
                {/* Radical Info */}
                <div 
                  className="bg-card rounded-lg border border-border p-6"
                  style={{ borderColor: `${radicalData.radical.color}40` }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl font-bold"
                      style={{ 
                        backgroundColor: `${radicalData.radical.color}20`,
                        color: radicalData.radical.color
                      }}
                    >
                      {radicalData.radical.radical}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-foreground mb-1">
                        {radicalData.radical.meaning} Radical
                      </h2>
                      <p className="text-sm text-muted-foreground mb-3">
                        {radicalData.radical.meaningJa} • {radicalData.radical.strokeCount} strokes • {radicalData.radical.position || 'various'} position
                      </p>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="px-2 py-1 bg-muted rounded">
                          {radicalData.radical.icon} {RADICAL_CATEGORIES[radicalData.radical.category]?.label}
                        </span>
                        <span className="px-2 py-1 bg-muted rounded">
                          {radicalData.totalCount} kanji found
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Sub-themes with Kanji */}
                {showSubThemes && radicalData.subThemeGroups && (
                  <div className="space-y-4">
                    {radicalData.radical.subThemes?.map(theme => {
                      const themeKanji = radicalData.subThemeGroups![theme.id] || [];
                      const isExpanded = expandedThemes.has(theme.id);
                      
                      if (themeKanji.length === 0) return null;
                      
                      return (
                        <div key={theme.id} className="bg-card rounded-lg border border-border overflow-hidden">
                          <button
                            onClick={() => toggleTheme(theme.id)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-semibold text-foreground">
                                {theme.name}
                              </span>
                              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                                {themeKanji.length} kanji
                              </span>
                            </div>
                            <svg 
                              className={`w-5 h-5 text-muted-foreground transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="px-6 pb-4">
                                  <p className="text-xs text-muted-foreground mb-3">
                                    Keywords: {theme.keywords.join(', ')}
                                  </p>
                                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                                    {themeKanji.map(kanjiDetail => (
                                      <motion.button
                                        key={kanjiDetail.kanji}
                                        onClick={() => handleKanjiClick(kanjiDetail)}
                                        className="bg-background border border-border rounded-lg p-3 hover:border-primary hover:shadow-md transition-all group"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        <div className="text-2xl mb-1 text-center group-hover:text-primary transition-colors">
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
                                              <span className="text-xs">N{kanjiDetail.jlpt}</span>
                                            )}
                                            {kanjiDetail.grade && (
                                              <span className="text-xs">G{kanjiDetail.grade}</span>
                                            )}
                                          </div>
                                        </div>
                                      </motion.button>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                    
                    {/* Uncategorized Kanji */}
                    {radicalData.uncategorized && radicalData.uncategorized.length > 0 && (
                      <div className="bg-card rounded-lg border border-border overflow-hidden">
                        <button
                          onClick={() => toggleTheme('uncategorized')}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold text-foreground">
                              Other Kanji
                            </span>
                            <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                              {radicalData.uncategorized.length} kanji
                            </span>
                          </div>
                          <svg 
                            className={`w-5 h-5 text-muted-foreground transition-transform ${
                              expandedThemes.has('uncategorized') ? 'rotate-180' : ''
                            }`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        <AnimatePresence>
                          {expandedThemes.has('uncategorized') && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 pb-4">
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                                  {radicalData.uncategorized.map(kanjiDetail => (
                                    <motion.button
                                      key={kanjiDetail.kanji}
                                      onClick={() => handleKanjiClick(kanjiDetail)}
                                      className="bg-background border border-border rounded-lg p-3 hover:border-primary hover:shadow-md transition-all group"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <div className="text-2xl mb-1 text-center group-hover:text-primary transition-colors">
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
                                            <span className="text-xs">N{kanjiDetail.jlpt}</span>
                                          )}
                                          {kanjiDetail.grade && (
                                            <span className="text-xs">G{kanjiDetail.grade}</span>
                                          )}
                                        </div>
                                      </div>
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                )}
                
                {/* All Kanji (when sub-themes are off) */}
                {!showSubThemes && radicalData.kanji && (
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="font-semibold mb-4 text-foreground">
                      All Kanji with {radicalData.radical.radical}
                    </h3>
                    
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                      {radicalData.kanji.map(kanjiDetail => (
                        <motion.button
                          key={kanjiDetail.kanji}
                          onClick={() => handleKanjiClick(kanjiDetail)}
                          className="bg-background border border-border rounded-lg p-4 hover:border-primary hover:shadow-md transition-all group"
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
                              {kanjiDetail.grade && (
                                <span>G{kanjiDetail.grade}</span>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
        </div>
      </div>
      
      {/* Kanji Detail Modal */}
      {modalKanji && (
        <KanjiModal
          kanji={modalKanji}
          isOpen={!!modalKanji}
          onClose={() => setModalKanji(null)}
          onSave={() => {
            // Handle save functionality if needed
          }}
          isSaved={false}
        />
      )}
    </div>
  );
}