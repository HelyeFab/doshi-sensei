'use client';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { useSettings } from '@/contexts/SettingsContext';
import { pokemonManager } from '@/utils/pokemonManager';
import PokedexModal from '@/components/games/PokedexModal';
import { colorPalettes } from '@/utils/themes';
import { StatsDebugSummary } from '@/components/debug/StatsDebugSummary';
import { StatsBar } from '@/components/stats/StatsBar';

// Structured Data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Doshi Sensei",
  "description": "Learn Japanese verb and adjective conjugations with interactive practice, drills, and vocabulary. Master ichidan, godan, and irregular verbs.",
  "url": "https://doshisensei.com",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "creator": {
    "@type": "Organization",
    "name": "Doshi Sensei Team"
  },
  "applicationSubCategory": "Language Learning",
  "featureList": [
    "Japanese verb conjugation practice",
    "Interactive drills and quizzes",
    "JLPT vocabulary support",
    "Grammar explanations",
    "Progress tracking",
    "Offline support"
  ],
  "screenshot": "https://doshisensei.com/doshi.png",
  "softwareVersion": "1.0"
};


// Feature cards data
const FEATURE_CARDS = [
  { title: 'Practice', icon: '📚', href: '/practice', description: 'Learn conjugations' },
  { title: 'Drill', icon: '⚡', href: '/drill', description: 'Quick practice' },
  { title: 'Vocabulary', icon: '📖', href: '/vocabulary', description: 'Browse words' },
  { title: 'Kanji', icon: '漢', href: '/kanji-browser', description: 'Study kanji' },
  { title: 'Mood Boards', icon: '🗺️', href: '/kanji-moods', description: 'Learn by theme' },
  { title: 'Saved Items', icon: '⭐', href: '/favourites', description: 'Your collection' },
  { title: 'Account', icon: '👤', href: '/account', description: 'Profile & stats' },
  { title: 'Settings', icon: '⚙️', href: '/settings', description: 'Customize app' },
  { title: 'News', icon: '🗞️', href: '/news', description: 'Japanese articles' },
  { title: 'Games', icon: '🎮', href: '/games', description: 'Listening quiz' },
  { title: 'Resources', icon: '🎌', href: '/resources', description: 'Articles & tips' },
  { title: 'AI Stories', icon: '/flat-icons/root-icons/story.svg', href: '/stories', description: 'Interactive tales' }
];

// Predefined color patterns for optimal visual distribution
const MOBILE_COLOR_PATTERN: CardColor[] = [
  'blue', 'teal',
  'green', 'purple',
  'indigo', 'orange',
  'pink', 'blue',
  'purple', 'green',
  'teal', 'indigo'
];

const DESKTOP_COLOR_PATTERN: CardColor[] = [
  'blue', 'orange', 'green', 'purple',
  'pink', 'teal', 'indigo', 'orange',
  'purple', 'green', 'blue', 'pink'
];

// Utility to convert hsl string to moderate pastel
function pastelizeHSL(hsl: string) {
  // Match hsl(hue, saturation%, lightness%)
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
  if (!match) return hsl;
  const [_, h, s, l] = match;
  // Use 60% saturation, 85% lightness for moderate pastel
  return `hsl(${h}, 60%, 85%)`;
}

