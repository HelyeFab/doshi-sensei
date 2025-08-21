'use client';

import { useStrings } from '@/contexts/LanguageContext';

export function DetailedStats() {
  const strings = useStrings();

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Learning Statistics</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-primary">0</div>
          <div className="text-sm text-muted-foreground">Games Played</div>
        </div>
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-primary">0</div>
          <div className="text-sm text-muted-foreground">Stories Read</div>
        </div>
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-primary">0</div>
          <div className="text-sm text-muted-foreground">Words Learned</div>
        </div>
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-primary">0</div>
          <div className="text-sm text-muted-foreground">Study Streak</div>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-center text-muted-foreground">
          Start using Doshi Sensei to see your learning statistics!
        </p>
      </div>
    </div>
  );
}