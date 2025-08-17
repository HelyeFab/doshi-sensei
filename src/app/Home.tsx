'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { SmartLink } from '@/components/SmartLink';
import Image from 'next/image';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useSettings } from '@/contexts/SettingsContext';
import { useStrings } from '@/contexts/LanguageContext';
import { pokemonManager } from '@/utils/pokemonManager';
import { colorPalettes } from '@/utils/themes';
// import { ToriiGate } from '@/components/ToriiGate'; // Disabled - component not in use
import { StatsBar } from '@/components/stats/StatsBar';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import UserAchievements from '@/components/achievements/UserAchievements';
import VirtualCompanion from '@/components/VirtualCompanion';
import { useRouter } from 'next/navigation';
import InAppNotificationBell from '@/components/notifications/InAppNotificationBell';

// Import debug utility in development
// Commented out to fix build issues - uncomment for debugging
// if (process.env.NODE_ENV === 'development') {
//   import('@/utils/debugStats');
// }

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

// Feature cards will be generated from strings

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
  const { profile, profilePicture } = useUserProfile();
  const { subscription } = useSubscription2();
  const { settings } = useSettings();
  const strings = useStrings();
  const { user } = useAuth();
  const router = useRouter();
  const [dayProgress, setDayProgress] = useState(0);
  const [todayDate, setTodayDate] = useState<string>('');
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Ensure strings are loaded
  if (!strings || !strings.home || !strings.home.featureCards) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading...</div>;
  }

  // Generate feature cards from strings (excluding Practice and Drill)
  const FEATURE_CARDS = [
    { title: strings.home.featureCards.practice.title, icon: strings.home.featureCards.practice.icon, href: '/practice', description: strings.home.featureCards.practice.description },
    { title: strings.home.featureCards.hiragana.title, icon: strings.home.featureCards.hiragana.icon, href: '/practice/hiragana', description: strings.home.featureCards.hiragana.description },
    { title: strings.home.featureCards.katakana.title, icon: strings.home.featureCards.katakana.icon, href: '/practice/katakana', description: strings.home.featureCards.katakana.description },
    { title: strings.home.featureCards.conjugation.title, icon: strings.home.featureCards.conjugation.icon, href: '/practice/conjugation', description: strings.home.featureCards.conjugation.description },
    { title: strings.home.featureCards.vocabulary.title, icon: strings.home.featureCards.vocabulary.icon, href: '/vocabulary', description: strings.home.featureCards.vocabulary.description },
    { title: strings.home.featureCards.drill.title, icon: strings.home.featureCards.drill.icon, href: '/drill', description: strings.home.featureCards.drill.description },
    { title: strings.home.featureCards.kanji.title, icon: strings.home.featureCards.kanji.icon, href: '/kanji-browser', description: strings.home.featureCards.kanji.description },
    { title: strings.home.featureCards.moodBoards.title, icon: strings.home.featureCards.moodBoards.icon, href: '/kanji-moods', description: strings.home.featureCards.moodBoards.description },
    { title: strings.home.featureCards.games.title, icon: strings.home.featureCards.games.icon, href: '/games', description: strings.home.featureCards.games.description },
    { title: strings.home.featureCards.news.title, icon: strings.home.featureCards.news.icon, href: '/news', description: strings.home.featureCards.news.description },
    { title: strings.home.featureCards.stories.title, icon: '/flat-icons/root-icons/story.svg', href: '/stories', description: strings.home.featureCards.stories.description },
    { title: strings.home.featureCards.youtubeShadowing.title, icon: strings.home.featureCards.youtubeShadowing.icon, href: '/tools/youtube-shadowing', description: strings.home.featureCards.youtubeShadowing.description },
    { title: strings.home.featureCards.youtubeSeries?.title || 'YouTube Series', icon: '/flat-icons/ui/Shadowing/facebook.svg', href: '/tools/youtube-series', description: strings.home.featureCards.youtubeSeries?.description || 'Track Japanese YouTube channels and auto-import as resources' },
    { title: strings.home.featureCards.dailyReviews?.title || 'Daily Reviews', icon: strings.home.featureCards.dailyReviews?.icon || '📅', href: '/daily-reviews', description: strings.home.featureCards.dailyReviews?.description || 'SRS kanji practice' },
    { title: strings.home.featureCards.resources.title, icon: strings.home.featureCards.resources.icon, href: '/resources', description: strings.home.featureCards.resources.description },
    { title: strings.home.featureCards.savedItems.title, icon: strings.home.featureCards.savedItems.icon, href: '/favourites', description: strings.home.featureCards.savedItems.description }
  ];

  // Use predefined color patterns for better visual distribution
  const mobileColors = MOBILE_COLOR_PATTERN;
  const desktopColors = DESKTOP_COLOR_PATTERN;
  
  // Define heavy pages once to avoid recalculating
  const HEAVY_PAGES = useMemo(() => 
    ['/practice', '/vocabulary', '/drill', '/kanji-browser', '/news', '/stories', '/kanji-moods', '/achievements'],
    []
  );

  // For mobile, override the Resources card icon to only show the flag
  const mobileFeatureCards = useMemo(() => 
    FEATURE_CARDS.map(card =>
      card.title === strings.home.featureCards.resources.title
        ? { ...card, icon: '🎌' }
        : card
    ), [strings.home.featureCards.resources.title]
  );

  // Get theme colors for gradient (moderate pastel) - client-side only to prevent hydration issues
  const [gradientColors, setGradientColors] = useState({
    primary: 'hsl(210, 60%, 85%)',
    accent: 'hsl(220, 60%, 85%)',
    secondary: 'hsl(230, 60%, 85%)'
  });

  // Removed pastel color for icon backgrounds - now using theme system directly

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

  // Calculate day progress and date (0-100%)
  useEffect(() => {
    const calculateDayProgress = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      
      // Total seconds in a day: 24 * 60 * 60 = 86400
      const totalSecondsInDay = 86400;
      const currentSeconds = (hours * 3600) + (minutes * 60) + seconds;
      const progress = (currentSeconds / totalSecondsInDay) * 100;
      
      setDayProgress(progress);
      
      // Format date
      const day = now.getDate();
      const month = now.toLocaleDateString('en-US', { month: 'long' });
      const year = now.getFullYear();
      setTodayDate(`${day} ${month} ${year}`);
    };

    // Calculate initial progress
    calculateDayProgress();

    // Update every minute
    const interval = setInterval(calculateDayProgress, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Structured Data for SEO - keeping for SEO purposes */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      {/* Desktop margin wrapper */}
      <div className="md:mx-16 lg:mx-32 xl:mx-48 2xl:mx-64">
        {/* Welcome Section */}
        <header className="px-4 pt-8 pb-6" role="banner">
        <div className="flex items-center gap-3">
          {/* User Avatar */}
          <button
            onClick={() => setShowAvatarModal(true)}
            className="block cursor-pointer"
            aria-label="Open user menu"
          >
            <UserAvatar size="md" priority />
          </button>
          
          {/* Greeting Text */}
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground">
              {strings.home.greeting} {displayName}-san! <span className="inline-block animate-wave">👋</span>
            </h1>
            {user ? (
              <p className="text-sm text-muted-foreground">{strings.home.readyToPractice}</p>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/login')}
                  className="text-sm text-primary hover:underline"
                >
                  Login
                </button>
                <span className="text-sm text-muted-foreground">/</span>
                <button
                  onClick={() => router.push('/login')}
                  className="text-sm text-primary hover:underline"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
          
          {/* Notification Bell */}
          {user && <InAppNotificationBell />}
        </div>
      </header>

      {/* Today's Date Section */}
      <section className="px-4 pb-6">
        <h2 className="text-lg font-medium text-foreground mb-2">
          {todayDate ? `Today, ${todayDate}` : 'Today'}
        </h2>
        
        {/* Day Progress Bar */}
        <div 
          className="relative h-0.5 w-full bg-muted overflow-hidden"
          role="progressbar"
          aria-label={strings.home.dayProgressTooltip}
          aria-valuenow={Math.round(dayProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          title={strings.home.dayProgressTooltip}
        >
          <div 
            className="absolute left-0 top-0 h-full transition-all duration-300 ease-out"
            style={{
              width: `${dayProgress}%`,
              backgroundColor: 'var(--primary)'
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{strings.home.dayProgressTooltip}</p>
      </section>
      
      {/* User Achievements */}
      <UserAchievements />
      
      {/* Stats Bar */}
      <div className="px-4 pb-4">
        <StatsBar />
      </div>

      {/* Feature Cards - Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-6">
          {/* Foundation Section */}
          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">Foundation</h3>
            <div className="space-y-3">
              {[
                { title: strings.home.featureCards.hiragana.title, icon: strings.home.featureCards.hiragana.icon, href: '/practice/hiragana', description: strings.home.featureCards.hiragana.description },
                { title: strings.home.featureCards.katakana.title, icon: strings.home.featureCards.katakana.icon, href: '/practice/katakana', description: strings.home.featureCards.katakana.description }
              ].map((card) => {
                const isHeavy = HEAVY_PAGES.some(page => card.href.startsWith(page));
                const LinkComp = isHeavy ? SmartLink : Link;
                return (
                <LinkComp key={card.href} href={card.href} className="block">
                  <div className="bg-card rounded-lg shadow-sm border border-border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10">
                        {card.icon.startsWith('/') ? (
                          <Image
                            src={card.icon}
                            alt={card.title}
                            width={24}
                            height={24}
                            className="opacity-70"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-2xl">{card.icon}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </LinkComp>
              );
              })}
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border"></div>

          {/* Core Learning Section */}
          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">Core Learning</h3>
            <div className="space-y-3">
              {[
                { title: strings.home.featureCards.kanji.title, icon: strings.home.featureCards.kanji.icon, href: '/kanji-browser', description: strings.home.featureCards.kanji.description },
                { title: strings.home.featureCards.kanjiMastery?.title || "Kanji Mastery", icon: strings.home.featureCards.kanjiMastery?.icon || "🎯", href: '/tools/kanji-mastery', description: strings.home.featureCards.kanjiMastery?.description || "Master kanji with SRS" },
                { title: strings.home.featureCards.moodBoards.title, icon: strings.home.featureCards.moodBoards.icon, href: '/kanji-moods', description: strings.home.featureCards.moodBoards.description },
                { title: strings.home.featureCards.textbookVocabulary.title, icon: strings.home.featureCards.textbookVocabulary.icon, href: '/tools/textbook-vocabulary', description: strings.home.featureCards.textbookVocabulary.description },
                { title: strings.home.featureCards.vocabulary.title, icon: strings.home.featureCards.vocabulary.icon, href: '/vocabulary', description: strings.home.featureCards.vocabulary.description },
                { title: strings.home.featureCards.conjugation.title, icon: strings.home.featureCards.conjugation.icon, href: '/practice/conjugation', description: strings.home.featureCards.conjugation.description }
              ].map((card) => {
                const isHeavy = HEAVY_PAGES.some(page => card.href.startsWith(page));
                const LinkComp = isHeavy ? SmartLink : Link;
                return (
                <LinkComp key={card.href} href={card.href} className="block">
                  <div className="bg-card rounded-lg shadow-sm border border-border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10">
                        {card.icon.startsWith('/') ? (
                          <Image
                            src={card.icon}
                            alt={card.title}
                            width={24}
                            height={24}
                            className="opacity-70"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-2xl">{card.icon}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </LinkComp>
              );
              })}
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border"></div>

          {/* Practice & Review Section */}
          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">Practice & Review</h3>
            <div className="space-y-3">
              {[
                { title: strings.home.featureCards.practice.title, icon: strings.home.featureCards.practice.icon, href: '/practice', description: strings.home.featureCards.practice.description },
                { title: strings.home.featureCards.dailyReviews?.title || 'Daily Reviews', icon: strings.home.featureCards.dailyReviews?.icon || '📅', href: '/daily-reviews', description: strings.home.featureCards.dailyReviews?.description || 'SRS kanji practice' },
                { title: strings.home.featureCards.drill.title, icon: strings.home.featureCards.drill.icon, href: '/drill', description: strings.home.featureCards.drill.description },
                { title: strings.home.featureCards.games.title, icon: strings.home.featureCards.games.icon, href: '/games', description: strings.home.featureCards.games.description }
              ].map((card) => {
                const isHeavy = HEAVY_PAGES.some(page => card.href.startsWith(page));
                const LinkComp = isHeavy ? SmartLink : Link;
                return (
                <LinkComp key={card.href} href={card.href} className="block">
                  <div className="bg-card rounded-lg shadow-sm border border-border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10">
                        {card.icon.startsWith('/') ? (
                          <Image
                            src={card.icon}
                            alt={card.title}
                            width={24}
                            height={24}
                            className="opacity-70"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-2xl">{card.icon}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </LinkComp>
              );
              })}
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border"></div>

          {/* Immersion Section */}
          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">Immersion</h3>
            <div className="space-y-3">
              {[
                { title: strings.home.featureCards.news.title, icon: strings.home.featureCards.news.icon, href: '/news', description: strings.home.featureCards.news.description },
                { title: strings.home.featureCards.stories.title, icon: '/flat-icons/root-icons/story.svg', href: '/stories', description: strings.home.featureCards.stories.description },
                { title: strings.home.featureCards.youtubeShadowing.title, icon: strings.home.featureCards.youtubeShadowing.icon, href: '/tools/youtube-shadowing', description: strings.home.featureCards.youtubeShadowing.description },
                { title: strings.home.featureCards.youtubeSeries?.title || 'YouTube Series', icon: '/flat-icons/ui/Shadowing/facebook.svg', href: '/tools/youtube-series', description: strings.home.featureCards.youtubeSeries?.description || 'Track Japanese YouTube channels and auto-import as resources' },
                { title: 'My Videos', icon: '🎬', href: '/tools/my-videos', description: 'View your saved videos and practice history' }
              ].map((card) => {
                const isHeavy = HEAVY_PAGES.some(page => card.href.startsWith(page));
                const LinkComp = isHeavy ? SmartLink : Link;
                return (
                <LinkComp key={card.href} href={card.href} className="block">
                  <div className="bg-card rounded-lg shadow-sm border border-border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10">
                        {card.icon.startsWith('/') ? (
                          <Image
                            src={card.icon}
                            alt={card.title}
                            width={24}
                            height={24}
                            className="opacity-70"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-2xl">{card.icon}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </LinkComp>
              );
              })}
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border"></div>

          {/* Social & Community Section */}
          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">Community</h3>
            <div className="space-y-3">
              {[
                { title: 'Leaderboard', icon: '🏆', href: '/leaderboard', description: 'View rankings and compete' },
                { title: 'Friends', icon: '👥', href: '/friends', description: 'Connect with other learners' }
              ].map((card) => {
                const isHeavy = HEAVY_PAGES.some(page => card.href.startsWith(page));
                const LinkComp = isHeavy ? SmartLink : Link;
                return (
                <LinkComp key={card.href} href={card.href} className="block">
                  <div className="bg-card rounded-lg shadow-sm border border-border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10">
                        <span className="text-2xl">{card.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </LinkComp>
              );
              })}
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border"></div>

          {/* Tools & Resources Section */}
          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">Tools & Resources</h3>
            <div className="space-y-3">
              {[
                { title: strings.home.featureCards.resources.title, icon: strings.home.featureCards.resources.icon, href: '/resources', description: strings.home.featureCards.resources.description },
                { title: strings.home.featureCards.savedItems.title, icon: strings.home.featureCards.savedItems.icon, href: '/favourites', description: strings.home.featureCards.savedItems.description }
              ].map((card) => {
                const isHeavy = HEAVY_PAGES.some(page => card.href.startsWith(page));
                const LinkComp = isHeavy ? SmartLink : Link;
                return (
                <LinkComp key={card.href} href={card.href} className="block">
                  <div className="bg-card rounded-lg shadow-sm border border-border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10">
                        {card.icon.startsWith('/') ? (
                          <Image
                            src={card.icon}
                            alt={card.title}
                            width={24}
                            height={24}
                            className="opacity-70"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-2xl">{card.icon}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </LinkComp>
              );
              })}
            </div>
          </section>

        </div>
      </div>
      </div>{/* End of desktop margin wrapper */}

      {/* Virtual Companion Modal */}
      <VirtualCompanion 
        isOpen={showAvatarModal} 
        onClose={() => setShowAvatarModal(false)} 
      />

    </div>
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
    if (href === '/settings') {

      console.log('⏰ Timestamp:', new Date().toISOString());

      // Check if there's any tutorial state in localStorage
      const tutorialState = localStorage.getItem('doshi-sensei-tutorial-seen');

      // Log navigation type

    }
  };

  // Check if this is a heavy page
  const HEAVY_PAGES = ['/vocabulary', '/drill', '/practice', '/admin', '/news', '/stories', '/kanji-browser', '/kanji-moods', '/achievements'];
  const isHeavyPage = HEAVY_PAGES.some(page => href.startsWith(page));
  const LinkComponent = isHeavyPage ? SmartLink : Link;

  return (
    <LinkComponent href={href} className="block" onClick={handleClick}>
      <div
        className={`group relative rounded-2xl p-3 md:p-4 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer aspect-square ${colors.bg} ${colors.text} ${colors.shadow}`}
        style={{
          border: '2px solid white',
          boxShadow: `inset 0 0 0 1px ${colors.inset}, 0 4px 12px rgba(0,0,0,0.1)`
        }}
      >
        {/* Frosted glass overlay effect - pointer-events-none to prevent click interference */}
        <div className="absolute inset-0 rounded-2xl bg-card/15 dark:bg-card/8 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

        <div className="relative flex flex-col items-center justify-center text-center h-full">
          <div className="text-2xl md:text-3xl drop-shadow-sm mb-2">
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
            <p className="text-xs md:text-sm opacity-90 mt-1 font-medium hidden md:block">
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
    </LinkComponent>
  );
}
