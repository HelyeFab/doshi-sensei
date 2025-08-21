'use client';

import { useState } from 'react';
import SmartHeader from '@/components/SmartHeader';
import { useUnifiedReview } from '@/components/unified-review';

export default function TestReviewPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');
  const { engine, isReady } = useUnifiedReview();

  const sampleKanjiItems = [
    { character: '水', meaning: 'water', reading: 'みず', level: 'N5' },
    { character: '火', meaning: 'fire', reading: 'ひ', level: 'N5' },
    { character: '木', meaning: 'tree', reading: 'き', level: 'N5' },
    { character: '金', meaning: 'gold, money', reading: 'きん', level: 'N5' },
    { character: '土', meaning: 'earth, soil', reading: 'つち', level: 'N5' },
    { character: '日', meaning: 'sun, day', reading: 'ひ', level: 'N5' },
    { character: '月', meaning: 'moon, month', reading: 'つき', level: 'N5' },
    { character: '人', meaning: 'person', reading: 'ひと', level: 'N5' },
    { character: '大', meaning: 'big', reading: 'おおきい', level: 'N5' },
    { character: '小', meaning: 'small', reading: 'ちいさい', level: 'N5' }
  ];

  const sampleVocabItems = [
    { word: 'こんにちは', meaning: 'hello', reading: 'konnichiwa' },
    { word: 'ありがとう', meaning: 'thank you', reading: 'arigatou' },
    { word: 'すみません', meaning: 'excuse me', reading: 'sumimasen' },
    { word: 'おはよう', meaning: 'good morning', reading: 'ohayou' },
    { word: 'こんばんは', meaning: 'good evening', reading: 'konbanwa' },
    { word: 'はい', meaning: 'yes', reading: 'hai' },
    { word: 'いいえ', meaning: 'no', reading: 'iie' },
    { word: 'わかりません', meaning: "I don't understand", reading: 'wakarimasen' },
    { word: 'がくせい', meaning: 'student', reading: 'gakusei' },
    { word: 'せんせい', meaning: 'teacher', reading: 'sensei' }
  ];

  const addSampleKanji = async () => {
    setIsLoading(true);
    setLastAction('Adding sample kanji...');
    
    try {
      if (!isReady || !engine) {
        setLastAction('Review engine not ready');
        return;
      }

      for (const kanji of sampleKanjiItems) {
        await engine.addReviewItem({
          id: `kanji_${kanji.character}`,
          type: 'kanji',
          content: {
            character: kanji.character,
            meaning: kanji.meaning,
            reading: kanji.reading,
            level: kanji.level
          },
          difficulty: 1,
          tags: ['sample', 'kanji', kanji.level],
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      setLastAction(`Successfully added ${sampleKanjiItems.length} kanji items`);
    } catch (error) {
      setLastAction(`Error adding kanji: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const addSampleVocabulary = async () => {
    setIsLoading(true);
    setLastAction('Adding sample vocabulary...');
    
    try {
      if (!isReady || !engine) {
        setLastAction('Review engine not ready');
        return;
      }

      for (const vocab of sampleVocabItems) {
        await engine.addReviewItem({
          id: `vocab_${vocab.word}`,
          type: 'vocabulary',
          content: {
            word: vocab.word,
            meaning: vocab.meaning,
            reading: vocab.reading
          },
          difficulty: 1,
          tags: ['sample', 'vocabulary', 'basic'],
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      setLastAction(`Successfully added ${sampleVocabItems.length} vocabulary items`);
    } catch (error) {
      setLastAction(`Error adding vocabulary: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllData = async () => {
    setIsLoading(true);
    setLastAction('Clearing all review data...');
    
    try {
      if (!isReady || !engine) {
        setLastAction('Review engine not ready');
        return;
      }

      // For now, just indicate that the feature needs implementation
      setLastAction('Clear data feature - implementation needed in engine');
    } catch (error) {
      setLastAction(`Error clearing data: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomReviews = async () => {
    setIsLoading(true);
    setLastAction('Generating random due reviews...');
    
    try {
      if (!isReady || !engine) {
        setLastAction('Review engine not ready');
        return;
      }

      // For now, just simulate the feature
      const count = Math.floor(Math.random() * 5) + 1;
      setLastAction(`Simulated generating ${count} items due for review (feature needs implementation)`);
    } catch (error) {
      setLastAction(`Error generating reviews: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SmartHeader title="Review System Test" backHref="/" />
      
      <div className="md:mx-16 lg:mx-32 xl:mx-48 2xl:mx-64">
        <div className="px-4 pt-4 pb-8">
          {/* Info Section */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Review System Testing</h2>
            <p className="text-muted-foreground mb-4">
              This page allows you to test the Unified Review Engine by adding sample data and 
              manipulating review schedules. Use these tools to test the review functionality 
              before adding real study materials.
            </p>
            
            {lastAction && (
              <div className={`p-3 rounded-lg ${
                lastAction.includes('Error') 
                  ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                  : 'bg-primary/10 text-primary border border-primary/20'
              }`}>
                <p className="text-sm font-medium">Last Action:</p>
                <p className="text-sm">{lastAction}</p>
              </div>
            )}
          </div>

          {/* Sample Data Section */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Add Sample Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={addSampleKanji}
                disabled={isLoading}
                className="flex flex-col items-center p-6 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-3xl mb-2">漢</span>
                <span className="font-medium text-foreground">Add Sample Kanji</span>
                <span className="text-sm text-muted-foreground text-center">
                  Adds 10 basic kanji characters (水, 火, 木, etc.)
                </span>
              </button>

              <button
                onClick={addSampleVocabulary}
                disabled={isLoading}
                className="flex flex-col items-center p-6 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-3xl mb-2">語</span>
                <span className="font-medium text-foreground">Add Sample Vocabulary</span>
                <span className="text-sm text-muted-foreground text-center">
                  Adds 10 common Japanese phrases
                </span>
              </button>
            </div>
          </div>

          {/* Testing Tools Section */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Testing Tools</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={generateRandomReviews}
                disabled={isLoading}
                className="flex flex-col items-center p-6 bg-secondary/50 border border-secondary rounded-lg hover:bg-secondary/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-3xl mb-2">🎲</span>
                <span className="font-medium text-foreground">Generate Due Reviews</span>
                <span className="text-sm text-muted-foreground text-center">
                  Randomly marks some items as due for review
                </span>
              </button>

              <button
                onClick={clearAllData}
                disabled={isLoading}
                className="flex flex-col items-center p-6 bg-destructive/10 border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-3xl mb-2">🗑️</span>
                <span className="font-medium text-destructive">Clear All Data</span>
                <span className="text-sm text-muted-foreground text-center">
                  Removes all review items and progress data
                </span>
              </button>
            </div>
          </div>

          {/* Navigation Section */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Navigation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/review"
                className="flex flex-col items-center p-6 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors"
              >
                <span className="text-3xl mb-2">📝</span>
                <span className="font-medium text-foreground">Go to Review System</span>
                <span className="text-sm text-muted-foreground text-center">
                  Start using the main review interface
                </span>
              </a>

              <a
                href="/"
                className="flex flex-col items-center p-6 bg-muted border border-border rounded-lg hover:bg-muted/70 transition-colors"
              >
                <span className="text-3xl mb-2">🏠</span>
                <span className="font-medium text-foreground">Back to Home</span>
                <span className="text-sm text-muted-foreground text-center">
                  Return to the main dashboard
                </span>
              </a>
            </div>
          </div>

          {isLoading && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card rounded-lg p-6 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="text-foreground">Processing...</span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom padding for navbar */}
          <div className="h-20"></div>
        </div>
      </div>
    </div>
  );
}