'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { MoodBoardManager } from '@/components/admin/MoodBoardManager';
import { useMoodBoards } from '@/hooks/useMoodBoards';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStrings } from '@/contexts/LanguageContext';
import GenerateKanjiMoodboardModal from '@/components/admin/GenerateKanjiMoodboardModal';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

export default function MoodBoardsPage() {
  const strings = useStrings();
  const router = useRouter();
  const { moodBoards, loading, createMoodBoard } = useMoodBoards();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJLPT, setFilterJLPT] = useState<'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'>('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [stats, setStats] = useState({
    totalBoards: 0,
    activeBoards: 0,
    mostPopular: 'Loading...',
    lastUpdated: 'Calculating...'
  });

  const jlptOptions = [
    { value: 'all', label: 'All Levels', color: 'bg-gray-100 text-gray-800' },
    { value: 'N5', label: 'JLPT N5', color: 'bg-green-100 text-green-800' },
    { value: 'N4', label: 'JLPT N4', color: 'bg-blue-100 text-blue-800' },
    { value: 'N3', label: 'JLPT N3', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'N2', label: 'JLPT N2', color: 'bg-orange-100 text-orange-800' },
    { value: 'N1', label: 'JLPT N1', color: 'bg-red-100 text-red-800' },
  ] as const;

  // Calculate real statistics from mood boards data
  useEffect(() => {
    if (!loading && moodBoards.length > 0) {
      const totalBoards = moodBoards.length;
      const activeBoards = moodBoards.filter(board => board.isActive !== false).length;

      // Find most popular mood board (could be based on views or usage)
      const mostPopular = moodBoards.find(board => board.isActive !== false)?.title || 'None';

      // Find the most recently updated board
      const mostRecentBoard = moodBoards.reduce((latest, current) => {
        const currentDate = current.updatedAt ? new Date(current.updatedAt) : new Date(0);
        const latestDate = latest.updatedAt ? new Date(latest.updatedAt) : new Date(0);
        return currentDate > latestDate ? current : latest;
      }, moodBoards[0]);

      const lastUpdated = mostRecentBoard?.updatedAt
        ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
          Math.floor((new Date(mostRecentBoard.updatedAt).getTime() - Date.now()) / (1000 * 60 * 60)),
          'hour'
        )
        : 'Unknown';

      setStats({
        totalBoards,
        activeBoards,
        mostPopular,
        lastUpdated
      });
    } else if (!loading) {
      setStats({
        totalBoards: 0,
        activeBoards: 0,
        mostPopular: 'None',
        lastUpdated: 'Never'
      });
    }
  }, [moodBoards, loading]);

  const handleGeneratedMoodboard = async (moodboardData: any) => {
    try {
      console.log('Handling generated moodboard:', moodboardData);
      
      if (!moodboardData || !moodboardData.kanjiList) {
        throw new Error('Invalid moodboard data received');
      }
      
      // Convert KanjiImportItem format to KanjiItem format
      const convertedKanji = moodboardData.kanjiList.map((item: any) => {
        // Use the onyomi and kunyomi arrays directly from the AI response
        const onReadings = item.onyomi || [];
        const kunReadings = item.kunyomi || [];
        
        return {
          char: item.kanji,
          meaning: item.meaning,
          readings: {
            on: onReadings,
            kun: kunReadings
          },
          examples: item.examples || [],
          difficulty: item.jlptLevel === 'N5' ? 1 : 
                     item.jlptLevel === 'N4' ? 2 : 
                     item.jlptLevel === 'N3' ? 3 : 
                     item.jlptLevel === 'N2' ? 4 : 5
        };
      });
      
      // Create the moodboard in the database
      await createMoodBoard({
        title: moodboardData.category,
        emoji: moodboardData.emoji,
        jlpt: moodboardData.kanjiList[0]?.jlptLevel || 'N5',
        background: moodboardData.themeColor,
        description: moodboardData.description,
        kanji: convertedKanji,
        isActive: true,
        sortOrder: 0,
      });
      
      // Refresh the page to show the new moodboard
      router.refresh();
    } catch (error) {
      console.error('Error creating moodboard:', error);
      // Show error notification if available
      if (typeof window !== 'undefined') {
        alert(`Failed to create moodboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  return (
    <AdminLayout title="Mood Boards Management">
      <div className="space-y-6">
        {/* Page header */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 sm:p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1 sm:mb-2">
                Mood Boards Management
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Create, edit, and manage kanji mood boards with our hybrid editor interface.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowGenerateModal(true)}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
              >
                <Sparkles className="w-4 h-4" />
                <span className="whitespace-nowrap">Generate with AI</span>
              </button>
              <Link
                href="/admin/mood-boards/new"
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="whitespace-nowrap">Create New Board</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Search and filters */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="space-y-4">
            {/* Search bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="mood-board-search" className="sr-only">
                  {strings.admin.searchMoodBoards}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    id="mood-board-search"
                    type="text"
                    placeholder={strings.admin.searchMoodBoardsPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{strings.admin.jlptLevel}:</span>
                <select
                  value={filterJLPT}
                  onChange={(e) => setFilterJLPT(e.target.value as any)}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  {jlptOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* JLPT filter pills */}
            <div className="flex flex-wrap gap-2">
              {jlptOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilterJLPT(option.value)}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                    ${filterJLPT === option.value
                      ? 'bg-primary text-primary-foreground'
                      : option.color + ' hover:opacity-80'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Search results summary */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                {searchQuery && (
                  <span>
                    {strings.admin.searchingFor}: <strong className="text-foreground">"{searchQuery}"</strong>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span>{strings.admin.level}: <strong className="text-foreground">{jlptOptions.find(o => o.value === filterJLPT)?.label}</strong></span>
                {(searchQuery || filterJLPT !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterJLPT('all');
                    }}
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    {strings.admin.clearFilters}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mood board manager */}
        <MoodBoardManager
          searchQuery={searchQuery}
          filterJLPT={filterJLPT}
        />

        {/* Statistics cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📊</div>
              <div>
                <div className="text-sm text-muted-foreground">{strings.admin.totalBoards}</div>
                <div className="text-xl font-bold text-foreground">
                  {loading ? '...' : stats.totalBoards}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🎯</div>
              <div>
                <div className="text-sm text-muted-foreground">{strings.admin.activeBoards}</div>
                <div className="text-xl font-bold text-foreground">
                  {loading ? '...' : stats.activeBoards}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📈</div>
              <div>
                <div className="text-sm text-muted-foreground">{strings.admin.mostPopular}</div>
                <div className="text-sm font-medium text-foreground">
                  {loading ? strings.admin.loading : stats.mostPopular}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🕒</div>
              <div>
                <div className="text-sm text-muted-foreground">{strings.admin.lastUpdated}</div>
                <div className="text-sm font-medium text-foreground">
                  {loading ? strings.admin.calculating : stats.lastUpdated}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Generation Modal */}
        <GenerateKanjiMoodboardModal
          isOpen={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          onGenerated={handleGeneratedMoodboard}
        />
      </div>
    </AdminLayout>
  );
}
