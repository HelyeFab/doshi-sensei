'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { useAccessWithModals } from '@/hooks/useAccessWithModals';
import KanjiSimonBoardSelection from '@/components/games/KanjiSimon/KanjiSimonBoardSelection';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';
import SlideUpModal from '@/components/SlideUpModal';

export default function KanjiSimonClient() {
  const router = useRouter();
  const { checkAndTrack, AccessModals } = useAccessWithModals();
  const [showInstructions, setShowInstructions] = useState(true);

  const handleBoardSelect = async (boardId: string) => {
    // Check access for kanji-simon game
    const hasAccess = await checkAndTrack('kanji_simon');

    if (hasAccess) {
      router.push(`/games/kanji-simon/${boardId}`);
    }
  };

  const handleBack = () => {
    router.push('/games');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AccessModals />
      
      <SmartPageHeader
        title="Kanji Simon"
        backHref="/games"
      />

      {/* Main Content */}
      <MobileAwareContainer className="container mx-auto px-4 py-8">
        <main className="max-w-7xl mx-auto mb-32 md:mb-8 pb-safe">
          <KanjiSimonBoardSelection onSelect={handleBoardSelect} />

          {/* Instructions Modal */}
          <SlideUpModal
            isOpen={showInstructions}
            onClose={() => setShowInstructions(false)}
            height="90%"
            showHandle={false}
            title="How to Play Kanji Simon"
          >
            <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 -m-6 p-6 pb-8">
              {/* Hero Section */}
              <div className="mb-12">
                <div className="text-center max-w-3xl mx-auto">
                  <div className="relative inline-block mb-6">
                    <div className="text-7xl animate-pulse">🎯</div>
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-2xl rounded-full opacity-60"></div>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
                    Test Your Memory with Kanji Readings
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-6 max-w-2xl mx-auto">
                    Watch the sequence of readings light up, then repeat them in order.
                    Be careful - clicking the wrong segment ends the round!
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="mb-8 max-w-4xl mx-auto">
                <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 rounded-2xl p-8 backdrop-blur-sm">
                  <h3 className="text-2xl font-bold text-center text-foreground mb-8">How to Play</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4 group">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                          1
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground text-lg">Watch Pattern</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Kanji segments light up in sequence
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 group">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                          2
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground text-lg">Memorize</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Remember the order of readings
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4 group">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                          3
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground text-lg">Repeat</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Click segments in the same order
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 group">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                          4
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground text-lg">Level Up</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Sequences get longer as you progress
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <div className="text-center">
                <button
                  onClick={() => setShowInstructions(false)}
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium text-lg hover:bg-primary/90 transition-colors"
                >
                  Choose Board & Start
                </button>
              </div>
            </div>
          </SlideUpModal>
        </main>
      </MobileAwareContainer>
    </div>
  );
}
