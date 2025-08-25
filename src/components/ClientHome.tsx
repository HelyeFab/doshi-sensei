'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStrings } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatsBar } from '@/components/stats/StatsBar';
import UserAchievements from '@/components/achievements/UserAchievements';
import UserAvatar from '@/components/UserAvatar';
import VirtualCompanion from '@/components/VirtualCompanion';
import SmartReviewWidget from '@/components/unified-review/SmartReviewWidget';

interface ClientHomeProps {
  initialDate: string;
  initialProgress: number;
}

export default function ClientHome({ initialDate, initialProgress }: ClientHomeProps) {
  const { user, userType } = useAuth();
  const fullDisplayName = user?.displayName || user?.email?.split('@')[0] || 'Friend';
  // Extract first name for mobile display
  const firstName = fullDisplayName.split(' ')[0];
  const displayName = fullDisplayName; // Keep full name for backward compatibility
  const [showCompanion, setShowCompanion] = useState(false);
  const strings = useStrings();

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
    { title: 'Kanji Mastery', icon: '🎯', href: '/tools/kanji-mastery', description: 'Master kanji with SRS' },
    { title: 'Mood Boards', icon: '🗺️', href: '/kanji-moods', description: 'Learn kanji by themes' },
    { title: 'Textbook Vocab', icon: '📚', href: '/tools/textbook-vocabulary', description: 'Study textbook vocabulary' },
    { title: 'Vocabulary', icon: '📖', href: '/vocabulary', description: 'Explore Japanese vocabulary' },
    { title: 'Conjugation', icon: '🔤', href: '/practice/conjugation', description: 'Practice verb conjugations' }
  ];

  const practiceCards = [
    { title: 'Review System', icon: '📝', href: '/review', description: 'Unified spaced repetition review' },
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
      <h3 className="text-lg font-bold text-gray-900 mb-3">{title}</h3>
      <div className="space-y-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="block">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-blue-50">
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
                  <h3 className="font-medium text-gray-900">{card.title}</h3>
                  <p className="text-sm text-gray-500">{card.description}</p>
                </div>
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="min-h-screen bg-gray-50">
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
            {/* User Avatar */}
            <button 
              onClick={() => setShowCompanion(true)}
              className="cursor-pointer transition-transform hover:scale-105"
              aria-label="Open Virtual Companion"
            >
              <UserAvatar size="md" priority={true} />
            </button>
            
            {/* Greeting Text */}
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">
                {/* Show first name on mobile, full name on desktop */}
                <span className="md:hidden">
                  {strings.home.greeting} {firstName}-san! <span className="inline-block animate-wave">👋</span>
                </span>
                <span className="hidden md:inline">
                  {strings.home.greeting} {fullDisplayName}-san! <span className="inline-block animate-wave">👋</span>
                </span>
              </h1>
              <p className="text-sm text-gray-600">{strings.home.readyToPractice}</p>
            </div>
          </div>
        </header>

        {/* Today's Date Section */}
        <section className="px-4 pb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Today, {initialDate}
          </h2>
          
          {/* Day Progress Bar - Thin like in old app */}
          <div className="relative h-0.5 w-full bg-gray-200 overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${initialProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Day progress</p>
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
            <div className="border-t border-gray-200"></div>

            {/* Core Learning Section */}
            {renderCardSection('Core Learning', coreLearningCards)}

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Practice & Review Section */}
            {renderCardSection('Practice & Review', practiceCards)}

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Immersion Section */}
            {renderCardSection('Immersion', immersionCards)}

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

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