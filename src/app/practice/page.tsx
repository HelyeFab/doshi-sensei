'use client';

import { useState, useEffect } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/PageHeader';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ProductionSnakePath } from '@/components/ProductionSnakePath';
// Removed React Spring to use pure CSS animations

// Structured Data for Practice Page
const practiceStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "Japanese Language Practice - Conjugation & Kana",
  "description": "Interactive Japanese verb and adjective conjugation practice with detailed explanations. Study hiragana and katakana charts with pronunciation.",
  "url": "https://doshisensei.com/practice",
  "educationalLevel": ["Beginner", "Intermediate", "Advanced"],
  "learningResourceType": "Interactive Practice",
  "about": {
    "@type": "Thing",
    "name": "Japanese Language",
    "description": "Japanese verb conjugations, grammar, vocabulary, hiragana and katakana"
  },
  "teaches": [
    "Japanese verb conjugation",
    "Ichidan verb forms",
    "Godan verb forms",
    "Irregular verb forms",
    "I-adjective conjugation",
    "Na-adjective conjugation",
    "JLPT grammar patterns",
    "Hiragana characters",
    "Katakana characters",
    "Japanese syllabary"
  ],
  "educationalRole": "Student",
  "typicalAgeRange": "13-65",
  "interactivityType": "Active",
  "isAccessibleForFree": true,
  "inLanguage": "en",
  "keywords": [
    "Japanese practice",
    "verb conjugation",
    "Japanese grammar",
    "JLPT preparation",
    "Japanese learning",
    "ichidan verbs",
    "godan verbs",
    "hiragana chart",
    "katakana chart",
    "kana practice"
  ]
};

// Feature cards data with mood board style and size variations
const FEATURE_CARDS = [
  { id: 1, icon: '🎮', title: 'Games', subtitle: 'Play & Learn', gradient: 'from-pink-400 to-rose-600', bgColor: '#ec4899', size: 'full' },
  { id: 2, icon: '📰', title: 'News', subtitle: 'Daily Updates', gradient: 'from-blue-400 to-cyan-600', bgColor: '#3b82f6', size: 'half' },
  { id: 3, icon: '🤖', title: 'AI Stories', subtitle: 'Generated Tales', gradient: 'from-purple-400 to-violet-600', bgColor: '#8b5cf6', size: 'full' },
  { id: 4, icon: '📚', title: 'Vocabulary', subtitle: 'Word Bank', gradient: 'from-green-400 to-emerald-600', bgColor: '#10b981', size: 'half' },
  { id: 5, icon: '📝', title: 'Grammar', subtitle: 'Learn Rules', gradient: 'from-yellow-400 to-amber-600', bgColor: '#f59e0b', size: 'half' },
  { id: 6, icon: '🎯', title: 'Practice', subtitle: 'Daily Drills', gradient: 'from-orange-400 to-red-600', bgColor: '#f97316', size: 'full' },
  { id: 7, icon: '📊', title: 'Stats', subtitle: 'Your Progress', gradient: 'from-indigo-400 to-blue-600', bgColor: '#6366f1', size: 'half' },
  { id: 8, icon: '🏆', title: 'Achievements', subtitle: 'Earn Rewards', gradient: 'from-teal-400 to-cyan-600', bgColor: '#14b8a6', size: 'full' },
];

