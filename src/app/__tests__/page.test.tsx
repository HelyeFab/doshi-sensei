import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../page';

// Mock Next.js navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>
  }
});

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render page header with app name', () => {
    render(<Home />);

    expect(screen.getByText('Doshi Sensei')).toBeInTheDocument();
    expect(screen.getByText('動詞 先生')).toBeInTheDocument();
    expect(screen.getByText('Master Japanese verb and adjective conjugations')).toBeInTheDocument();
  });

  test('should render all navigation cards', () => {
    render(<Home />);

    expect(screen.getByText('Practice Conjugations')).toBeInTheDocument();
    expect(screen.getByText('Drill Mode')).toBeInTheDocument();
    expect(screen.getByText('Browse Vocabulary')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('should render navigation cards with correct descriptions', () => {
    render(<Home />);

    expect(screen.getByText('Practice conjugations with detailed explanations')).toBeInTheDocument();
    expect(screen.getByText('Test your knowledge with multiple choice questions')).toBeInTheDocument();
    expect(screen.getByText('Browse and search Japanese vocabulary by JLPT level')).toBeInTheDocument();
    expect(screen.getByText('Customize your learning experience')).toBeInTheDocument();
  });

  test('should render navigation cards with correct icons', () => {
    render(<Home />);

    expect(screen.getByText('📚')).toBeInTheDocument(); // Practice
    expect(screen.getByText('⚡')).toBeInTheDocument(); // Drill
    expect(screen.getByText('📖')).toBeInTheDocument(); // Vocabulary
    expect(screen.getByText('⚙️')).toBeInTheDocument(); // Settings
  });

  test('should render links with correct hrefs', () => {
    render(<Home />);

    expect(screen.getByRole('link', { name: /practice conjugations/i })).toHaveAttribute('href', '/practice');
    expect(screen.getByRole('link', { name: /drill mode/i })).toHaveAttribute('href', '/drill');
    expect(screen.getByRole('link', { name: /browse vocabulary/i })).toHaveAttribute('href', '/vocabulary');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
  });

  test('should render stats section', () => {
    render(<Home />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Words Learned')).toBeInTheDocument();
    expect(screen.getByText('Drills Completed')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Streak')).toBeInTheDocument();
  });

  test('should render initial stat values', () => {
    render(<Home />);

    const statValues = screen.getAllByText('0');
    expect(statValues).toHaveLength(2); // Words Learned and Drills Completed
    expect(screen.getByText('0%')).toBeInTheDocument(); // Accuracy
    expect(screen.getByText('0 days')).toBeInTheDocument(); // Streak
  });

  test('should render footer', () => {
    render(<Home />);

    expect(screen.getByText('Master Japanese conjugations one verb at a time')).toBeInTheDocument();
  });

  test('should render app logo with correct character', () => {
    render(<Home />);

    expect(screen.getByText('動')).toBeInTheDocument();
  });

  test('should handle hover effects on navigation cards', async () => {
    const user = userEvent.setup();
    render(<Home />);

    const practiceCard = screen.getByRole('link', { name: /practice conjugations/i });

    await user.hover(practiceCard);

    // Check if hover classes are applied (testing implementation detail)
    expect(practiceCard).toHaveClass('hover:bg-card/80');
  });

  test('should have proper accessibility attributes', () => {
    render(<Home />);

    // Check for main landmark
    expect(screen.getByRole('main')).toBeInTheDocument();

    // Check for header
    expect(screen.getByRole('banner')).toBeInTheDocument();

    // Check for content info (footer)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();

    // Check that all navigation cards are links
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
  });

  test('should use semantic HTML structure', () => {
    render(<Home />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  test('should render with proper heading hierarchy', () => {
    render(<Home />);

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Doshi Sensei');

    const h2 = screen.getByRole('heading', { level: 2 });
    expect(h2).toHaveTextContent('Loading...');

    const h3s = screen.getAllByRole('heading', { level: 3 });
    expect(h3s).toHaveLength(4); // One for each navigation card
  });

  test('should have responsive design classes', () => {
    render(<Home />);

    const container = screen.getByRole('main').parentElement;
    expect(container).toHaveClass('container mx-auto px-4 py-8 min-h-screen');

    const grid = screen.getByRole('main').querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-1 md:grid-cols-2');
  });

  test('should render all navigation card elements correctly', () => {
    render(<Home />);

    // Check that each card has required elements
    const cards = [
      { text: 'Practice Conjugations', icon: '📚' },
      { text: 'Drill Mode', icon: '⚡' },
      { text: 'Browse Vocabulary', icon: '📖' },
      { text: 'Settings', icon: '⚙️' }
    ];

    cards.forEach(card => {
      expect(screen.getByText(card.text)).toBeInTheDocument();
      expect(screen.getByText(card.icon)).toBeInTheDocument();
      expect(screen.getByText('Get Started')).toBeInTheDocument();
    });
  });

  test('should handle client-side rendering properly', async () => {
    render(<Home />);

    // Should mount and set client state
    await waitFor(() => {
      expect(screen.getByText('Doshi Sensei')).toBeInTheDocument();
    });
  });

  test('should contain proper CSS classes for styling', () => {
    render(<Home />);

    // Check for fade-in animations
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('fade-in');

    // Check for slide-up animations
    const statsSection = screen.getByText('Loading...').closest('.bg-card');
    expect(statsSection).toHaveClass('slide-up');
  });

  test('should handle navigation card interactions', async () => {
    const user = userEvent.setup();
    render(<Home />);

    const practiceLink = screen.getByRole('link', { name: /practice conjugations/i });

    // Test keyboard navigation
    await user.tab();
    expect(document.activeElement).toBe(practiceLink);

    // Test that enter key works
    await user.keyboard('{Enter}');
    // Since we're using Link components, the navigation would be handled by Next.js
  });

  test('should render Japanese text with proper classes', () => {
    render(<Home />);

    const japaneseText = screen.getByText('動詞 先生');
    expect(japaneseText).toHaveClass('japanese-text');

    const appIcon = screen.getByText('動');
    expect(appIcon).toHaveClass('japanese-text');
  });

  test('should have proper container structure', () => {
    render(<Home />);

    const container = screen.getByRole('main').parentElement;
    expect(container).toHaveClass('container mx-auto px-4 py-8 min-h-screen');

    const mainContent = screen.getByRole('main');
    expect(mainContent).toHaveClass('max-w-4xl mx-auto');
  });
});

describe('NavigationCard Component', () => {
  test('should render with all props', () => {
    render(<Home />);

    // Test individual navigation card rendering
    const practiceCard = screen.getByRole('link', { name: /practice conjugations/i });

    expect(practiceCard).toBeInTheDocument();
    expect(practiceCard).toHaveAttribute('href', '/practice');
    expect(screen.getByText('📚')).toBeInTheDocument();
    expect(screen.getByText('Practice Conjugations')).toBeInTheDocument();
    expect(screen.getByText('Practice conjugations with detailed explanations')).toBeInTheDocument();
  });

  test('should have proper CSS classes for hover effects', () => {
    render(<Home />);

    const practiceCard = screen.getByRole('link', { name: /practice conjugations/i });
    expect(practiceCard.firstChild).toHaveClass('group');
  });
});

describe('StatCard Component', () => {
  test('should render stat cards with correct values and labels', () => {
    render(<Home />);

    const statsSection = screen.getByText('Loading...').closest('.bg-card');
    expect(statsSection).toBeInTheDocument();

    // Check individual stat cards
    expect(screen.getByText('Words Learned')).toBeInTheDocument();
    expect(screen.getByText('Drills Completed')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Streak')).toBeInTheDocument();

    // Check default values
    const zeroValues = screen.getAllByText('0');
    expect(zeroValues).toHaveLength(2);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0 days')).toBeInTheDocument();
  });
});
