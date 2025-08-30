/**
 * Review Hub End-to-End Test Suite
 * Tests complete user workflows from UI to database
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReviewHubClient from '@/app/review-hub/ReviewHubClient';
import { AuthContext } from '@/contexts/AuthContext';
import { LanguageContext } from '@/contexts/LanguageContext';
import { getUnifiedDataStore } from '../review-store/UnifiedDataStore';
import { getEventBus } from '../review-events/EventBus';
import { ReviewSource, ReviewResult, EventPriority } from '../review-events/types';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  usePathname: () => '/review-hub'
}));

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test_user', displayName: 'Test User' }
  }
}));

// Mock auth context
const mockAuthContext = {
  user: {
    uid: 'test_user',
    email: 'test@example.com',
    displayName: 'Test User'
  },
  loading: false,
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn()
};

// Mock language context
const mockLanguageContext = {
  language: 'en',
  setLanguage: jest.fn(),
  strings: {
    home: {
      greeting: 'Welcome',
      readyToPractice: 'Ready to practice?'
    },
    review: {
      correct: 'Correct',
      incorrect: 'Incorrect',
      skip: 'Skip'
    }
  }
};

describe('Review Hub E2E Tests', () => {
  let dataStore: ReturnType<typeof getUnifiedDataStore>;
  let eventBus: ReturnType<typeof getEventBus>;

  beforeEach(() => {
    // Initialize services
    dataStore = getUnifiedDataStore({ enableSync: false });
    eventBus = getEventBus({ persistEvents: false });
    
    // Clear state
    eventBus.clear();
    
    // Mock data store methods
    jest.spyOn(dataStore, 'getDueItems').mockResolvedValue({
      items: [
        {
          id: 'test_item_1',
          sourceType: ReviewSource.KANJI_MASTERY,
          content: {
            primary: '食',
            secondary: 'eat, food',
            reading: 'たべる'
          },
          contentType: 'kanji',
          scheduling: {
            dueDate: new Date()
          }
        } as any
      ],
      total: 1,
      overdue: 0,
      dueToday: 1,
      dueTomorrow: 0,
      sources: { [ReviewSource.KANJI_MASTERY]: 1 },
      nextReviewTime: new Date()
    });
    
    jest.spyOn(dataStore, 'getCompletedToday').mockResolvedValue(5);
    jest.spyOn(dataStore, 'getCurrentStreak').mockResolvedValue(7);
    jest.spyOn(dataStore, 'recordReview').mockResolvedValue({
      success: true,
      itemId: 'test_item_1',
      nextReviewDate: new Date(Date.now() + 86400000),
      interval: 2,
      easeFactor: 2.5,
      repetitions: 1,
      syncId: '1'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User Interface Flow', () => {
    it('should render review hub dashboard', async () => {
      const { container } = render(
        <AuthContext.Provider value={mockAuthContext as any}>
          <LanguageContext.Provider value={mockLanguageContext as any}>
            <ReviewHubClient />
          </LanguageContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Review Hub/i)).toBeInTheDocument();
      });

      // Check stats are displayed
      expect(screen.getByText('1')).toBeInTheDocument(); // Due items
      expect(screen.getByText('5')).toBeInTheDocument(); // Completed today
      expect(screen.getByText('7')).toBeInTheDocument(); // Streak
    });

    it('should start review session', async () => {
      render(
        <AuthContext.Provider value={mockAuthContext as any}>
          <LanguageContext.Provider value={mockLanguageContext as any}>
            <ReviewHubClient />
          </LanguageContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const startButton = screen.getByText('Start Review Session');
        expect(startButton).toBeInTheDocument();
      });

      // Click start review
      fireEvent.click(screen.getByText('Start Review Session'));

      await waitFor(() => {
        // Review session should show
        expect(screen.getByText('Review Session')).toBeInTheDocument();
        expect(screen.getByText('食')).toBeInTheDocument();
        expect(screen.getByText('eat, food')).toBeInTheDocument();
      });
    });

    it('should handle review submission', async () => {
      render(
        <AuthContext.Provider value={mockAuthContext as any}>
          <LanguageContext.Provider value={mockLanguageContext as any}>
            <ReviewHubClient />
          </LanguageContext.Provider>
        </AuthContext.Provider>
      );

      // Start review session
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Review Session'));
      });

      await waitFor(() => {
        expect(screen.getByText('食')).toBeInTheDocument();
      });

      // Submit correct answer
      fireEvent.click(screen.getByText('Correct'));

      await waitFor(() => {
        expect(dataStore.recordReview).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'test_user',
            itemId: 'test_item_1',
            result: ReviewResult.CORRECT
          })
        );
      });
    });

    it('should handle sync button', async () => {
      const syncSpy = jest.spyOn(dataStore, 'syncWithRemote').mockResolvedValue();

      render(
        <AuthContext.Provider value={mockAuthContext as any}>
          <LanguageContext.Provider value={mockLanguageContext as any}>
            <ReviewHubClient />
          </LanguageContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const syncButton = screen.getByLabelText(/Sync data/i);
        expect(syncButton).toBeInTheDocument();
      });

      // Click sync
      fireEvent.click(screen.getByLabelText(/Sync data/i));

      await waitFor(() => {
        expect(syncSpy).toHaveBeenCalledWith('test_user');
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update UI on review events', async () => {
      render(
        <AuthContext.Provider value={mockAuthContext as any}>
          <LanguageContext.Provider value={mockLanguageContext as any}>
            <ReviewHubClient />
          </LanguageContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // Initial due items
      });

      // Update mock to return no items
      jest.spyOn(dataStore, 'getDueItems').mockResolvedValue({
        items: [],
        total: 0,
        overdue: 0,
        dueToday: 0,
        dueTomorrow: 0,
        sources: {},
        nextReviewTime: undefined
      });

      // Emit review completed event
      await eventBus.emit({
        type: 'item.reviewed',
        source: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        data: {
          itemId: 'test_item_1',
          itemType: 'kanji',
          result: ReviewResult.CORRECT
        },
        priority: EventPriority.NORMAL
      });

      await waitFor(() => {
        expect(screen.getByText('All caught up!')).toBeInTheDocument();
      });
    });

    it('should show sync status', async () => {
      render(
        <AuthContext.Provider value={mockAuthContext as any}>
          <LanguageContext.Provider value={mockLanguageContext as any}>
            <ReviewHubClient />
          </LanguageContext.Provider>
        </AuthContext.Provider>
      );

      // Emit sync started
      await eventBus.emit({
        type: 'sync.started',
        source: ReviewSource.REVIEW_HUB,
        userId: 'test_user',
        data: {
          itemId: 'sync',
          itemType: 'kanji'
        },
        priority: EventPriority.NORMAL
      });

      // Emit sync completed
      await eventBus.emit({
        type: 'sync.completed',
        source: ReviewSource.REVIEW_HUB,
        userId: 'test_user',
        data: {
          itemId: 'sync',
          itemType: 'kanji'
        },
        priority: EventPriority.NORMAL
      });

      // Verify getDueItems was called again after sync
      await waitFor(() => {
        expect(dataStore.getDueItems).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when review fails', async () => {
      jest.spyOn(dataStore, 'recordReview').mockRejectedValue(
        new Error('Network error')
      );

      render(
        <AuthContext.Provider value={mockAuthContext as any}>
          <LanguageContext.Provider value={mockLanguageContext as any}>
            <ReviewHubClient />
          </LanguageContext.Provider>
        </AuthContext.Provider>
      );

      // Start review and submit
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Review Session'));
      });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Correct'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to save review/i)).toBeInTheDocument();
      });
    });

    it('should handle no user session', () => {
      render(
        <AuthContext.Provider value={{ ...mockAuthContext, user: null } as any}>
          <LanguageContext.Provider value={mockLanguageContext as any}>
            <ReviewHubClient />
          </LanguageContext.Provider>
        </AuthContext.Provider>
      );

      expect(screen.getByText(/Please sign in/i)).toBeInTheDocument();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      render(
        <AuthContext.Provider value={mockAuthContext as any}>
          <LanguageContext.Provider value={mockLanguageContext as any}>
            <ReviewHubClient />
          </LanguageContext.Provider>
        </AuthContext.Provider>
      );

      // Should show loading initially
      expect(screen.getByText(/Loading review data/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(
        <AuthContext.Provider value={mockAuthContext as any}>
          <LanguageContext.Provider value={mockLanguageContext as any}>
            <ReviewHubClient />
          </LanguageContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Sync data/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Close review session/i)).toBeInTheDocument();
      });
    });

    it('should be keyboard navigable', async () => {
      const { container } = render(
        <AuthContext.Provider value={mockAuthContext as any}>
          <LanguageContext.Provider value={mockLanguageContext as any}>
            <ReviewHubClient />
          </LanguageContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const startButton = screen.getByText('Start Review Session');
        
        // Focus should be accessible
        startButton.focus();
        expect(document.activeElement).toBe(startButton);
        
        // Should be clickable with Enter
        fireEvent.keyDown(startButton, { key: 'Enter' });
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
    });

    it('should adapt layout for mobile', async () => {
      render(
        <AuthContext.Provider value={mockAuthContext as any}>
          <LanguageContext.Provider value={mockLanguageContext as any}>
            <ReviewHubClient />
          </LanguageContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        // Mobile classes should be applied
        const container = screen.getByText('Review Hub').closest('div');
        expect(container?.className).toContain('px-4');
      });
    });
  });

  describe('Data Integration', () => {
    it('should aggregate items from multiple sources', async () => {
      jest.spyOn(dataStore, 'getDueItems').mockResolvedValue({
        items: [
          {
            id: 'kanji_1',
            sourceType: ReviewSource.KANJI_MASTERY,
            contentType: 'kanji',
            content: { primary: '食' }
          } as any,
          {
            id: 'vocab_1',
            sourceType: ReviewSource.TEXTBOOK_VOCAB,
            contentType: 'vocabulary',
            content: { primary: '食べる' }
          } as any,
          {
            id: 'card_1',
            sourceType: ReviewSource.FLASHCARDS,
            contentType: 'flashcard',
            content: { primary: 'Front', secondary: 'Back' }
          } as any
        ],
        total: 3,
        overdue: 0,
        dueToday: 3,
        dueTomorrow: 0,
        sources: {
          [ReviewSource.KANJI_MASTERY]: 1,
          [ReviewSource.TEXTBOOK_VOCAB]: 1,
          [ReviewSource.FLASHCARDS]: 1
        },
        nextReviewTime: new Date()
      });

      render(
        <AuthContext.Provider value={mockAuthContext as any}>
          <LanguageContext.Provider value={mockLanguageContext as any}>
            <ReviewHubClient />
          </LanguageContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // Total due items
        
        // Check source badges are shown
        expect(screen.getByText(/kanji/i)).toBeInTheDocument();
        expect(screen.getByText(/vocabulary/i)).toBeInTheDocument();
        expect(screen.getByText(/flashcard/i)).toBeInTheDocument();
      });
    });
  });
});