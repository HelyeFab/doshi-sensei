'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMoodBoards } from '@/hooks/useMoodBoards';
import { getAllProgress } from '@/utils/moodBoardProgress';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import MoodBoardCard from '@/components/kanji-moods/MoodBoardCard';
import { MoodBoard, MoodBoardsProgress } from '@/types/moodBoard';
import { Search, Filter, X } from 'lucide-react';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';
import { LoadingHourglassPage } from '@/components/ui/LoadingHourglass';

export default function KanjiMoodsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { moodBoards, loading } = useMoodBoards();
  const [progress, setProgress] = useState<MoodBoardsProgress>({});
  const [showInstructions, setShowInstructions] = useState(false);

  // Initialize state from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedJLPT, setSelectedJLPT] = useState<'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'>(
    (searchParams.get('jlpt') as any) || 'all'
  );
  const [showCompleted, setShowCompleted] = useState(
    searchParams.get('completed') !== 'false'
  );
  const [showFilters, setShowFilters] = useState(false);
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
        <SmartPageHeader title="Kanji Moods" />
        <div className="container mx-auto px-4 pb-20">
          <LoadingHourglassPage text="Loading mood boards..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SmartPageHeader title="Kanji Moods" />
      
      <MobileAwareContainer className="container mx-auto px-4">
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
            
            {/* How to Use Button */}
            <div className="mt-6">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>How to use Kanji Moods</span>
                <svg
                  className={`w-4 h-4 transition-transform ${
                    showInstructions ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showInstructions && (
                <div className="mt-4 p-5 bg-card border border-border rounded-lg text-left max-w-3xl mx-auto">
                  <h3 className="text-lg font-semibold text-foreground mb-4">🗺️ Master Kanji Through Thematic Learning</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">🎯 What are Mood Boards?</h4>
                      <p className="text-muted-foreground text-sm">
                        Mood boards are curated collections of 5-10 related kanji organized by theme, emotion, or context. 
                        Unlike traditional JLPT levels, mood boards group kanji that naturally connect - like "Nature" (山 mountain, 
                        川 river, 森 forest) or "Emotions" (喜 joy, 怒 anger, 哀 sorrow). This thematic approach helps your brain 
                        create meaningful associations, making kanji easier to remember.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-2">🔍 Browse & Discover</h4>
                      <p className="text-muted-foreground text-sm">
                        Use filters to find mood boards by JLPT level, completion status, or search for specific themes. 
                        Each board shows your progress percentage and the number of kanji you've learned. Boards are 
                        color-coded by difficulty: green (N5 beginner) to red (N1 advanced).
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-foreground mb-2">📚 Study Process</h4>
                        <ol className="text-muted-foreground text-sm space-y-2">
                          <li>1. Click a mood board to enter the study view</li>
                          <li>2. Tap any kanji card to flip and see readings</li>
                          <li>3. View stroke order and example words</li>
                          <li>4. Click the circle to mark as learned</li>
                          <li>5. Complete all kanji to finish the board</li>
                        </ol>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-foreground mb-2">🏆 Track Progress</h4>
                        <p className="text-muted-foreground text-sm">
                          Your progress is saved locally and persists between sessions. The progress bar 
                          shows completion percentage, and learned kanji appear with a checkmark. 
                          Complete boards earn achievements and contribute to your overall kanji mastery stats.
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-2">🧠 Learning Strategy</h4>
                      <p className="text-muted-foreground text-sm">
                        <strong>Context is King:</strong> Study all kanji in a mood board together, not individually. 
                        Notice patterns - kanji about water often contain 氵, body parts contain 月, and actions contain 手. 
                        Create mental stories linking the kanji: "I climbed the 山 (mountain), crossed the 川 (river), 
                        and rested in the 森 (forest)." This narrative approach dramatically improves retention.
                      </p>
                    </div>

                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium flex items-center gap-2">
                        <span className="text-lg">⚠️</span>
                        <span>
                          <strong>Important:</strong> Don't rush through boards! Spend 5-10 minutes per kanji, 
                          understanding not just the character but its role in the theme. Quality beats quantity - 
                          mastering one board deeply is better than skimming through five.
                        </span>
                      </p>
                    </div>

                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <p className="text-sm text-primary font-medium">
                        💡 <strong>Pro Tips:</strong>
                      </p>
                      <ul className="mt-1 ml-5 text-sm text-primary list-disc">
                        <li>Start with boards matching your current JLPT level</li>
                        <li>Complete one full board before starting another</li>
                        <li>Review completed boards weekly to maintain memory</li>
                        <li>Use the search to find boards matching your interests</li>
                        <li>Practice writing the kanji while studying for better retention</li>
                        <li>Progress syncs locally - no account needed to track learning</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
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
                {/* Quick Filters */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Quick Filters</label>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setSelectedJLPT('N5');
                        setShowCompleted(true);
                      }}
                      className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
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
                      className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
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
                      className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                        !searchQuery && selectedJLPT === 'all' && showCompleted
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      All Boards
                    </button>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <label className="block text-sm font-medium text-foreground mb-2">Custom Filters</label>
                  
                  {/* JLPT Filter */}
                  <div className="mb-3">
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
                </div>

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

          {/* Desktop Quick Filter Pills */}
          <div className="hidden sm:flex flex-wrap gap-2 mt-4">
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

      </MobileAwareContainer>
    </div>
  );
}
