'use client';

import { useState, useEffect } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import { useFeature } from '@/hooks/useFeature';
import { motion, AnimatePresence } from 'framer-motion';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { VocabularyLearningView } from './components/VocabularyLearningView';
import { StructuredData } from '@/components/StructuredData';
import { structuredData } from '@/utils/seo';
import { useLearnTracking } from '@/hooks/useLearnTracking';

const pageStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Textbook Vocabulary - Doshi Sensei",
  "description": "Learn Japanese vocabulary from popular textbooks like Genki and Minna no Nihongo with interactive exercises and spaced repetition",
  "url": "https://doshisensei.com/tools/textbook-vocabulary"
};

type Textbook = 'genki-1' | 'genki-2-complete' | 'minna-1' | 'minna-2' | 'kaishi-15k' | 'kanji-in-context' | null;

export default function TextbookVocabularyPage() {
  const strings = useStrings();
  const { checkAndTrack } = useFeature('textbook_vocabulary', {
    showModal: true,
    showToast: true,
    trackUsage: true
  });
  const { track: trackLearning } = useLearnTracking();
  const [selectedTextbook, setSelectedTextbook] = useState<Textbook>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Skip during SSR/build time
    if (typeof window === 'undefined') return;
    
    // Track feature usage
    const trackUsage = async () => {
      const canAccess = await checkAndTrack();
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
      id: 'genki-2-complete' as Textbook,
      title: 'Genki 2',
      subtitle: 'Elementary Japanese II (Complete)',
      color: 'from-purple-400 to-indigo-500',
      shadowColor: 'shadow-indigo-200 dark:shadow-indigo-500/50',
      hoverShadow: 'hover:shadow-indigo-300 dark:hover:shadow-indigo-400/60',
      lessons: 11,
      words: 1062,
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
    },
    {
      id: 'kaishi-15k' as Textbook,
      title: 'Kaishi Core 1.5k',
      subtitle: 'Frequency-Based Core Vocabulary',
      color: 'from-orange-400 to-red-500',
      shadowColor: 'shadow-red-200 dark:shadow-red-500/50',
      hoverShadow: 'hover:shadow-red-300 dark:hover:shadow-red-400/60',
      lessons: 0, // Organized by JLPT level instead
      words: 1500,
      level: 'N5-N1',
      icon: '🔥'
    },
    {
      id: 'kanji-in-context' as Textbook,
      title: 'Kanji in Context',
      subtitle: 'Comprehensive Kanji Compounds',
      color: 'from-blue-400 to-cyan-500',
      shadowColor: 'shadow-cyan-200 dark:shadow-cyan-500/50',
      hoverShadow: 'hover:shadow-cyan-300 dark:hover:shadow-cyan-400/60',
      lessons: 50, // 50 chapters
      words: 9279,
      level: 'N4-N1',
      icon: '📚'
    }
  ];

  // Calculate total words dynamically
  const totalWords = textbooks.reduce((sum, textbook) => sum + textbook.words, 0);

  const handleTextbookSelect = (textbook: Textbook) => {
    setIsLoading(true);
    setSelectedTextbook(textbook);
    
    // Track textbook selection with ULAS
    const textbookInfo = textbooks.find(t => t.id === textbook);
    if (textbookInfo) {
      trackLearning({
        type: 'view',
        category: 'textbook',
        content: {
          value: textbook,
          metadata: {
            textbookTitle: textbookInfo.title,
            subtitle: textbookInfo.subtitle,
            level: textbookInfo.level,
            lessons: textbookInfo.lessons,
            totalWords: textbookInfo.words
          }
        }
      });
    }
    
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
                {totalWords.toLocaleString()} words
              </div>
              <p className="text-sm text-muted-foreground mt-1">From {textbooks.length} popular textbooks</p>
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