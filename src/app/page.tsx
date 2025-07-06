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

interface UserStats {
  drillsCompleted: number;
  accuracy: number;
  streak: number;
  totalDaysUsed: number;
  kanjiStudySessions: number;
  kanjiAccuracy: number;
  totalKanjiLearned: number;
  pokemonCaught: number;
  storiesRead: number;
}

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
  { title: 'Resources', icon: '✨🎌✨', href: '/resources', description: 'Articles & tips' },
  { title: 'AI Stories', icon: '📖', href: '/stories', description: 'Interactive tales' }
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
  const [stats, setStats] = useState<UserStats>({
    drillsCompleted: 0,
    accuracy: 0,
    streak: 0,
    totalDaysUsed: 0,
    kanjiStudySessions: 0,
    kanjiAccuracy: 0,
    totalKanjiLearned: 0,
    pokemonCaught: 0,
    storiesRead: 0
  });
  const [loading, setLoading] = useState(true);
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

  // Get theme colors for gradient (moderate pastel)
  const colorScheme = settings.colorScheme || 'default';
  const palette = colorPalettes[colorScheme]?.colors || colorPalettes['default'].colors;
  const pastelPrimary = pastelizeHSL(palette.primary);
  const pastelAccent = pastelizeHSL(palette.accent);
  const pastelSecondary = pastelizeHSL(palette.secondary);

  // Load Pokédex count separately to ensure it's always available
  useEffect(() => {
    const loadPokemonCount = async () => {
      try {
        // Get user premium status
        const isPremiumUser = subscription?.status === 'active' &&
          (subscription?.plan === 'monthly' ||
            subscription?.plan === 'yearly');

        // Get caught Pokemon from IndexedDB and cloud if premium
        const caughtPokemon = await pokemonManager.getCaughtPokemon(profile, isPremiumUser);

        console.log('🎮 Pokédex count check:', {
          pokemonCount: caughtPokemon.length,
          user: profile?.email
        });

        if (caughtPokemon.length > 0) {
          setStats(prev => ({ ...prev, pokemonCaught: caughtPokemon.length }));
        }
      } catch (error) {
        console.error('Error loading Pokémon count:', error);
        // No fallback needed, will display 0
      }
    };

    loadPokemonCount();
  }, [profile, subscription]);

  // Initialize StatsManager with user context AND load stats
  useEffect(() => {
    const loadStatsManager = async () => {
      try {
        const { default: StatsManager } = await import('@/utils/stats');

        if (profile) {
          const canSync = subscription?.status === 'active';
          StatsManager.setUser(profile, canSync);
        } else {
          StatsManager.setUser(null, false);
        }

        // Load stats after setting up user context
        loadStats();
      } catch (error) {
        console.error('Error loading StatsManager:', error);
        setLoading(false);
      }
    };

    loadStatsManager();
  }, [profile, subscription]);

  useEffect(() => {
    // Reload stats when page becomes visible/focused
    const handleFocus = () => {
      loadStats();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadStats();
      }
    };

    // Listen for when user returns to this tab/page
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadStats = async () => {
    try {
      const { default: StatsManager } = await import('@/utils/stats');
      const { storyManager } = await import('@/utils/storyManager');
      const userStats = await StatsManager.getUserStats();

      // Get Pokémon count from both sources
      let pokemonCount = 0;
      try {
        const isPremiumUser = subscription?.status === 'active' &&
          (subscription?.plan === 'monthly' ||
            subscription?.plan === 'yearly');

        const caughtPokemon = await pokemonManager.getCaughtPokemon(profile, isPremiumUser);
        pokemonCount = caughtPokemon.length;
      } catch (error) {
        // Error loading Pokémon in loadStats
        console.error('Error loading Pokémon in loadStats:', error);
      }

      // Get story stats with error handling
      let storyStats = { totalStoriesRead: 0 };
      if (profile) {
        try {
          storyStats = await storyManager.getUserStoryStats(profile.uid);
        } catch (error) {
          // Silently fail if Firebase permissions are not set up
          console.warn('Could not fetch story stats:', error);
        }
      }

      setStats(prevStats => ({
        drillsCompleted: userStats.drillsCompleted,
        accuracy: Math.round(userStats.accuracy),
        streak: userStats.currentStreak,
        totalDaysUsed: userStats.totalDaysUsed,
        kanjiStudySessions: userStats.kanjiStudySessions || 0,
        kanjiAccuracy: Math.round(userStats.kanjiAccuracy || 0),
        totalKanjiLearned: userStats.totalKanjiLearned || 0,
        pokemonCaught: pokemonCount || prevStats.pokemonCaught, // Keep previous count if new data is 0
        storiesRead: storyStats.totalStoriesRead || 0
      }));
    } catch (err) {
      console.error('Error loading stats:', err);
      // Don't reset stats on error - keep previous values
    } finally {
      setLoading(false);
    }
  };

  // Get user's first name only
  const getUserDisplayName = () => {
    if (profile?.displayName) {
      // Extract first name from display name (split by space and take first part)
      return profile.displayName.split(' ')[0];
    }
    if (profile?.email) {
      // For email-based names, take the part before @ and split by common separators
      const emailName = profile.email.split('@')[0];
      // Handle cases like "john.doe" or "john_doe" or "john-doe"
      return emailName.split(/[._-]/)[0];
    }
    return 'Friend';
  };

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

        {/* Pokédex Icon - positioned on the right */}
        {stats.pokemonCaught > 0 && (
          <button
            onClick={() => setShowPokedexModal(true)}
            className="absolute top-4 right-4 p-3 bg-white backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 z-10"
            aria-label="Open Pokédex"
          >
            <img
              src="/flat-icons/188915-pokemon-go/png/smartphone.png"
              alt="Pokédex"
              className="w-8 h-8 md:w-10 md:h-10"
            />
            <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {stats.pokemonCaught}
            </span>
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 md:py-8 min-h-screen pb-32 md:pb-8">
        {/* Welcome Header */}
        <header className="mb-8 md:mb-12 text-center">
          {/* Welcome Text with Inline Avatar */}
          <div className="flex items-center justify-center gap-3 mb-2">
            {profile?.avatar ? (
              <img
                src={profile.avatar}
                alt={`${profile.displayName || profile.email}'s profile`}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-lg"
                style={{
                  boxShadow: '0 0 0 2px white, 0 0 0 3px var(--primary), 0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            ) : profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt={`${profile.displayName || profile.email}'s profile`}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-lg"
                style={{
                  boxShadow: '0 0 0 2px white, 0 0 0 3px var(--primary), 0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            ) : null}
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              Hello {getUserDisplayName()}!
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

          {/* Minimal Stats Bar */}
          <div
            className="backdrop-blur-md rounded-lg p-4 md:p-5 mb-8 transition-all duration-300"
            style={{
              border: '2px solid white',
              boxShadow: 'inset 0 0 0 1px rgb(129, 140, 248), 0 4px 12px rgba(0,0,0,0.1)',
              background: `linear-gradient(90deg, ${pastelPrimary} 0%, ${pastelAccent} 60%, ${pastelSecondary} 100%)`,
            }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap md:items-center md:justify-between gap-4 md:gap-4">
              {/* Streak Badge */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <span className="text-base md:text-sm text-gray-800">🔥</span>
                </div>
                <div>
                  <div className="text-sm md:text-xs text-gray-700">Streak</div>
                  <div className="text-base md:text-sm font-semibold text-gray-900">{loading ? '...' : `${stats.streak} days`}</div>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden md:block h-8 w-px bg-gray-400/30" />

              {/* Drills */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 md:w-7 md:h-7 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <span className="text-base md:text-sm text-gray-800">⚡</span>
                </div>
                <div>
                  <div className="text-base md:text-sm font-semibold text-gray-900">{loading ? '...' : stats.drillsCompleted}</div>
                  <div className="text-sm md:text-xs text-gray-700">Drills</div>
                </div>
              </div>

              {/* Sessions */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 md:w-7 md:h-7 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <span className="text-base md:text-sm text-gray-800">漢</span>
                </div>
                <div>
                  <div className="text-base md:text-sm font-semibold text-gray-900">{loading ? '...' : stats.kanjiStudySessions}</div>
                  <div className="text-sm md:text-xs text-gray-700">Sessions</div>
                </div>
              </div>

              {/* Learned */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 md:w-7 md:h-7 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <span className="text-base md:text-sm text-gray-800">📚</span>
                </div>
                <div>
                  <div className="text-base md:text-sm font-semibold text-gray-900">{loading ? '...' : stats.totalKanjiLearned}</div>
                  <div className="text-sm md:text-xs text-gray-700">Learned</div>
                </div>
              </div>

              {/* Pokemon */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 md:w-7 md:h-7 rounded-full bg-white shadow-sm flex items-center justify-center p-1">
                  <img
                    src="/pokeball.png"
                    alt="Pokéball"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="text-base md:text-sm font-semibold text-gray-900">{loading ? '...' : stats.pokemonCaught}</div>
                  <div className="text-sm md:text-xs text-gray-700">Pokémon</div>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden md:block h-8 w-px bg-gray-400/30" />

              {/* Stories Read */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 md:w-7 md:h-7 rounded-full bg-white shadow-sm flex items-center justify-center">
                    <span className="text-base md:text-sm text-gray-800">📖</span>
                  </div>
                  <div>
                    <div className="text-base md:text-sm font-semibold text-gray-900">{loading ? '...' : stats.storiesRead}</div>
                    <div className="text-sm md:text-xs text-gray-700">Stories</div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden md:block h-8 w-px bg-gray-400/30" />

              {/* Overall Accuracy */}
              <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                <div className="relative w-10 h-10">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="gray"
                      strokeWidth="3"
                      fill="none"
                      opacity="0.2"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="gray"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${loading ? 0 : (Math.max(stats.accuracy, stats.kanjiAccuracy) / 100) * 100} 100`}
                      strokeLinecap="round"
                      className={`transition-all duration-500`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-gray-800">{loading ? '...' : `${Math.round((stats.accuracy + stats.kanjiAccuracy) / 2)}%`}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-700">Avg Accuracy</div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Pokédex Modal */}
      <PokedexModal
        isOpen={showPokedexModal}
        onClose={() => setShowPokedexModal(false)}
        userId={profile?.uid}
      />
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

  return (
    <Link href={href}>
      <div
        className={`group relative rounded-2xl p-4 md:p-6 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${colors.bg} ${colors.text} ${colors.shadow}`}
        style={{
          border: '2px solid white',
          boxShadow: `inset 0 0 0 1px ${colors.inset}, 0 4px 12px rgba(0,0,0,0.1)`
        }}
      >
        {/* Frosted glass overlay effect */}
        <div className="absolute inset-0 rounded-2xl bg-white/15 dark:bg-white/8 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div className="relative flex flex-col items-center text-center space-y-2 md:space-y-3">
          <div className="text-2xl md:text-3xl drop-shadow-sm">
            {icon.startsWith('/') ? (
              <img
                src={icon}
                alt={title}
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

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
          <svg className="w-4 h-4 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

interface CompactStatProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'purple' | 'orange';
  loading: boolean;
  isPercentage?: boolean;
  suffix?: string;
}

function CompactStat({ label, value, color, loading, isPercentage = false, suffix = '' }: CompactStatProps) {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400'
  };

  const displayValue = isPercentage ? `${value}%` : value.toString();

  return (
    <div className="text-center">
      <div className={`text-xl md:text-2xl font-bold mb-1 ${colorClasses[color]}`}>
        {loading ? '...' : displayValue}
      </div>
      <div className="text-xs md:text-sm text-muted-foreground font-medium">
        {label}
      </div>
      {suffix && !isPercentage && (
        <div className="text-xs text-muted-foreground opacity-75">
          {suffix}
        </div>
      )}
    </div>
  );
}

interface StatCircleProps {
  label: string;
  value: number;
  maxValue: number;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'indigo' | 'teal';
  loading: boolean;
  isPercentage?: boolean;
  suffix?: string;
}

function StatCircle({ label, value, maxValue, color, loading, isPercentage = false, suffix = '' }: StatCircleProps) {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    pink: 'text-pink-600 dark:text-pink-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    teal: 'text-teal-600 dark:text-teal-400'
  };

  const strokeClasses = {
    blue: 'stroke-blue-600 dark:stroke-blue-400',
    green: 'stroke-green-600 dark:stroke-green-400',
    purple: 'stroke-purple-600 dark:stroke-purple-400',
    orange: 'stroke-orange-600 dark:stroke-orange-400',
    pink: 'stroke-pink-600 dark:stroke-pink-400',
    indigo: 'stroke-indigo-600 dark:stroke-indigo-400',
    teal: 'stroke-teal-600 dark:stroke-teal-400'
  };

  const percentage = Math.min((value / maxValue) * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = `${(circumference * percentage) / 100} ${circumference}`;

  const displayValue = isPercentage ? `${value}%` : value.toString();
  const displaySuffix = suffix && !isPercentage ? ` ${suffix}` : '';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24 md:w-32 md:h-32">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="var(--muted)"
            strokeWidth="6"
            fill="none"
            className="opacity-20"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeDasharray={loading ? '0 283' : strokeDasharray}
            strokeLinecap="round"
            className={`transition-all duration-1000 ease-out ${strokeClasses[color]}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-lg md:text-xl font-bold ${colorClasses[color]}`}>
            {loading ? '...' : displayValue}
          </span>
          {suffix && !isPercentage && (
            <span className="text-xs text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>
      </div>
      <span className="text-sm md:text-base font-medium text-muted-foreground mt-2 text-center">
        {label}
      </span>
    </div>
  );
}
