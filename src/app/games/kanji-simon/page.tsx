'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { useAccessWithModals } from '@/hooks/useAccessWithModals';
import KanjiSimonBoardSelection from '@/components/games/KanjiSimon/KanjiSimonBoardSelection';

export default function KanjiSimonPage() {
  const router = useRouter();
  const { checkAndTrack, AccessModals } = useAccessWithModals();

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
    <>
      <AccessModals />

      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />

        {/* Virtual Companion Button positioned within this section */}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 min-h-screen pb-24 md:pb-8">
        <main className="max-w-7xl mx-auto mb-32 md:mb-8 pb-safe">
          {/* Page Header */}
          <PageHeader
            title="Kanji Simon"
            showBackButton={true}
            onBack={handleBack}
          />

          <div className="max-w-4xl mx-auto text-center mb-8">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold mb-4">
              Test your memory with kanji readings!
            </h2>
            <p className="text-muted-foreground mb-2">
              Watch the sequence of readings light up, then repeat them in order.
            </p>
            <p className="text-sm text-muted-foreground">
              Be careful - clicking the wrong segment ends the round!
            </p>
          </div>

          <KanjiSimonBoardSelection onSelect={handleBoardSelect} />
        </main>
      </div>
    </>
  );
}
