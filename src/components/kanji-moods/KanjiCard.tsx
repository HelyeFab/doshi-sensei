'use client';

import { useState, useEffect, useRef } from 'react';
import { KanjiCardProps } from '@/types/moodBoard';
import { Kanji } from '@/types';
import KanjiDetailsModal from '@/components/kanji/KanjiDetailsModal';
import { useStrings } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Bookmark } from 'lucide-react';
import StudyListManager from '@/utils/studyListManager';
import { SaveWordModal } from '@/components/drill/SaveWordModal';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useToast } from '@/hooks/useToast';
import { useLearnTracking } from '@/hooks/useLearnTracking';

export default function KanjiCard({
  kanji,
  isLearned,
  onToggleLearned,
}: KanjiCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isKanjiSaved, setIsKanjiSaved] = useState(false);
  const strings = useStrings();
  const { user } = useAuth();
  const { track } = useAnalytics();
  const { toast } = useToast();
  
  // Universal Learning Analytics
  const { track: trackLearning } = useLearnTracking();
  const viewStartTime = useRef(Date.now());

  // Check if kanji is already saved when component mounts
  useEffect(() => {
    checkIfKanjiSaved();
    
    // Track kanji view with Universal Learning Analytics
    trackLearning({
      type: 'view',
      category: 'kanji',
      content: {
        value: kanji.char,
        jlptLevel: kanji.jlpt,
        metadata: {
          meanings: [kanji.meaning],
          readings: {
            on: kanji.readings?.on || [],
            kun: kanji.readings?.kun || []
          },
          source: 'kanji_card',
          difficulty: kanji.difficulty
        }
      }
    });
    
    // Track duration on unmount
    return () => {
      const duration = Date.now() - viewStartTime.current;
      if (duration > 1000) { // Only track if viewed for more than 1 second
        trackLearning({
          type: 'complete',
          category: 'kanji',
          content: { value: kanji.char },
          metrics: { duration }
        });
      }
    };
  }, [kanji.char]);

  const checkIfKanjiSaved = async () => {
    if (!kanji || !user) return;
    try {
      const lists = await StudyListManager.getAllStudyLists();
      let saved = false;
      
      for (const list of lists) {
        const items = await StudyListManager.getItemsInList(list.id);
        // Check if this kanji exists in the kanji array
        const kanjiExists = items.kanji?.some(k => k.kanji === kanji.char);
        if (kanjiExists) {
          saved = true;
          break;
        }
      }
      
      setIsKanjiSaved(saved);
    } catch (error) {
      console.error('Error checking saved kanji:', error);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking on bookmark
    if ((e.target as HTMLElement).closest('.bookmark-button')) {
      return;
    }
    setIsModalOpen(true);
    
    // Track kanji view
    track('kanji_viewed', {
      kanji: kanji.char,
      jlptLevel: kanji.jlpt || 'unknown',
      source: 'moodboard'
    });

  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.warning('Sign in required', 'Please sign in to save kanji to your study lists');
      return;
    }
    
    // Track save attempt
    trackLearning({
      type: 'save',
      category: 'kanji',
      content: {
        value: kanji.char,
        metadata: {
          action: 'bookmark_click',
          alreadySaved: isKanjiSaved
        }
      }
    });
    
    setShowSaveModal(true);
  };

  return (
    <>
      <div
        className="kanji-card-container w-full cursor-pointer hover:scale-[1.02] transition-transform"
        onClick={handleCardClick}
      >
        <div className="kanji-card">
          <div className="kanji-card-face">
            <div className="flex flex-col items-center justify-center h-full p-4">
              <div className="text-6xl font-bold text-foreground mb-3 japanese-text font-ja" data-quickcontext="true">
                {kanji.char}
              </div>
              <div className="text-lg text-muted-foreground text-center">
                {kanji.meaning}
              </div>

            </div>

            {/* Bookmark Icon - Top Left */}
            <button
              className="bookmark-button absolute top-3 left-3 p-1.5"
              onClick={handleBookmarkClick}
              aria-label="Save to lists"
            >
              <Bookmark 
                className={`w-4 h-4 transition-colors duration-300 ${isKanjiSaved ? 'fill-current text-purple-400' : 'text-muted-foreground'}`} 
              />
            </button>


            {/* Click Hint */}
            <div className="absolute bottom-3 w-full text-center text-xs text-muted-foreground opacity-60">
              Tap to view details
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <KanjiDetailsModal
        kanji={{
          kanji: kanji.char,
          meaning: kanji.meaning,
          onyomi: kanji.readings?.on || [],
          kunyomi: kanji.readings?.kun || [],
          jlpt: `N${kanji.difficulty || 5}`,
          examples: kanji.examples?.map((ex, idx) => ({
            word: ex,
            reading: '',
            meaning: ''
          })) || []
        }}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isLearned={isLearned}
        onToggleLearned={onToggleLearned}
        showLearnedButton={true}
        showSaveButton={true}
        onSave={() => handleBookmarkClick(new MouseEvent('click') as any)}
      />

      {/* Save Modal */}
      {showSaveModal && (
        <SaveWordModal
          word={{
            id: kanji.char,
            kanji: kanji.char,
            kana: kanji.readings.kun[0] || kanji.readings.on[0] || '',
            romaji: '',
            meaning: kanji.meaning,
            english: kanji.meaning,
            type: 'noun',
            jlpt: 5,
            tags: [],
            word: kanji.char,
            reading: kanji.readings.kun[0] || kanji.readings.on[0] || '',
            meanings: [kanji.meaning],
            jlptLevel: kanji.difficulty,
            frequency: 0,
            kanaReading: kanji.readings.kun[0] || kanji.readings.on[0] || ''
          }}
          onClose={() => setShowSaveModal(false)}
          onSaveComplete={() => {
            checkIfKanjiSaved();
          }}
          itemType="kanji"
        />
      )}

      <style jsx>{`
        .kanji-card-container {
          height: 240px;
        }

        .kanji-card {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .kanji-card-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 12px;
          border: 2px solid var(--border);
          background: var(--card);
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          transition: box-shadow 0.2s ease-in-out;
          display: flex;
          flex-direction: column;
        }

        .kanji-card:hover .kanji-card-face {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .kanji-card-face::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--gradient);
          opacity: 0.1;
          border-radius: 12px;
        }

        @media (max-width: 768px) {
          .kanji-card-container {
            height: 200px;
          }
        }
      `}</style>
    </>
  );
}
