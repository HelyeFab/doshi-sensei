'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFeature } from '@/hooks/useFeature';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { DesktopContainer } from '@/components/layout/DesktopContainer';
import { motion } from 'framer-motion';
import KanjiConnectionsIntroDialog from '@/components/dialogs/KanjiConnectionsIntroDialog';

export default function KanjiConnectionsPage() {
  const router = useRouter();
  const { checkAndTrack, AccessModals, userType } = useFeature('kanji_connections', {
    showModal: true,
    trackUsage: true
  });
  
  const [showIntroDialog, setShowIntroDialog] = useState(false);
  
  useEffect(() => {
    // Show intro only for guest and free users
    if (userType === 'guest' || userType === 'free') {
      setShowIntroDialog(true);
    }
  }, [userType]);
  
  const handleIntroComplete = async () => {
    // Close intro dialog
    setShowIntroDialog(false);
  };
  
  const handleIntroClose = () => {
    setShowIntroDialog(false);
    router.push('/');
  };
  
  // If showing intro dialog, show minimal page
  if (showIntroDialog) {
    return (
      <div className="min-h-screen bg-background">
        <KanjiConnectionsIntroDialog
          isOpen={true}
          onClose={handleIntroClose}
          onContinue={handleIntroComplete}
        />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <SmartPageHeader 
        title="Kanji Connections"
        subtitle="Premium Kanji Learning Tools"
        showBack={true}
      />
      
      <DesktopContainer>
        <div className="mobile-nav-padding px-4 md:px-0">
          {/* Hero Section */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 md:p-8 mb-6 md:mb-8">
            <div className="text-center max-w-3xl mx-auto">
              <div className="text-6xl mb-4">🔮</div>
              <h1 className="text-3xl font-bold mb-4">
                Unlock the Patterns Behind Kanji
              </h1>
              <p className="text-lg text-muted-foreground">
                Three revolutionary approaches to understanding and memorizing kanji through 
                connections, patterns, and visual structures. Master 2000+ kanji with the 
                methods that work best for your learning style.
              </p>
            </div>
          </div>
          
          {/* Features Grid - Using Kanji Mastery's Beautiful Card Design */}
          <div className="space-y-4 mb-6 md:mb-8">
            {/* Kanji Families */}
            <button
              onClick={async () => {
                const hasAccess = await checkAndTrack();
                if (hasAccess) {
                  router.push('/tools/kanji-mastery/families');
                }
              }}
              className="block w-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-2 border-purple-500/20 rounded-xl p-4 md:p-6 hover:from-purple-500/20 hover:to-blue-500/20 transition-all duration-300 group relative overflow-hidden text-left"
            >
              {/* Background decoration */}
              <div className="absolute top-0 right-0 -mr-4 -mt-4 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
              
              <div className="relative">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                    <span>👨‍👩‍👧‍👦</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-foreground">Kanji Families</h3>
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold rounded-full">
                        UNIQUE
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Master kanji through component patterns and shared meanings - a revolutionary way to learn characters faster
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-lg">
                        <span>🔥</span> 60+ families
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-lg">
                        <span>🎯</span> 2000+ kanji
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-lg">
                        <span>⚡</span> Pattern recognition
                      </span>
                    </div>
                  </div>
                  <svg className="w-6 h-6 text-muted-foreground group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Semantic Radicals */}
            <button
              onClick={async () => {
                const hasAccess = await checkAndTrack();
                if (hasAccess) {
                  router.push('/tools/kanji-mastery/radicals');
                }
              }}
              className="block w-full bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border-2 border-cyan-500/20 rounded-xl p-4 md:p-6 hover:from-cyan-500/20 hover:to-teal-500/20 transition-all duration-300 group relative overflow-hidden text-left"
            >
              {/* Background decoration */}
              <div className="absolute top-0 right-0 -mr-4 -mt-4 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
              
              <div className="relative">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                    <span>⚛️</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-foreground">Semantic Radicals</h3>
                      <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-semibold rounded-full">
                        MEANING
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Explore kanji grouped by semantic radicals and sub-themes - understand meanings through visual components
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-lg">
                        <span>💧</span> 20+ radicals
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-lg">
                        <span>🧠</span> Thematic groups
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-lg">
                        <span>📊</span> Meaning clusters
                      </span>
                    </div>
                  </div>
                  <svg className="w-6 h-6 text-muted-foreground group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Visual Patterns (SKIP) */}
            <button
              onClick={async () => {
                const hasAccess = await checkAndTrack();
                if (hasAccess) {
                  router.push('/tools/kanji-mastery/visual-layout');
                }
              }}
              className="block w-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-2 border-orange-500/20 rounded-xl p-4 md:p-6 hover:from-orange-500/20 hover:to-amber-500/20 transition-all duration-300 group relative overflow-hidden text-left"
            >
              {/* Background decoration */}
              <div className="absolute top-0 right-0 -mr-4 -mt-4 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
              
              <div className="relative">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                    <span>🎨</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-foreground">Visual Patterns (SKIP)</h3>
                      <span className="px-2 py-0.5 bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-semibold rounded-full">
                        VISUAL
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Navigate kanji by visual structure and shape patterns - learn through spatial organization
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-lg">
                        <span>↔️</span> 4 patterns
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-lg">
                        <span>🎯</span> Visual memory
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-lg">
                        <span>⬜</span> Shape-based
                      </span>
                    </div>
                  </div>
                  <svg className="w-6 h-6 text-muted-foreground group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
          
          {/* Benefits Section */}
          <div className="bg-card border border-border rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">
              Why Kanji Connections?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="text-2xl">🧠</div>
                <div>
                  <h3 className="font-semibold mb-1">Multiple Learning Pathways</h3>
                  <p className="text-sm text-muted-foreground">
                    Engage different parts of your brain with visual, semantic, and structural approaches
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="text-2xl">🔗</div>
                <div>
                  <h3 className="font-semibold mb-1">Connected Learning</h3>
                  <p className="text-sm text-muted-foreground">
                    Learn kanji in groups, making memorization faster and more effective
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="text-2xl">📊</div>
                <div>
                  <h3 className="font-semibold mb-1">Comprehensive Coverage</h3>
                  <p className="text-sm text-muted-foreground">
                    Access over 2000 kanji organized in meaningful ways
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="text-2xl">⚡</div>
                <div>
                  <h3 className="font-semibold mb-1">Accelerated Mastery</h3>
                  <p className="text-sm text-muted-foreground">
                    Learn patterns once, recognize them everywhere
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DesktopContainer>
      
      {/* Render Access Modals if needed */}
      {AccessModals && <AccessModals />}
    </div>
  );
}