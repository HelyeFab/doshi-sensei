'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStrings } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatsBar } from '@/components/stats/StatsBar';
import UserAchievements from '@/components/achievements/UserAchievements';
import UserAvatar from '@/components/UserAvatar';
import VirtualCompanion from '@/components/VirtualCompanion';
import SmartReviewWidget from '@/components/unified-review/SmartReviewWidget';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface ClientHomeProps {
  initialDate: string | null;
  initialProgress: number | null;
}

export default function ClientHome({ initialDate, initialProgress }: ClientHomeProps) {
  const { user, userType } = useAuth();
  const fullDisplayName = user?.displayName || user?.email?.split('@')[0] || 'Friend';
  // Extract first name for mobile display
  const firstName = fullDisplayName.split(' ')[0];
  const displayName = fullDisplayName; // Keep full name for backward compatibility
  const [showCompanion, setShowCompanion] = useState(false);
  const strings = useStrings();
  const { isInstalled } = usePWAInstall();
  
  // Calculate date and progress on client side only
  const [dateString, setDateString] = useState('');
  const [dayProgress, setDayProgress] = useState(0);
  
  useEffect(() => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    setDateString(today.toLocaleDateString('en-US', options));
    
    // Calculate day progress
    const hours = today.getHours();
    const minutes = today.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    setDayProgress((totalMinutes / (24 * 60)) * 100);
  }, []);

  // SEO Structured Data using strings
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": strings.appName,
    "description": strings.appDescription,
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


  // Feature card sections based on old app structure
  const foundationCards = [
    { title: 'Hiragana', icon: 'あ', href: '/practice/hiragana', description: 'Master the hiragana alphabet' },
    { title: 'Katakana', icon: 'ア', href: '/practice/katakana', description: 'Learn katakana characters' }
  ];

  const coreLearningCards = [
    { title: 'Kanji', icon: '漢', href: '/kanji-browser', description: 'Browse and learn kanji' },
    // Review features now route through Review Hub
    { title: 'Kanji Mastery', icon: '🎯', href: '/tools/kanji-mastery', description: 'Master kanji with SRS (Reviews via Review Hub)' },
    { title: 'Kanji Connections', icon: '🔮', href: '/tools/kanji-connections', description: 'Premium: Families, Radicals & Patterns' },
    { title: 'Mood Boards', icon: '🗺️', href: '/kanji-moods', description: 'Learn kanji by themes' },
    // Review features now route through Review Hub
    { title: 'Textbook Vocab', icon: '📚', href: '/tools/textbook-vocabulary', description: 'Study textbook vocabulary (Reviews via Review Hub)' },
    { title: 'Word Learning', icon: '🧠', href: '/tools/word-learning-session', description: 'Interactive multimodal vocabulary' },
    { title: 'Vocabulary', icon: '📖', href: '/vocabulary', description: 'Explore Japanese vocabulary' },
    { title: 'Conjugation', icon: '🔤', href: '/practice/conjugation', description: 'Practice verb conjugations' }
  ];

  const practiceCards = [
    { title: 'Review Hub', icon: '/flat-icons/ui/book.svg', href: '/review-hub', description: 'Unified review system - all sources' },
    { title: 'Practice', icon: '📚', href: '/practice', description: 'General practice mode' },
    { title: 'Drill', icon: '⚡', href: '/drill', description: 'Quick drill exercises' },
    { title: 'Games', icon: '/game-console.png', href: '/games', description: 'Learn through fun games' }
  ];

  const immersionCards = [
    { title: 'News', icon: '🗞️', href: '/news', description: 'Read Japanese news' },
    { title: 'Stories', icon: '/flat-icons/root-icons/story.svg', href: '/stories', description: 'AI-generated stories' },
    { title: 'YouTube Shadowing', icon: '/flat-icons/ui/youtube.svg', href: '/tools/youtube-shadowing', description: 'Practice with YouTube' },
    { title: 'YouTube Series', icon: '/flat-icons/ui/Shadowing/facebook.svg', href: '/tools/youtube-series', description: 'Track YouTube channels' },
    { title: 'My Videos', icon: '🎬', href: '/tools/my-videos', description: 'Your saved videos' }
  ];

  const toolsCards = [
    { title: 'Achievements', icon: '🏆', href: '/achievements', description: 'Track your progress' },
    { title: 'Resources', icon: '🎌', href: '/resources', description: 'Learning resources' },
    { title: 'Saved Items', icon: '⭐', href: '/favourites', description: 'Your saved items' }
  ];

  const renderCardSection = (title: string, cards: typeof foundationCards) => (
    <section>
      <h3 className="text-lg font-bold text-foreground mb-3">{title}</h3>
      <div className="space-y-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="block">
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
          </Link>
        ))}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* SEO Structured Data */}
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
            {/* User Avatar with Install Indicator */}
            <button 
              onClick={() => setShowCompanion(true)}
              className="cursor-pointer transition-transform hover:scale-105 relative"
              aria-label="Open Virtual Companion"
            >
              <UserAvatar size="md" priority={true} />
              {/* Install App Badge - Only show if not installed */}
              {!isInstalled && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <svg className="w-3.5 h-3.5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} 
                      d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                  </svg>
                </div>
              )}
            </button>
            
            {/* Greeting Text */}
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground">
                {/* Show first name on mobile, full name on desktop */}
                <span className="md:hidden">
                  {strings.home.greeting} {firstName}-san! <span className="inline-block animate-wave">👋</span>
                </span>
                <span className="hidden md:inline">
                  {strings.home.greeting} {fullDisplayName}-san! <span className="inline-block animate-wave">👋</span>
                </span>
              </h1>
              <p className="text-sm text-muted-foreground">{strings.home.readyToPractice}</p>
            </div>
          </div>
        </header>

        {/* Today's Date Section */}
        <section className="px-4 pb-6">
          <h2 className="text-lg font-medium text-foreground mb-2">
            {dateString ? `Today, ${dateString}` : 'Loading...'}
          </h2>
          
          {/* Day Progress Bar - Thin like in old app */}
          <div className="relative h-0.5 w-full bg-muted overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${dayProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Day progress</p>
        </section>

        {/* Smart Review Widget - Shows when reviews are due */}
        <SmartReviewWidget />
        
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
            {renderCardSection('Foundation', foundationCards)}

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Core Learning Section */}
            {renderCardSection('Core Learning', coreLearningCards)}

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Practice & Review Section */}
            <div id="review-section">
              {renderCardSection('Practice & Review', practiceCards)}
            </div>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Immersion Section */}
            {renderCardSection('Immersion', immersionCards)}

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Tools & Resources Section */}
            {renderCardSection('Tools & Resources', toolsCards)}

            {/* Bottom padding for navbar */}
            <div className="h-20"></div>
          </div>
        </div>
      </div>

      {/* Virtual Companion Modal */}
      <VirtualCompanion 
        isOpen={showCompanion} 
        onClose={() => setShowCompanion(false)} 
      />
    </div>
  );
}