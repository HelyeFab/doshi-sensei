'use client';

import { useState, useEffect } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { SmartLink } from '@/components/SmartLink';
import SlideUpModal from '@/components/SlideUpModal';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import { STRIPE_CONFIG } from '@/lib/stripe';
import { useAnalytics } from '@/hooks/useAnalytics';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';

// Structured Data for Practice Page (keeping for SEO)
const practiceStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "Japanese Language Practice - Conjugation & Kana",
  "description": "Interactive Japanese verb and adjective conjugation practice with detailed explanations. Study hiragana and katakana charts with pronunciation.",
  "url": "https://doshisensei.com/practice",
  "educationalLevel": ["Beginner", "Intermediate", "Advanced"],
  "learningResourceType": "Interactive Practice"
};

// FAQ Schema for Practice Page
const practiceFAQData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What can I practice on this page?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You can practice hiragana and katakana charts with pronunciation guides, verb and adjective conjugations with detailed explanations, and access interactive flashcard drills for vocabulary practice."
      }
    },
    {
      "@type": "Question",
      "name": "Is the practice content suitable for beginners?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! Our practice tools are designed for all levels. Beginners can start with hiragana and katakana charts, while intermediate and advanced learners can focus on complex verb conjugations and vocabulary drills."
      }
    },
    {
      "@type": "Question",
      "name": "How do the conjugation exercises work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our conjugation practice shows you all forms of Japanese verbs and adjectives including present, past, negative, polite, and special forms like passive and causative. Each form includes detailed explanations and examples."
      }
    },
    {
      "@type": "Question",
      "name": "Can I practice offline?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, many of our practice tools work offline once loaded. The app uses progressive web app technology to cache content for offline use."
      }
    }
  ]
};

