'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStrings } from '@/contexts/LanguageContext';
import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import KanjiProgressSummary from './components/KanjiProgressSummary';

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
}

export default function KanjiMasteryDashboard() {
  const strings = useStrings();
  const router = useRouter();
  const { checkAndTrack } = useAccess();
  const { feature, access, remaining } = useFeature('kanji_mastery');
  const { isPremium, userType } = useSubscription2();
  
  const [settings, setSettings] = useState<StudySettings>({
    sessionSize: 5,
    jlptLevel: 'N5',
    gradeLevel: '1',
    studyMode: 'jlpt'
  });
  
  const [showWarning, setShowWarning] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check if session size exceeds recommended limit
    setShowWarning(settings.sessionSize > 20);
  }, [settings.sessionSize]);

  const handleStartSession = async () => {
    // Check access
    const canUse = await checkAndTrack('kanji_mastery');
    if (!canUse) return;
    
    // Navigate to learning flow with settings
    const params = new URLSearchParams({
      size: settings.sessionSize.toString(),
      mode: settings.studyMode,
      level: settings.studyMode === 'jlpt' ? settings.jlptLevel : settings.gradeLevel
    });
    
    router.replace(`/tools/kanji-mastery/learn?${params}`);
  };


  const getMaxSessionSize = () => {
    if (isPremium) return 50;
    if (userType === 'free') return 20;
    return 10; // guest
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pageStructuredData),
        }}
      />

      <div className="mobile-nav-padding">
        {/* Smart Page Header */}
        <SmartPageHeader 
          title="Kanji Mastery 🎯"
          showBackButton={true}
        />

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

        {/* How to Use Section */}
        <div className="px-4 mb-6">
          <div className="text-center">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>How to use Kanji Mastery</span>
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
                <h3 className="text-lg font-semibold text-foreground mb-4">🎯 Master Kanji with Scientific Spaced Repetition</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">📚 Getting Started</h4>
                    <p className="text-muted-foreground text-sm">
                      Kanji Mastery uses the FSRS (Free Spaced Repetition Scheduler) algorithm - the same scientifically-proven system used by Anki. 
                      Start by selecting your study mode (JLPT Level, School Grade, or Mixed), then choose how many kanji to study per session (5-50).
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-2">🎲 How Kanji Are Selected</h4>
                    <p className="text-muted-foreground text-sm">
                      <strong>For Learning Sessions (Drill Mode):</strong> The system randomly shuffles all kanji from your selected JLPT level 
                      or grade and picks the number you requested. This ensures variety and prevents predictable patterns. Each selected kanji 
                      is then enriched with real example sentences from Tatoeba and JMDict databases.
                    </p>
                    <p className="text-muted-foreground text-sm mt-2">
                      <strong>For Review Sessions (Coming Soon):</strong> The FSRS algorithm will prioritize kanji based on:
                    </p>
                    <ul className="mt-1 ml-4 text-muted-foreground text-sm list-disc">
                      <li>Overdue items (sorted by how overdue they are)</li>
                      <li>Kanji due within the next 24 hours</li>
                      <li>Your past performance and retention rate</li>
                      <li>Optimal spacing intervals to maximize memory retention</li>
                    </ul>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">🧪 Drill Mode</h4>
                      <p className="text-muted-foreground text-sm">
                        Learn new kanji with comprehensive explanations including meanings, on'yomi/kun'yomi readings, 
                        example sentences from real Japanese sources, and stroke order animations. Mark kanji as "easy" 
                        when you've mastered them.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-foreground mb-2">🎨 Free Study</h4>
                      <p className="text-muted-foreground text-sm">
                        Browse and study any kanji at your own pace without tracking. Perfect for reviewing specific 
                        kanji or exploring characters outside your current level. No session limits apply here.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-2">📊 Progress Tracking</h4>
                    <p className="text-muted-foreground text-sm">
                      Your progress is automatically saved and synced (premium users get cloud sync). The system tracks:
                    </p>
                    <ul className="mt-2 ml-4 text-muted-foreground text-sm list-disc">
                      <li>Mastery level (0-100%) for each kanji</li>
                      <li>Retention rate based on your review performance</li>
                      <li>Optimal review intervals calculated by FSRS</li>
                      <li>Study time and session statistics</li>
                      <li>Separate tracking for recognition, production, and writing modes</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-medium flex items-center gap-2">
                      <span className="text-lg">⚠️</span>
                      <span>
                        <strong>Optimal Learning:</strong> Studies show that 10-20 kanji per session maximizes retention. 
                        Studying more than 20 at once significantly reduces how well you remember them. Quality over quantity!
                      </span>
                    </p>
                  </div>

                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm text-primary font-medium">
                      💡 <strong>Pro Tips:</strong>
                    </p>
                    <ul className="mt-1 ml-5 text-sm text-primary list-disc">
                      <li>Start with 5-10 kanji per session and gradually increase</li>
                      <li>Study daily for best results - even 5 minutes helps!</li>
                      <li>Use the "mark as easy" feature for kanji you already know well</li>
                      <li>Combine with the Kanji Browser for additional practice</li>
                      <li>Free users get {userType === 'guest' ? '10' : '20'} kanji per session, Premium users get up to 50</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 space-y-6">
          {/* Session Configuration */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Configure Your Study Session
            </h2>
            
            {/* Study Mode Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                Study Mode
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
                <span>{getMaxSessionSize()}</span>
              </div>
              
              {showWarning && (
                <div className="mt-2 p-3 bg-destructive/10 border-2 border-destructive rounded-lg">
                  <p className="text-sm text-destructive font-semibold flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <span>Studying more than 20 kanji per session may reduce retention. Consider smaller, more frequent sessions.</span>
                  </p>
                </div>
              )}
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartSession}
              disabled={remaining === 0}
              className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              Start Learning Session
            </button>
          </div>

          {/* Study Modes */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Study Modes
            </h2>
            
            <div className="space-y-3">
              {/* Drill Mode */}
              <button
                onClick={handleStartSession}
                className="w-full text-left p-4 border border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">🧪 Drill Mode</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Study new kanji with comprehensive explanations
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>


              {/* Free Study */}
              <button
                onClick={() => router.replace('/tools/kanji-mastery/browse')}
                className="w-full text-left p-4 border border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">🎨 Free Study</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Browse and study any kanji at your own pace
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          {/* Progress Summary */}
          <KanjiProgressSummary />
        </div>
      </div>
    </div>
  );
}