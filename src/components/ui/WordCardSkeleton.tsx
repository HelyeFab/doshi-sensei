'use client';

export function WordCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Kanji skeleton */}
          <div className="flex items-baseline gap-3 mb-2">
            <div className="h-8 w-24 bg-muted rounded"></div>
            <div className="h-6 w-32 bg-muted/70 rounded"></div>
          </div>
          
          {/* Meaning skeleton */}
          <div className="h-5 w-48 bg-muted/50 rounded mb-3"></div>
          
          {/* Badges skeleton */}
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-muted/30 rounded-full"></div>
            <div className="h-6 w-20 bg-muted/30 rounded-full"></div>
          </div>
        </div>
        
        {/* Action buttons skeleton */}
        <div className="flex gap-2">
          <div className="w-10 h-10 bg-muted/30 rounded-lg"></div>
          <div className="w-10 h-10 bg-muted/30 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

export function WordCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <WordCardSkeleton key={i} />
      ))}
    </div>
  );
}