'use client';

import { useState, useEffect, useCallback } from 'react';
import { KANJI_FAMILIES, getFamiliesByCategories, type KanjiFamily } from '@/lib/kanji/families';
import { useFeature } from '@/hooks/useFeature';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface KanjiDetails {
  kanji: string;
  grade?: number | null;
  jlpt?: number | null;
  stroke_count?: number;
  meanings?: string[];
  kun_readings?: string[];
  on_readings?: string[];
  frequency?: number | null;
}

interface FamilyData {
  family: string;
  label: string;
  labelJa: string;
  color: string;
  icon: string;
  note: string;
  components: string[];
  count: number;
  kanji: KanjiDetails[];
  crossFamilyKanji?: {
    kanji: string;
    families: string[];
  }[];
}

export default function KanjiFamiliesPage() {
  const router = useRouter();
  const { checkAndTrack } = useFeature('kanji_families', {
    showModal: true,
    trackUsage: true
  });
  
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [familyData, setFamilyData] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCrossFamilies, setShowCrossFamilies] = useState(false);
  
  const familiesByCategory = getFamiliesByCategories();
  
  const loadFamilyData = useCallback(async (familyId: string) => {
    // Check access before loading
    const hasAccess = await checkAndTrack();
    if (!hasAccess) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/kanji/by-family?family=${familyId}&details=true&crossFamilies=${showCrossFamilies}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to load family data');
      }
      
      const data = await response.json();
      setFamilyData(data);
    } catch (err) {
      console.error('Error loading family:', err);
      setError('Failed to load kanji family data');
    } finally {
      setLoading(false);
    }
  }, [checkAndTrack, showCrossFamilies]);
  
  useEffect(() => {
    if (selectedFamily) {
      loadFamilyData(selectedFamily);
    }
  }, [selectedFamily, loadFamilyData]);
  
  const handleFamilySelect = (familyId: string) => {
    setSelectedFamily(familyId);
  };
  
  const handleKanjiClick = (kanji: string) => {
    // Navigate to kanji detail page
    router.push(`/kanji-browser?search=${kanji}`);
  };
  
  const getFilteredFamilies = () => {
    if (selectedCategory === 'all') {
      return Object.values(KANJI_FAMILIES);
    }
    return familiesByCategory[selectedCategory] || [];
  };
  
  const categoryColors: Record<string, string> = {
    elements: 'bg-orange-100 text-orange-800 border-orange-300',
    nature: 'bg-green-100 text-green-800 border-green-300',
    human: 'bg-blue-100 text-blue-800 border-blue-300',
    tools: 'bg-purple-100 text-purple-800 border-purple-300',
    abstract: 'bg-gray-100 text-gray-800 border-gray-300',
    movement: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    society: 'bg-pink-100 text-pink-800 border-pink-300'
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 py-6 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/tools/kanji-mastery"
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Back to Kanji Mastery"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Kanji Families</h1>
              <p className="text-sm text-muted-foreground">
                Learn kanji grouped by shared components and meanings
              </p>
            </div>
            
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
              All Families
            </button>
            {Object.keys(familiesByCategory).map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm transition-all capitalize ${
                  selectedCategory === category
                    ? categoryColors[category] + ' border'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Family Selector */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg border border-border p-4">
              <h2 className="font-semibold mb-4 text-foreground">Select a Family</h2>
              
              <div className={`space-y-2 max-h-[600px] overflow-y-auto ${
                viewMode === 'grid' ? 'grid grid-cols-1 gap-2' : ''
              }`}>
                {getFilteredFamilies().map(family => (
                  <motion.button
                    key={family.id}
                    onClick={() => handleFamilySelect(family.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedFamily === family.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-muted'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                        style={{ backgroundColor: `${family.color}20` }}
                      >
                        {family.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{family.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {family.components.join(' ')} • {family.labelJa}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Kanji Display */}
          <div className="lg:col-span-2">
            {!selectedFamily ? (
              <div className="bg-card rounded-lg border border-border p-12 text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  Select a Kanji Family
                </h3>
                <p className="text-muted-foreground">
                  Choose a family from the list to explore related kanji
                </p>
              </div>
            ) : loading ? (
              <div className="bg-card rounded-lg border border-border p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading kanji family...</p>
              </div>
            ) : error ? (
              <div className="bg-destructive/10 rounded-lg border border-destructive p-6 text-center">
                <p className="text-destructive">{error}</p>
              </div>
            ) : familyData ? (
              <div className="space-y-6">
                {/* Family Info */}
                <div 
                  className="bg-card rounded-lg border border-border p-6"
                  style={{ borderColor: `${familyData.color}40` }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                      style={{ backgroundColor: `${familyData.color}20` }}
                    >
                      {familyData.icon}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-foreground mb-1">
                        {familyData.label}
                      </h2>
                      <p className="text-sm text-muted-foreground mb-3">
                        {familyData.note}
                      </p>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="px-2 py-1 bg-muted rounded">
                          Components: {familyData.components.join(' ')}
                        </span>
                        <span className="px-2 py-1 bg-muted rounded">
                          {familyData.count} kanji
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Cross-family toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="crossFamilies"
                    checked={showCrossFamilies}
                    onChange={(e) => setShowCrossFamilies(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="crossFamilies" className="text-sm text-muted-foreground">
                    Show cross-family connections
                  </label>
                </div>
                
                {/* Kanji Grid */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="font-semibold mb-4 text-foreground">
                    Kanji in this Family
                  </h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {familyData.kanji.map(kanjiDetail => (
                      <motion.button
                        key={kanjiDetail.kanji}
                        onClick={() => handleKanjiClick(kanjiDetail.kanji)}
                        className="bg-background border border-border rounded-lg p-4 hover:border-primary hover:shadow-md transition-all group"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="text-3xl mb-2 text-center group-hover:text-primary transition-colors">
                          {kanjiDetail.kanji}
                        </div>
                        
                        <div className="space-y-1 text-xs">
                          {kanjiDetail.meanings && (
                            <div className="text-muted-foreground truncate">
                              {kanjiDetail.meanings[0]}
                            </div>
                          )}
                          
                          <div className="flex justify-between text-muted-foreground/70">
                            {kanjiDetail.jlpt && (
                              <span>N{kanjiDetail.jlpt}</span>
                            )}
                            {kanjiDetail.grade && (
                              <span>G{kanjiDetail.grade}</span>
                            )}
                            {kanjiDetail.stroke_count && (
                              <span>{kanjiDetail.stroke_count}画</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Cross-family indicator */}
                        {showCrossFamilies && familyData.crossFamilyKanji?.find(
                          cf => cf.kanji === kanjiDetail.kanji
                        ) && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <div className="text-xs text-primary">
                              +{familyData.crossFamilyKanji.find(
                                cf => cf.kanji === kanjiDetail.kanji
                              )?.families.length} families
                            </div>
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
                
                {/* Cross-family connections */}
                {showCrossFamilies && familyData.crossFamilyKanji && familyData.crossFamilyKanji.length > 0 && (
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="font-semibold mb-4 text-foreground">
                      Cross-Family Connections
                    </h3>
                    <div className="space-y-2">
                      {familyData.crossFamilyKanji.slice(0, 10).map(item => (
                        <div key={item.kanji} className="flex items-center gap-3">
                          <span className="text-2xl">{item.kanji}</span>
                          <div className="flex gap-2 flex-wrap">
                            {item.families.map(familyId => {
                              const family = KANJI_FAMILIES[familyId];
                              return family ? (
                                <button
                                  key={familyId}
                                  onClick={() => handleFamilySelect(familyId)}
                                  className="px-2 py-1 bg-muted rounded text-xs hover:bg-muted/80 transition-colors"
                                >
                                  {family.icon} {family.label}
                                </button>
                              ) : null;
                            })}
                          </div>
                        </div>
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
  );
}