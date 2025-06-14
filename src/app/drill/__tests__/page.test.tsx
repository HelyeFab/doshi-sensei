import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DrillPage from '../page';
import { getCommonVerbs } from '@/utils/api';
import { ConjugationEngine } from '@/utils/conjugation';

// Mock the API
jest.mock('@/utils/api', () => ({
  getCommonVerbs: jest.fn(),
}));

// Mock the conjugation engine
jest.mock('@/utils/conjugation', () => ({
  ConjugationEngine: {
    conjugate: jest.fn(),
    getConjugationRule: jest.fn(),
  },
  getRandomConjugationForm: jest.fn(),
  generateQuestionStem: jest.fn(),
}));

// Mock PageHeader component
jest.mock('@/components/PageHeader', () => {
  return function MockPageHeader({ title }: { title: string }) {
    return <h1>{title}</h1>;
  };
});

const mockGetCommonVerbs = getCommonVerbs as jest.MockedFunction<typeof getCommonVerbs>;
const mockConjugationEngine = ConjugationEngine as jest.Mocked<typeof ConjugationEngine>;

describe('DrillPage', () => {
  const mockWords = [
    {
      id: 'word1',
      kanji: '食べる',
      kana: 'たべる',
      romaji: 'taberu',
      meaning: 'to eat',
      type: 'Ichidan' as const,
      jlpt: 'N5' as const,
    },
    {
      id: 'word2',
      kanji: '飲む',
      kana: 'のむ',
      romaji: 'nomu',
      meaning: 'to drink',
      type: 'Godan' as const,
      jlpt: 'N5' as const,
    },
  ];

  const mockConjugations = {
    present: '食べる',
    past: '食べた',
    negative: '食べない',
    pastNegative: '食べなかった',
    polite: '食べます',
    politePast: '食べました',
    teForm: '食べて',
    // ... other forms would be here in real implementation
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCommonVerbs.mockResolvedValue(mockWords);
    mockConjugationEngine.conjugate.mockReturnValue(mockConjugations as any);
    mockConjugationEngine.getConjugationRule.mockReturnValue('Remove る, add た');

    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  test('should render loading state initially', () => {
    render(<DrillPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('should render drill title', async () => {
    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByText('Drill Mode')).toBeInTheDocument();
    });
  });

  test('should render start screen when game not started', async () => {
    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByText('Ready to practice?')).toBeInTheDocument();
      expect(screen.getByText(/Test your knowledge with \d+ conjugation questions/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /drill mode/i })).toBeInTheDocument();
    });
  });

  test('should start game when start button is clicked', async () => {
    const user = userEvent.setup();
    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /drill mode/i })).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /drill mode/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('Choose the correct conjugation:')).toBeInTheDocument();
    });
  });

  test('should display question after starting game', async () => {
    const user = userEvent.setup();
    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /drill mode/i })).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /drill mode/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('食べる')).toBeInTheDocument();
      expect(screen.getByText('(たべる)')).toBeInTheDocument();
      expect(screen.getByText('"to eat"')).toBeInTheDocument();
    });
  });

  test('should display score tracker when game started', async () => {
    const user = userEvent.setup();
    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /drill mode/i })).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /drill mode/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/Score: 0\/\d+/)).toBeInTheDocument();
      expect(screen.getByText(/1 of \d+/)).toBeInTheDocument();
    });
  });

  test('should handle answer selection', async () => {
    const user = userEvent.setup();
    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /drill mode/i })).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /drill mode/i });
    await user.click(startButton);

    await waitFor(() => {
      const options = screen.getAllByRole('button');
      const answerOptions = options.filter(button =>
        !button.textContent?.includes('Show Rules') &&
        !button.textContent?.includes('Hide Rules') &&
        button.textContent !== 'Drill Mode'
      );
      expect(answerOptions.length).toBeGreaterThan(0);
    });
  });

  test('should show correct/incorrect feedback after answer selection', async () => {
    const user = userEvent.setup();
    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /drill mode/i })).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /drill mode/i });
    await user.click(startButton);

    await waitFor(() => {
      const options = screen.getAllByRole('button');
      const answerOptions = options.filter(button =>
        !button.textContent?.includes('Show Rules') &&
        !button.textContent?.includes('Hide Rules') &&
        button.textContent !== 'Drill Mode'
      );

      if (answerOptions.length > 0) {
        return user.click(answerOptions[0]);
      }
    });

    await waitFor(() => {
      const correctText = screen.queryByText('Correct!');
      const incorrectText = screen.queryByText('Incorrect. Try again!');
      expect(correctText || incorrectText).toBeInTheDocument();
    });
  });

  test('should toggle rules display', async () => {
    const user = userEvent.setup();
    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /drill mode/i })).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /drill mode/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('Show Rules')).toBeInTheDocument();
    });

    const showRulesButton = screen.getByText('Show Rules');
    await user.click(showRulesButton);

    await waitFor(() => {
      expect(screen.getByText('Hide Rules')).toBeInTheDocument();
      expect(mockConjugationEngine.getConjugationRule).toHaveBeenCalled();
    });
  });

  test('should show next question button after answering', async () => {
    const user = userEvent.setup();
    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /drill mode/i })).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /drill mode/i });
    await user.click(startButton);

    await waitFor(() => {
      const options = screen.getAllByRole('button');
      const answerOptions = options.filter(button =>
        !button.textContent?.includes('Show Rules') &&
        !button.textContent?.includes('Hide Rules') &&
        button.textContent !== 'Drill Mode'
      );

      if (answerOptions.length > 0) {
        return user.click(answerOptions[0]);
      }
    });

    await waitFor(() => {
      const nextButton = screen.queryByText('Next Question') || screen.queryByText('Success!');
      expect(nextButton).toBeInTheDocument();
    });
  });

  test('should show results screen when drill is finished', async () => {
    // Mock a single question scenario for easier testing
    mockGetCommonVerbs.mockResolvedValue([mockWords[0]]);

    const user = userEvent.setup();
    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /drill mode/i })).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /drill mode/i });
    await user.click(startButton);

    await waitFor(() => {
      const options = screen.getAllByRole('button');
      const answerOptions = options.filter(button =>
        !button.textContent?.includes('Show Rules') &&
        !button.textContent?.includes('Hide Rules') &&
        button.textContent !== 'Drill Mode'
      );

      if (answerOptions.length > 0) {
        return user.click(answerOptions[0]);
      }
    });

    await waitFor(() => {
      const nextButton = screen.getByText('Success!');
      return user.click(nextButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText(/\d+\/\d+/)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  test('should restart drill when try again is clicked', async () => {
    // Mock a single question scenario
    mockGetCommonVerbs.mockResolvedValue([mockWords[0]]);

    const user = userEvent.setup();
    render(<DrillPage />);

    // Complete the drill first
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /drill mode/i })).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /drill mode/i });
    await user.click(startButton);

    await waitFor(() => {
      const options = screen.getAllByRole('button');
      const answerOptions = options.filter(button =>
        !button.textContent?.includes('Show Rules') &&
        !button.textContent?.includes('Hide Rules') &&
        button.textContent !== 'Drill Mode'
      );

      if (answerOptions.length > 0) {
        return user.click(answerOptions[0]);
      }
    });

    await waitFor(() => {
      const nextButton = screen.getByText('Success!');
      return user.click(nextButton);
    });

    await waitFor(() => {
      const tryAgainButton = screen.getByText('Try Again');
      return user.click(tryAgainButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Ready to practice?')).toBeInTheDocument();
    });
  });

  test('should handle API errors gracefully', async () => {
    mockGetCommonVerbs.mockRejectedValue(new Error('API Error'));

    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load data. Please try again.')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  test('should retry loading on error', async () => {
    mockGetCommonVerbs.mockRejectedValueOnce(new Error('API Error'));
    mockGetCommonVerbs.mockResolvedValueOnce(mockWords);

    const user = userEvent.setup();
    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Ready to practice?')).toBeInTheDocument();
    });
  });

  test('should handle stored drill word from session storage', async () => {
    const storedWord = JSON.stringify(mockWords[0]);
    (window.sessionStorage.getItem as jest.Mock).mockReturnValue(storedWord);

    render(<DrillPage />);

    await waitFor(() => {
      expect(window.sessionStorage.getItem).toHaveBeenCalledWith('drillWord');
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('drillWord');
    });
  });

  test('should display correct conjugation form in question', async () => {
    const user = userEvent.setup();
    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /drill mode/i })).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /drill mode/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/form:/)).toBeInTheDocument();
    });
  });

  test('should show question stem with question mark', async () => {
    const user = userEvent.setup();
    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /drill mode/i })).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /drill mode/i });
    await user.click(startButton);

    await waitFor(() => {
      const questionStem = screen.getByText(/？/);
      expect(questionStem).toBeInTheDocument();
    });
  });

  test('should apply correct styling for answer options', async () => {
    const user = userEvent.setup();
    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /drill mode/i })).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /drill mode/i });
    await user.click(startButton);

    await waitFor(() => {
      const options = screen.getAllByRole('button');
      const answerOptions = options.filter(button =>
        !button.textContent?.includes('Show Rules') &&
        !button.textContent?.includes('Hide Rules') &&
        button.textContent !== 'Drill Mode'
      );

      if (answerOptions.length > 0) {
        expect(answerOptions[0]).toHaveClass('p-4 rounded-lg border');
      }
    });
  });

  test('should have proper accessibility attributes', async () => {
    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const startButton = screen.getByRole('button', { name: /drill mode/i });
    await user.click(startButton);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});

describe('DrillPage Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle empty word list', async () => {
    mockGetCommonVerbs.mockResolvedValue([]);

    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load data. Please try again.')).toBeInTheDocument();
    });
  });

  test('should handle malformed session storage data', async () => {
    (window.sessionStorage.getItem as jest.Mock).mockReturnValue('invalid json');
    mockGetCommonVerbs.mockResolvedValue([]);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<DrillPage />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error parsing stored word:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  test('should generate different distractors for answers', async () => {
    const user = userEvent.setup();
    mockGetCommonVerbs.mockResolvedValue([
      {
        id: 'word1',
        kanji: '食べる',
        kana: 'たべる',
        romaji: 'taberu',
        meaning: 'to eat',
        type: 'Ichidan' as const,
        jlpt: 'N5' as const,
      }
    ]);

    render(<DrillPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /drill mode/i })).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /drill mode/i });
    await user.click(startButton);

    await waitFor(() => {
      const options = screen.getAllByRole('button');
      const answerOptions = options.filter(button =>
        !button.textContent?.includes('Show Rules') &&
        !button.textContent?.includes('Hide Rules') &&
        button.textContent !== 'Drill Mode'
      );

      expect(answerOptions.length).toBeGreaterThanOrEqual(2);
    });
  });
});