// Infinite Scrolling Background Component with Instagram Grid
function InfiniteScrollingBackground() {
  // Remove scroll listener to prevent re-renders affecting animations

  // Create 5 columns with varied speeds - all slowed by half
  const columns = [
    { offset: 0, speed: 120, reverse: false },  // Was 60, now 120
    { offset: 2, speed: 90, reverse: true },    // Was 45, now 90
    { offset: 4, speed: 140, reverse: false },  // Was 70, now 140
    { offset: 6, speed: 80, reverse: true },    // Was 40, now 80
    { offset: 1, speed: 110, reverse: false },  // Was 55, now 110
  ];

  return (
    <div className="absolute inset-0 -top-32 -bottom-32 overflow-hidden pointer-events-none">
      {/* Diagonal container with parallax */}
      <div
        className="absolute inset-0 -left-32 -right-32"
        style={{
          transform: `rotate(-15deg)`,
        }}
      >
        {/* Instagram-style grid columns */}
        <div className="flex gap-4 h-full">
          {columns.map((col, colIndex) => (
            <InfiniteColumn
              key={colIndex}
              colIndex={colIndex}
              offset={col.offset}
              speed={col.speed}
              reverse={col.reverse}
            />
          ))}
        </div>
      </div>

      {/* Purple frosted glass gradient overlay - covers entire background */}
      <div className="absolute inset-0 -top-32 -bottom-32 -left-32 -right-32">
        {/* Primary purple gradient - slightly stronger */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-purple-500/10 to-transparent" />
        {/* Secondary gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-tl from-violet-600/15 via-transparent to-purple-400/8" />
        {/* Subtle white overlay for better text contrast */}
        <div className="absolute inset-0 bg-white/5 dark:bg-black/10" />
        {/* Frosted glass effect */}
        <div className="absolute inset-0 backdrop-blur-[3px]" />
      </div>
    </div>
  );
}

// Individual infinite column component
function InfiniteColumn({ colIndex, offset, speed, reverse }: { colIndex: number; offset: number; speed: number; reverse: boolean }) {
  // Rearrange cards for variety
  const cards = [...FEATURE_CARDS.slice(offset % FEATURE_CARDS.length), ...FEATURE_CARDS.slice(0, offset % FEATURE_CARDS.length)];
  // Double the cards for seamless looping
  const extendedCards = [...cards, ...cards];

  return (
    <div className="relative flex-1 h-full overflow-hidden">
      {/* Primary scrolling container */}
      <div
        className="absolute w-full"
        style={{
          animation: `${reverse ? 'continuousScrollUp' : 'continuousScrollDown'} ${speed}s linear infinite`,
          height: '200%', // Double height for seamless loop
        }}
      >
        {/* First set of cards */}
        <div className="flex flex-col gap-4">
          {extendedCards.map((card, index) => (
            <div
              key={`${colIndex}-${index}`}
              className={`relative overflow-hidden rounded-3xl shadow-xl ${
                card.size === 'full'
                  ? 'min-h-[240px] md:min-h-[280px]'
                  : 'min-h-[120px] md:min-h-[140px]'
              }`}
              style={{
                opacity: 0.12,  // Reduced to 12%
                background: card.bgColor,
              }}
            >
              {/* Stronger gradient overlay like mood boards */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`}
                style={{ mixBlendMode: 'multiply', opacity: 0.8 }}
              />

              {/* White overlay for text contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

              {/* Content */}
              <div className={`relative h-full flex flex-col justify-between ${
                card.size === 'full' ? 'p-3 md:p-6' : 'p-2 md:p-4'
              } text-white`}>
                <div>
                  <div className={`${card.size === 'full' ? 'text-4xl md:text-5xl' : 'text-2xl md:text-3xl'} mb-2`}>
                    {card.icon}
                  </div>
                  <h4 className={`font-bold ${
                    card.size === 'full' ? 'text-lg md:text-2xl' : 'text-sm md:text-lg'
                  } mb-1 break-words hyphens-auto`}>
                    {card.title}
                  </h4>
                  <p className={`${
                    card.size === 'full' ? 'text-sm md:text-base' : 'text-xs md:text-sm'
                  } opacity-90`}>
                    {card.subtitle}
                  </p>
                </div>

                {/* Level indicator like mood boards */}
                {card.size === 'full' && (
                  <div className="text-xs md:text-sm opacity-80 font-medium">
                    N{(index % 5) + 1} Level
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Duplicate set for seamless loop */}
        <div className="flex flex-col gap-4 mt-4">
          {extendedCards.map((card, index) => (
            <div
              key={`${colIndex}-${index}-dup`}
              className={`relative overflow-hidden rounded-3xl shadow-xl ${
                card.size === 'full'
                  ? 'min-h-[240px] md:min-h-[280px]'
                  : 'min-h-[120px] md:min-h-[140px]'
              }`}
              style={{
                opacity: 0.12,  // Reduced to 12%
                background: card.bgColor,
              }}
            >
              {/* Stronger gradient overlay like mood boards */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`}
                style={{ mixBlendMode: 'multiply', opacity: 0.8 }}
              />

              {/* White overlay for text contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

              {/* Content */}
              <div className={`relative h-full flex flex-col justify-between ${
                card.size === 'full' ? 'p-3 md:p-6' : 'p-2 md:p-4'
              } text-white`}>
                <div>
                  <div className={`${card.size === 'full' ? 'text-4xl md:text-5xl' : 'text-2xl md:text-3xl'} mb-2`}>
                    {card.icon}
                  </div>
                  <h4 className={`font-bold ${
                    card.size === 'full' ? 'text-lg md:text-2xl' : 'text-sm md:text-lg'
                  } mb-1 break-words hyphens-auto`}>
                    {card.title}
                  </h4>
                  <p className={`${
                    card.size === 'full' ? 'text-sm md:text-base' : 'text-xs md:text-sm'
                  } opacity-90`}>
                    {card.subtitle}
                  </p>
                </div>

                {/* Level indicator like mood boards */}
                {card.size === 'full' && (
                  <div className="text-xs md:text-sm opacity-80 font-medium">
                    N{(index % 5) + 1} Level
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Learning Path Component with pure CSS animations
function LearningPath() {
  // Define the path stations
  const stations = [
    {
      id: 'kana',
      href: '/practice/kana',
      icon: 'あ',
      title: 'Kana Charts',
      subtitle: 'Start here',
      gradient: 'from-rose-400 to-pink-600',
      glowGradient: 'from-rose-400/50 to-pink-600/50',
      hoverColor: 'hover:text-rose-600',
      delay: 0
    },
    {
      id: 'conjugation',
      href: '/practice/conjugation',
      icon: '動',
      title: 'Conjugation',
      subtitle: 'Next step',
      gradient: 'from-orange-400 to-amber-600',
      glowGradient: 'from-orange-400/50 to-amber-600/50',
      hoverColor: 'hover:text-orange-600',
      delay: 200
    },
    {
      id: 'coming-soon',
      href: '#',
      icon: '🔜',
      title: 'More',
      subtitle: 'Coming soon',
      gradient: 'from-amber-400 to-yellow-600',
      glowGradient: 'from-amber-400/30 to-yellow-600/30',
      hoverColor: '',
      disabled: true,
      delay: 400
    }
  ];

  // Hover state for stations
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);

  return (
    <div className="w-full md:max-w-5xl mx-auto px-0 md:px-4 relative">
      <h3 className="text-xl font-semibold text-center text-white mb-12 relative z-10 animate-fade-in-up bg-gradient-to-br from-primary/90 to-primary/70 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20 max-w-fit mx-auto transform hover:scale-105 transition-all hover:shadow-[0_20px_50px_rgba(139,_92,_246,_0.5)]" style={{ boxShadow: '0 10px 40px rgba(139, 92, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)' }}>
        Your Learning Path Awaits
      </h3>

      {/* Stacked Container Layout with Background */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Infinite Scrolling Background - Local to Learning Path */}
        <InfiniteScrollingBackground />

        {/* Stacked Container Layout */}
        <div className="flex flex-col gap-8 relative z-10 p-8 md:p-12">
        {stations.map((station, index) => {
          const isLast = index === stations.length - 1;

          // Determine alignment based on index
          const alignment = index === 0 ? 'justify-start' : index === 1 ? 'justify-center' : 'justify-end';

          return (
            <div key={station.id} className="w-full">
              <div className={`flex ${alignment} w-full animate-scale-in`} style={{ animationDelay: `${500 + index * 200}ms` }}>
                {station.disabled ? (
                  <div className="opacity-60">
                    <StationCircle station={station} />
                  </div>
                ) : (
                  <Link
                    href={station.href}
                    className="group block"
                    onMouseEnter={() => setHoveredStation(station.id)}
                    onMouseLeave={() => setHoveredStation(null)}
                  >
                    <StationCircle station={station} isHovered={hoveredStation === station.id} />
                  </Link>
                )}
              </div>

            </div>
          );
        })}

        {/* Duplicate the pattern */}
        <div className="mt-8 pt-8">
          <h4 className="text-center text-lg font-semibold text-white mb-8 bg-gradient-to-br from-primary/90 to-primary/70 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20 max-w-fit mx-auto transform hover:scale-105 transition-all hover:shadow-[0_20px_50px_rgba(139,_92,_246,_0.5)]" style={{ boxShadow: '0 10px 40px rgba(139, 92, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)' }}>Continue Your Journey</h4>
          {stations.map((station, index) => {
            const isLast = index === stations.length - 1;

            // Determine alignment based on index
            const alignment = index === 0 ? 'justify-start' : index === 1 ? 'justify-center' : 'justify-end';

            return (
              <div key={`${station.id}-2`} className="w-full mb-8">
                <div className={`flex ${alignment} w-full animate-scale-in`} style={{ animationDelay: `${1000 + index * 200}ms` }}>
                  {station.disabled ? (
                    <div className="opacity-60">
                      <StationCircle station={station} />
                    </div>
                  ) : (
                    <Link
                      href={station.href}
                      className="group block"
                      onMouseEnter={() => setHoveredStation(`${station.id}-2`)}
                      onMouseLeave={() => setHoveredStation(null)}
                    >
                      <StationCircle station={station} isHovered={hoveredStation === `${station.id}-2`} />
                    </Link>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>
      </div>

      {/* Enhanced description with animation */}
      <div className="mt-20 text-center max-w-2xl mx-auto relative z-10 animate-fade-in-up" style={{ animationDelay: '1400ms' }}>
        <div className="bg-gradient-to-br from-primary/90 to-primary/70 backdrop-blur-md rounded-2xl px-8 py-6 border border-white/20 transform hover:scale-[1.02] transition-all hover:shadow-[0_25px_60px_rgba(139,_92,_246,_0.5)]" style={{ boxShadow: '0 15px 45px rgba(139, 92, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)' }}>
          <p className="text-white text-lg font-medium">
            Follow the path from top to bottom. Each station builds upon the last,
            creating your foundation in Japanese.
          </p>
        </div>
      </div>
    </div>
  );
}

// Station Circle Component with pure CSS animations
function StationCircle({ station, isHovered = false }: { station: any; isHovered?: boolean }) {
  return (
    <>
      <div className="relative w-20 h-20 md:w-32 md:h-32">
        {/* Glow effect - reduced opacity */}
        <div className={`absolute -inset-2 md:-inset-4 bg-gradient-to-r ${station.glowGradient} rounded-full blur-xl md:blur-2xl ${station.disabled ? 'opacity-30' : 'opacity-50 group-hover:opacity-70'} transition-opacity duration-300`} />

        {/* Main circle */}
        <div
          className={`relative w-full h-full bg-gradient-to-br ${station.gradient} rounded-full flex items-center justify-center shadow-2xl transition-transform duration-300 ${isHovered ? 'scale-110' : 'scale-100'}`}
        >
          <span className={`text-3xl md:text-5xl ${station.icon === '🔜' ? '' : 'text-white font-bold'}`}>{station.icon}</span>
        </div>

        {/* Pulse ring animation */}
        {!station.disabled && (
          <div
            className={`absolute inset-0 rounded-full border-2 md:border-4 animate-pulse-ring ${
              station.id === 'kana' ? 'border-rose-400/70' : 'border-orange-400/70'
            }`}
          />
        )}
      </div>

      <div className="text-center mt-4 md:mt-6">
        <div className="bg-gradient-to-br from-primary/90 to-primary/70 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20 transform hover:scale-105 transition-all hover:shadow-[0_15px_35px_rgba(139,_92,_246,_0.4)]" style={{ boxShadow: '0 8px 25px rgba(139, 92, 246, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)' }}>
          <p className={`text-lg md:text-xl font-bold text-white ${station.disabled ? 'opacity-70' : ''}`}>
            {station.title}
          </p>
          <p className="text-xs md:text-sm text-white/80 font-medium">{station.subtitle}</p>
        </div>
      </div>
    </>
  );
}

// Production Learning Path Component with Snake Path
function ProductionLearningPath() {
  const nodes = [
    {
      id: 'start',
      type: 'checkpoint' as const,
      icon: '🌸',
      title: 'Welcome!',
      subtitle: 'Start here',
      completed: true
    },
    {
      id: 'hiragana',
      type: 'lesson' as const,
      icon: 'あ',
      title: 'Hiragana',
      subtitle: 'Basic syllabary',
      completed: true,
      href: '/practice/hiragana'
    },
    {
      id: 'katakana',
      type: 'lesson' as const,
      icon: 'ア',
      title: 'Katakana',
      subtitle: 'Foreign words',
      completed: true,
      href: '/practice/katakana',
      current: true
    },
    {
      id: 'conjugation',
      type: 'lesson' as const,
      icon: '動',
      title: 'Conjugation',
      subtitle: 'Verb forms',
      href: '/practice/conjugation'
    },
    {
      id: 'checkpoint-1',
      type: 'checkpoint' as const,
      icon: '🎮',
      title: 'Checkpoint 1',
      subtitle: 'Play games!',
      completed: true,
      href: '/games'
    },
    {
      id: 'conjugation-drill',
      type: 'lesson' as const,
      icon: '⚡',
      title: 'Conjugation Drill',
      subtitle: 'Quick practice',
      href: '/drill/conjugation'
    },
    {
      id: 'flashcards',
      type: 'lesson' as const,
      icon: '🎴',
      title: 'Flashcards',
      subtitle: 'Spaced repetition',
      href: '/drill/flashcards'
    },
    {
      id: 'checkpoint-2',
      type: 'checkpoint' as const,
      icon: '🕹️',
      title: 'Checkpoint 2',
      subtitle: 'More games!',
      href: '/games'
    },
    {
      id: 'kanji-browser',
      type: 'lesson' as const,
      icon: '漢',
      title: 'Kanji Browser',
      subtitle: 'Explore kanji',
      href: '/kanji-browser'
    },
    {
      id: 'vocabulary',
      type: 'lesson' as const,
      icon: '📚',
      title: 'Vocabulary',
      subtitle: 'Browse words',
      href: '/vocabulary'
    },
    {
      id: 'mood-boards',
      type: 'lesson' as const,
      icon: '🎭',
      title: 'Mood Boards',
      subtitle: 'Kanji by feeling',
      href: '/kanji-moods'
    },
    {
      id: 'checkpoint-3',
      type: 'checkpoint' as const,
      icon: '🎯',
      title: 'Checkpoint 3',
      subtitle: 'Game time!',
      href: '/games'
    },
    {
      id: 'news',
      type: 'lesson' as const,
      icon: '📰',
      title: 'News',
      subtitle: 'Latest updates',
      href: '/news'
    },
    {
      id: 'ai-stories',
      type: 'lesson' as const,
      icon: '🤖',
      title: 'AI Stories',
      subtitle: 'Interactive tales',
      href: '/stories'
    },
    {
      id: 'resources',
      type: 'lesson' as const,
      icon: '🎌',
      title: 'Resources',
      subtitle: 'Learning tools',
      href: '/resources'
    }
  ];

  return (
    <div className="w-full md:max-w-5xl mx-auto px-0 md:px-4 relative">
      <h3 className="text-xl font-semibold text-center text-white mb-12 relative z-10 animate-fade-in-up bg-gradient-to-br from-primary/90 to-primary/70 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20 max-w-fit mx-auto transform hover:scale-105 transition-all hover:shadow-[0_20px_50px_rgba(139,_92,_246,_0.5)]" style={{ boxShadow: '0 10px 40px rgba(139, 92, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)' }}>
        Your Learning Path Awaits
      </h3>

      {/* Snake Path Container with Animated Background */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Infinite Scrolling Background - Local to Learning Path */}
        <InfiniteScrollingBackground />

        {/* Snake Path Content */}
        <div className="relative z-10 p-8">
          <ProductionSnakePath nodes={nodes} />
        </div>
      </div>

      {/* Enhanced description with animation */}
      <div className="mt-20 text-center max-w-2xl mx-auto relative z-10 animate-fade-in-up" style={{ animationDelay: '1400ms' }}>
        <div className="bg-gradient-to-br from-primary/90 to-primary/70 backdrop-blur-md rounded-2xl px-8 py-6 border border-white/20 transform hover:scale-[1.02] transition-all hover:shadow-[0_25px_60px_rgba(139,_92,_246,_0.5)]" style={{ boxShadow: '0 15px 45px rgba(139, 92, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)' }}>
          <p className="text-white text-lg font-medium">
            Follow the path from top to bottom. Each station builds upon the last,
            creating your foundation in Japanese.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PracticePage() {
  const strings = useStrings();

    return (
    <>
        {/* Virtual Companion Section - 1/6th of screen height */}
        <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />

        {/* Virtual Companion Button positioned within this section */}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-0 md:px-4 py-8 min-h-screen pb-24 md:pb-8">
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(practiceStructuredData),
          }}
        />

        <main className="max-w-7xl mx-auto mb-32 md:mb-8 pb-safe">
          {/* Page Header */}
          <PageHeader title={strings.practice?.title || "Practice Mode"} helpKey="practice" />

          {/* Hero Section */}
          <div className="mb-12">
            <div className="text-center max-w-3xl mx-auto">
              {/* Animated Gateway */}
              <div className="relative inline-block mb-6">
                <div className="text-7xl animate-pulse">⛩️</div>
                <div className="absolute -inset-4 bg-gradient-to-r from-rose-500/20 via-orange-500/20 to-amber-500/20 blur-2xl rounded-full opacity-60 animate-pulse"></div>
                {/* Floating elements */}
                <div className="absolute -top-4 -left-8 text-2xl animate-bounce animation-delay-100">あ</div>
                <div className="absolute -top-4 -right-8 text-2xl animate-bounce animation-delay-300">カ</div>
                <div className="absolute -bottom-4 -left-6 text-2xl animate-bounce animation-delay-500">学</div>
                <div className="absolute -bottom-4 -right-6 text-2xl animate-bounce animation-delay-700">習</div>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                <span className="bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 bg-clip-text text-transparent">
                  {strings.practice?.hero?.gatewayTitle || "Your Gateway to Japanese"}
                </span>
              </h2>

              <p className="text-xl font-semibold text-foreground mb-4">
                {strings.practice?.hero?.subtitle || "Begin Your Journey Here"}
              </p>

              <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl mx-auto">
                Welcome to the foundation of your Japanese learning adventure. Master the essentials with our
                <span className="font-semibold text-rose-600"> {strings.practice?.hero?.kanaChartsHighlight || 'Kana Charts'}</span> and
                <span className="font-semibold text-orange-600"> {strings.practice?.hero?.conjugationPracticeHighlight || 'Conjugation Practice'}</span> —
                the building blocks every learner needs.
              </p>

              {/* Stats or motivational elements */}
              <div className="flex flex-wrap gap-6 justify-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🌸</span>
                  <span className="text-muted-foreground">{strings.practice?.hero?.stats?.hiraganaKatakana || "Start with Hiragana & Katakana"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <span className="text-muted-foreground">{strings.practice?.hero?.stats?.verbConjugations || "Master verb conjugations"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🚀</span>
                  <span className="text-muted-foreground">{strings.practice?.hero?.stats?.strongFoundations || "Build strong foundations"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Learning Path with Production Snake Path */}
          <ProductionLearningPath />
        </main>
      </div>
    </>
  );
}