export default function PracticePage() {
  const strings = useStrings();
  const [activeTab, setActiveTab] = useState<'hiragana' | 'katakana'>('hiragana');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { createCheckoutSession } = useSubscription2();
  const { trackUpgradeModalShown, track } = useAnalytics();

  // Track modal shown
  useEffect(() => {
    if (showUpgradeModal) {
      trackUpgradeModalShown('feature_limit', 'anki_import');
      console.log('📊 [Analytics] Upgrade modal shown:', { trigger: 'feature_limit', feature: 'anki_import' });
    }
  }, [showUpgradeModal, trackUpgradeModalShown]);

  const monthlyPlan = SUBSCRIPTION_PLANS.find(plan => plan.id === 'monthly');
  const yearlyPlan = SUBSCRIPTION_PLANS.find(plan => plan.id === 'yearly');

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    try {
      // Track upgrade plan selected
      track('upgrade_plan_selected', { plan, feature: 'anki_import' });
      console.log('📊 [Analytics] Upgrade plan selected:', { plan, feature: 'anki_import' });
      
      const priceId = plan === 'monthly'
        ? STRIPE_CONFIG.priceIds.monthly
        : STRIPE_CONFIG.priceIds.yearly;

      await createCheckoutSession(priceId);
    } catch (error) {
      console.error('Upgrade failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Structured Data for SEO - keeping for SEO purposes */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(practiceStructuredData),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(practiceFAQData),
        }}
      />

      {/* Page Header */}
      <SmartPageHeader 
        title={strings.practice?.title || "Practice Mode"}
        className="text-foreground"
        backHref="/"
      />

      {/* Begin Journey Section */}
      <section className="px-4 pb-6">
        <h2 className="text-lg font-medium text-foreground mb-4">
          {strings.practice?.hero?.subtitle || "Begin Your Journey Here"}
        </h2>
        
        {/* Responsive Container: Grid for desktop, horizontal scroll for mobile */}
        <div className="overflow-x-auto -mx-4 px-4 lg:overflow-visible lg:mx-0 lg:px-0">
          <div className="flex gap-6 w-max lg:grid lg:grid-cols-3 lg:gap-6 lg:max-w-7xl lg:mx-auto lg:w-auto">
            
            {/* Block 1: Kana Charts */}
            <div className="w-[380px] flex-shrink-0 lg:w-auto">
              {/* Intro Card */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-4">
                <p className="text-muted-foreground leading-relaxed mb-4 text-center">
                  Welcome to the foundation of your Japanese learning adventure. Master the essentials with our{' '}
                  <span className="font-semibold text-primary">Kana Charts</span>
                  {' '}and{' '}
                  <span className="font-semibold text-accent">Conjugation Practice</span>
                  {' '}— the building blocks every learner needs.
                </p>
                
                {/* Feature highlights */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🌸</span>
                    <p className="text-sm text-muted-foreground">
                      {strings.practice?.hero?.stats?.hiraganaKatakana || "Start with Hiragana & Katakana"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎯</span>
                    <p className="text-sm text-muted-foreground">
                      {strings.practice?.hero?.stats?.verbConjugations || "Master verb conjugations"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🚀</span>
                    <p className="text-sm text-muted-foreground">
                      {strings.practice?.hero?.stats?.strongFoundations || "Build strong foundations"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Kana Tab Navigation */}
              <div className="bg-card rounded-lg shadow-sm border border-border mb-4">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('hiragana')}
                    className={`flex-1 py-3 text-center font-medium transition-colors relative ${
                      activeTab === 'hiragana' 
                        ? 'text-primary' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    HIRAGANA
                    {activeTab === 'hiragana' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('katakana')}
                    className={`flex-1 py-3 text-center font-medium transition-colors relative ${
                      activeTab === 'katakana' 
                        ? 'text-primary' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    KATAKANA
                    {activeTab === 'katakana' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                {activeTab === 'hiragana' ? (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      Master Hiragana - The Foundation
                    </h3>
                    <p className="text-foreground/70 mb-6">
                      Learn the 46 basic hiragana characters that form the foundation of Japanese writing. 
                      Perfect for beginners starting their journey.
                    </p>
                    
                    {/* Quick Preview Grid */}
                    <div className="grid grid-cols-5 gap-3 mb-6">
                      {['あ', 'か', 'さ', 'た', 'な'].map((char, idx) => (
                        <div key={idx} className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-2xl font-medium text-foreground japanese-text">{char}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {['a', 'ka', 'sa', 'ta', 'na'][idx]}
                          </div>
                        </div>
                      ))}
                    </div>

                    <SmartNavigationLink 
                      href="/practice/hiragana"
                      title="Hiragana Chart"
                      type="page"
                      className="inline-flex items-center justify-center w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      Practice Hiragana Chart
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </SmartNavigationLink>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      Master Katakana - Foreign Words
                    </h3>
                    <p className="text-foreground/70 mb-6">
                      Learn the 46 katakana characters used for foreign words and emphasis. 
                      Essential for reading modern Japanese.
                    </p>
                    
                    {/* Quick Preview Grid */}
                    <div className="grid grid-cols-5 gap-3 mb-6">
                      {['ア', 'カ', 'サ', 'タ', 'ナ'].map((char, idx) => (
                        <div key={idx} className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-2xl font-medium text-foreground japanese-text">{char}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {['a', 'ka', 'sa', 'ta', 'na'][idx]}
                          </div>
                        </div>
                      ))}
                    </div>

                    <SmartNavigationLink 
                      href="/practice/katakana"
                      title="Katakana Chart"
                      type="page"
                      className="inline-flex items-center justify-center w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      Practice Katakana Chart
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </SmartNavigationLink>
                  </div>
                )}
              </div>
            </div>

            {/* Block 2: Vocabulary Search */}
            <div className="w-[380px] flex-shrink-0 lg:w-auto">
              {/* Vocabulary Card */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-4">
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Search millions of words with our powerful{' '}
                  <span className="font-semibold text-blue-500">JMDict</span> integration and{' '}
                  <span className="font-semibold text-purple-500">WaniKani</span> data.
                  Find exactly what you need instantly!
                </p>
                
                {/* Vocabulary features */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔍</span>
                    <p className="text-sm text-muted-foreground">
                      {strings.vocabulary?.searchPlaceholder || "Search in English, Japanese, or romaji"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📖</span>
                    <p className="text-sm text-muted-foreground">
                      Detailed definitions with examples
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎌</span>
                    <p className="text-sm text-muted-foreground">
                      JLPT levels and WaniKani data
                    </p>
                  </div>
                </div>
              </div>

              {/* Vocabulary Search Interface */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Quick Vocabulary Search
                </h3>
                
                {/* Search Bar */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search for any Japanese word..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled
                    style={{ cursor: 'not-allowed' }}
                  />
                </div>

                {/* Example Results */}
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Popular searches:</p>
                  <div className="flex flex-wrap gap-2">
                    {['食べる', '飲む', '行く', '見る', '話す'].map((word) => (
                      <span key={word} className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>

                <Link 
                  href="/vocabulary"
                  className="inline-flex items-center justify-center w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors mt-6"
                >
                  Open Full Vocabulary Browser
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Block 3: Drills */}
            <div className="w-[380px] flex-shrink-0 lg:w-auto">
              {/* Drills Card */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-4">
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Test yourself with our <span className="font-semibold text-green-500">interactive drills</span>. 
                  Practice conjugations, vocabulary, and more with instant feedback.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚡</span>
                    <p className="text-sm text-muted-foreground">
                      Quick practice sessions
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📊</span>
                    <p className="text-sm text-muted-foreground">
                      Track your accuracy
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎯</span>
                    <p className="text-sm text-muted-foreground">
                      Focus on weak areas
                    </p>
                  </div>
                </div>
              </div>

              {/* Drill Interface */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Quick Drill Practice
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Choose a drill type:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <SmartLink href="/drill" className="p-3 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center">
                        <span className="text-2xl mb-1 block">🔤</span>
                        <p className="text-sm">Conjugation</p>
                      </SmartLink>
                      <SmartLink href="/drill" className="p-3 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center">
                        <span className="text-2xl mb-1 block">📝</span>
                        <p className="text-sm">Vocabulary</p>
                      </SmartLink>
                      <SmartLink href="/drill" className="p-3 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center">
                        <span className="text-2xl mb-1 block">🈯</span>
                        <p className="text-sm">Kanji</p>
                      </SmartLink>
                      <SmartLink href="/drill" className="p-3 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center">
                        <span className="text-2xl mb-1 block">📃</span>
                        <p className="text-sm">Sentences</p>
                      </SmartLink>
                    </div>
                  </div>

                  <SmartLink 
                    href="/drill"
                    className="inline-flex items-center justify-center w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Start Full Drill Session
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </SmartLink>
                </div>
              </div>
            </div>

            {/* Block 4: Flashcards */}
            <div className="w-[380px] flex-shrink-0 lg:w-auto">
              {/* Flashcards Card */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-4">
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Build your memory with <span className="font-semibold text-indigo-500">spaced repetition</span>. 
                  Our SRS algorithm ensures you review at the perfect time.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🧠</span>
                    <p className="text-sm text-muted-foreground">
                      Smart review scheduling
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📈</span>
                    <p className="text-sm text-muted-foreground">
                      Optimize memory retention
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <img src="/flat-icons/ui/flash-card.svg" alt="Flashcard" className="w-8 h-8" />
                    <p className="text-sm text-muted-foreground">
                      Custom card creation
                    </p>
                  </div>
                </div>
              </div>

              {/* Flashcard Interface */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Today's Reviews
                </h3>
                
                <div className="space-y-4">
                  <div className="text-center p-8 bg-muted/50 rounded-lg">
                    <img src="/flat-icons/ui/flash-card.svg" alt="Flashcard" className="w-16 h-16 mx-auto" />
                    <p className="mt-4 text-muted-foreground">No reviews due today!</p>
                    <p className="text-sm text-gray-500 mt-2">Create some flashcards to get started</p>
                  </div>

                  <Link 
                    href="/drill/flashcards"
                    className="inline-flex items-center justify-center w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Manage Flashcards
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* Block 5: Anki Integration */}
            <div className="w-[380px] flex-shrink-0 lg:w-auto">
              {/* Anki Card */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-4">
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Import your <span className="font-semibold text-primary">Anki decks</span> seamlessly. 
                  Continue your studies with all your existing cards and progress.
                  <span className="ml-1 text-xs text-accent font-semibold">Premium</span>
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📥</span>
                    <p className="text-sm text-muted-foreground">
                      Import .apkg files
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔄</span>
                    <p className="text-sm text-muted-foreground">
                      Sync across devices
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚙️</span>
                    <p className="text-sm text-muted-foreground">
                      Full SRS algorithm
                    </p>
                  </div>
                </div>
              </div>

              {/* Anki Interface */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Anki Integration
                </h3>
                
                <div className="space-y-4">
                  <div className="text-center p-8 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-6xl">👑</span>
                    <p className="mt-4 text-gray-700 font-medium">Premium Feature</p>
                    <p className="text-sm text-gray-600 mt-2">Upgrade to import and sync your Anki decks</p>
                  </div>

                  <button 
                    onClick={() => setShowUpgradeModal(true)}
                    className="inline-flex items-center justify-center w-full py-3 px-4 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                  >
                    Upgrade to Premium
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Block 6: Games */}
            <div className="w-[380px] flex-shrink-0 lg:w-auto">
              {/* Games Card */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-4">
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Learning is fun with our <span className="font-semibold text-primary">interactive games</span>! 
                  From Kanji Quest to listening challenges, make progress while playing.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎮</span>
                    <p className="text-sm text-muted-foreground">
                      6+ engaging games
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏆</span>
                    <p className="text-sm text-muted-foreground">
                      Achievements & rewards
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎯</span>
                    <p className="text-sm text-muted-foreground">
                      Learn while having fun
                    </p>
                  </div>
                </div>
              </div>

              {/* Games Interface */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Featured Games
                </h3>
                
                <div className="space-y-3">
                  <button className="w-full p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg hover:from-pink-100 hover:to-purple-100 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🎌</span>
                      <div>
                        <p className="font-medium">Kanji Quest</p>
                        <p className="text-sm text-muted-foreground">Catch 'em all with kanji!</p>
                      </div>
                    </div>
                  </button>

                  <button className="w-full p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg hover:from-blue-100 hover:to-cyan-100 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🎧</span>
                      <div>
                        <p className="font-medium">Listening Challenge</p>
                        <p className="text-sm text-muted-foreground">Train your ears!</p>
                      </div>
                    </div>
                  </button>

                  <Link 
                    href="/games"
                    className="inline-flex items-center justify-center w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors mt-4"
                  >
                    View All Games
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* Block 7: Reading Content */}
            <div className="w-[380px] flex-shrink-0 lg:w-auto">
              {/* Reading Card */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-4">
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Read real Japanese with our <span className="font-semibold text-primary">news articles</span> and{' '}
                  <span className="font-semibold text-accent">stories</span>. 
                  Furigana support helps you read confidently.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📰</span>
                    <p className="text-sm text-muted-foreground">
                      Daily news updates
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📚</span>
                    <p className="text-sm text-muted-foreground">
                      Graded stories
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔤</span>
                    <p className="text-sm text-muted-foreground">
                      Toggle furigana support
                    </p>
                  </div>
                </div>
              </div>

              {/* Reading Interface */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Today's Reading
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">News</span>
                      <span className="text-xs text-gray-500">5 min read</span>
                    </div>
                    <h4 className="font-medium mb-1">Japan's Cherry Blossom Season</h4>
                    <p className="text-sm text-muted-foreground">今年の桜の開花予想は...</p>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Story</span>
                      <span className="text-xs text-gray-500">10 min read</span>
                    </div>
                    <h4 className="font-medium mb-1">The Helpful Tanuki</h4>
                    <p className="text-sm text-muted-foreground">昔々、ある山に...</p>
                  </div>

                  <div className="flex gap-2">
                    <Link 
                      href="/news"
                      className="flex-1 inline-flex items-center justify-center py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                    >
                      News Articles
                    </Link>
                    <Link 
                      href="/stories"
                      className="flex-1 inline-flex items-center justify-center py-3 px-4 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                    >
                      Stories
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Block 8: Kanji by JLPT */}
            <div className="w-[380px] flex-shrink-0 lg:w-auto">
              {/* Kanji JLPT Card */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-4">
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Master kanji systematically by <span className="font-semibold text-green-500">JLPT level</span>. 
                  From N5 basics to N1 advanced, build your kanji knowledge step by step.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🈯</span>
                    <p className="text-sm text-muted-foreground">
                      2,000+ kanji organized
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📝</span>
                    <p className="text-sm text-muted-foreground">
                      Stroke order practice
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎓</span>
                    <p className="text-sm text-muted-foreground">
                      JLPT N5 to N1 levels
                    </p>
                  </div>
                </div>
              </div>

              {/* Kanji JLPT Interface */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Browse Kanji by JLPT Level
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="font-bold text-green-700">N5</p>
                      <p className="text-xs text-gray-600">~100</p>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="font-bold text-blue-700">N4</p>
                      <p className="text-xs text-gray-600">~300</p>
                    </div>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="font-bold text-purple-700">N3</p>
                      <p className="text-xs text-gray-600">~650</p>
                    </div>
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="font-bold text-orange-700">N2</p>
                      <p className="text-xs text-gray-600">~1200</p>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg col-span-2">
                      <p className="font-bold text-red-700">N1</p>
                      <p className="text-xs text-gray-600">~2000</p>
                    </div>
                  </div>

                  <Link 
                    href="/kanji-browser"
                    className="inline-flex items-center justify-center w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Open Kanji Browser
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* Block 9: Kanji Mood Boards */}
            <div className="w-[380px] flex-shrink-0 lg:w-auto">
              {/* Mood Boards Card */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-4">
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Explore beautiful <span className="font-semibold text-purple-500">kanji mood boards</span> with themes. 
                  Each board tells a story to help you remember kanji naturally.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎨</span>
                    <p className="text-sm text-muted-foreground">
                      Themed collections
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📖</span>
                    <p className="text-sm text-muted-foreground">
                      Story-based learning
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🌸</span>
                    <p className="text-sm text-muted-foreground">
                      Visual memory aids
                    </p>
                  </div>
                </div>
              </div>

              {/* Mood Boards Interface */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Featured Mood Boards
                </h3>
                
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-lg">
                    <div className="h-32 bg-gradient-to-br from-pink-200 to-purple-200 p-4">
                      <p className="font-bold text-white text-xl">Nature 自然</p>
                      <p className="text-white/80 text-sm">Mountain, river, tree...</p>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-lg">
                    <div className="h-32 bg-gradient-to-br from-blue-200 to-cyan-200 p-4">
                      <p className="font-bold text-white text-xl">Time 時間</p>
                      <p className="text-white/80 text-sm">Today, tomorrow, week...</p>
                    </div>
                  </div>

                  <Link 
                    href="/kanji-moods"
                    className="inline-flex items-center justify-center w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors mt-4"
                  >
                    Explore All Mood Boards
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* Block 10: Shadowing */}
            <div className="w-[380px] flex-shrink-0 lg:w-auto">
              {/* Shadowing Card */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-4">
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Perfect your pronunciation with <span className="font-semibold text-teal-500">shadowing practice</span>. 
                  Listen and repeat with articles and stories at your level.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎧</span>
                    <p className="text-sm text-muted-foreground">
                      Native audio support
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🗣️</span>
                    <p className="text-sm text-muted-foreground">
                      Practice speaking
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📱</span>
                    <p className="text-sm text-muted-foreground">
                      Mobile-friendly practice
                    </p>
                  </div>
                </div>
              </div>

              {/* Shadowing Interface */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Shadowing Practice
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-teal-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium">Current Article</p>
                      <button className="text-teal-600 hover:text-teal-700">
                        <span className="text-2xl">🎧</span>
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">自己紹介 - Self Introduction</p>
                    <p className="text-xs text-gray-600">はじめまして。私の名前は...</p>
                  </div>

                  <div className="flex justify-center">
                    <button className="py-3 px-6 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors">
                      <span className="text-2xl">▶️</span>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <Link 
                      href="/news"
                      className="flex-1 inline-flex items-center justify-center py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                    >
                      News Audio
                    </Link>
                    <Link 
                      href="/stories"
                      className="flex-1 inline-flex items-center justify-center py-3 px-4 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                    >
                      Story Audio
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Upgrade Modal */}
      <SlideUpModal
        isOpen={showUpgradeModal}
        onClose={() => {
          track('upgrade_modal_dismissed', { feature: 'anki_import' });
          console.log('📊 [Analytics] Upgrade modal dismissed:', { feature: 'anki_import' });
          setShowUpgradeModal(false);
        }}
        height="auto"
        title={strings.subscriptions?.upgradeToPremium || "Upgrade to Premium"}
        showHandle={false}
      >
        <div className="text-center">
          <div className="text-4xl mb-4">✨</div>
          <p className="text-muted-foreground mb-6 text-sm">
            Import your Anki decks and unlock all premium features to accelerate your Japanese learning journey!
          </p>

          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4 mb-6">
            <div className="text-sm text-muted-foreground mb-2">
              <strong>{strings.subscriptions?.premiumBenefits || "Premium Benefits"}</strong>
            </div>
            <div className="text-sm text-foreground space-y-1">
              {monthlyPlan?.features.map((feature: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <button
              onClick={() => handleUpgrade('yearly')}
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium relative"
            >
              <div className="absolute top-0 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-b transform translate-y-0">
                {strings.subscriptions?.savePercent || "Save 17%"}
              </div>
              <div className="text-lg">${yearlyPlan?.price}/year</div>
              <div className="text-sm opacity-90">{strings.subscriptions?.bestValue || "Best Value"}</div>
            </button>

            <button
              onClick={() => handleUpgrade('monthly')}
              className="w-full px-4 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors font-medium"
            >
              <div className="text-lg">${monthlyPlan?.price}/month</div>
              <div className="text-sm opacity-70">{strings.subscriptions?.monthlyPlan || "Monthly Plan"}</div>
            </button>
          </div>

          <button
            onClick={() => {
              track('upgrade_modal_dismissed', { feature: 'anki_import' });
              console.log('📊 [Analytics] Upgrade modal dismissed:', { feature: 'anki_import' });
              setShowUpgradeModal(false);
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {strings.subscriptions?.maybeLater || "Maybe Later"}
          </button>

          <div className="text-xs text-muted-foreground mt-3">
            {strings.subscriptions?.cancelAnytime || "Cancel anytime, no questions asked"}
          </div>
        </div>
      </SlideUpModal>

    </div>
  );
}