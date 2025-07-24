'use client';

import { useState } from 'react';
import { AdjustableSnakePath } from '@/components/AdjustableSnakePath';
import { StandardPageHeader } from '@/components/StandardPageHeader';
import { useRouter } from 'next/navigation';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';

// Example nodes for demonstration
const PRACTICE_NODES = [
  {
    id: 'start',
    type: 'checkpoint' as const,
    icon: '🌸',
    title: 'Welcome!',
    subtitle: 'Start here',
    completed: true
  },
  {
    id: 'hiragana-1',
    type: 'lesson' as const,
    icon: 'あ',
    title: 'Hiragana Basics',
    subtitle: 'A-KA-SA',
    completed: true
  },
  {
    id: 'hiragana-2',
    type: 'lesson' as const,
    icon: 'た',
    title: 'More Hiragana',
    subtitle: 'TA-NA-HA',
    completed: true
  },
  {
    id: 'checkpoint-1',
    type: 'checkpoint' as const,
    title: 'Checkpoint 1',
    completed: true
  },
  {
    id: 'katakana-1',
    type: 'lesson' as const,
    icon: 'ア',
    title: 'Katakana Intro',
    subtitle: 'A-KA-SA',
    completed: true,
    current: true
  },
  {
    id: 'katakana-2',
    type: 'lesson' as const,
    icon: 'タ',
    title: 'Katakana Practice',
    subtitle: 'TA-NA-HA'
  },
  {
    id: 'verbs-1',
    type: 'lesson' as const,
    icon: '動',
    title: 'Basic Verbs',
    subtitle: 'Ichidan & Godan'
  },
  {
    id: 'checkpoint-2',
    type: 'checkpoint' as const,
    title: 'Checkpoint 2'
  },
  {
    id: 'conjugation-1',
    type: 'lesson' as const,
    icon: '学',
    title: 'Conjugation',
    subtitle: 'Present tense'
  },
  {
    id: 'adjectives-1',
    type: 'lesson' as const,
    icon: '形',
    title: 'Adjectives',
    subtitle: 'i & na types'
  },
  {
    id: 'particles-1',
    type: 'lesson' as const,
    icon: '助',
    title: 'Particles',
    subtitle: 'Basic particles'
  },
  {
    id: 'checkpoint-3',
    type: 'checkpoint' as const,
    title: 'Checkpoint 3'
  },
  {
    id: 'locked-1',
    type: 'locked' as const,
    title: 'Coming Soon'
  },
  {
    id: 'locked-2',
    type: 'locked' as const,
    title: 'Coming Soon'
  },
  {
    id: 'locked-3',
    type: 'locked' as const,
    title: 'Coming Soon'
  }
];

export default function SnakeAdjustPage() {
  const router = useRouter();
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const handleNodeClick = (node: any) => {
    if (node.type === 'locked') return;
    setSelectedNode(node);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <MobileAwareContainer className="container mx-auto px-4 py-8 min-h-screen">
        <StandardPageHeader title="Adjustable Snake Path" backHref="/practice" />
        
        <main className="max-w-4xl mx-auto">

          {/* Instructions */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold text-sm mb-2">📐 Path Designer Mode</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Use the sliders below each node to adjust horizontal position</li>
              <li>• Create a natural snake-like curve similar to Duolingo</li>
              <li>• Click "Export Positions" to get the coordinates for production</li>
              <li>• Reference lines at 20%, 50%, and 80% help with alignment</li>
            </ul>
          </div>

          {/* Adjustable Snake Path */}
          <AdjustableSnakePath
            nodes={PRACTICE_NODES}
            onNodeClick={handleNodeClick}
            nodeSpacing={140}
          />

          {/* Selected Node Info */}
          {selectedNode && (
            <div className="fixed bottom-20 left-4 right-4 md:bottom-8 md:left-auto md:right-8 md:w-80 
                          bg-card border border-border rounded-lg p-4 shadow-lg z-50">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    {selectedNode.icon && <span>{selectedNode.icon}</span>}
                    {selectedNode.title}
                  </h4>
                  {selectedNode.subtitle && (
                    <p className="text-sm text-muted-foreground">{selectedNode.subtitle}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Node ID: {selectedNode.id}
              </div>
            </div>
          )}
        </main>
      </MobileAwareContainer>
    </div>
  );
}