export default function Home() {
  const { profile } = useUserProfile();
  const { subscription } = useSubscription2();
  const { settings } = useSettings();
  const [showPokedexModal, setShowPokedexModal] = useState(false);

  // Use predefined color patterns for better visual distribution
  const mobileColors = MOBILE_COLOR_PATTERN;
  const desktopColors = DESKTOP_COLOR_PATTERN;

  // For mobile, override the Resources card icon to only show the flag
  const mobileFeatureCards = FEATURE_CARDS.map(card =>
    card.title === 'Resources'
      ? { ...card, icon: '🎌' }
      : card
  );

  // Get theme colors for gradient (moderate pastel) - client-side only to prevent hydration issues
  const [gradientColors, setGradientColors] = useState({
    primary: 'hsl(210, 60%, 85%)',
    accent: 'hsl(220, 60%, 85%)', 
    secondary: 'hsl(230, 60%, 85%)'
  });

  useEffect(() => {
    // Only run on client side to prevent hydration mismatch
    if (typeof window === 'undefined') return;
    
    const colorScheme = settings.colorScheme || 'default';
    const palette = colorPalettes[colorScheme]?.colors || colorPalettes['default'].colors;
    
    setGradientColors({
      primary: pastelizeHSL(palette.primary),
      accent: pastelizeHSL(palette.accent),
      secondary: pastelizeHSL(palette.secondary)
    });
  }, [settings.colorScheme]);


  // Get user's first name only - memoized to prevent hydration issues
  const [displayName, setDisplayName] = useState('Friend');
  
  useEffect(() => {
    // Only run on client side to prevent hydration mismatch
    if (typeof window === 'undefined') return;
    
    if (profile?.displayName) {
      // Extract first name from display name (split by space and take first part)
      setDisplayName(profile.displayName.split(' ')[0]);
    } else if (profile?.email) {
      // For email-based names, take the part before @ and split by common separators
      const emailName = profile.email.split('@')[0];
      // Handle cases like "john.doe" or "john_doe" or "john-doe"
      setDisplayName(emailName.split(/[._-]/)[0]);
    } else {
      setDisplayName('Friend');
    }
  }, [profile?.displayName, profile?.email]);

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20"
        />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />

        {/* Virtual Companion Button positioned within this section */}

      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 md:py-8 min-h-screen pb-32 md:pb-8">
        {/* Welcome Header */}
        <header className="mb-8 md:mb-12 text-center">
          {/* Welcome Text with Inline Avatar */}
          <div className="flex items-center justify-center gap-3 mb-2">
            {typeof window !== 'undefined' && profile?.avatar ? (
              <img
                src={profile.avatar}
                alt={`${profile.displayName || profile.email}'s profile`}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-lg"
                style={{
                  boxShadow: '0 0 0 2px white, 0 0 0 3px var(--primary), 0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            ) : typeof window !== 'undefined' && profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt={`${profile.displayName || profile.email}'s profile`}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-lg"
                style={{
                  boxShadow: '0 0 0 2px white, 0 0 0 3px var(--primary), 0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            ) : null}
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2" suppressHydrationWarning>
              Hello {displayName}!
              <span
                className="inline-block animate-pulse origin-[70%_70%]"
                style={{
                  animation: 'wave 2s ease-in-out infinite',
                  transformOrigin: '70% 70%'
                }}
              >
                👋
              </span>
            </h1>
          </div>
          <p className="text-base md:text-lg text-muted-foreground">
            Ready to practice some Japanese?
          </p>
        </header>

        {/* Main Navigation Cards */}
        <main className="max-w-6xl mx-auto">
          {/* Navigation Cards */}
          <div className="mb-6 md:mb-8">
            {/* Mobile: 2x2 Grid without scroll container */}
            <div className="md:hidden">
              <div className="grid grid-cols-2 gap-3">
                {mobileFeatureCards.map((card, index) => (
                  <FeatureCard
                    key={card.href}
                    title={card.title}
                    icon={card.icon}
                    href={card.href}
                    color={mobileColors[index]}
                    description={card.description}
                  />
                ))}
              </div>
            </div>

            {/* Desktop: Grid Layout (no scroll needed) */}
            <div className="hidden md:grid md:grid-cols-4 md:gap-6">
              {FEATURE_CARDS.map((card, index) => (
                <FeatureCard
                  key={card.href}
                  title={card.title}
                  icon={card.icon}
                  href={card.href}
                  color={desktopColors[index]}
                  description={card.description}
                />
              ))}
            </div>
          </div>

          {/* New Stats Bar Component */}
          <StatsBar className="mb-8" />
        </main>
      </div>

      {/* Pokédex Modal */}
      <PokedexModal
        isOpen={showPokedexModal}
        onClose={() => setShowPokedexModal(false)}
        userId={profile?.uid}
      />
      
      {/* Debug Summary - Only in development */}
      {process.env.NODE_ENV === 'development' && <StatsDebugSummary />}
    </>
  );
}

// Expanded color palette for better variety
const CARD_COLORS = {
  blue: {
    bg: 'bg-blue-100/60 hover:bg-blue-200/70 dark:bg-blue-900/30 dark:hover:bg-blue-800/40',
    border: 'border-blue-300/60 dark:border-blue-600/60',
    text: 'text-blue-900 dark:text-blue-100',
    shadow: 'hover:shadow-blue-200/25 dark:hover:shadow-blue-900/25',
    inset: 'rgb(59, 130, 246)'
  },
  green: {
    bg: 'bg-emerald-100/60 hover:bg-emerald-200/70 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/40',
    border: 'border-emerald-300/60 dark:border-emerald-600/60',
    text: 'text-emerald-900 dark:text-emerald-100',
    shadow: 'hover:shadow-emerald-200/25 dark:hover:shadow-emerald-900/25',
    inset: 'rgb(16, 185, 129)'
  },
  purple: {
    bg: 'bg-violet-100/60 hover:bg-violet-200/70 dark:bg-violet-900/30 dark:hover:bg-violet-800/40',
    border: 'border-violet-300/60 dark:border-violet-600/60',
    text: 'text-violet-900 dark:text-violet-100',
    shadow: 'hover:shadow-violet-200/25 dark:hover:shadow-violet-900/25',
    inset: 'rgb(139, 92, 246)'
  },
  pink: {
    bg: 'bg-pink-100/60 hover:bg-pink-200/70 dark:bg-pink-900/30 dark:hover:bg-pink-800/40',
    border: 'border-pink-300/60 dark:border-pink-600/60',
    text: 'text-pink-900 dark:text-pink-100',
    shadow: 'hover:shadow-pink-200/25 dark:hover:shadow-pink-900/25',
    inset: 'rgb(236, 72, 153)'
  },
  orange: {
    bg: 'bg-orange-100/60 hover:bg-orange-200/70 dark:bg-orange-900/30 dark:hover:bg-orange-800/40',
    border: 'border-orange-300/60 dark:border-orange-600/60',
    text: 'text-orange-900 dark:text-orange-100',
    shadow: 'hover:shadow-orange-200/25 dark:hover:shadow-orange-900/25',
    inset: 'rgb(249, 115, 22)'
  },
  teal: {
    bg: 'bg-teal-100/60 hover:bg-teal-200/70 dark:bg-teal-900/30 dark:hover:bg-teal-800/40',
    border: 'border-teal-300/60 dark:border-teal-600/60',
    text: 'text-teal-900 dark:text-teal-100',
    shadow: 'hover:shadow-teal-200/25 dark:hover:shadow-teal-900/25',
    inset: 'rgb(20, 184, 166)'
  },
  indigo: {
    bg: 'bg-indigo-100/60 hover:bg-indigo-200/70 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/40',
    border: 'border-indigo-300/60 dark:border-indigo-600/60',
    text: 'text-indigo-900 dark:text-indigo-100',
    shadow: 'hover:shadow-indigo-200/25 dark:hover:shadow-indigo-900/25',
    inset: 'rgb(99, 102, 241)'
  }
} as const;

type CardColor = keyof typeof CARD_COLORS;

// Function to assign colors ensuring no adjacent cards have the same color
function assignCardColors(totalCards: number, columns: number): CardColor[] {
  const colorKeys = Object.keys(CARD_COLORS) as CardColor[];
  const colors: CardColor[] = [];

  // More sophisticated coloring that uses more colors
  for (let i = 0; i < totalCards; i++) {
    const row = Math.floor(i / columns);
    const col = i % columns;

    // Find colors of adjacent cards
    const adjacentColors: Set<CardColor> = new Set();

    // Check left neighbor
    if (col > 0 && colors[i - 1]) {
      adjacentColors.add(colors[i - 1]);
    }

    // Check top neighbor
    if (row > 0 && colors[i - columns]) {
      adjacentColors.add(colors[i - columns]);
    }

    // Check right neighbor (for better distribution)
    if (col < columns - 1 && colors[i + 1]) {
      adjacentColors.add(colors[i + 1]);
    }

    // Check diagonal neighbors to avoid patterns
    if (row > 0 && col > 0 && colors[i - columns - 1]) {
      adjacentColors.add(colors[i - columns - 1]);
    }
    if (row > 0 && col < columns - 1 && colors[i - columns + 1]) {
      adjacentColors.add(colors[i - columns + 1]);
    }

    // Try to use colors in a rotating pattern for better distribution
    const startIndex = (row + col) % colorKeys.length;
    let availableColor: CardColor | undefined;

    // Look for an available color starting from the rotated position
    for (let j = 0; j < colorKeys.length; j++) {
      const colorIndex = (startIndex + j) % colorKeys.length;
      const color = colorKeys[colorIndex];
      if (!adjacentColors.has(color)) {
        availableColor = color;
        break;
      }
    }

    colors.push(availableColor || colorKeys[0]);
  }

  return colors;
}

interface FeatureCardProps {
  title: string;
  icon: string;
  href: string;
  color: CardColor;
  description: string;
}

function FeatureCard({ title, icon, href, color, description }: FeatureCardProps) {
  const colors = CARD_COLORS[color];

  // Add debugging for Settings card navigation
  const handleClick = (e: React.MouseEvent) => {
    if (title === 'Settings') {
      console.log('🔧 Settings card clicked!');
      console.log('📍 Current URL:', window.location.href);
      console.log('🎯 Target href:', href);
      console.log('🖱️ Click event:', e);
      console.log('🔄 Is default prevented?', e.defaultPrevented);
      console.log('📱 Event type:', e.type);
      console.log('🎯 Event target:', e.target);
      console.log('⏰ Timestamp:', new Date().toISOString());
      
      // Check if there's any tutorial state in localStorage
      const tutorialState = localStorage.getItem('doshi-sensei-tutorial-seen');
      console.log('📚 Tutorial state in localStorage:', tutorialState);
      
      // Log navigation type
      console.log('🚀 About to navigate to:', href);
    }
  };

  return (
    <Link href={href} className="block" onClick={handleClick}>
      <div
        className={`group relative rounded-2xl p-4 md:p-6 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer ${colors.bg} ${colors.text} ${colors.shadow}`}
        style={{
          border: '2px solid white',
          boxShadow: `inset 0 0 0 1px ${colors.inset}, 0 4px 12px rgba(0,0,0,0.1)`
        }}
      >
        {/* Frosted glass overlay effect - pointer-events-none to prevent click interference */}
        <div className="absolute inset-0 rounded-2xl bg-white/15 dark:bg-white/8 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

        <div className="relative flex flex-col items-center text-center space-y-2 md:space-y-3">
          <div className="text-2xl md:text-3xl drop-shadow-sm">
            {icon.startsWith('/') ? (
              <img
                src={icon}
                alt={title}
                width={40}
                height={40}
                className="w-8 h-8 md:w-10 md:h-10 object-contain"
              />
            ) : (
              icon
            )}
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold">
              {title}
            </h3>
            <p className="text-xs md:text-sm opacity-90 mt-1 font-medium">
              {description}
            </p>
          </div>
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110 pointer-events-none">
          <svg className="w-4 h-4 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}