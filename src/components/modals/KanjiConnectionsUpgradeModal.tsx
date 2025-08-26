'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface KanjiConnectionsUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KanjiConnectionsUpgradeModal({ isOpen, onClose }: KanjiConnectionsUpgradeModalProps) {
  const router = useRouter();
  const { user, userType } = useAuth();
  const [currentKanji, setCurrentKanji] = useState(0);
  
  const exampleKanji = [
    { kanji: '明', family: 'Sun & Moon', components: '日 + 月' },
    { kanji: '森', family: 'Trees', components: '木 × 3' },
    { kanji: '語', family: 'Speech', components: '言 + 五 + 口' },
    { kanji: '海', family: 'Water', components: '氵+ 毎' },
    { kanji: '持', family: 'Hand Actions', components: '扌+ 寺' },
  ];
  
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setCurrentKanji((prev) => (prev + 1) % exampleKanji.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, exampleKanji.length]);
  
  const handleUpgrade = () => {
    onClose();
    // Free users go to account page to upgrade
    router.push('/account');
  };
  
  const handleSignIn = () => {
    onClose();
    // Guests go to login page
    router.push('/login');
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg max-h-[90vh] bg-background border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header with animated background */}
            <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-8">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="text-center">
                <div className="text-6xl mb-4">🔮</div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Unlock Kanji Connections
                </h2>
                <p className="text-sm text-muted-foreground">
                  Discover the hidden patterns that make kanji easy to remember
                </p>
              </div>
            </div>
            
            {/* Animated Kanji Example */}
            <div className="px-6 py-4 bg-muted/30">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentKanji}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center"
                >
                  <div className="text-6xl mb-2">{exampleKanji[currentKanji].kanji}</div>
                  <div className="text-sm text-primary font-medium">
                    {exampleKanji[currentKanji].family}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {exampleKanji[currentKanji].components}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Why Premium Section */}
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span className="text-lg">💎</span> Why is this Premium?
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Kanji Connections represents months of research and curation. We've analyzed thousands of kanji 
                  to identify patterns that traditional textbooks miss. This premium feature helps you learn kanji 
                  10x faster by revealing the hidden connections that make memorization effortless.
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="text-xl">👨‍👩‍👧‍👦</div>
                  <div>
                    <h3 className="font-semibold mb-1">60+ Kanji Families</h3>
                    <p className="text-sm text-muted-foreground">
                      Learn groups of kanji that share components and meanings
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="text-xl">⚛️</div>
                  <div>
                    <h3 className="font-semibold mb-1">Semantic Radicals</h3>
                    <p className="text-sm text-muted-foreground">
                      Master kanji through meaning clusters like water 氵, hand 扌, speech 言
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="text-xl">🎨</div>
                  <div>
                    <h3 className="font-semibold mb-1">Visual Patterns (SKIP)</h3>
                    <p className="text-sm text-muted-foreground">
                      Navigate 2000+ kanji by their visual structure and shape
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Testimonial */}
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <p className="text-sm italic text-foreground mb-2">
                  "I learned more kanji in 2 weeks with Connections than I did in 6 months of traditional study. 
                  The patterns just click!"
                </p>
                <p className="text-xs text-muted-foreground">
                  — Sarah K., Premium Member
                </p>
              </div>
              
              {/* CTA Buttons */}
              <div className="space-y-3">
                {userType === 'guest' ? (
                  <>
                    <button
                      onClick={handleSignIn}
                      className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                      Sign In to Get Started
                    </button>
                    <button
                      onClick={onClose}
                      className="w-full py-3 px-4 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
                    >
                      Maybe Later
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleUpgrade}
                      className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                      Upgrade to Premium
                    </button>
                    <button
                      onClick={onClose}
                      className="w-full py-3 px-4 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
                    >
                      Maybe Later
                    </button>
                  </>
                )}
              </div>
              
              {/* Premium Badge */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  🌟 Premium members get unlimited access to all three tools
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}