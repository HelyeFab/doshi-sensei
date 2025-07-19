'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMoodBoards } from '@/hooks/useMoodBoards';
import { getAllProgress } from '@/utils/moodBoardProgress';
import { PageHeader } from '@/components/PageHeader';
import MoodBoardCard from '@/components/kanji-moods/MoodBoardCard';
import { MoodBoard, MoodBoardsProgress } from '@/types/moodBoard';
import { Search, Filter, X } from 'lucide-react';

export default function KanjiMoodsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { moodBoards, loading } = useMoodBoards();
  const [progress, setProgress] = useState<MoodBoardsProgress>({});

  // Initialize state from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedJLPT, setSelectedJLPT] = useState<'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'>(
    (searchParams.get('jlpt') as any) || 'all'
  );
  const [showCompleted, setShowCompleted] = useState(
    searchParams.get('completed') !== 'false'
  );
  const [showFilters, setShowFilters] = useState(false);
  const [showQuickFilters, setShowQuickFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'title' | 'progress' | 'kanji'>('title');

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedJLPT !== 'all') params.set('jlpt', selectedJLPT);
    if (!showCompleted) params.set('completed', 'false');

    const newUrl = params.toString() ? `?${params.toString()}` : '/kanji-moods';
    router.replace(newUrl, { scroll: false });
  }, [searchQuery, selectedJLPT, showCompleted, router]);

  useEffect(() => {
    // Load progress data
    const loadProgress = () => {
      try {
        const allProgress = getAllProgress();
        setProgress(allProgress);
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    };

    loadProgress();
  }, []);

  // Filter mood boards based on search and filters
  const filteredBoards = useMemo(() => {
    let boards = moodBoards.filter(board => board.isActive !== false);

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      boards = boards.filter(board =>
        board.title.toLowerCase().includes(query) ||
        board.description.toLowerCase().includes(query) ||
        board.kanji.some(k =>
          k.char.includes(query) ||
          k.meaning.toLowerCase().includes(query)
        )
      );
    }

    // Apply JLPT filter
    if (selectedJLPT !== 'all') {
      boards = boards.filter(board => board.jlpt === selectedJLPT);
    }

    // Apply completion filter
    if (!showCompleted) {
      boards = boards.filter(board =>
        progress[board.id]?.progressPercentage !== 100
      );
    }

    // Sort boards
    boards.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'progress':
          const progressA = progress[a.id]?.progressPercentage || 0;
          const progressB = progress[b.id]?.progressPercentage || 0;
          return progressB - progressA;
        case 'kanji':
          return a.kanji.length - b.kanji.length;
        default:
          return 0;
      }
    });

    return boards;
  }, [moodBoards, searchQuery, selectedJLPT, showCompleted, progress, sortBy]);

  const completedBoards = moodBoards
    .filter(board => board.isActive !== false)
    .filter(board => progress[board.id]?.progressPercentage === 100)
    .length;

  const handleBoardClick = (boardId: string) => {
    router.push(`/kanji-moods/${boardId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Virtual Companion Section - 1/6th of screen height */}
        <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

          {/* Gradient to White Fade */}
          <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />

          {/* Virtual Companion Button positioned within this section */}
        </div>

        <div className="container mx-auto px-4 pb-20">
          <PageHeader icon="/flat-icons/ui/kanji.svg" showBackButton={true} helpKey="kanji-moods" />
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-muted-foreground">Loading mood boards...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />

        {/* Virtual Companion Button positioned within this section */}
      </div>

      <div className="container mx-auto px-4 pb-24 md:pb-8">
        <div className="mb-16 md:mb-24">
          <PageHeader icon="/flat-icons/ui/kanji.svg" showBackButton={true} helpKey="kanji-moods" />
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Search boards, kanji, or meanings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Button - Mobile */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {(selectedJLPT !== 'all' || !showCompleted) && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {[selectedJLPT !== 'all' && 1, !showCompleted && 1].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Desktop Filters */}
            <div className="hidden sm:flex items-center gap-3">
              {/* JLPT Filter */}
              <select
                value={selectedJLPT}
                onChange={(e) => setSelectedJLPT(e.target.value as any)}
                className="px-3 py-2.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Levels</option>
                <option value="N5">JLPT N5</option>
                <option value="N4">JLPT N4</option>
                <option value="N3">JLPT N3</option>
                <option value="N2">JLPT N2</option>
                <option value="N1">JLPT N1</option>
              </select>

              {/* Completion Filter */}
              <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card cursor-pointer hover:bg-muted transition-colors">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  className="w-4 h-4 text-primary rounded focus:ring-primary border-border"
                />
                <span className="text-sm text-foreground">Show Completed</span>
              </label>
            </div>
          </div>

          {/* Mobile Filter Panel */}
          {showFilters && (
            <div className="sm:hidden mt-3 p-4 rounded-lg border border-border bg-card">
              <div className="space-y-4">
                {/* JLPT Filter */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">JLPT Level</label>
                  <select
                    value={selectedJLPT}
                    onChange={(e) => setSelectedJLPT(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="all">All Levels</option>
                    <option value="N5">JLPT N5</option>
                    <option value="N4">JLPT N4</option>
                    <option value="N3">JLPT N3</option>
                    <option value="N2">JLPT N2</option>
                    <option value="N1">JLPT N1</option>
                  </select>
                </div>

                {/* Completion Filter */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="w-4 h-4 text-primary rounded focus:ring-primary border-border"
                  />
                  <span className="text-sm text-foreground">Show Completed Boards</span>
                </label>

                {/* Clear Filters */}
                {(selectedJLPT !== 'all' || !showCompleted || searchQuery) && (
                  <button
                    onClick={() => {
                      setSelectedJLPT('all');
                      setShowCompleted(true);
                      setSearchQuery('');
                      setShowFilters(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Active Filters Display */}
          {(searchQuery || selectedJLPT !== 'all' || !showCompleted) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                >
                  <span>Search: "{searchQuery}"</span>
                  <X className="w-3 h-3" />
                </button>
              )}
              {selectedJLPT !== 'all' && (
                <button
                  onClick={() => setSelectedJLPT('all')}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                >
                  <span>{selectedJLPT}</span>
                  <X className="w-3 h-3" />
                </button>
              )}
              {!showCompleted && (
                <button
                  onClick={() => setShowCompleted(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                >
                  <span>Hide Completed</span>
                  <X className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedJLPT('all');
                  setShowCompleted(true);
                }}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Quick Filter Pills */}
          <div className="mt-4">
            {/* Desktop Quick Filters */}
            <div className="hidden sm:flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Quick filters:</span>
              <button
                onClick={() => {
                  setSelectedJLPT('N5');
                  setShowCompleted(true);
                }}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedJLPT === 'N5' && showCompleted
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                Beginner (N5)
              </button>
              <button
                onClick={() => {
                  setShowCompleted(false);
                  setSelectedJLPT('all');
                }}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  !showCompleted && selectedJLPT === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                In Progress
              </button>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedJLPT('all');
                  setShowCompleted(true);
                }}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  !searchQuery && selectedJLPT === 'all' && showCompleted
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                All Boards
              </button>
            </div>

            {/* Mobile Quick Filters Dropdown */}
            <div className="sm:hidden">
              <button
                onClick={() => setShowQuickFilters(!showQuickFilters)}
                className="flex items-center justify-between w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
              >
                <span className="text-sm">Quick Filters</span>
                <svg
                  className={`w-4 h-4 transform transition-transform ${showQuickFilters ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showQuickFilters && (
                <div className="mt-2 p-4 rounded-lg border border-border bg-card">
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setSelectedJLPT('N5');
                        setShowCompleted(true);
                        setShowQuickFilters(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedJLPT === 'N5' && showCompleted
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      Beginner (N5)
                    </button>
                    <button
                      onClick={() => {
                        setShowCompleted(false);
                        setSelectedJLPT('all');
                        setShowQuickFilters(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        !showCompleted && selectedJLPT === 'all'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedJLPT('all');
                        setShowCompleted(true);
                        setShowQuickFilters(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        !searchQuery && selectedJLPT === 'all' && showCompleted
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      All Boards
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hero Section */}
      <div className="mb-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-6xl mb-4">🗺️</div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Learn Kanji by Theme
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Discover kanji organized by meaningful themes and contexts.
            Each mood board contains related kanji that tell a story together,
            making them easier to remember and understand.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <div className="bg-card rounded-lg p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Your Progress</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{filteredBoards.length}</div>
              <div className="text-sm text-muted-foreground">Showing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedBoards}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {moodBoards.filter(b => b.isActive !== false).reduce((sum, board) => sum + board.kanji.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Kanji</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Object.values(progress).reduce((sum, p) => sum + p.learnedKanji.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Learned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mood Boards Grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-foreground">
            {searchQuery || selectedJLPT !== 'all' || !showCompleted
              ? `Found ${filteredBoards.length} board${filteredBoards.length !== 1 ? 's' : ''}`
              : 'Available Mood Boards'
            }
          </h3>
          {filteredBoards.length > 0 && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {filteredBoards.length} of {moodBoards.filter(b => b.isActive !== false).length} boards
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="title">Sort: A-Z</option>
                <option value="progress">Sort: Progress</option>
                <option value="kanji">Sort: Kanji Count</option>
              </select>
            </div>
          )}
        </div>

        {filteredBoards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoards.map((board) => (
              <MoodBoardCard
                key={board.id}
                board={board}
                progress={progress[board.id]}
                onClick={handleBoardClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">{searchQuery || selectedJLPT !== 'all' || !showCompleted ? '🔍' : '📚'}</div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchQuery || selectedJLPT !== 'all' || !showCompleted
                ? 'No boards match your filters'
                : 'No mood boards available'
              }
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedJLPT !== 'all' || !showCompleted
                ? 'Try adjusting your search or filters'
                : 'Mood boards are being prepared. Check back soon!'
              }
            </p>
            {(searchQuery || selectedJLPT !== 'all' || !showCompleted) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedJLPT('all');
                  setShowCompleted(true);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Getting Started Guide */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <span>🚀</span>
            How to Use Mood Boards
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Choose a Theme</h4>
                  <p className="text-sm text-muted-foreground">
                    Pick a mood board that interests you - Nature, Daily Life, or Numbers
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Study Each Kanji</h4>
                  <p className="text-sm text-muted-foreground">
                    Tap kanji cards to see readings and examples. Find connections between them.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Mark as Learned</h4>
                  <p className="text-sm text-muted-foreground">
                    Click the circle button when you've mastered a kanji
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Complete the Board</h4>
                  <p className="text-sm text-muted-foreground">
                    Learn all 5 kanji to complete the theme and unlock achievements
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
