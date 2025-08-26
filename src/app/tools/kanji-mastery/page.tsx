'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import KanjiProgressSummary from './components/KanjiProgressSummary';
import ReviewDueAlert from './components/ReviewDueAlert';
import { DesktopContainer } from '@/components/layout/DesktopContainer';

const pageStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Kanji Mastery - Doshi Sensei",
  "description": "Master kanji with spaced repetition and comprehensive learning tools",
  "url": "https://doshisensei.com/tools/kanji-mastery"
};

interface StudySettings {
  sessionSize: number;
  jlptLevel: string;
  gradeLevel: string;
  studyMode: 'jlpt' | 'grade' | 'mixed';
  learningApproach: 'smart' | 'linear';
}

export default function KanjiMasteryDashboard() {
  const router = useRouter();
  const { checkAndTrack, remaining } = useFeature('kanji_mastery');
  const { isPremium, userType } = useSubscription2();
  
  // Define getMaxSessionSize first
  const getMaxSessionSize = () => {
    if (isPremium) return 50;
    if (userType === 'free') return 20;
    return 10; // guest
  };
  
  // Load saved settings from localStorage
  const [settings, setSettings] = useState<StudySettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kanjiMasterySettings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return {
      sessionSize: 5,
      jlptLevel: 'N5',
      gradeLevel: '1',
      studyMode: 'jlpt',
      learningApproach: 'smart'
    };
  });
  
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kanjiMasterySettings', JSON.stringify(settings));
    }
  }, [settings]);

  // Validate session size
  const isSessionSizeValid = settings.sessionSize >= 1 && settings.sessionSize <= getMaxSessionSize();
  const showSizeWarning = settings.sessionSize > 20;
  const showSizeError = settings.sessionSize > getMaxSessionSize();

  const handleStartSession = async () => {
    if (!isSessionSizeValid) {
      setError('Please select a valid session size');
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      // Check access
      const canUse = await checkAndTrack();
      if (!canUse) {
        setIsStarting(false);
        return;
      }
      
      // Navigate to learning flow with settings
      const params = new URLSearchParams({
        size: settings.sessionSize.toString(),
        mode: settings.studyMode,
        level: settings.studyMode === 'jlpt' ? settings.jlptLevel : settings.gradeLevel,
        approach: settings.learningApproach
      });
      
      router.replace(`/tools/kanji-mastery/learn?${params}`);
    } catch (err) {
      console.error('Failed to start session:', err);
      setError('Failed to start session. Please try again.');
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pageStructuredData),
        }}
      />

      {/* Smart Page Header - Outside DesktopContainer */}
      <SmartPageHeader 
        title="Kanji Mastery"
        showBack={true}
        customBackUrl="/"
      />

      <DesktopContainer>
        <div className="mobile-nav-padding">
        {/* Usage Info */}
        {remaining !== null && remaining !== -1 && (
          <div className="px-4 mb-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <p className="text-sm text-primary">
                {remaining === 0 
                  ? `Daily limit reached. Resets tomorrow.`
                  : `${remaining} session${remaining !== 1 ? 's' : ''} remaining today`}
              </p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="px-4 space-y-6">
          {/* Reviews Due Alert */}
          <ReviewDueAlert />
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-lg shadow-sm border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg">📚</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Session Size</p>
                  <p className="text-lg font-semibold text-foreground">{settings.sessionSize} kanji</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-lg shadow-sm border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg">⏱️</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Est. Time</p>
                  <p className="text-lg font-semibold text-foreground">{settings.sessionSize * 2}-{settings.sessionSize * 3} min</p>
                </div>
              </div>
            </div>
          </div>

          {/* Linear Progress Indicator (only show in linear mode) */}
          {settings.learningApproach === 'linear' && (
            <div className="bg-card rounded-lg shadow-sm border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Linear Progress</span>
                <span className="text-xs text-muted-foreground">
                  {(() => {
                    const storageKey = `kanjiLinearProgress_${settings.jlptLevel}`;
                    const lastIndex = parseInt(
                      typeof window !== 'undefined' 
                        ? localStorage.getItem(storageKey) || '0'
                        : '0'
                    );
                    const total = settings.studyMode === 'jlpt' ? 80 : 100; // N5 has 80 kanji
                    return `${Math.min(lastIndex, total)}/${total} kanji`;
                  })()}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${(() => {
                      const storageKey = `kanjiLinearProgress_${settings.jlptLevel}`;
                      const lastIndex = parseInt(
                        typeof window !== 'undefined' 
                          ? localStorage.getItem(storageKey) || '0'
                          : '0'
                      );
                      const total = settings.studyMode === 'jlpt' ? 80 : 100;
                      return Math.min((lastIndex / total) * 100, 100);
                    })()}%`
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Study kanji in traditional order. Progress saves automatically.
              </p>
            </div>
          )}

          {/* Session Configuration */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span>⚙️</span>
              Configure Your Study Session
            </h2>
            
            {/* Learning Approach Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                Learning Approach
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSettings({ ...settings, learningApproach: 'smart' })}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                    settings.learningApproach === 'smart'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 border-border'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg">🧠</span>
                    <span>Smart Selection</span>
                    <span className="text-xs opacity-80">Adaptive learning</span>
                  </div>
                </button>
                <button
                  onClick={() => setSettings({ ...settings, learningApproach: 'linear' })}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                    settings.learningApproach === 'linear'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 border-border'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg">📚</span>
                    <span>Linear Order</span>
                    <span className="text-xs opacity-80">Sequential study</span>
                  </div>
                </button>
              </div>
              {settings.learningApproach === 'smart' && (
                <p className="text-xs text-muted-foreground mt-2">
                  Prioritizes new kanji, due reviews, and areas you struggle with
                </p>
              )}
              {settings.learningApproach === 'linear' && (
                <p className="text-xs text-muted-foreground mt-2">
                  Study kanji in traditional order, perfect for textbook learning
                </p>
              )}
            </div>

            {/* Study Mode Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                Study Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSettings({ ...settings, studyMode: 'jlpt' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.studyMode === 'jlpt'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  JLPT Level
                </button>
                <button
                  onClick={() => setSettings({ ...settings, studyMode: 'grade' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.studyMode === 'grade'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  School Grade
                </button>
                <button
                  onClick={() => setSettings({ ...settings, studyMode: 'mixed' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.studyMode === 'mixed'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Mixed
                </button>
              </div>
            </div>

            {/* Level Selection */}
            {settings.studyMode === 'jlpt' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  JLPT Level
                </label>
                <select
                  value={settings.jlptLevel}
                  onChange={(e) => setSettings({ ...settings, jlptLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="N5">N5 - Beginner</option>
                  <option value="N4">N4 - Elementary</option>
                  <option value="N3">N3 - Intermediate</option>
                  <option value="N2">N2 - Advanced</option>
                  <option value="N1">N1 - Expert</option>
                </select>
              </div>
            )}

            {settings.studyMode === 'grade' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  School Grade
                </label>
                <select
                  value={settings.gradeLevel}
                  onChange={(e) => setSettings({ ...settings, gradeLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {[1, 2, 3, 4, 5, 6].map(grade => (
                    <option key={grade} value={grade}>Grade {grade}</option>
                  ))}
                  <option value="7">Secondary School</option>
                </select>
              </div>
            )}

            {/* Session Size */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                Kanji per Session: {settings.sessionSize}
              </label>
              <input
                type="range"
                min="1"
                max={getMaxSessionSize()}
                value={settings.sessionSize}
                onChange={(e) => setSettings({ ...settings, sessionSize: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1</span>
                <span className="font-medium">Recommended: 5-10</span>
                <span>{getMaxSessionSize()}</span>
              </div>
              
              {showSizeError && (
                <div className="mt-2 p-3 bg-destructive/10 border-2 border-destructive rounded-lg">
                  <p className="text-sm text-destructive font-semibold flex items-center gap-2">
                    <span>❌</span>
                    <span>Session size exceeds your limit of {getMaxSessionSize()} kanji.</span>
                  </p>
                </div>
              )}
              
              {!showSizeError && showSizeWarning && (
                <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Studying more than 20 kanji per session may reduce retention. Consider smaller, more frequent sessions.</span>
                  </p>
                </div>
              )}
            </div>
            
            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Start Button */}
            <button
              onClick={handleStartSession}
              disabled={remaining === 0 || isStarting || !isSessionSizeValid}
              className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isStarting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <span>Starting Session...</span>
                </>
              ) : (
                <span>Start Learning Session</span>
              )}
            </button>
          </div>


          {/* How It Works */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span>💡</span>
              How It Works
            </h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="text-primary font-semibold">1.</span>
                <div>
                  <p className="text-sm font-medium text-foreground">Configure Your Session</p>
                  <p className="text-xs text-muted-foreground">Choose JLPT level and number of kanji to study</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-primary font-semibold">2.</span>
                <div>
                  <p className="text-sm font-medium text-foreground">Learn with Examples</p>
                  <p className="text-xs text-muted-foreground">Each kanji comes with vocabulary and sentences</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-primary font-semibold">3.</span>
                <div>
                  <p className="text-sm font-medium text-foreground">Spaced Repetition</p>
                  <p className="text-xs text-muted-foreground">AI-powered scheduling optimizes your retention</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Summary */}
          <KanjiProgressSummary />
        </div>
      </div>
      </DesktopContainer>
    </div>
  );
}