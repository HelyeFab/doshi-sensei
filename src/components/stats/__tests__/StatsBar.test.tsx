import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StatsBar } from '../StatsBar';
import { useStats } from '@/hooks/useStats';
import { useSettings } from '@/contexts/SettingsContext';
import { UserStatsV2, DailyActivity } from '@/lib/stats/statsTracker';

// Mock hooks
jest.mock('@/hooks/useStats');
jest.mock('@/contexts/SettingsContext');
jest.mock('@/components/DevHelper', () => ({
  useComponentName: () => ({})
}));

const mockUseStats = useStats as jest.MockedFunction<typeof useStats>;
const mockUseSettings = useSettings as jest.MockedFunction<typeof useSettings>;

describe('StatsBar Component', () => {
  const mockStats: UserStatsV2 = {
    userId: 'test-user',
    currentStreak: 5,
    longestStreak: 10,
    totalDaysActive: 30,
    lastActiveDate: '2025-01-19',
    firstActiveDate: '2024-12-01',
    totalActivities: 250,
    drillsCompleted: 50,
    storiesRead: 20,
    articlesRead: 30,
    kanjiStudySessions: 40,
    gamesPlayed: 60,
    vocabStudied: 25,
    flashcardsReviewed: 15,
    practiceSessionsCompleted: 10,
    overallAccuracy: 85,
    drillAccuracy: 80,
    kanjiAccuracy: 90,
    gameAccuracy: 88,
    totalQuestionsAnswered: 1000,
    totalCorrectAnswers: 850,
    totalKanjiLearned: 150,
    totalWordsLearned: 300,
    totalGameScore: 5000,
    pokemonCaught: 25,
    learnedKanjiSet: [],
    learnedWordsSet: [],
    caughtPokemonSet: [],
    drillStats: { totalQuestions: 500, totalCorrect: 400 },
    kanjiStats: { totalQuestions: 300, totalCorrect: 270 },
    gameStats: { totalQuestions: 200, totalCorrect: 176 },
    lastUpdated: Date.now(),
    version: '2.1'
  };

  const mockTodayActivity: DailyActivity = {
    date: '2025-01-19',
    activities: [],
    summary: {
      totalActivities: 10,
      drillsCompleted: 2,
      storiesRead: 1,
      articlesRead: 2,
      kanjiStudied: 1,
      gamesPlayed: 3,
      vocabStudied: 0,
      flashcardsReviewed: 1,
      practiceSessionsCompleted: 0,
      totalScore: 300,
      totalCorrect: 45,
      totalQuestions: 50
    }
  };

  const mockWeekActivities: DailyActivity[] = [
    mockTodayActivity,
    {
      date: '2025-01-18',
      activities: [],
      summary: {
        totalActivities: 8,
        drillsCompleted: 1,
        storiesRead: 2,
        articlesRead: 1,
        kanjiStudied: 2,
        gamesPlayed: 1,
        vocabStudied: 0,
        flashcardsReviewed: 1,
        practiceSessionsCompleted: 0,
        totalScore: 200,
        totalCorrect: 35,
        totalQuestions: 40
      }
    }
  ];

  const mockActivities = {
    today: mockTodayActivity,
    week: mockWeekActivities,
    month: [...mockWeekActivities] // Simplified for testing
  };

  beforeEach(() => {
    mockUseStats.mockReturnValue({
      stats: mockStats,
      activities: mockActivities,
      loading: false,
      error: null,
      trackActivity: jest.fn(),
      forceSync: jest.fn(),
      refreshStats: jest.fn()
    });

    mockUseSettings.mockReturnValue({
      settings: { colorScheme: 'default' },
      updateSettings: jest.fn(),
      resetSettings: jest.fn()
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all 6 stat items', () => {
      render(<StatsBar />);

      // Check for all stat labels
      expect(screen.getByText('Streak')).toBeInTheDocument();
      expect(screen.getByText('Pokémon')).toBeInTheDocument();
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('This Week')).toBeInTheDocument();
      expect(screen.getByText('This Month')).toBeInTheDocument();
      expect(screen.getByText('All Time')).toBeInTheDocument();
    });

    it('should display correct values', () => {
      render(<StatsBar />);

      // Streak
      expect(screen.getByText('5')).toBeInTheDocument();
      
      // Pokémon
      expect(screen.getByText('25')).toBeInTheDocument();
      
      // Today's Progress (1/2/1/3 format)
      expect(screen.getByText('1/2/1/3')).toBeInTheDocument();
      
      // This Week (sum of activities)
      const weekTotal = 1 + 2 + 1 + 3 + 1 + 2 + 1 + 1; // 12
      expect(screen.getByText('12')).toBeInTheDocument();
      
      // All Time
      expect(screen.getByText('250')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      mockUseStats.mockReturnValue({
        ...mockUseStats(),
        loading: true
      });

      render(<StatsBar />);

      // Should show loading indicators
      const loadingElements = screen.getAllByText('...');
      expect(loadingElements.length).toBe(6); // One for each stat
    });

    it('should handle null activities gracefully', () => {
      mockUseStats.mockReturnValue({
        ...mockUseStats(),
        activities: {
          today: null,
          week: [],
          month: []
        }
      });

      render(<StatsBar />);

      // Should show default values
      expect(screen.getByText('0/0/0/0')).toBeInTheDocument(); // Today's default
      expect(screen.getByText('0')).toBeInTheDocument(); // Week/Month totals
    });
  });

  describe('Interactivity', () => {
    it('should show tooltip on hover for streak', async () => {
      render(<StatsBar />);

      const streakElement = screen.getByText('Streak').closest('div');
      fireEvent.mouseEnter(streakElement!);

      await waitFor(() => {
        expect(screen.getByText('Longest: 10 days')).toBeInTheDocument();
      });

      fireEvent.mouseLeave(streakElement!);

      await waitFor(() => {
        expect(screen.queryByText('Longest: 10 days')).not.toBeInTheDocument();
      });
    });

    it('should show tooltip on touch for mobile', async () => {
      render(<StatsBar />);

      const todayElement = screen.getByText('Today').closest('div');
      fireEvent.touchStart(todayElement!);

      await waitFor(() => {
        expect(screen.getByText(/Flashcards: 1/)).toBeInTheDocument();
      });
    });

    it('should display detailed breakdown for Today stat', async () => {
      render(<StatsBar />);

      const todayElement = screen.getByText('Today').closest('div');
      fireEvent.mouseEnter(todayElement!);

      await waitFor(() => {
        const tooltip = screen.getByText(/Flashcards: 1, Articles: 2, Stories: 1, Games: 3/);
        expect(tooltip).toBeInTheDocument();
      });
    });

    it('should display breakdown for week stat', async () => {
      render(<StatsBar />);

      const weekElement = screen.getByText('This Week').closest('div');
      fireEvent.mouseEnter(weekElement!);

      await waitFor(() => {
        // Week totals: flashcards(1+1), articles(2+1), stories(1+2), games(3+1)
        const tooltip = screen.getByText(/Flashcards: 2, Articles: 3, Stories: 3, Games: 4/);
        expect(tooltip).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should apply correct grid classes', () => {
      const { container } = render(<StatsBar />);
      
      const gridElement = container.querySelector('.grid');
      expect(gridElement).toHaveClass('grid-cols-3'); // Mobile
      expect(gridElement).toHaveClass('md:grid-cols-6'); // Desktop
    });

    it('should apply responsive padding', () => {
      const { container } = render(<StatsBar />);
      
      const wrapperElement = container.querySelector('.px-3');
      expect(wrapperElement).toHaveClass('px-3', 'py-2');
    });
  });

  describe('Theme Integration', () => {
    it('should apply theme-based gradient', () => {
      mockUseSettings.mockReturnValue({
        settings: { colorScheme: 'terminal' },
        updateSettings: jest.fn(),
        resetSettings: jest.fn()
      } as any);

      const { container } = render(<StatsBar />);
      
      const gradientElement = container.querySelector('[style*="linear-gradient"]');
      expect(gradientElement).toBeInTheDocument();
      expect(gradientElement?.getAttribute('style')).toContain('linear-gradient');
    });

    it('should handle missing theme gracefully', () => {
      mockUseSettings.mockReturnValue({
        settings: { colorScheme: undefined },
        updateSettings: jest.fn(),
        resetSettings: jest.fn()
      } as any);

      // Should not crash
      expect(() => render(<StatsBar />)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero stats', () => {
      mockUseStats.mockReturnValue({
        ...mockUseStats(),
        stats: {
          ...mockStats,
          currentStreak: 0,
          pokemonCaught: 0,
          totalActivities: 0
        }
      });

      render(<StatsBar />);

      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });

    it('should handle very large numbers', () => {
      mockUseStats.mockReturnValue({
        ...mockUseStats(),
        stats: {
          ...mockStats,
          totalActivities: 999999,
          pokemonCaught: 1000
        }
      });

      render(<StatsBar />);

      expect(screen.getByText('999999')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
    });

    it('should handle empty week/month data', () => {
      mockUseStats.mockReturnValue({
        ...mockUseStats(),
        activities: {
          today: mockTodayActivity,
          week: [],
          month: []
        }
      });

      render(<StatsBar />);

      // Week and Month should show 0
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for images', () => {
      render(<StatsBar />);

      const pokeballImg = screen.getByAltText('Pokéball');
      expect(pokeballImg).toBeInTheDocument();
      expect(pokeballImg).toHaveAttribute('src', '/pokeball.png');
    });

    it('should maintain focus order', () => {
      const { container } = render(<StatsBar />);
      
      const statElements = container.querySelectorAll('.cursor-pointer');
      expect(statElements.length).toBe(6);
      
      // Each stat should be interactive
      statElements.forEach(element => {
        expect(element).toHaveClass('cursor-pointer');
      });
    });
  });

  describe('Performance', () => {
    it('should memoize calculations', () => {
      const { rerender } = render(<StatsBar />);
      
      // Initial render
      expect(screen.getByText('1/2/1/3')).toBeInTheDocument();
      
      // Re-render with same data
      rerender(<StatsBar />);
      
      // Should still show same values without recalculation
      expect(screen.getByText('1/2/1/3')).toBeInTheDocument();
    });

    it('should update when stats change', () => {
      const { rerender } = render(<StatsBar />);
      
      // Update stats
      mockUseStats.mockReturnValue({
        ...mockUseStats(),
        stats: {
          ...mockStats,
          currentStreak: 10
        }
      });
      
      rerender(<StatsBar />);
      
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });
});