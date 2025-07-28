'use client';

import { useState, useEffect } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import Link from 'next/link';
import SlideUpModal from '@/components/SlideUpModal';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import { STRIPE_CONFIG } from '@/lib/stripe';
import { useAnalytics } from '@/hooks/useAnalytics';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';

export default function PracticeClient() {
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
                      {strings.practice?.hero?.stats?.practiceAnytime || "Practice anytime, anywhere"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏆</span>
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

              {/* Kana Chart Content */}
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
                      Instant definitions & examples
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💾</span>
                    <p className="text-sm text-muted-foreground">
                      Save words to study lists
                    </p>
                  </div>
                </div>
              </div>

              {/* Vocabulary Interface */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Quick Search
                </h3>
                
                {/* Search Preview */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Try searching 'book' or '本'"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled
                  />
                </div>

                {/* Recent searches mockup */}
                <div className="space-y-2 mb-4">
                  <div className="text-xs text-muted-foreground">Recent searches:</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 text-sm bg-muted rounded-full">食べる</span>
                    <span className="px-3 py-1 text-sm bg-muted rounded-full">学校</span>
                    <span className="px-3 py-1 text-sm bg-muted rounded-full">友達</span>
                  </div>
                </div>

                <Link 
                  href="/vocabulary"
                  className="inline-flex items-center justify-center w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Open Vocabulary Search
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
                      Adaptive difficulty
                    </p>
                  </div>
                </div>
              </div>

              {/* Drills Interface */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Practice Drills
                </h3>
                
                <div className="space-y-3">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-green-900">Conjugation Drill</p>
                        <p className="text-sm text-green-700">Master verb forms</p>
                      </div>
                      <span className="text-2xl">✏️</span>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-blue-900">Vocabulary Quiz</p>
                        <p className="text-sm text-blue-700">Test your knowledge</p>
                      </div>
                      <span className="text-2xl">📝</span>
                    </div>
                  </div>

                  <Link 
                    href="/drill"
                    className="inline-flex items-center justify-center w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors mt-4"
                  >
                    Start Drilling
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* Block 4: Flashcards */}
            <div className="w-[380px] flex-shrink-0 lg:w-auto">
              {/* Flashcards Card */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-4">
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Study smarter with <span className="font-semibold text-yellow-600">spaced repetition</span>. 
                  Our SRS algorithm ensures you review at the perfect time.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🧠</span>
                    <p className="text-sm text-muted-foreground">
                      Science-based algorithm
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
                    <h4 className="font-medium mb-2">Tech News</h4>
                    <p className="text-sm text-muted-foreground">今年の桜の開花予想は...</p>
                    <p className="text-xs text-gray-500 mt-2">5 min read • N3 level</p>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium mb-2">Japanese Folk Tale</h4>
                    <p className="text-sm text-muted-foreground">昔々、ある山に...</p>
                    <p className="text-xs text-gray-500 mt-2">10 min read • N4 level</p>
                  </div>

                  <Link 
                    href="/news"
                    className="inline-flex items-center justify-center w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Browse All Reading
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
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
                  Study by JLPT Level
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-green-600">N5</span>
                      <div>
                        <p className="font-medium text-sm">Beginner</p>
                        <p className="text-xs text-gray-600">80 essential kanji</p>
                      </div>
                    </div>
                    <span className="text-sm text-green-600">→</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-blue-600">N4</span>
                      <div>
                        <p className="font-medium text-sm">Elementary</p>
                        <p className="text-xs text-gray-600">170 basic kanji</p>
                      </div>
                    </div>
                    <span className="text-sm text-blue-600">→</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-purple-600">N3</span>
                      <div>
                        <p className="font-medium text-sm">Intermediate</p>
                        <p className="text-xs text-gray-600">370 kanji</p>
                      </div>
                    </div>
                    <span className="text-sm text-purple-600">→</span>
                  </div>

                  <Link 
                    href="/kanji-browser"
                    className="inline-flex items-center justify-center w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors mt-4"
                  >
                    Browse All Kanji
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* Block 9: Kanji Mood Boards */}
            <div className="w-[380px] flex-shrink-0 lg:w-auto">
              {/* Kanji Quest Card */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-4">
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Embark on your <span className="font-semibold text-red-500">Kanji Quest</span>! 
                  Learn characters through mood boards and visual associations.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🖼️</span>
                    <p className="text-sm text-muted-foreground">
                      Visual learning
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎨</span>
                    <p className="text-sm text-muted-foreground">
                      Themed collections
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💡</span>
                    <p className="text-sm text-muted-foreground">
                      Memory techniques
                    </p>
                  </div>
                </div>
              </div>

              {/* Kanji Quest Interface */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Featured Boards
                </h3>
                
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Nature Kanji</p>
                        <p className="text-sm text-gray-600">Mountain, river, tree...</p>
                      </div>
                      <span className="text-2xl">🌿</span>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Daily Life</p>
                        <p className="text-sm text-gray-600">Home, food, family...</p>
                      </div>
                      <span className="text-2xl">🏠</span>
                    </div>
                  </div>

                  <Link 
                    href="/kanji-moods"
                    className="inline-flex items-center justify-center w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors mt-4"
                  >
                    Explore All Boards
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
                      Pronunciation practice
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📱</span>
                    <p className="text-sm text-muted-foreground">
                      Mobile friendly
                    </p>
                  </div>
                </div>
              </div>

              {/* Shadowing Interface */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Practice Shadowing
                </h3>
                
                <div className="space-y-4">
                  <div className="text-center p-8 bg-teal-50 rounded-lg">
                    <span className="text-6xl">🎤</span>
                    <p className="mt-4 text-gray-700 font-medium">Listen & Repeat</p>
                    <p className="text-sm text-gray-600 mt-2">Practice with real Japanese audio</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>📖</span>
                      <span>Choose from articles & stories</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>⏯️</span>
                      <span>Control playback speed</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>📝</span>
                      <span>See text with furigana</span>
                    </div>
                  </div>

                  <Link 
                    href="/read"
                    className="inline-flex items-center justify-center w-full py-3 px-4 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors"
                  >
                    Start Shadowing
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>


          </div>
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="px-4 py-8 border-t border-border">
        <h2 className="text-lg font-medium text-foreground mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/practice/hiragana" className="text-center p-4 bg-card rounded-lg hover:bg-muted transition-colors">
            <span className="text-2xl mb-2 block">あ</span>
            <span className="text-sm text-muted-foreground">Hiragana</span>
          </Link>
          <Link href="/practice/katakana" className="text-center p-4 bg-card rounded-lg hover:bg-muted transition-colors">
            <span className="text-2xl mb-2 block">ア</span>
            <span className="text-sm text-muted-foreground">Katakana</span>
          </Link>
          <Link href="/practice/conjugation" className="text-center p-4 bg-card rounded-lg hover:bg-muted transition-colors">
            <span className="text-2xl mb-2 block">動</span>
            <span className="text-sm text-muted-foreground">Conjugation</span>
          </Link>
          <Link href="/drill" className="text-center p-4 bg-card rounded-lg hover:bg-muted transition-colors">
            <span className="text-2xl mb-2 block">練</span>
            <span className="text-sm text-muted-foreground">Drills</span>
          </Link>
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
        title={strings.subscriptions?.upgradeTitle || "Upgrade to Premium"}
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