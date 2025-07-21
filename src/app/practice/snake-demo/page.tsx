'use client';

import { useState } from 'react';
import { SnakePath } from '@/components/SnakePath';
import { PageHeader } from '@/components/PageHeader';
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
    title: 'Checkpoint',
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
    title: 'Checkpoint'
  },
  {
    id: 'conjugation-1',
    type: 'lesson' as const,
    icon: '学',
    title: 'Conjugation',
    subtitle: 'Present tense'
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

export default function SnakeDemoPage() {
  const router = useRouter();
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const handleNodeClick = (node: any) => {
    if (node.type === 'locked') return;
    
    setSelectedNode(node);
    
    // Here you can navigate to specific practice pages
    if (node.id === 'hiragana-1' || node.id === 'hiragana-2') {
      router.push('/practice/kana');
    } else if (node.id === 'verbs-1' || node.id === 'conjugation-1') {
      router.push('/practice/conjugation');
    }
  };

  return (
    <>
      {/* Virtual Companion Section */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Main Content */}
      <MobileAwareContainer className="container mx-auto px-4 py-8 min-h-screen">
        <main className="max-w-3xl mx-auto">
          <PageHeader 
            title="Learning Path (Snake Demo)" 
            showBackButton={true} 
            onBackClick={() => router.push('/practice')} 
          />

          {/* Progress Stats */}
          <div className="mb-8 p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Your Progress</h3>
                <p className="text-sm text-muted-foreground">Keep up the great work!</p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">5/12</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">🔥 7</div>
                  <div className="text-xs text-muted-foreground">Day Streak</div>
                </div>
              </div>
            </div>
          </div>

          {/* Snake Path */}
          <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 rounded-2xl p-8 border border-border/50">
            <SnakePath
              nodes={PRACTICE_NODES}
              onNodeClick={handleNodeClick}
              pathColor="#d4d4d8"
              nodeSpacing={140}
              curveIntensity={120}
            />
          </div>

          {/* Tips */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold text-sm text-foreground mb-2">💡 Tips</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Complete lessons in order to unlock new content</li>
              <li>• Checkpoint nodes review what you've learned</li>
              <li>• Practice daily to maintain your streak!</li>
            </ul>
          </div>

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
              <button
                onClick={() => handleNodeClick(selectedNode)}
                className="mt-3 w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 
                         transition-colors text-sm font-medium"
              >
                Start Lesson
              </button>
            </div>
          )}
        </main>
      </MobileAwareContainer>
    </>
  );
}