'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface KanjiConnectionsIntroDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export default function KanjiConnectionsIntroDialog({ 
  isOpen, 
  onClose, 
  onContinue 
}: KanjiConnectionsIntroDialogProps) {
  
  const features = [
    {
      icon: '🧩',
      title: 'Pattern Recognition',
      description: 'Discover how kanji share common components that reveal their meanings'
    },
    {
      icon: '🌊',
      title: 'Semantic Grouping',
      description: 'Learn kanji in meaningful clusters (water, fire, movement, emotions)'
    },
    {
      icon: '🎯',
      title: 'Visual Memory',
      description: 'Master kanji through their visual structure and shape patterns'
    },
    {
      icon: '⚡',
      title: '10x Faster Learning',
      description: 'Learn hundreds of kanji by understanding just a few key patterns'
    }
  ];
  
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
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-2xl max-h-[90vh] bg-background border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Welcome to Kanji Connections 🔮
                  </h2>
                  <p className="text-muted-foreground">
                    A revolutionary way to master kanji through patterns and connections
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* What makes it special */}
              <div>
                <h3 className="text-lg font-semibold mb-3">What Makes This Special?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Traditional kanji learning teaches characters one by one, making it feel overwhelming. 
                  Kanji Connections reveals the hidden patterns that connect thousands of kanji, turning 
                  memorization into understanding. Once you see the patterns, you can't unsee them!
                </p>
              </div>
              
              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-3"
                  >
                    <div className="text-2xl flex-shrink-0">{feature.icon}</div>
                    <div>
                      <h4 className="font-medium text-foreground mb-1">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Premium Badge */}
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg p-4 border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🏆</div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Premium Exclusive</h3>
                    <p className="text-sm text-muted-foreground">
                      This advanced learning system is available exclusively to premium members. 
                      It includes 60+ kanji families, 20+ semantic radical groups, and complete SKIP pattern analysis.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Example */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Quick Example:</h4>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-2xl">明</span>
                  <span className="text-muted-foreground">=</span>
                  <span className="text-lg">日</span>
                  <span className="text-muted-foreground">(sun) +</span>
                  <span className="text-lg">月</span>
                  <span className="text-muted-foreground">(moon) =</span>
                  <span className="text-primary font-medium">bright</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Once you learn this pattern, you'll instantly recognize it in 明日 (tomorrow), 説明 (explanation), and dozens more!
                </p>
              </div>
              
              {/* CTA */}
              <div className="flex gap-3">
                <button
                  onClick={onContinue}
                  className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Continue to Kanji Connections
                </button>
                <button
                  onClick={onClose}
                  className="py-3 px-4 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}