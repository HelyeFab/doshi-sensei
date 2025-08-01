'use client';

interface KanjiProgressBarProps {
  current: number;
  total: number;
}

export default function KanjiProgressBar({ current, total }: KanjiProgressBarProps) {
  const percentage = (current / total) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Progress</span>
        <span className="text-foreground font-medium">{current} / {total}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}