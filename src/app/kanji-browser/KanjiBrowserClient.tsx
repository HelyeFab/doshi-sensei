'use client';

import { useState, useEffect } from 'react';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';
import KanjiCard from '@/components/kanji/KanjiCard';
import KanjiModal from '@/components/kanji/KanjiModal';
import { kanjiService } from '@/services/kanjiService';
import { JLPT_LEVELS, JLPTLevel, KANJI_BY_LEVEL } from '@/types/kanji';
import { useStrings } from '@/contexts/LanguageContext';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { useFeature } from '@/hooks/useFeature';

export default function KanjiBrowserClient() {
  const strings = useStrings();
  const { isPremium } = useSubscription2();
  const { feature: strokeOrderFeature } = useFeature('view_stroke_order');
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel>('N5');
  const [searchTerm, setSearchTerm] = useState('');
  const [kanjiList, setKanjiList] = useState<string[]>([]);
  const [filteredKanji, setFilteredKanji] = useState<string[]>([]);
  const [selectedKanji, setSelectedKanji] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadKanjiForLevel();
  }, [selectedLevel]);

  useEffect(() => {
    filterKanji();
  }, [kanjiList, searchTerm]);

  const loadKanjiForLevel = async () => {
    setLoading(true);
    try {
      const levelKanji = KANJI_BY_LEVEL[selectedLevel] || [];
      setKanjiList(levelKanji);
    } catch (error) {
      console.error('Failed to load kanji:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterKanji = () => {
    if (!searchTerm) {
      setFilteredKanji(kanjiList);
      return;
    }

    const filtered = kanjiList.filter(kanji => {
      // For now, just check if the kanji matches
      // In a full implementation, we'd search meanings and readings too
      return kanji.includes(searchTerm);
    });
    setFilteredKanji(filtered);
  };

  const canViewStrokeOrder = isPremium || (strokeOrderFeature?.access?.hasAccess ?? false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SmartPageHeader
        title={strings.kanjiBrowser?.title || "Kanji Browser"}
        icon="language"
        description={strings.kanjiBrowser?.description || "Browse and study kanji by JLPT level"}
      />

      <MobileAwareContainer className="pb-20">
        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={strings.kanjiBrowser?.searchPlaceholder || "Search kanji, meaning, or reading..."}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Level Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {strings.kanjiBrowser?.selectLevel || "Select JLPT Level"}
          </label>
          <div className="flex flex-wrap gap-2">
            {JLPT_LEVELS.map(level => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedLevel === level
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Kanji Count */}
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {strings.kanjiBrowser?.showing || "Showing"} {filteredKanji.length} {strings.kanjiBrowser?.of || "of"} {kanjiList.length} {strings.kanjiBrowser?.kanji || "kanji"}
        </div>

        {/* Kanji Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {filteredKanji.map((kanji) => (
              <KanjiCard
                key={kanji}
                kanji={kanji}
                onClick={() => setSelectedKanji(kanji)}
                showMeaning={false}
                size="medium"
              />
            ))}
          </div>
        )}

        {filteredKanji.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400">
              {strings.kanjiBrowser?.noResults || "No kanji found matching your search"}
            </p>
          </div>
        )}

        {/* Kanji Modal */}
        {selectedKanji && (
          <KanjiModal
            kanji={selectedKanji}
            onClose={() => setSelectedKanji(null)}
            canViewStrokeOrder={canViewStrokeOrder}
          />
        )}
      </MobileAwareContainer>
    </div>
  );
}