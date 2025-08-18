'use client';

import { useState, useEffect } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import { useAccess } from '@/hooks/useAccess';
import { motion, AnimatePresence } from 'framer-motion';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { VocabularyLearningView } from './components/VocabularyLearningView';
import { StructuredData } from '@/components/StructuredData';
import { structuredData } from '@/utils/seo';

const pageStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Textbook Vocabulary - Doshi Sensei",
  "description": "Learn Japanese vocabulary from popular textbooks like Genki and Minna no Nihongo with interactive exercises and spaced repetition",
  "url": "https://doshisensei.com/tools/textbook-vocabulary"
};

type Textbook = 'genki-1' | 'genki-2' | 'minna-1' | 'minna-2' | null;

export default function TextbookVocabularyPage() {
  const strings = useStrings();
  const { checkAndTrack } = useAccess();
  const [selectedTextbook, setSelectedTextbook] = useState<Textbook>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Skip during SSR/build time
    if (typeof window === 'undefined') return;
    
    // Track feature usage
    const trackUsage = async () => {
      const canAccess = await checkAndTrack('textbook_vocabulary');
      if (!canAccess) {

      }
    };
    trackUsage();
  }, [checkAndTrack]);

  const textbooks = [
    {
      id: 'genki-1' as Textbook,
      title: 'Genki 1',
      subtitle: 'Elementary Japanese',
      color: 'from-pink-400 to-purple-500',
      shadowColor: 'shadow-purple-200 dark:shadow-purple-500/50',
      hoverShadow: 'hover:shadow-purple-300 dark:hover:shadow-purple-400/60',
      lessons: 12,
      words: 1496,
      level: 'N5',
      icon: '🌸'
    },
    {
      id: 'genki-2' as Textbook,
      title: 'Genki 2',
      subtitle: 'Elementary Japanese II',
      color: 'from-purple-400 to-indigo-500',
      shadowColor: 'shadow-indigo-200 dark:shadow-indigo-500/50',
      hoverShadow: 'hover:shadow-indigo-300 dark:hover:shadow-indigo-400/60',
      lessons: 11,
      words: 491,
      level: 'N4-N5',
      icon: '🌺'
    },
    {
      id: 'minna-1' as Textbook,
      title: 'Minna no Nihongo 1',
      subtitle: 'Japanese for Everyone',
      color: 'from-green-400 to-teal-500',
      shadowColor: 'shadow-teal-200 dark:shadow-teal-500/50',
      hoverShadow: 'hover:shadow-teal-300 dark:hover:shadow-teal-400/60',
      lessons: 25,
      words: 2029,
      level: 'N5',
      icon: '🌿'
    },
    {
      id: 'minna-2' as Textbook,
      title: 'Minna no Nihongo 2',
      subtitle: 'Japanese for Everyone II',
      color: 'from-teal-400 to-blue-500',
      shadowColor: 'shadow-blue-200 dark:shadow-blue-500/50',
      hoverShadow: 'hover:shadow-blue-300 dark:hover:shadow-blue-400/60',
      lessons: 25,
      words: 1058,
      level: 'N4',
      icon: '🌊'
    }
  ];

  const handleTextbookSelect = (textbook: Textbook) => {
    setIsLoading(true);
    setSelectedTextbook(textbook);
    // Simulate loading
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pageStructuredData),
        }}
      />

      {!selectedTextbook && (
        <SmartPageHeader 
          title="Textbook Vocabulary"
          backHref="/"
        />
      )}

      <AnimatePresence mode="wait">
        {!selectedTextbook ? (
          <motion.div
            key="textbook-selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4 pb-20"
          >
            {/* How to Use Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="mb-6 text-center"
            >
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>How to use Textbook Vocabulary</span>
                <svg
                  className={`w-4 h-4 transition-transform ${
                    showInstructions ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showInstructions && (
                <div className="mt-4 p-5 bg-card border border-border rounded-lg text-left max-w-3xl mx-auto">
                  <h3 className="text-lg font-semibold text-foreground mb-4">📚 Master Textbook Vocabulary with Scientific Spaced Repetition</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">🎯 Complete Textbook Coverage</h4>
                      <p className="text-muted-foreground text-sm">
                        Access complete vocabulary from Genki I & II (1,700+ words) and Minna no Nihongo I & II (2,800+ words). 
                        Every word from every chapter is included with accurate readings, meanings, and example sentences. 
                        This is the most comprehensive collection available online, imported directly from official sources.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-2">⏰ Golden Time Learning System</h4>
                      <p className="text-muted-foreground text-sm">
                        Our FSRS (Free Spaced Repetition Scheduler) algorithm - the same used by Anki - calculates the optimal 
                        review time for each word. The "Golden Time" is when reviewing will maximize retention with minimum effort. 
                        Words appear for review just before you're likely to forget them, strengthening long-term memory.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-foreground mb-2">📖 Study Modes</h4>
                        <p className="text-muted-foreground text-sm">
                          <strong>Grid View:</strong> Browse all vocabulary with instant flip cards<br/>
                          <strong>Study Mode:</strong> Interactive flashcards with self-grading<br/>
                          <strong>Golden Time:</strong> Review words at optimal intervals<br/>
                          <strong>Learn Mode:</strong> Introduce new words with guided practice
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-foreground mb-2">🎯 Smart Filtering</h4>
                        <p className="text-muted-foreground text-sm">
                          Filter by lesson, JLPT level, part of speech, or mastery status. 
                          Focus on specific chapters you're studying in class or review 
                          all N5 verbs across multiple lessons. The flexible system adapts 
                          to your learning needs.
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-2">💾 Progress Tracking</h4>
                      <p className="text-muted-foreground text-sm">
                        All progress saves automatically to your device using IndexedDB. Free users get local storage 
                        for up to 500 words, Premium users get unlimited storage with Firebase cloud sync across devices. 
                        Track mastery levels, review counts, and learning streaks. The system remembers every interaction 
                        to optimize future reviews.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-2">🎮 Interactive Learning</h4>
                      <p className="text-muted-foreground text-sm">
                        Unlike static flashcards, our cards are interactive: tap to flip, swipe to navigate, rate your 
                        confidence (1-5), and get instant audio pronunciation. Cards show furigana, kanji breakdowns, 
                        and contextual examples. The system adapts difficulty based on your performance.
                      </p>
                    </div>

                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium flex items-center gap-2">
                        <span className="text-lg">⚠️</span>
                        <span>
                          <strong>Optimal Learning:</strong> Studies show reviewing 20-30 words per session maximizes retention. 
                          More than 50 words causes cognitive overload and reduces learning efficiency. Use Golden Time 
                          mode to automatically limit sessions to the optimal size.
                        </span>
                      </p>
                    </div>

                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <p className="text-sm text-primary font-medium">
                        💡 <strong>Pro Tips:</strong>
                      </p>
                      <ul className="mt-1 ml-5 text-sm text-primary list-disc">
                        <li>Sync your study with your textbook lessons - study Chapter 3 vocab before class</li>
                        <li>Use Golden Time daily - even 5 minutes maintains your vocabulary</li>
                        <li>Rate honestly: 1 (forgot) to 5 (perfect) - this optimizes review scheduling</li>
                        <li>Listen to audio for every word to improve pronunciation</li>
                        <li>Review example sentences to understand usage context</li>
                        <li>Free users: 20 reviews/day, Premium: unlimited with cloud sync</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Golden Time Banner */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-4 text-white shadow-lg dark:from-yellow-500 dark:to-orange-600"
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">⏰</div>
                <div className="flex-1">
                  <h2 className="font-bold text-lg">Golden Time Learning</h2>
                  <p className="text-sm opacity-90">Review at the perfect moment for maximum retention</p>
                </div>
              </div>
            </motion.div>

            {/* Textbook Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {textbooks.map((textbook, index) => (
                <motion.button
                  key={textbook.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                  onClick={() => handleTextbookSelect(textbook.id)}
                  className={`group relative bg-card dark:bg-card/80 backdrop-blur-sm rounded-2xl p-10 shadow-md ${textbook.shadowColor} ${textbook.hoverShadow} hover:shadow-xl dark:hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 border border-transparent dark:border-border/50 dark:hover:border-primary/30`}
                >
                  {/* Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${textbook.color} opacity-5 dark:opacity-20 rounded-2xl`} />
                  
                  {/* Coming Soon Badge for empty textbooks */}
                  {textbook.words === 0 && (
                    <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
                      Coming Soon
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4 pt-2">
                      <div className="text-left pl-2">
                        <h3 className="text-xl font-bold text-foreground mb-1">
                          {textbook.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{textbook.subtitle}</p>
                      </div>
                      <div className="text-3xl pr-2">{textbook.icon}</div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center bg-muted rounded-lg p-2">
                        <div className="text-xs text-muted-foreground">Lessons</div>
                        <div className="font-bold text-foreground">{textbook.lessons}</div>
                      </div>
                      <div className="text-center bg-muted rounded-lg p-2">
                        <div className="text-xs text-muted-foreground">Words</div>
                        <div className="font-bold text-foreground">
                          {textbook.words === 0 ? '-' : textbook.words.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center bg-muted rounded-lg p-2">
                        <div className="text-xs text-muted-foreground">Level</div>
                        <div className="font-bold text-foreground">{textbook.level}</div>
                      </div>
                    </div>

                    {/* Progress Bar (if user has progress) */}
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden mx-3 mb-2">
                      <div 
                        className={`absolute inset-y-0 left-0 bg-gradient-to-r ${textbook.color} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-full dark:opacity-80`}
                        style={{ width: '30%' }}
                      />
                    </div>

                    {/* Hover Effect */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-border transition-colors duration-300" />
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 bg-card rounded-xl p-4 shadow-sm"
            >
              <h3 className="font-semibold text-foreground mb-2">📊 Total Collection</h3>
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400">
                9,635 words
              </div>
              <p className="text-sm text-muted-foreground mt-1">From 4 popular textbooks</p>
            </motion.div>

            {/* Features Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 grid grid-cols-2 gap-4"
            >
              <div className="bg-card rounded-xl p-4 shadow-sm">
                <div className="text-2xl mb-2">🎯</div>
                <h4 className="font-semibold text-foreground mb-1">Smart Filtering</h4>
                <p className="text-xs text-muted-foreground">By lesson, JLPT level, or theme</p>
              </div>
              <div className="bg-card rounded-xl p-4 shadow-sm">
                <div className="text-2xl mb-2">🎵</div>
                <h4 className="font-semibold text-foreground mb-1">Audio Support</h4>
                <p className="text-xs text-muted-foreground">Native pronunciation included</p>
              </div>
              <div className="bg-card rounded-xl p-4 shadow-sm">
                <div className="text-2xl mb-2">📊</div>
                <h4 className="font-semibold text-foreground mb-1">Progress Tracking</h4>
                <p className="text-xs text-muted-foreground">See your mastery level</p>
              </div>
              <div className="bg-card rounded-xl p-4 shadow-sm">
                <div className="text-2xl mb-2">💫</div>
                <h4 className="font-semibold text-foreground mb-1">Interactive Learning</h4>
                <p className="text-xs text-muted-foreground">Not just flashcards!</p>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <VocabularyLearningView 
            textbook={selectedTextbook!} 
            onBack={() => setSelectedTextbook(null)}
            checkAndTrack={checkAndTrack}
          />
        )}
      </AnimatePresence>
    </div>
  );
}